"""Download Copernicus Marine SST and export a Hobday-ready JSON artifact."""

from __future__ import annotations

import argparse
import json
import tempfile
from pathlib import Path
from typing import Any
from datetime import date, timedelta
import os
import pandas as pd

REP_DATASET_ID = "C3S-GLO-SST-L4-REP-OBS-SST"
DEFAULT_DATASET_VERSION = "202506"
NRT_DATASET_ID = "METOFFICE-GLO-SST-L4-NRT-OBS-SST-V2"
DEFAULT_VARIABLE = "analysed_sst"


def read_dataframe_subset(
    start: str,
    end: str,
    *,
    dataset_id: str,
    variable: str,
    bbox: tuple[float, float, float, float],
    dataset_version: str | None = None,
) -> Any:
    """Read a Copernicus subset natively."""
    try:
        import copernicusmarine
    except ModuleNotFoundError as exc:
        raise SystemExit("Install Copernicus access with `pip install copernicusmarine`.") from exc
        
    options: dict[str, Any] = {
        "dataset_id": dataset_id,
        "variables": [variable],
        "minimum_longitude": bbox[0], "maximum_longitude": bbox[1],
        "minimum_latitude": bbox[2], "maximum_latitude": bbox[3],
        "start_datetime": f"{start}T00:00:00" if len(start) == 10 else start,
        "end_datetime": f"{end}T00:00:00" if len(end) == 10 else end,
    }
    if dataset_version:
        options["dataset_version"] = dataset_version
        
    # On utilise la méthode officielle qui est stable
    frame = copernicusmarine.read_dataframe(**options)
    
    if frame is None or frame.empty:
        raise RuntimeError("Copernicus returned no data for this date.")
        
    return frame

def normalise_dataframe(frame: Any, variable: str) -> Any:
    """Normalize Copernicus Toolbox output to one daily ``date``/``sst`` table."""
    import pandas as pd

    frame = frame.reset_index()
    time_column = next((name for name in ("time", "date", "datetime") if name in frame.columns), None)
    if time_column is None or variable not in frame.columns:
        raise ValueError(f"Copernicus response must contain time and {variable!r}: {list(frame.columns)}")
    frame["date"] = pd.to_datetime(frame[time_column], utc=True).dt.tz_localize(None).dt.normalize()
    frame["sst"] = pd.to_numeric(frame[variable], errors="coerce")
    if frame["sst"].median() > 100:
        frame["sst"] -= 273.15
    return frame[["date", "sst"]].dropna().groupby("date", as_index=False)["sst"].mean()


def fetch_rep_nrt_series(
    start: str,
    end: str,
    *,
    bbox: tuple[float, float, float, float],
    variable: str = DEFAULT_VARIABLE,
) -> tuple[Any, dict[str, Any]]:
    """Fetch and merge the REP baseline product with the NRT continuation."""
    import pandas as pd
    from datetime import date, timedelta

    requested_start = pd.Timestamp(start)
    requested_end = pd.Timestamp(end)
    rep_end = min(requested_end, pd.Timestamp("2024-12-31"))
    frames = []
    products = []
    
    # 1. TÉLÉCHARGEMENT HISTORIQUE (REP)
    if requested_start <= rep_end:
        print(f"📥 Téléchargement historique REP (jusqu'en 2024)...")
        rep = read_dataframe_subset(
            requested_start.date().isoformat(), rep_end.date().isoformat(),
            dataset_id=REP_DATASET_ID, dataset_version=DEFAULT_DATASET_VERSION,
            variable=variable, bbox=bbox,
        )
        frames.append(normalise_dataframe(rep, variable))
        products.append({"datasetId": REP_DATASET_ID, "period": [requested_start.date().isoformat(), rep_end.date().isoformat()]})
        
    nrt_start = max(requested_start, pd.Timestamp("2025-01-01"))
    
    # 2. TÉLÉCHARGEMENT TEMPS RÉEL (NRT) AVEC AUTO-FALLBACK
    if nrt_start <= requested_end:
        success = False
        # On teste jusqu'à 7 jours de décalage
        for offset in range(1, 8):
            attempt_end = min(requested_end, pd.Timestamp(date.today() - timedelta(days=offset)))
            if attempt_end < nrt_start:
                break
                
            try:
                print(f"📡 Tentative NRT de {nrt_start.date()} à {attempt_end.date()}...")
                nrt = read_dataframe_subset(
                    nrt_start.date().isoformat(), attempt_end.date().isoformat(),
                    dataset_id=NRT_DATASET_ID, variable=variable, bbox=bbox,
                )
                frames.append(normalise_dataframe(nrt, variable))
                products.append({"datasetId": NRT_DATASET_ID, "period": [nrt_start.date().isoformat(), attempt_end.date().isoformat()]})
                success = True
                break # Succès ! On sort de la boucle
            except Exception as e:
                print(f"⚠️ NRT indisponible à J-{offset} ({e}). On recule d'un jour...")
                continue
                
        if not success:
            print("❌ Impossible de charger les données NRT récentes.")

    if not frames:
        raise ValueError("Impossible de récupérer les données REP ou NRT.")
        
    merged = pd.concat(frames, ignore_index=True).drop_duplicates("date").sort_values("date").reset_index(drop=True)
    return merged, {"products": products}


