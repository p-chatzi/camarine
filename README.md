# Camarine

Camarine est une application web conçue en français montrant les canicules marines autour des côtes françaises et leur impact sur les espèces marines. Toutes les données proviennent en direct de l'API Copernicus Marine (aucun fichier NetCDF n'est nécessaire pour faire tourner l'application) :

- `C3S-GLO-SST-L4-REP-OBS-SST` (1982–2024) pour la période de référence (baseline) 1991–2020,
- `METOFFICE-GLO-SST-L4-NRT-OBS-SST-V2` (2025 → aujourd'hui) pour les jours récents.

Les canicules marines sont détectées selon la définition de Hobday (90e centile, minimum de cinq jours). La résolution satellite ne permet pas de tirer des conclusions à l'échelle d'une plage, d'une ferme aquacole ou d'une lagune unique.

## Installation et lancement

Installez les dépendances JavaScript et lancez l'application (depuis la racine du dépôt) :

```sh
npm install
npm run dev          # http://localhost:5173
```

Lancez le backend dans un second terminal (au sein de votre environnement virtuel `venv`) afin que le frontend utilise les données Copernicus en direct :

```sh
python -m pip install -r backend/requirements.txt
python -m uvicorn backend.main:app --app-dir . --reload --port 8000
```

Le serveur de développement Vite redirige (proxy) `/api` vers ce backend. Le frontend interroge `/api/mhw?lat=43&lon=6&radius=0.05` et `/api/map?day=YYYY-MM-DD`.

**Nouveau sur le code ? Lisez [ARCHITECTURE.md](ARCHITECTURE.md)** — ce document détaille chaque dossier, indique quel fichier modifier pour les changements courants et liste les problèmes connus.

**D'où viennent les données et les textes ? Voir [SOURCES.md](SOURCES.md)** — Copernicus Marine, contour IGN, statuts UICN et publications citées pour chaque espèce, sources prévues (PNPC, MedECC, INPN, Ifremer).

Si la boîte à outils demande des identifiants, authentifiez-vous une fois avec `copernicusmarine login` avant de démarrer le backend. Ne mettez jamais d'identifiants dans le frontend et ne les commitez jamais dans le dépôt.

Vérifications utiles :

```sh
npm run typecheck      # vérification TypeScript stricte
npm run build          # build de production dans dist/
npm run test:data      # tests Python (Hobday + suggestions d'espèces)
npm run check:species  # chaque espèce est bien en mer (pas sur terre), points trop proches, espèces dans Pelagos
python scripts/build_pelagos.py ne_10m_land.geojson  # régénère la zone Pelagos (shapely, voir SOURCES.md)
```

## Hébergement

`npm run build` génère un site statique dans `dist/`. Il appelle `/api/...` sur sa propre origine : servez donc `dist/` et le backend FastAPI derrière le même domaine (ex. avec nginx : `/` → `dist/`, `/api` → uvicorn). Si l'API est hébergée sur un autre domaine, définissez `ALLOWED_ORIGINS=https://votre-site` pour le backend. Les identifiants Copernicus restent sur le serveur (`copernicusmarine login` ou variables d'environnement), jamais dans le frontend.

Le bouton **Mode expert** (dans l'en-tête) affiche la télémétrie brute du jour (dans la pop-up de date), les identifiants de produits et les sources de données, ainsi que le **catalogue des espèces** (menu à droite : faune / flore, recherche par nom, statut UICN, formulaire « Une espèce manque ? ») et les espèces réservées aux experts sur la carte. Il est toujours désactivé au chargement de la page ; la carte s'ouvre en « Mode Impact Biologique ». Les suggestions sont enregistrées côté serveur dans `suggestions_data/suggestions.jsonl` (ignoré par git, sans donnée personnelle). Le guide audiovisuel (voix off, ambiance sonore, visite guidée), les kits pédagogiques, les quiz, les sessions de classe et le déploiement en mode kiosque restent des travaux prévus sur la feuille de route ultérieure.

## Pipeline Copernicus Marine

Le pipeline utilise l'API officielle `read_dataframe` de Copernicus Marine et combine deux produits : `C3S-GLO-SST-L4-REP-OBS-SST` (1982–2024) pour la période de référence 1991–2020, et `METOFFICE-GLO-SST-L4-NRT-OBS-SST-V2` (2025–présent) pour la suite actuelle. Il calcule ensuite la moyenne spatiale sur une petite boîte autour du lieu sélectionné et détecte les événements avec la définition de Hobday : 90e centile, période de référence 1991–2020 et durée minimale de cinq jours. Configurez vos identifiants Copernicus via le login de la boîte à outils ou par variables d'environnement, puis lancez :

```sh
python copernicus_pipeline.py --lat 43.0 --lon 6.0
```

Cela génère le fichier `public/data/copernicus_pipeline.json` contenant les deux produits sources, les paramètres de la méthode, les relevés quotidiens et les événements détectés (utile comme jeu de données de test). L'emplacement par défaut est Toulon ; utilisez `--lat`, `--lon` et `--radius` pour sélectionner une autre zone d'extraction.

## Provenance

Camarine est un fork de [maelritouet/OCEAN-HACKATON](https://github.com/maelritouet/OCEAN-HACKATON), le projet d'équipe de l'Ocean Hackathon (Toulon, octobre 2026). L'historique de ce dépôt repart d'un commit racine (« Refacto », 21/10/2026) : git ne peut donc pas relier automatiquement les deux historiques. Version d'origine la plus probable : branche `main` du dépôt d'équipe au commit `c397b58` (dernier push le 18/10/2026, avant la refonte).

Pour retrouver cette version en local :

```sh
git remote add upstream https://github.com/maelritouet/OCEAN-HACKATON
git fetch upstream
git log upstream/main      # c397b58 = état au moment du fork
```
