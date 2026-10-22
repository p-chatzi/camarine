# Camarine — Sources

Ce document indique d'où viennent les données et les textes affichés par Camarine. Il distingue ce qui est **déjà utilisé** de ce qui est **prévu** mais pas encore intégré. Règle du projet : une information affichée doit pouvoir être reliée à une source listée ici ou dans la fiche de l'espèce.

---

## 1. Sources utilisées aujourd'hui

### 1.1 Copernicus Marine Service : températures de surface de la mer (SST)

**Qui ?** Le *Copernicus Marine Service* (CMEMS) est le service océanographique de Copernicus, le programme d'observation de la Terre de l'Union européenne. Il est mis en œuvre par Mercator Ocean International pour le compte de la Commission européenne. Il diffuse gratuitement des données d'observation (satellites, bouées) et de modélisation sur tous les océans.

**Quelles données ?** Deux produits de température de surface (SST), dits « L4 » : grilles complètes, quotidiennes, sans trous, d'une résolution de 0,05° (environ 5 km).

| Rôle dans Camarine | Jeu de données | Période | Origine |
| --- | --- | --- | --- |
| Série historique et climatologie de référence | `C3S-GLO-SST-L4-REP-OBS-SST` (produit `SST_GLO_SST_L4_REP_OBSERVATIONS_010_024`) | 1982 → 2024 | Retraitement climatique du *Copernicus Climate Change Service* (C3S), séries homogènes |
| Jours récents | `METOFFICE-GLO-SST-L4-NRT-OBS-SST-V2` | 2025 → aujourd'hui | Analyse quasi temps réel du Met Office (OSTIA) |

**Pourquoi ces données ?**
- Elles sont **ouvertes, gratuites et officielles** : n'importe qui peut refaire nos calculs.
- La **série longue** (plus de 40 ans) permet de calculer une climatologie sur la normale OMM **1991–2020**, indispensable pour savoir ce qui est anormal.
- Elles sont **quotidiennes**. La définition scientifique d'une canicule marine (Hobday) repose sur des jours consécutifs.
- Elles couvrent **toutes les façades** (Manche, Atlantique, Méditerranée, Corse) avec la même méthode, ce qui permet de les comparer.

**Comment on les utilise ?**
1. `copernicus_pipeline.py` télécharge la SST quotidienne via l'API officielle `copernicusmarine` (`read_dataframe`). Les identifiants restent sur le serveur, jamais dans le navigateur.
2. `hobday.py` calcule, pour chaque jour de l'année, la climatologie et le **90ᵉ centile** sur 1991–2020. Une **canicule marine** correspond à au moins **5 jours consécutifs** au-dessus de ce seuil (Hobday et al., 2016). L'intensité est classée en catégories (Hobday et al., 2018).
3. Le backend FastAPI expose deux routes, avec un cache disque :
   - `GET /api/mhw` : série temporelle et canicules détectées autour d'**un point** (aujourd'hui Toulon, 43° N / 6° E) ;
   - `GET /api/map` : grille de SST sur la France pour **un jour** donné.
4. Le site affiche la grille sur la carte, les graphiques (onglet « Comprendre ») et les exports CSV/JSON (onglet « Partager »).

**Références de méthode**
- Hobday, A. J. et al. (2016). *A hierarchical approach to defining marine heatwaves.* Progress in Oceanography, 141, 227–238. <https://doi.org/10.1016/j.pocean.2015.12.014>
- Hobday, A. J. et al. (2018). *Categorizing and naming marine heatwaves.* Oceanography, 31(2). <https://doi.org/10.5670/oceanog.2018.205>
- Portail des données : <https://data.marine.copernicus.eu>