def load_daily_sst(path: Path, variable: str) -> pd.DataFrame:
    """Read a NetCDF and spatially average its SST values."""
    try:
        import pandas as pd
    except ModuleNotFoundError as exc:
        raise SystemExit("Install pipeline dependencies with `pip install -r requirements.txt`.") from exc
    try:
        import xarray as xr
    except ModuleNotFoundError as exc:
        raise SystemExit("Install pipeline dependencies with `pip install -r requirements.txt`.") from exc
    with xr.open_dataset(path) as dataset:
        if variable not in dataset:
            raise ValueError(f"Variable {variable!r} not found in {path}")
        values = dataset[variable]
        spatial_dims = [dim for dim in values.dims if dim not in {"time", "depth"}]
        if spatial_dims:
            values = values.mean(dim=spatial_dims, skipna=True)
        frame = values.to_dataframe(name="sst").reset_index()[["time", "sst"]]
    frame["date"] = pd.to_datetime(frame.pop("time"), utc=True).dt.tz_localize(None).dt.normalize()
    frame["sst"] = pd.to_numeric(frame["sst"], errors="coerce")
    if frame["sst"].median() > 100:
        frame["sst"] = frame["sst"] - 273.15
    return frame.dropna().groupby("date", as_index=False)["sst"].mean()


def build_payload(frame: pd.DataFrame, baseline_start: str, baseline_end: str, source: dict[str, Any], filter_start: str | None = None, filter_end: str | None = None) -> dict[str, Any]:
    from hobday import detect_hobday_events
    import pandas as pd

    # 1. On calcule toujours Hobday sur l'historique complet pour que la climatologie (1991-2020) soit valide
    result = detect_hobday_events(frame, baseline_start, baseline_end)
    
    records = result.records
    
    # 2. Si le front a demandé une période spécifique (ex: 2025-2026), on filtre les records affichés après coup, 
    # tout en gardant l'algorithme valide sur toute la série !
    if filter_start and filter_end:
        fs = pd.Timestamp(filter_start)
        fe = pd.Timestamp(filter_end)
        records = [r for r in records if fs <= pd.Timestamp(r["date"]) <= fe]

    return {
        "schemaVersion": 2,
        "source": source,
        "method": result.settings,
        "coverage": {
            "start": records[0]["date"] if records else None,
            "end": records[-1]["date"] if records else None,
            "recordCount": len(records),
        },
        "events": result.events, # Les canicules détectées sur toute la période
        "records": records,      # Les points filtrés affichés sur le graphique
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, help="Existing NetCDF; skips the REP/NRT API calls")
    parser.add_argument("--output", type=Path, default=Path("public/data/copernicus_pipeline.json"))
    parser.add_argument("--start", default="1982-01-01")
    parser.add_argument("--end", default=date.today().isoformat())
    parser.add_argument("--baseline-start", default="1991-01-01")
    parser.add_argument("--baseline-end", default="2020-12-31")
    parser.add_argument("--variable", default=DEFAULT_VARIABLE)
    parser.add_argument("--lat", type=float, default=43.0, help="Target latitude (default: Toulon)")
    parser.add_argument("--lon", type=float, default=6.0, help="Target longitude (default: Toulon)")
    parser.add_argument("--radius", type=float, default=0.05, help="Half-width of the extraction box in degrees")
    parser.add_argument("--dataset-version", default=DEFAULT_DATASET_VERSION, help="REP product version")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    with tempfile.TemporaryDirectory() as temporary:
        if args.input is not None:
            frame = load_daily_sst(args.input, args.variable)
            source = {"products": [{"datasetId": "local-NetCDF", "period": [args.start, args.end]}]}
        else:
            bbox = (args.lon - args.radius, args.lon + args.radius, args.lat - args.radius, args.lat + args.radius)
            frame, source = fetch_rep_nrt_series(args.start, args.end, bbox=bbox, variable=args.variable)
        payload = build_payload(frame, args.baseline_start, args.baseline_end, {
            "provider": "Copernicus Marine Service",
            "datasetVersion": args.dataset_version,
            "variable": args.variable,
            "location": {"lat": args.lat, "lon": args.lon, "radiusDegrees": args.radius},
            **source,
        })
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"Exported {len(payload['records'])} records and {len(payload['events'])} events to {args.output}")


if __name__ == "__main__":
    main()