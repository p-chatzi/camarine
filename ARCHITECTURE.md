# Camarine — Organisation du code

Lisez ceci avant votre première modification. Chaque fichier a un seul rôle, et le premier commentaire de chaque fichier indique quel est ce rôle.

## Flux de données (une phrase par étape)

1. **Copernicus Marine** → `copernicus_pipeline.py` télécharge la SST quotidienne (REP 1982–2024 + NRT 2025→aujourd'hui) et `hobday.py` détecte les canicules marines (P90, période de référence 1991–2020, ≥ 5 jours).
2. **FastAPI** (`backend/`) expose ces données via `GET /api/mhw` (série temporelle locale + événements) et `GET /api/map` (pixels SST sur la France pour un jour donné), mis en cache sur le disque dans `cache_data/`.
3. **Frontend** (`src/api/copernicus.ts`) récupère les deux ; les hooks dans `src/hooks/` gèrent l'état ; les composants dans `src/components/` se contentent de l'afficher.

```
Copernicus ─► copernicus_pipeline.py + hobday.py ─► backend/*_service.py ─► backend/main.py (routes)
                                                                                   │  /api/mhw, /api/map
                                                                                   ▼
                          src/api/copernicus.ts ─► src/hooks/* ─► src/App.tsx ─► src/components/<onglet>/*
```

## Frontend (`src/`)

| Dossier                  | Ce qu'il contient                                                                                       | Règle                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `types.ts`               | Toutes les structures de données partagées entre fichiers (`SpeciesItem`, `Pipeline`, `MapCell`…)       | Ajoutez un type ici si deux fichiers en ont besoin                     |
| `config.ts`              | Constantes : coordonnées de Toulon, boîte englobante de la France, années de référence, URLs des tuiles | Aucun nombre magique dans les composants                               |
| `data/`                  | Contenu statique : espèces, photos, chapitres du musée, métadonnées des sources                         | Données brutes uniquement, aucune logique                              |
| `lib/`                   | Fonctions pures : catégories Hobday, couleurs, dates, export CSV/JSON, synthé audio                     | Pas de React, facile à tester unitairement                             |
| `api/`                   | Le seul endroit qui appelle `fetch`                                                                     |                                                                        |
| `hooks/`                 | État + effets de bord, une seule responsabilité par hook                                                | Les composants ne font pas de `fetch` et ne gardent pas d'état partagé |
| `components/layout/`     | En-tête (Header), barre inférieure (BottomBar), écran de chargement                                     |                                                                        |
| `components/map/`        | Carte Leaflet ; un hook par couche (`useThermalLayer`, `useSpeciesMarkers`, …)                          |                                                                        |
| `components/visualiser/` | Onglet 1 : filtres, pilule de télémétrie, légende, fiche espèce                                         |                                                                        |
| `components/comprendre/` | Onglet 2 : KPIs, explicatif Hobday, strip plot, graphique quotidien, tableau des événements             |                                                                        |
| `components/partager/`   | Onglet 3 : panneau d'export, modale d'aperçu, forum                                                     |                                                                        |
| `App.tsx`                | Détient l'état partagé entre les onglets, choisit quel onglet afficher                                  | Gardez-le court : connectez les éléments, n'implémentez pas de logique |

### Où dois-je aller pour modifier…

| Je veux…                                                      | Fichier à modifier                                                                                                                                                                                  |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ajouter / modifier une espèce                                 | `src/data/species.ts` (+ photos dans `src/data/speciesImages.ts`)                                                                                                                                   |
| Changer les couleurs ou les seuils des catégories de canicule | `src/lib/hobday.ts`                                                                                                                                                                                 |
| Changer l'échelle de couleurs de la SST                       | `src/lib/colors.ts`                                                                                                                                                                                 |
| Changer le contenu de l'export CSV/JSON                       | `src/lib/export.ts`                                                                                                                                                                                 |
| Changer le lieu surveillé (Toulon)                            | `src/config.ts` → `PIPELINE_LOCATION`                                                                                                                                                               |
| Ajouter un filtre à la carte                                  | `src/hooks/useMapSettings.ts` (état) + `src/components/visualiser/FilterPanel.tsx` (UI)                                                                                                             |
| Afficher / masquer un élément uniquement pour les experts     | L'englober dans `settings.expert && …` (état dans `src/hooks/useMapSettings.ts`)                                                                                                                    |
| Changer la vue par défaut / la limite de dézoom               | `FRANCE_BOUNDS` (vue d'accueil) et `DATA_BOUNDS` (zone téléchargée = limite de déplacement/zoom) dans `src/config.ts` ; logique dans `lockToData` / `goHome`, `src/components/map/useLeafletMap.ts` |
| Changer les infobulles (tooltips) des pixels sur la carte     | `src/components/map/thermalPopups.ts`                                                                                                                                                               |
| Ajouter un nouvel onglet                                      | `AppMode` dans `types.ts`, un bouton dans `layout/Header.tsx`, un `components/<onglet>/<Onglet>View.tsx`, une ligne dans `App.tsx`                                                                  |
| Ajouter un endpoint API                                       | `backend/<nom>_service.py` (logique) + une route dans `backend/main.py`, puis une fonction dans `src/api/copernicus.ts`                                                                             |

### Répartition du travail en équipe

Les dossiers correspondent aux fonctionnalités, ce qui permet de travailler en parallèle avec très peu de conflits de fusion (merge conflicts) : une personne par dossier d'onglet (`visualiser/`, `comprendre/`, `partager/`), une sur `components/map/`, une sur `backend/` + le pipeline Python. Fichiers partagés nécessitant de la coordination : `types.ts`, `App.tsx`, `hooks/useCopernicusData.ts`.

## Backend (`backend/`)

| Fichier          | Rôle                                                                                                     |
| ---------------- | -------------------------------------------------------------------------------------------------------- |
| `main.py`        | Routes uniquement (`/api/health`, `/api/mhw`, `/api/map`) et configuration CORS                          |
| `mhw_service.py` | Série temporelle locale + événements Hobday                                                              |
| `map_service.py` | Grille SST pour un jour donné ; recule jusqu'à 3 jours en arrière lorsque les données NRT sont en retard |
| `cache.py`       | Fichiers JSON dans `cache_data/` (modifiable via `CAMARINE_CACHE_DIR`)                                   |

Variables d'environnement : `ALLOWED_ORIGINS` (séparées par des virgules, pour l'hébergement), `CAMARINE_CACHE_DIR`.

## Comportement de la carte

- **Vue d'accueil** = toute la France métropolitaine, Corse comprise (`FRANCE_BOUNDS`), recalculée lors du redimensionnement de la fenêtre tant que l'utilisateur n'a pas déplacé la carte.
- **Limites** : les utilisateurs ne peuvent pas dézoomer ou se déplacer au-delà de `DATA_BOUNDS`, qui correspond également à la zone demandée à `/api/map`. Ainsi, chaque portion de mer visible à l'écran possède une température (à l'exception de quelques pixels d'arrondi sur l'extrême bordure).
- **Rendu** : les pixels sont peints dans une seule image canvas (`useThermalLayer.ts`), soit ~175 000 pixels en environ 0,5 s. Une infobulle unique suit le curseur. Les lignes du canvas sont espacées selon la projection de Mercator afin que les pixels restent alignés avec le trait de côte.