**Limites connues (à corriger avant un usage scientifique, détail dans [ARCHITECTURE.md](ARCHITECTURE.md))**
- **Seuils de Toulon appliqués partout.** Sur la carte, chaque pixel est comparé à la climatologie et au P90 **de Toulon**, pas aux siens. Résultat : les eaux plus froides de l'Atlantique et de la Manche ne déclenchent presque jamais de canicule, et la Méditerranée en déclenche trop. C'est pour cette raison que les canicules semblent aujourd'hui presque exclusivement méditerranéennes sur la carte. En réalité, une canicule marine se définit par rapport à la climatologie **locale**, et les trois façades en connaissent. En juin 2026, par exemple, Météo-France a relevé des anomalies d'environ +6 °C dans le golfe de Gascogne et de +3,5 °C en Manche ([L'Info Durable / AFP, 26/06/2026](https://www.linfodurable.fr/toutes-les-eaux-littorales-hexagonales-frappees-par-des-canicules-marines-chercheur-57539)). La correction consiste à calculer une grille de climatologie et de P90 **par pixel**, une seule fois à partir des données 1991–2020, puis à la mettre en cache.
- **Résolution de 5 km** : pas de conclusion possible à l'échelle d'une plage, d'une crique ou d'une lagune.

### 1.2 Contour de la France

- **Source :** IGN, *Admin Express COG* (édition 2018), via le dépôt public [gregoiredavid/france-geojson](https://github.com/gregoiredavid/france-geojson) (fichier `metropole.geojson`).
- **Licence :** Licence Ouverte / Etalab 2.0 (attribution « IGN » affichée sur la carte).
- **Traitement :** simplifié avec [mapshaper](https://github.com/mbloch/mapshaper) (`-simplify 10% weighted keep-shapes`, îles de moins de 2 km² retirées, précision 0,0001°), soit 54 Ko. Fichier : `public/geo/france-metropole.geojson`. DOM-TOM exclus pour l'instant.

### 1.3 Sanctuaire Pelagos (filtre « Façades »)

- **Limites :** article 3 de l'*Accord relatif à la création en Méditerranée d'un sanctuaire pour les mammifères marins* (Rome, 25/11/1999) — ligne ouest de la pointe Escampobariou (presqu'île de Giens) à Capo Falcone (Sardaigne), ligne est de Capo Ferro (Sardaigne) à Fosso Chiarone (Toscane), et les côtes entre ces points ([texte de l'accord, ministère italien de l'Environnement](https://mase.gov.it/sites/default/files/accordo_santuario_mammiferi_marini_25_11_1999.pdf)). La coordonnée d'Escampobariou est publiée « 43°01'70"N, 06°05'90"E » (secondes > 59) : elle est lue en minutes décimales, ce qui tombe bien sur la pointe ouest de Giens.
- **Construction :** `scripts/build_pelagos.py` trace ces deux lignes, retire les terres avec le trait de côte Natural Earth 10 m (domaine public) et écrit `public/geo/pelagos.geojson` (mer uniquement, îles exclues). Contrôle : surface calculée ≈ 87 650 km² pour 87 500 km² officiels (écart 0,2 %).
- **Faits affichés** (signataires, dates, surface, 8 cétacés réguliers) : Barcelo et al. (2013), *Scientific Reports of Port-Cros National Park* 27 : 451-460 ([PDF, PN Port-Cros](https://www.portcros-parcnational.fr/sites/portcros-parcnational.fr/files/4035c0e917b8f9cc414f76b7b69d584d.pdf)). Le Parc national de Port-Cros anime la partie française de l'accord.
- **Espèces « dans la zone » :** celles dont le point est à l'intérieur du polygone (test géométrique). Aucune des espèces actuelles n'est un mammifère marin : la cible même du sanctuaire reste à ajouter.

### 1.4 Fonds de carte et photos

- **Fond de carte :** Esri *World Ocean Base* (bathymétrie), gratuit et sans clé, attribution affichée.
- **Photos d'espèces :** Wikimedia Commons. L'auteur et la licence sont affichés au survol de chaque photo. Les espèces sans photo choisie à la main reçoivent l'image principale de leur article Wikipédia, avec l'auteur et la licence lus sur Commons au moment de l'affichage (`src/api/wikimedia.ts`).

### 1.5 Fiches espèces : statut UICN et publications

Chaque fiche (`src/data/species.ts`) contient :
- le **statut Liste rouge UICN**, avec sa portée (mondiale ou régionale Méditerranée), son année et un lien vers l'évaluation. `NE` signifie qu'**aucune évaluation n'a été trouvée** : à vérifier, ce qui ne veut pas dire « pas menacée » ;
- un **niveau de preuve** du lien avec la chaleur : *établi*, *probable* ou *hypothèse*, d'après les sources citées ;
- la **liste des sources**, affichée en bas de la fiche.

Les textes restent un **brouillon indicatif** (bandeau « Placeholder [ À titre indicatif - étude en cours ] » sur chaque fiche) tant qu'ils n'ont pas été relus.

| Espèce | Groupe | Visible | UICN | Lien chaleur | Sources principales |
| --- | --- | --- | --- | --- | --- |
| Corail rouge — *Corallium rubrum* | Faune | Tous | EN (Méditerranée, 2016) | Établi | UICN anthozoaires Méd. ; Garrabou et al. 2022 |
| Gorgone rouge — *Paramuricea clavata* | Faune | Tous | VU (Méditerranée, 2016) | Établi | PN Calanques 2022 ; UICN ; Garrabou et al. 2022 |
| Herbier de posidonie — *Posidonia oceanica* | Flore | Tous | LC (mondiale, 2016) | Probable | UICN ; PN Calanques 2018 ; Corse Net Infos 2017 |
| Plancton & micro-algues | Flore | Tous | Non applicable | Probable | Drouet et al. 2022 ; Santé publique France |
| Moules & huîtres de Thau — *Mytilus galloprovincialis* | Faune | Tous | NE | Établi | AFP / DDTM 2018 |
| Moule commune — *Mytilus edulis* | Faune | Tous | NE | Hypothèse | Polsenaere et al. 2017 ; réseau Ifremer |
| Bulot — *Buccinum undatum* | Faune | Tous | NE | Probable | Reporterre 2022 (essais SMEL) |
| Forêts de laminaires — *Laminaria* spp. | Flore | Tous | NE | Probable | Raybaud et al. 2013 |
| Poulpe commun — *Octopus vulgaris* | Faune | Tous | LC (mondiale, 2018) | Probable | UICN ; L'Info Durable 2025 |
| Éponge de toilette — *Spongia officinalis* | Faune | Expert | NE | Établi | CORDIS HOLOSPONGIA ; Garrabou et al. 2022 |
| Grande nacre — *Pinna nobilis* | Faune | Expert | CR (mondiale, 2019) | Hypothèse | UICN 2019 ; fiches UICN Méditerranée |
| Tortue caouanne — *Caretta caretta* | Faune | Expert | VU (mondiale, 2017) | Hypothèse | PN Port-Cros 2023 ; Ville de Fréjus 2023 ; UICN |
| Barracuda à bouche jaune — *Sphyraena viridensis* | Faune | Expert | LC (mondiale, 2015) | Probable | PN Calanques 2024 ; UICN ; INPN |
| Mérou brun — *Epinephelus marginatus* | Faune | Expert | VU (mondiale, 2018) | Hypothèse | Cottalorda et al. 2009 (PN Port-Cros) ; UICN |
| Méduse pélagie — *Pelagia noctiluca* | Faune | Expert | NE | Probable | Licandro et al. 2010 |
| Ostreopsis — *Ostreopsis* cf. *ovata* | Flore | Expert | Non applicable | Probable | Drouet et al. 2022 ; Santé publique France |
| Baliste commun — *Balistes capriscus* | Faune | Expert | VU (mondiale, 2015) | Hypothèse | UICN ; Futura Sciences 2020 |
| Huître creuse sauvage — *Magallana gigas* | Faune | Expert | Non pertinent (introduite) | Établi | Programme PROGIG 2009 (LEMAR, Ifremer) |
| Laminaire digitée — *Laminaria digitata* | Flore | Expert | NE | Probable | Raybaud et al. 2013 |

**Positions sur la carte.** Chaque espèce a un point **en mer ou dans une lagune côtière, jamais à terre**. C'est vérifié par `npm run check:species`, à relancer après chaque ajout. Les points marqués « position indicative » illustrent une zone de présence : ce ne sont pas des observations géolocalisées.

### 1.6 Contexte général cité dans l'application

- Garrabou, J. et al. (2022). *Marine heatwaves drive recurrent mass mortalities in the Mediterranean Sea.* Global Change Biology. <https://doi.org/10.1111/gcb.16301> : mortalités massives touchant 50 taxons de 8 embranchements entre 2015 et 2019.
- Liste rouge UICN : <https://www.iucnredlist.org>

---

## 2. Sources prévues (pas encore intégrées)

Ces sources sont identifiées pour remplacer les textes provisoires et les positions indicatives par des données vérifiées. Rien de ce qui suit n'est encore utilisé dans le code.

### 2.1 Parc national de Port-Cros (PNPC)

- **Qui :** établissement public créé en 1963, l'un des plus anciens parcs marins d'Europe (îles de Port-Cros et de Porquerolles, aire maritime adjacente). Il publie la revue *Scientific Reports of Port-Cros National Park*.
- **Pourquoi :** des suivis de terrain de long terme en Méditerranée française : gorgones, mérou brun, herbiers de posidonie, pontes de tortues caouannes. Ce sont des observations locales, plus fines que la résolution satellite.
- **Utilisation prévue :** remplacer les seuils et les taux de mortalité codés en dur par des valeurs publiées. Ajouter des observations datées et localisées. Valider les textes avec les agents du parc.

### 2.2 MedECC (Mediterranean Experts on Climate and environmental Change)

- **Qui :** réseau scientifique indépendant de plusieurs centaines de chercheurs, souvent présenté comme « le GIEC de la Méditerranée ». Il a publié le premier rapport d'évaluation sur le climat et l'environnement en Méditerranée (*MAR1*, 2020).
- **Pourquoi :** une synthèse de référence, relue par des pairs, sur le réchauffement méditerranéen, ses projections et ses impacts sur les écosystèmes.
- **Utilisation prévue :** citer les chiffres de contexte (vitesse du réchauffement, projections) dans l'onglet « Comprendre », et expliquer pourquoi la Méditerranée se réchauffe vite : mer semi-fermée, faible inertie thermique.

### 2.3 INPN (Inventaire national du patrimoine naturel)

- **Qui :** plateforme nationale de référence sur la biodiversité, pilotée par PatriNat (OFB, MNHN, CNRS, IRD).
- **Pourquoi :** le **référentiel taxonomique TAXREF** (identifiant `cd_nom` unique par espèce), les **statuts** (protection, listes rouges nationales et régionales UICN France) et les **données d'occurrence** (portail OpenObs).
- **Utilisation prévue :** ajouter le `cd_nom` à chaque espèce. Afficher le statut Liste rouge **France** en plus du statut mondial. Remplacer les positions indicatives par des zones d'occurrence réelles.

### 2.4 Ifremer

- **Qui :** Institut français de recherche pour l'exploitation de la mer, organisme public de recherche océanographique.
- **Pourquoi :** les réseaux de surveillance du littoral (phytoplancton et phycotoxines, santé des coquillages, mortalités conchylicoles), l'archive ouverte de publications *Archimer* et le catalogue de données géographiques *Sextant*.
- **Utilisation prévue :** sourcer les fiches conchylicoles (moules, huîtres) et le plancton (*Ostreopsis*), et superposer des données de surveillance sur la carte.

---

## 3. Ajouter ou corriger une source

1. Ajoutez la référence dans le champ `sources` de l'espèce (`src/data/species.ts`), avec un titre lisible et un lien stable (DOI de préférence).
2. Mettez à jour `iucn` et `heatEvidence` si nécessaire.
3. Lancez `npm run check:species` si vous changez une position.
4. Mettez à jour le tableau de la section 1.5.

Les visiteurs peuvent proposer une espèce manquante depuis le catalogue du mode expert. Les propositions sont enregistrées dans `suggestions_data/suggestions.jsonl`, côté serveur, sans aucune donnée personnelle, pour être relues par l'équipe.
