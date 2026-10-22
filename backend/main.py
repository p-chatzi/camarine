"""HTTP API for the Camarine web app. Routes only — the work happens in *_service.py.

Run from the repo root:
    python -m uvicorn backend.main:app --app-dir . --reload --port 8000
"""

from __future__ import annotations

import os
import traceback
from datetime import date
from typing import Any

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from pydantic import BaseModel, ConfigDict, Field, StrictStr

from . import suggestion_service
from .map_service import get_map_payload
from .mhw_service import get_mhw_payload

# Comma-separated list, e.g. "https://camarine.example.org". Defaults to the Vite dev server.
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")

app = FastAPI(title="Camarine Copernicus API")
# /api/map returns ~100k pixels: gzip cuts the transfer by ~5x.
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


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
    # Defaults = DATA_BOUNDS in src/config.ts (the frontend always sends them explicitly).
    min_lon: float = Query(-17.0, ge=-180, le=180),
    max_lon: float = Query(23.0, ge=-180, le=180),
    min_lat: float = Query(39.0, ge=-90, le=90),
    max_lat: float = Query(53.5, ge=-90, le=90),
    day: str | None = None,
) -> dict[str, Any]:
    """SST pixels over a bounding box for one day."""
    return get_map_payload((min_lon, max_lon, min_lat, max_lat), day)


SUGGESTIONS_PATH = "/api/suggestions"


@app.middleware("http")
async def limit_suggestion_body(request: Request, call_next):
    """Reject oversized or unsized bodies on the public suggestion form BEFORE they are read/parsed."""
    if request.url.path == SUGGESTIONS_PATH and request.method == "POST":
        length = request.headers.get("content-length")
        if length is None or not length.isdigit():
            return JSONResponse({"detail": "Content-Length requis."}, status_code=411)
        if int(length) > suggestion_service.MAX_BODY_BYTES:
            return JSONResponse({"detail": "Suggestion trop longue."}, status_code=413)
        if not request.headers.get("content-type", "").startswith("application/json"):
            return JSONResponse({"detail": "JSON attendu."}, status_code=415)
    return await call_next(request)


class SpeciesSuggestionIn(BaseModel):
    """Strict schema: strings only (no type coercion), unknown fields rejected."""

    model_config = ConfigDict(extra="forbid")

    species_name: StrictStr = Field(min_length=2, max_length=suggestion_service.NAME_MAX)
    message: StrictStr = Field(default="", max_length=suggestion_service.MESSAGE_MAX)
    website: StrictStr = Field(default="", max_length=200)  # honeypot: humans leave it empty


@app.post(SUGGESTIONS_PATH, status_code=201)
def suggest_species(payload: SpeciesSuggestionIn, request: Request) -> dict[str, str]:
    """Stores a "missing species" suggestion for review (see suggestion_service.py)."""
    if payload.website:
        return {"status": "ok"}  # bot: pretend success, store nothing
    client = request.client.host if request.client else "unknown"
    if not suggestion_service.allow_request(client):
        raise HTTPException(status_code=429, detail="Trop de suggestions, réessayez plus tard.")
    try:
        record = suggestion_service.build_record(payload.species_name, payload.message)
        suggestion_service.append_record(record)
    except suggestion_service.SuggestionError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except suggestion_service.StorageFullError as exc:
        raise HTTPException(status_code=503, detail="Les suggestions sont temporairement fermées.") from exc
    return {"status": "ok"}
