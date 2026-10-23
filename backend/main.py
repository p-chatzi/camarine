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

from . import notify, report_service, suggestion_service
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


FIRST_DAY = date(1982, 1, 1)  # first day of the Copernicus REP series


def _valid_day(value: str | None, name: str) -> date | None:
    """ISO day within [1982-01-01, today]: future days and pre-1982 days are refused (422)."""
    if value is None:
        return None
    try:
        day = date.fromisoformat(value)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"{name} : date AAAA-MM-JJ attendue.") from exc
    if not FIRST_DAY <= day <= date.today():
        raise HTTPException(status_code=422, detail=f"{name} : entre {FIRST_DAY.isoformat()} et aujourd'hui.")
    return day


@app.get("/api/mhw")
def marine_heatwaves(
    lat: float = Query(43.0, ge=-90, le=90),
    lon: float = Query(6.0, ge=-180, le=180),
    radius: float = Query(0.05, gt=0, le=2),
    start: str = "1982-01-01",
    end: str | None = None,
) -> dict[str, Any]:
    """Daily SST time series + detected marine heatwaves around one point."""
    first = _valid_day(start, "start")
    last = _valid_day(end, "end") or date.today()
    if first and first > last:
        raise HTTPException(status_code=422, detail="start doit précéder end.")
    try:
        return get_mhw_payload(lat, lon, radius, start, last.isoformat())
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
    _valid_day(day, "day")
    return get_map_payload((min_lon, max_lon, min_lat, max_lat), day)


SUGGESTIONS_PATH = "/api/suggestions"
REPORTS_PATH = "/api/reports"


@app.middleware("http")
async def limit_suggestion_body(request: Request, call_next):
    """Reject oversized or unsized bodies on the public forms BEFORE they are read/parsed."""
    if request.url.path in (SUGGESTIONS_PATH, REPORTS_PATH) and request.method == "POST":
        length = request.headers.get("content-length")
        if length is None or not length.isdigit():
            return JSONResponse({"detail": "Content-Length requis."}, status_code=411)
        if int(length) > suggestion_service.MAX_BODY_BYTES:
            return JSONResponse({"detail": "Message trop long."}, status_code=413)
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


class SpeciesReportIn(BaseModel):
    """"Signaler une erreur" on a species card. Strict schema, unknown fields rejected."""

    model_config = ConfigDict(extra="forbid")

    species_id: StrictStr = Field(min_length=1, max_length=report_service.SPECIES_ID_MAX)
    species_name: StrictStr = Field(default="", max_length=report_service.NAME_MAX)
    kind: StrictStr = Field(max_length=40)
    message: StrictStr = Field(max_length=report_service.MESSAGE_MAX)
    source_url: StrictStr = Field(default="", max_length=report_service.URL_MAX)
    website: StrictStr = Field(default="", max_length=200)  # honeypot


@app.post(REPORTS_PATH, status_code=201)
def report_species(payload: SpeciesReportIn, request: Request) -> dict[str, str]:
    """Stores an error report about a species card and notifies the maintainer (notify.py)."""
    if payload.website:
        return {"status": "ok"}
    client = request.client.host if request.client else "unknown"
    if not report_service.allow_request(client):
        raise HTTPException(status_code=429, detail="Trop de signalements, réessayez plus tard.")
    try:
        record = report_service.build_report(payload.species_id, payload.species_name, payload.kind, payload.message, payload.source_url)
        suggestion_service.append_record(record, report_service.REPORTS_FILE)
    except suggestion_service.SuggestionError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except suggestion_service.StorageFullError as exc:
        raise HTTPException(status_code=503, detail="Les signalements sont temporairement fermés.") from exc
    notify.notify(*report_service.describe(record))
    return {"status": "ok"}
