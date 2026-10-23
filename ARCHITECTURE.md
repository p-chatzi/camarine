# Camarine — Organisation du code

Lisez ceci avant votre première modification. Chaque fichier a un seul rôle, et le premier commentaire de chaque fichier indique quel est ce rôle.

## Flux de données (une phrase par étape)

1. **Copernicus Marine** → `copernicus_pipeline.py` télécharge la SST quotidienne (REP 1982–2024 + NRT 2025→aujourd'hui) et `hobday.py` détecte les canicules marines (P90, période de référence 1991–2020, ≥ 5 jours).
2. **FastAPI** (`backend/`) expose ces données via `GET /api/mhw` (série temporelle locale + événements) et `GET /api/map` (pixels SST sur la France pour un jour donné), mis en cache sur le disque dans `cache_data/`. Il reçoit aussi les suggestions d'espèces (`POST /api/suggestions`).
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
| `data/`                  | Contenu statique : espèces (avec statut UICN, rôle, zone, sources), photos, métadonnées des sources | Données brutes uniquement, aucune logique ; chaque affirmation sourcée (voir [SOURCES.md](SOURCES.md)) |
| `lib/`                   | Fonctions pures : catégories Hobday, couleurs, dates, export CSV/JSON, filtres/recherche d'espèces (`species.ts`) | Pas de React, facile à tester unitairement                             |
| `api/`                   | Le seul endroit qui appelle `fetch` : backend Copernicus (`copernicus.ts`), suggestions (`suggestions.ts`), contour de la France (`geo.ts`), photos Wikimedia (`wikimedia.ts`) |                                                                        |
| `hooks/`                 | État + effets de bord, une seule responsabilité par hook                                                | Les composants ne font pas de `fetch` et ne gardent pas d'état partagé |
| `components/layout/`     | En-tête flottant (Header), puce de date + pop-up (`DateControl` : jour, période, télémétrie expert `Telemetry`), écran de chargement |                                                                        |
| `components/map/`        | Carte Leaflet ; un hook par couche (`useThermalLayer`, `useSpeciesMarkers`, …)                          |                                                                        |
| `components/visualiser/` | Onglet 1 : filtres, légende, fiche espèce, encart Pelagos, catalogue expert (`SpeciesCatalog`) + formulaire de suggestion |
| `components/ui/`         | `Popover` : le seul composant de menu / pop-up (panneau bas sur téléphone, menu déroulant ailleurs ; focus, Échap, clic extérieur) |                                                                        |
| `components/comprendre/` | Onglet 2 : période d'analyse, KPIs, explicatif Hobday, historique des canicules (vues « Par année » `HeatwaveYearBars` et « Calendrier »), graphique quotidien, tableau |                                                                        |
| `components/partager/`   | Onglet 3 : panneau d'export, modale d'aperçu, forum                                                     |                                                                        |
| `App.tsx`                | Détient l'état partagé entre les onglets, choisit quel onglet afficher                                  | Gardez-le court : connectez les éléments, n'implémentez pas de logique |

### Où dois-je aller pour modifier…

| Je veux…                                                      | Fichier à modifier                                                                                                                                                                                  |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ajouter / modifier une espèce                                 | `src/data/species.ts` (+ photos facultatives dans `src/data/speciesImages.ts`, sinon image Wikipédia automatique), puis `npm run check:species` et le tableau de [SOURCES.md](SOURCES.md) |
| Rendre une espèce visible hors mode expert                    | `audience: 'public'` dans `src/data/species.ts` (`'expert'` = catalogue et carte du mode expert seulement)                                                                                          |
| Changer le contour de la France                               | `public/geo/france-metropole.geojson` (procédure dans [SOURCES.md](SOURCES.md) §1.2) ; style dans `src/components/map/useFranceOutline.ts`                                                          |
| Changer les couleurs ou les seuils des catégories de canicule | `src/lib/hobday.ts`                                                                                                                                                                                 |
| Changer l'échelle de couleurs de la SST                       | `src/lib/colors.ts`                                                                                                                                                                                 |
| Changer le contenu de l'export CSV/JSON                       | `src/lib/export.ts`                                                                                                                                                                                 |
| Changer le lieu surveillé (Toulon)                            | `src/config.ts` → `PIPELINE_LOCATION`                                                                                                                                                               |
| Ajouter un filtre à la carte                                  | `src/hooks/useMapSettings.ts` (état) + `src/components/visualiser/FilterPanel.tsx` (UI)                                                                                                             |
| Afficher / masquer un élément uniquement pour les experts     | L'englober dans `settings.expert && …` (état dans `src/hooks/useMapSettings.ts`)                                                                                                                    |
| Changer la vue par défaut / la limite de dézoom               | `FRANCE_BOUNDS` (vue d'accueil = dézoom maximal) et `DATA_BOUNDS` (zone de déplacement = zone téléchargée) dans `src/config.ts` ; logique dans `minZoomFor` / `lockToData` / `goHome`, `src/components/map/useLeafletMap.ts` |
| Changer les infobulles (tooltips) des pixels sur la carte     | `src/components/map/thermalPopups.ts`                                                                                                                                                               |
| Ajouter un nouvel onglet                                      | `AppMode` dans `types.ts`, un bouton dans `layout/Header.tsx`, un `components/<onglet>/<Onglet>View.tsx`, une ligne dans `App.tsx`                                                                  |
| Ajouter un endpoint API                                       | `backend/<nom>_service.py` (logique) + une route dans `backend/main.py`, puis une fonction dans `src/api/copernicus.ts`                                                                             |

### Répartition du travail en équipe

Les dossiers correspondent aux fonctionnalités, ce qui permet de travailler en parallèle avec très peu de conflits de fusion (merge conflicts) : une personne par dossier d'onglet (`visualiser/`, `comprendre/`, `partager/`), une sur `components/map/`, une sur `backend/` + le pipeline Python. Fichiers partagés nécessitant de la coordination : `types.ts`, `App.tsx`, `hooks/useCopernicusData.ts`.

## Backend (`backend/`)

| Fichier          | Rôle                                                                                                     |
| ---------------- | -------------------------------------------------------------------------------------------------------- |
| `main.py`        | Routes uniquement (`/api/health`, `/api/mhw`, `/api/map`, `POST /api/suggestions`) et configuration CORS |
| `mhw_service.py` | Série temporelle locale + événements Hobday                                                              |
| `suggestion_service.py` | Suggestions d'espèces : nettoyage du texte, limite anti-flood (5 / 10 min par client, en mémoire), ajout en JSON Lines dans `suggestions_data/` ; aucune IP ni donnée personnelle stockée |
| `map_service.py` | Grille SST pour un jour donné ; recule jusqu'à 3 jours en arrière lorsque les données NRT sont en retard |
| `cache.py`       | Fichiers JSON dans `cache_data/` (modifiable via `CAMARINE_CACHE_DIR`)                                   |

Variables d'environnement : `ALLOWED_ORIGINS` (séparées par des virgules, pour l'hébergement), `CAMARINE_CACHE_DIR`, `CAMARINE_SUGGESTIONS_FILE` (défaut `suggestions_data/suggestions.jsonl`).

Derrière un reverse proxy (nginx), lancez uvicorn avec `--proxy-headers --forwarded-allow-ips=<IP du proxy>` : sinon tous les visiteurs ont l'IP du proxy et partagent la même limite anti-flood des suggestions.

## Comportement de la carte

- **Vue d'accueil** = toute la France métropolitaine, Corse comprise (`FRANCE_BOUNDS`), recalculée lors du redimensionnement de la fenêtre tant que l'utilisateur n'a pas déplacé la carte.
- **Limites** : le dézoom maximal **est** la vue d'accueil (la France entière reste le sujet). Une fois zoomé, on peut se déplacer dans `DATA_BOUNDS` (zone demandée à `/api/map`) : chaque portion de mer visible possède une température, sauf sur un écran de téléphone très étroit, où la France entière a la priorité.
- **Contour** : France métropolitaine + Corse (`useFranceOutline.ts`), dans un calque entre les pixels SST et les épingles.
- **Sélection d'une espèce** : zoom 7,5 minimum, espèce centrée à gauche de sa fiche ; sa zone de prédilection est décrite en texte dans la fiche (pas de calque).
- **Épingles d'espèces** : 9 espèces « grand public » visibles dans tous les modes, toutes les espèces en mode expert. Au-delà de 12 épingles (mode expert), les étiquettes ne s'affichent qu'au survol en dessous du zoom 8,5.
- **Rendu** : les pixels sont peints dans une seule image canvas (`useThermalLayer.ts`), soit ~175 000 pixels en environ 0,5 s. Une infobulle unique suit le curseur. Les lignes du canvas sont espacées selon la projection de Mercator afin que les pixels restent alignés avec le trait de côte.

## Sanctuaire Pelagos

- Filtre « 🐋 Sanctuaire Pelagos » dans « Façades » (`BasinFilter` = bassins + `MarineZone`).
- Géométrie : `public/geo/pelagos.geojson`, construite par `scripts/build_pelagos.py` (voir [SOURCES.md](SOURCES.md) §1.3) ; chargée par `hooks/useMarineZone.ts`, dessinée par `components/map/useZoneHighlight.ts` (remplissage + bordure en tirets, entre les pixels SST et le contour France).
- Espèces de la zone : test point-dans-polygone (`lib/geo.ts` → `matchesFacade` dans `lib/species.ts`). `npm run check:species` liste aussi ces espèces.
- Encart d'information : `components/visualiser/PelagosCard.tsx` (repliable ; replié par défaut sur téléphone ; sous 1024 px la fiche espèce plein écran le recouvre). Faits et sources : `PELAGOS_INFO` dans `config.ts`.
- Ajouter une autre zone protégée : une entrée dans `MARINE_ZONES` (`config.ts`), le type `MarineZone`, un fichier GeoJSON et un bouton dans `FilterPanel.tsx`.

## Responsive, clavier et tactile

Principe : **la carte est le seul fond** de l'onglet Visualiser (100 % de la hauteur, sans bandeau ni pied de page) ; toutes les commandes sont des « puces » flottantes de 44 px (`CHIP` dans `layout/Header.tsx`) et tous les menus passent par `components/ui/Popover.tsx`.

Vérifié par script (Playwright) sur 320×568, 360×740, 390×844, 844×390 (téléphone couché), 768×1024 (tactile) et 1024×768 (vidéoprojecteur), 1280×720, 1440×900, 1920×1080, 2560×1440 (souris), dans 6 états (accueil, mode expert, chaque pop-up, fiche ouverte, Comprendre) : aucun débordement horizontal, aucun chevauchement entre puces, cibles ≥ 44 px au doigt et ≥ 24 px à la souris (hors liens dans le texte, exemptés par WCAG 2.5.8).

- **Disposition (Visualiser)** : ligne 1 = logo + sections + mode expert ; ligne 2 = « Façades » (+ « Vue France entière ») à gauche, catalogue (expert) à droite ; en bas à gauche = date + légende, au-dessus des crédits de la carte. `TOP_CONTROLS_PX` (config.ts) = hauteur de ces deux lignes : la caméra garde espèces et zones en dessous.
- **Sections** : sous 768 px, les 3 sections sont repliées dans un bouton « Section ▾ » (menu avec une phrase de description par section) ; au-dessus, onglets dans l'en-tête. Logo + nom + « Sentinelle des Canicules Marines » à partir de 1024 px (dans le menu en dessous).
- **Pop-ups** (`Popover`) : panneau bas (« bottom sheet ») sous 640 px, à portée de pouce ; menu déroulant accroché à son bouton au-dessus, dimensionné à la fenêtre. Un seul ouvert à la fois. Rendu dans `<body>` (portail) pour ne jamais être rogné.
- **Date** (`layout/DateControl.tsx`) : une puce « 31 déc. 2024 » (+ anomalie du jour en mode expert, roue de chargement pendant le téléchargement des pixels) ; la pop-up choisit « Un jour » (◀ ▶ jour par jour) ou « Moyenne période », et affiche la télémétrie en mode expert. Dans Comprendre, puce « période d'analyse » en haut de page. (Remplace l'ancienne barre du bas.)
- **Fiche espèce** : plein écran sous 1024 px (photos et texte en grand, au-dessus de l'en-tête) ; au-dessus, panneau à droite de `min(42rem, 46vw)` (`SPECIES_CARD` dans config.ts), l'espèce reste visible à gauche.
- **Comprendre** : « Canicules marines sur toute la série temporelle » en deux vues : **Par année** (jours de canicule par an, coloriés par catégorie, une année se déplie en épisodes ; vue par défaut sur téléphone) et **Calendrier** (rubans par jour de l'année ; défaut au-dessus de 640 px). Graphique quotidien : graduation tous les 2 mois et légende sous le graphique sur téléphone. Indicateurs en 2 colonnes.
- **Grands écrans et vidéoprojecteurs** : taille de base du texte ×1,125 à partir de 1920×1000 et ×1,25 à partir de 2560×1300 (toute l'interface est en `rem`).
- **Tactile** : classe `tap` (index.css) = 44×44 px minimum quand `pointer: coarse` ; `hit-44` = zone de clic de 44 px autour d'un bouton visuellement plus petit (onglets de l'en-tête) ; boutons +/− masqués sur téléphone tenu en portrait (pincer pour zoomer) ; un toucher sur la mer affiche la valeur du pixel 4 s ; légendes et crédits des photos toujours visibles (pas de survol).
- **Clavier** : ordre de tabulation = en-tête → Façades / Pelagos → catalogue → date / légende → carte (épingles, zoom) → fiche ; anneau de focus unique (`:focus-visible`, index.css) ; à l'ouverture d'une pop-up le focus va sur le choix actif, Tab reste dans la pop-up, Échap la ferme et rend le focus au bouton ; Entrée/Espace sur une épingle ouvre sa fiche, le focus entre dans la fiche et revient à l'épingle à la fermeture (Échap) ; rubans du calendrier et années de la vue « Par année » atteignables au clavier ; tableau des événements triable au clavier (`aria-sort`).
- **Non vérifié** : vrais appareils (Safari iOS, Firefox, Android), lecteurs d'écran.

## Retiré le 22/10/2026 (à reprendre plus tard)

- **Guide audiovisuel** : voix off, ambiance sonore sous-marine, bouton « Audio » des fiches et mode Musée / « Fresque murale » (`useAudio.ts`, `underwaterAudio.ts`, `useMuseumTour.ts`, `MuseumPanel.tsx`, `MuseumControls.tsx`, `museumSections.ts`). Le code reste dans l'historique git ; les textes de narration sont conservés dans `narrationText` (`src/data/species.ts`).
- **Fond OpenStreetMap** : un seul fond de carte, Esri World Ocean Base (`BASE_TILE_URL` dans `src/config.ts`).

## Entrées utilisateur (formulaire de suggestion)

Le formulaire est public : tout ce qu'il envoie est traité comme hostile. Le navigateur nettoie le texte pour donner un retour immédiat (`src/api/suggestions.ts`), mais **la frontière de sécurité est le backend** (`backend/suggestion_service.py`, `backend/main.py`) :

- corps HTTP : `Content-Length` obligatoire, 8 Ko maximum, `Content-Type: application/json` obligatoire (411 / 413 / 415) ;
- schéma strict : chaînes uniquement (pas de conversion de type), champs inconnus refusés (422) ;
- texte : normalisation NFC, suppression de tous les caractères Unicode de catégorie C (contrôle, bidi type « Trojan Source », largeur nulle…), 30 lignes maximum, longueurs plafonnées après nettoyage, nom d'espèce avec au moins une lettre ;
- `= + - @` en début de champ préfixés d'une apostrophe (injection de formules si le fichier est ouvert dans un tableur) ;
- stockage : une ligne JSON par suggestion (pas d'injection de ligne), fichier en 0600, 5 Mo maximum (503 ensuite), aucune IP stockée ;
- anti-flood : 5 suggestions / 10 min par client, mémoire bornée (10 000 clients suivis) ;
- affichage : le texte n'est jamais injecté comme HTML (React échappe ; les étiquettes Leaflet passent par `escapeHtml`).

## Problèmes connus (non corrigés pour conserver le comportement actuel)

- **Les catégories de canicule sur la carte utilisent les seuils de Toulon pour chaque pixel.** Chaque pixel est comparé à la climatologie / P90 du point unique `/api/mhw` (Toulon), et non aux siens. Les eaux plus froides de l'Atlantique et de la Manche n'afficheront presque jamais de canicule, tandis que les eaux chaudes du sud sur-déclencheront. Une carte exacte nécessite une grille de climatologie / P90 calculée par pixel (calculée une fois à partir des données REP 1991–2020 et mise en cache).

Éléments affichés à l'écran qui **ne sont pas** calculés à partir des données réelles (à corriger ou à étiqueter clairement avant toute présentation à des scientifiques) :

- **Infobulles de la carte en mode Période** : « Fréquence » et « Durée moy » sont des nombres pseudo-aléatoires générés (seedés) à partir des coordonnées du pixel (`useThermalLayer.ts`), et la SST moyenne sur la période est un mélange 40/60 entre le pixel et la moyenne de la série de Toulon, et non une vraie moyenne par pixel.
- **« SST {année} » sur les fiches espèces** : il s'agit d'une interpolation linéaire entre deux valeurs codées en dur (`baseSst2015`, `sst2026`) modulée par l'anomalie du jour (`SpeciesCard.tsx`). Seules les 9 espèces historiques ont ces valeurs ; le badge est masqué pour les autres.
- **Textes des fiches espèces** : brouillon indicatif (bandeau « Placeholder »). Plusieurs textes hérités du hackathon contiennent des chiffres non sourcés (ex. pertes de moules à Saint-Brieuc, canicule de mai 2026 pour le bulot) : à vérifier, voir [SOURCES.md](SOURCES.md) §1.5.
- **SST des espèces dans les exports** : se rabat sur une estimation basée sur la latitude lorsqu'aucun pixel de carte n'est chargé (`lib/speciesSst.ts`).
- **Sélectionner une date en dehors de la série chargée** insère un enregistrement temporaire qui copie la SST et le seuil du jour actuel (`selectDate` dans `useCopernicusData.ts`), de sorte que la pilule de télémétrie affiche les chiffres de la veille sous la nouvelle date.
- **Le Forum** est uniquement local (réinitialisé au rechargement de la page) ; « 3 Observateurs en ligne » et les deux messages initiaux sont codés en dur.
- Si le backend est arrêté, l'application affiche des données vides : il n'y a pas de repli (fallback) automatique vers `public/data/copernicus_pipeline.json` (contrairement à ce qu'indiquait l'ancien README).
- La couche raster satellite NASA GHRSST affiche toujours la date du `2023-08-15`, quelle que soit la date sélectionnée.
