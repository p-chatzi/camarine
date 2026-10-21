# Camarine

Camarine is a French-first web app showing marine heatwaves around the French
coast and their impact on marine species. All data comes live from the
Copernicus Marine API (no NetCDF files are needed to run the app):

- `C3S-GLO-SST-L4-REP-OBS-SST` (1982–2024) for the 1991–2020 baseline,
- `METOFFICE-GLO-SST-L4-NRT-OBS-SST-V2` (2025 → today) for recent days.

Heatwaves are detected with the Hobday definition (90th percentile, five-day
minimum). Satellite resolution does not support claims about a single beach,
farm or lagoon.

## Setup

Install the JavaScript dependencies and run the app (from the repo root):

```sh
npm install
npm run dev          # http://localhost:5173
```

Run the backend in a second terminal (inside your venv) so the front uses live Copernicus data:

```sh
python -m pip install -r backend/requirements.txt
python -m uvicorn backend.main:app --app-dir . --reload --port 8000
```

The Vite development server proxies `/api` to this backend. The frontend
requests `/api/mhw?lat=43&lon=6&radius=0.05` and `/api/map?day=YYYY-MM-DD`.

**New to the code? Read [ARCHITECTURE.md](ARCHITECTURE.md)** — it maps every
folder, says which file to edit for common changes, and lists known issues.

If the toolbox asks for credentials, authenticate once with
`copernicusmarine login` before starting the backend. Never put credentials in
the frontend or commit them to the repository.

Useful checks:

```sh
npm run typecheck   # strict TypeScript
npm run build       # production bundle in dist/
npm run test:data   # Python tests (pipeline + Hobday)
```

## Hosting

`npm run build` produces a static site in `dist/`. It calls `/api/...` on its
own origin, so serve `dist/` and the FastAPI backend behind the same domain
(e.g. nginx: `/` → `dist/`, `/api` → uvicorn). If the API lives on another
domain, set `ALLOWED_ORIGINS=https://your-site` for the backend. Copernicus
credentials stay on the server (`copernicusmarine login` or environment
variables), never in the frontend.

The **Mode expert** button (header) shows the raw telemetry bar, product ids
and data sources; it is off by default and remembered per browser.
Educational lesson kits, quizzes, classroom sessions, and kiosk deployment
remain deferred roadmap work.

## Copernicus Marine pipeline

The pipeline uses the official Copernicus Marine `read_dataframe` API and
combines two products: `C3S-GLO-SST-L4-REP-OBS-SST` (1982-2024) for the
1991-2020 baseline, and `METOFFICE-GLO-SST-L4-NRT-OBS-SST-V2` (2025-present)
for the current continuation. It then spatially averages a small box around
the selected location and detects events with the Hobday definition: 90th
percentile, 1991-2020 baseline, and a five-day minimum. Configure Copernicus
credentials with its toolbox login or environment variables, then run:

```sh
python copernicus_pipeline.py --lat 43.0 --lon 6.0
```

This writes `public/data/copernicus_pipeline.json` with both source products,
method settings, daily records, and detected events (useful as a test fixture). The default location is
Toulon; use `--lat`, `--lon`, and `--radius` to select another extraction box.