## Problèmes connus (non corrigés pour conserver le comportement actuel)

- **Les catégories de canicule sur la carte utilisent les seuils de Toulon pour chaque pixel.** Chaque pixel est comparé à la climatologie / P90 du point unique `/api/mhw` (Toulon), et non aux siens. Les eaux plus froides de l'Atlantique et de la Manche n'afficheront presque jamais de canicule, tandis que les eaux chaudes du sud sur-déclencheront. Une carte exacte nécessite une grille de climatologie / P90 calculée par pixel (calculée une fois à partir des données REP 1991–2020 et mise en cache).

Éléments affichés à l'écran qui **ne sont pas** calculés à partir des données réelles (à corriger ou à étiqueter clairement avant toute présentation à des scientifiques) :

- **Infobulles de la carte en mode Période** : « Fréquence » et « Durée moy » sont des nombres pseudo-aléatoires générés (seedés) à partir des coordonnées du pixel (`useThermalLayer.ts`), et la SST moyenne sur la période est un mélange 40/60 entre le pixel et la moyenne de la série de Toulon, et non une vraie moyenne par pixel.
- **« SST {année} » sur les fiches espèces** : il s'agit d'une interpolation linéaire entre deux valeurs codées en dur (`baseSst2015`, `sst2026`) modulée par l'anomalie du jour (`SpeciesCard.tsx`).
- **SST des espèces dans les exports** : se rabat sur une estimation basée sur la latitude lorsqu'aucun pixel de carte n'est chargé (`lib/speciesSst.ts`).
- **Sélectionner une date en dehors de la série chargée** insère un enregistrement temporaire qui copie la SST et le seuil du jour actuel (`selectDate` dans `useCopernicusData.ts`), de sorte que la pilule de télémétrie affiche les chiffres de la veille sous la nouvelle date.
- **Le Forum** est uniquement local (réinitialisé au rechargement de la page) ; « 3 Observateurs en ligne » et les deux messages initiaux sont codés en dur.
- **Le mode Musée / « Fresque Murale »** (`useMuseumTour.ts`, `MuseumPanel.tsx`, `MuseumControls.tsx`) est inaccessible : aucun bouton n'active `mode = 'museum'`. Il faut soit ajouter un onglet pour ce mode, soit supprimer ces trois fichiers.
- `MUSEUM_SECTIONS` fait référence à des espèces qui n'existent plus (`tortue-caouanne`, `meduse-pelagia`, `morue-atlantique`) ; elles sont ignorées.
- Si le backend est arrêté, l'application affiche des données vides : il n'y a pas de repli (fallback) automatique vers `public/data/copernicus_pipeline.json` (contrairement à ce qu'indiquait l'ancien README).
- La couche raster satellite NASA GHRSST affiche toujours la date du `2023-08-15`, quelle que soit la date sélectionnée.
