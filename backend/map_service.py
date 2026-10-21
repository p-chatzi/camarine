"""Gridded SST for one day over a bounding box (behind GET /api/map)."""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any

import copernicusmarine

from copernicus_pipeline import NRT_DATASET_ID, REP_DATASET_ID

from . import cache

REP_LAST_DAY = "2024-12-31"  # after this date only the NRT product exists
REP_VERSION = "202506"
MAX_DAYS_BACK = 4  # NRT data is often 1-3 days late: try earlier days


def _dataset_for(day: str) -> tuple[str, str | None]:
    if day <= REP_LAST_DAY:
        return REP_DATASET_ID, REP_VERSION
    return NRT_DATASET_ID, None


def _download_cells(day: str, bbox: tuple[float, float, float, float]) -> tuple[str, list[dict[str, float]]]:
    """Returns (dataset_id, cells) for one day. Raises if the day is unavailable."""
    min_lon, max_lon, min_lat, max_lat = bbox
    dataset_id, version = _dataset_for(day)
    options: dict[str, Any] = {
        "dataset_id": dataset_id,
        "variables": ["analysed_sst"],
        "minimum_longitude": min_lon,
        "maximum_longitude": max_lon,
        "minimum_latitude": min_lat,
        "maximum_latitude": max_lat,
        "start_datetime": day,
        "end_datetime": day,
    }
    if version:
        options["dataset_version"] = version

    # open_dataset + to_dataframe instead of read_dataframe, which breaks on column names.
    ds = copernicusmarine.open_dataset(**options)
    raw = ds.to_dataframe().reset_index()
    ds.close()

    if raw is None or raw.empty or "analysed_sst" not in raw.columns:
        raise ValueError("Données satellites incomplètes")

    lat_col = next((c for c in ("latitude", "lat") if c in raw.columns), None)
    lon_col = next((c for c in ("longitude", "lon") if c in raw.columns), None)
    if not lat_col or not lon_col:
        raise ValueError("Coordonnées spatiales manquantes")

    # Kelvin → °C when needed.
    raw["sst"] = raw["analysed_sst"].where(raw["analysed_sst"] < 200, raw["analysed_sst"] - 273.15)

    cells = [
        {"lat": round(float(row[lat_col]), 5), "lon": round(float(row[lon_col]), 5), "sst": round(float(row["sst"]), 3)}
        for _, row in raw.dropna(subset=[lat_col, lon_col, "sst"]).iterrows()
        if row["sst"] != 0
    ]
    if not cells:
        raise ValueError("Aucune cellule océanique valide")
    return dataset_id, cells


def get_map_payload(bbox: tuple[float, float, float, float], day: str | None) -> dict[str, Any]:
    """SST pixels for ``day`` (default: yesterday), falling back up to 3 days earlier."""
    requested = day or (date.today() - timedelta(days=1)).isoformat()
    key = "map_{}_{}_{}_{}_{}".format(*bbox, requested)
    cached = cache.load(key)
    if cached is not None:
        return cached

    target = date.fromisoformat(requested)
    for offset in range(MAX_DAYS_BACK):
        attempt = (target - timedelta(days=offset)).isoformat()
        try:
            dataset_id, cells = _download_cells(attempt, bbox)
        except Exception as exc:  # noqa: BLE001 - any failure → try the previous day
            print(f"⚠️ Image du {attempt} ignorée ({exc}). On recule...")
            continue

        payload = {
            "source": {
                "provider": "Copernicus Marine Service",
                "datasetId": dataset_id,
                "date": requested,
                "actual_map_data_used": attempt,
            },
            "cells": cells,
        }
        cache.save(key, payload)
        print(f"✅ Carte envoyée. (Demandée: {requested} | Donnée réelle: {attempt})")
        return payload

    # Copernicus fully unavailable: empty map (not cached, so it is retried next time).
    return {
        "source": {"provider": "Copernicus", "datasetId": "N/A", "date": requested, "note": "API Delayed"},
        "cells": [],
    }
