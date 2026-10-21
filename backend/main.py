"""HTTP API for the Camarine web app. Routes only — the work happens in *_service.py.

Run from the repo root:
    python -m uvicorn backend.main:app --app-dir . --reload --port 8000
"""

from __future__ import annotations

import os
import traceback
from datetime import date
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from .map_service import get_map_payload
from .mhw_service import get_mhw_payload

# Comma-separated list, e.g. "https://camarine.example.org". Defaults to the Vite dev server.
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")

app = FastAPI(title="Camarine Copernicus API")
# /api/map returns ~100k pixels: gzip cuts the transfer by ~5x.
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(CORSMiddleware, allow_origins=ALLOWED_ORIGINS, allow_methods=["GET"], allow_headers=["*"])


@app.get("/api/health")
@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/mhw")
def marine_heatwaves(
    lat: float = Query(43.0, ge=-90, le=90),
    lon: float = Query(6.0, ge=-180, le=180),
    radius: float = Query(0.05, gt=0, le=2),
    start: str = "1982-01-01",
    end: str | None = None,
) -> dict[str, Any]:
    """Daily SST time series + detected marine heatwaves around one point."""
    try:
        return get_mhw_payload(lat, lon, radius, start, end or date.today().isoformat())
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=502, detail=f"Copernicus pipeline unavailable: {exc}") from exc


@app.get("/api/map")
def current_map(
    min_lon: float = Query(-20.0, ge=-180, le=180),
    max_lon: float = Query(24.5, ge=-180, le=180),
    min_lat: float = Query(36.5, ge=-90, le=90),
    max_lat: float = Query(55.5, ge=-90, le=90),
    day: str | None = None,
) -> dict[str, Any]:
    """SST pixels over a bounding box for one day."""
    return get_map_payload((min_lon, max_lon, min_lat, max_lat), day)
