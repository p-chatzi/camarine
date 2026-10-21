"""Point time series + Hobday marine-heatwave detection (behind GET /api/mhw)."""

from __future__ import annotations

from typing import Any

from copernicus_pipeline import build_payload, fetch_rep_nrt_series

from . import cache

SERIES_START = "1982-01-01"
BASELINE_START = "1991-01-01"
BASELINE_END = "2020-12-31"


def get_mhw_payload(lat: float, lon: float, radius: float, start: str, end: str) -> dict[str, Any]:
    """Daily SST around (lat, lon) with climatology, P90 threshold and detected events.

    The full 1982→end series is always downloaded (the baseline needs 1991-2020);
    ``start``/``end`` only filter what is returned.
    """
    key = f"mhw_{lat}_{lon}_{radius}_{start}_{end}"
    cached = cache.load(key)
    if cached is not None:
        return cached

    bbox = (lon - radius, lon + radius, lat - radius, lat + radius)
    frame, source = fetch_rep_nrt_series(SERIES_START, end, bbox=bbox)
    payload = build_payload(
        frame,
        BASELINE_START,
        BASELINE_END,
        {
            "provider": "Copernicus Marine Service",
            "location": {"lat": lat, "lon": lon, "radiusDegrees": radius},
            **source,
        },
        filter_start=start,
        filter_end=end,
    )
    cache.save(key, payload)
    return payload
