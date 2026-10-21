# Camarine — how the code is organised

Read this before your first change. Every file has one job, and the first comment in each file says what that job is.

## Data flow (one sentence per step)

1. **Copernicus Marine** → `copernicus_pipeline.py` downloads daily SST (REP 1982–2024 + NRT 2025→today) and `hobday.py` detects marine heatwaves (P90, 1991–2020 baseline, ≥ 5 days).
2. **FastAPI** (`backend/`) exposes this as `GET /api/mhw` (point time series + events) and `GET /api/map` (SST pixels over France for one day), cached on disk in `cache_data/`.
3. **Frontend** (`src/api/copernicus.ts`) fetches both; hooks in `src/hooks/` hold the state; components in `src/components/` only display it.

```
Copernicus ─► copernicus_pipeline.py + hobday.py ─► backend/*_service.py ─► backend/main.py (routes)
                                                                                   │  /api/mhw, /api/map
                                                                                   ▼
                          src/api/copernicus.ts ─► src/hooks/* ─► src/App.tsx ─► src/components/<tab>/*
```

## Frontend (`src/`)

| Folder | What goes there | Rule |
|---|---|---|
| `types.ts` | Every shape shared between files (`SpeciesItem`, `Pipeline`, `MapCell`…) | Add a type here if two files need it |
| `config.ts` | Constants: Toulon location, France bounding box, baseline years, tile URLs | No magic numbers in components |
| `data/` | Static content: species, photos, museum chapters, data-source metadata | Plain data, no logic |
| `lib/` | Pure functions: Hobday categories, colours, dates, CSV/JSON export, audio synth | No React, easy to unit-test |
| `api/` | The only place that calls `fetch` | |
| `hooks/` | State + side effects, one concern per hook | Components don't fetch or keep shared state |
| `components/layout/` | Header, bottom bar, loading screen | |
| `components/map/` | Leaflet map; one hook per layer (`useThermalLayer`, `useSpeciesMarkers`, …) | |
| `components/visualiser/` | Tab 1: filters, telemetry pill, legend, species card | |
| `components/comprendre/` | Tab 2: KPIs, Hobday explainer, strip plot, daily chart, events table | |
| `components/partager/` | Tab 3: export panel, preview modal, forum | |
| `App.tsx` | Holds state shared across tabs, picks which tab to render | Keep it short: wire, don't implement |

### Where do I change…

| I want to… | Edit |
|---|---|
| Add / edit a species | `src/data/species.ts` (+ photos in `src/data/speciesImages.ts`) |
| Change heatwave category colours or thresholds | `src/lib/hobday.ts` |
| Change the SST colour scale | `src/lib/colors.ts` |
| Change what's in the CSV/JSON export | `src/lib/export.ts` |
| Change the monitored location (Toulon) | `src/config.ts` → `PIPELINE_LOCATION` |
| Add a filter to the map | `src/hooks/useMapSettings.ts` (state) + `src/components/visualiser/FilterPanel.tsx` (UI) |
| Show/hide something only for experts | wrap it in `settings.expert && …` (state in `src/hooks/useMapSettings.ts`) |
| Change the home view / how far users can zoom out | `FRANCE_BOUNDS` (home view) and `DATA_BOUNDS` (fetched area = pan/zoom limit) in `src/config.ts`; logic in `lockToData` / `goHome`, `src/components/map/useLeafletMap.ts` |
| Change pixel tooltips on the map | `src/components/map/thermalPopups.ts` |
| Add a new tab | `AppMode` in `types.ts`, a button in `layout/Header.tsx`, a `components/<tab>/<Tab>View.tsx`, one line in `App.tsx` |
| Add an API endpoint | `backend/<name>_service.py` (logic) + a route in `backend/main.py`, then a function in `src/api/copernicus.ts` |

### Splitting work between people

Folders map to features, so people can work in parallel with few merge conflicts: one person per tab folder (`visualiser/`, `comprendre/`, `partager/`), one on `components/map/`, one on `backend/` + the Python pipeline. Shared files that need coordination: `types.ts`, `App.tsx`, `hooks/useCopernicusData.ts`.

## Backend (`backend/`)

| File | Role |
|---|---|
| `main.py` | Routes only (`/api/health`, `/api/mhw`, `/api/map`) and CORS |
| `mhw_service.py` | Point time series + Hobday events |
| `map_service.py` | Gridded SST for one day; falls back up to 3 days when NRT data is late |
| `cache.py` | JSON files in `cache_data/` (override with `CAMARINE_CACHE_DIR`) |

Environment variables: `ALLOWED_ORIGINS` (comma-separated, for hosting), `CAMARINE_CACHE_DIR`.

## Map behaviour

- **Home view** = all of metropolitan France incl. Corsica (`FRANCE_BOUNDS`), recomputed on window resize until the user moves the map.
- **Limits**: users can't zoom out or pan beyond `DATA_BOUNDS`, which is also the area requested from `/api/map`. So every bit of sea on screen has a temperature (except a few pixels of rounding at the very edge).
- **Rendering**: pixels are painted into one canvas image (`useThermalLayer.ts`), ~175k pixels in about 0.5 s. One tooltip follows the cursor. Canvas rows are spaced in Mercator so pixels stay aligned with the coastline.

## Known issues (not fixed, so behaviour stays as it was)

- **Map heatwave categories use Toulon's thresholds for every pixel.** Each pixel is compared with the climatology/P90 of the single `/api/mhw` point (Toulon), not its own. Cold Atlantic/Channel water will almost never show a heatwave, and warm southern water will over-trigger. A correct map needs a per-pixel climatology/P90 grid (computed once from the 1991–2020 REP data and cached).

Things on screen that are **not** computed from data. Worth fixing or labelling before showing it to scientists:

- **Period mode map tooltips**: "Fréquence" and "Durée moy" are pseudo-random numbers seeded by the pixel's coordinates (`useThermalLayer.ts`), and the period average SST is a 40/60 blend of the pixel with the Toulon series average, not a per-pixel average.
- **Species card "SST {year}"** is a linear interpolation between two hard-coded values (`baseSst2015`, `sst2026`) scaled by today's anomaly (`SpeciesCard.tsx`).
- **Species SST in exports** falls back to a latitude-based guess when no map pixels are loaded (`lib/speciesSst.ts`).
- **Picking a date outside the loaded series** inserts a placeholder record that copies the current day's SST/threshold (`selectDate` in `useCopernicusData.ts`), so the telemetry pill shows yesterday's numbers under the new date.
- **Forum** is local only (resets on reload); "3 Observateurs en ligne" and the two seed messages are hard-coded.
- **Museum / "Fresque Murale" mode** (`useMuseumTour.ts`, `MuseumPanel.tsx`, `MuseumControls.tsx`) is unreachable: no button sets `mode = 'museum'`. Either add a tab for it or delete those three files.
- `MUSEUM_SECTIONS` references species that no longer exist (`tortue-caouanne`, `meduse-pelagia`, `morue-atlantique`); they're skipped.
- If the backend is down, the app shows empty data: there is no fallback to `public/data/copernicus_pipeline.json` (the old README said there was).
- The NASA GHRSST raster layer always shows 2023-08-15, whatever date is selected.
