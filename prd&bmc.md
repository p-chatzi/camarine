# 🌊 Plateforme Éducative sur les Canicules Marines — PRD & Business Model Canvas

> **Titre de travail :** *[À définir — ex. Camarine]*  
> **Contexte :** Projet Hackathon pour le **Cerema**, dans le cadre du **Projet Valerian**  
> **Statut :** Brouillon v2 pour relecture d'équipe  
> **Positionnement :** Un observatoire pensé d'abord en français, plus lisible que les outils existants, au service du grand public comme des scientifiques.

> [!NOTE]
> **Convention de lecture :**
> - Tout élément marqué **`[Hypothèse]`** est une supposition à valider auprès d'un enseignant, d'un médiateur de musée ou d'un scientifique avant le pitch.
> - Tout élément marqué **`[À vérifier]`** est un fait ou un chiffre à contrôler auprès d'une source officielle.

---

## Partie 1 : Product Requirements Document (PRD)

### 1. Vision
Un observatoire francophone qui rend les vagues de chaleur marines (canicules marines) lisibles pour tous et crédibles pour les scientifiques. Un seul moteur branché sur les vraies données Copernicus, trois niveaux de lecture (**Découvrir**, **Explorer**, **Expert**), et une ambition claire : être plus simple à utiliser que les outils existants, pas seulement différent.

> **Pitch en une phrase :** *« Voyez en quelques secondes si votre côte subit une canicule marine, comprenez pourquoi, et creusez aussi loin que vous le souhaitez — en français. »*

---

### 2. Problème et opportunité
* **Les canicules marines s'intensifient sur les côtes françaises.** En août 2026, le golfe du Lion a présenté des anomalies d'environ +6 °C au-dessus de la normale (Copernicus), et en juin 2025, 62 % de la surface de la Méditerranée était en état de canicule marine (Mercator). Les mytiliculteurs de l'étang de Thau ont rapporté 100 % de mortalité à l'été 2026 (AFP). `[À vérifier auprès des sources avant le pitch]`
* **Les données existent mais sont difficiles à lire.** Les visualiseurs existants basés sur Copernicus sont conçus pour des experts et majoritairement en anglais ; un non-spécialiste peine à répondre à la question : *« Ma côte a-t-elle connu une canicule marine l'été dernier ? »* `[Hypothèse, à prouver avec le benchmark de la section 4.2]`
* **En français, l'offre interactive manque.** Nos recherches ont trouvé des articles de presse et des cartes statiques, mais aucun outil interactif grand public pour explorer les événements. `[À confirmer : une recherche rapide ne vaut pas un audit complet]`
* **Manque de ressources pédagogiques.** Les enseignants et médiateurs scientifiques disposent de peu de ressources prêtes à l'emploi, basées sur des données réelles et en français sur ce sujet. `[Hypothèse, à valider avec 3 à 5 enseignants et 1 musée]`
* **Opportunité :** Créer un outil unique, basé sur des données ouvertes réelles, nettement plus lisible que les alternatives, servant à la fois le grand public et les scientifiques.

---

### 3. Objectifs et Non-objectifs

#### 🎯 Objectifs (Goals)
1. **Être nettement plus lisible que les outils existants :** Un non-expert répond à *« Ma côte a-t-elle subi une canicule marine l'été dernier ? »* en moins de 30 secondes, mesuré face à 2 ou 3 outils existants `[Cible = Hypothèse]`.
2. **Priorité au français (French-first) :** Interface, glossaire et contenus en français d'abord, anglais en second.
3. **Un moteur, trois profondeurs (`Découvrir`, `Explorer`, `Expert`) :** La même carte sert le grand public, les enseignants et les scientifiques.
4. **Clé en main pour la classe :** Offrir aux enseignants un outil utilisable en cours avec un minimum de préparation (< 15 min).
5. **Rigueur et traçabilité :** Chaque chiffre affiché à l'écran est traçable vers une donnée réelle ou une source citée, avec des limites clairement énoncées.

#### 🚫 Non-objectifs (pour le hackathon et la v1)
* Produire un service de prévision opérationnelle ou d'alerte précoce.
* Construire notre propre modèle océanographique.
* Prédire à l'échelle d'une ferme aquacole ou d'une lagune (la résolution satellite est trop grossière ; cela est indiqué ouvertement dans le produit).
* Créer des comptes utilisateurs pour les mineurs au-delà du strict nécessaire (respect de la vie privée avant tout).

---

### 4. Utilisateurs cibles (Personas)

| Persona | Qui sont-ils ? | Ce dont ils ont besoin | Niveau | Priorité |
| :--- | :--- | :--- | :---: | :---: |
| **Élève (11–18 ans)** | Apprenant, en classe ou à la maison | Court, visuel, interactif, compatible mobile, sentiment d'action | `Découvrir` | **Primaire** |
| **Enseignant** | Professeur de collège ou lycée (SVT, histoire-géo, physique-chimie, enseignement scientifique) | Activités prêtes à l'emploi alignées sur les programmes, fonctionne sur le matériel scolaire, préparation < 15 min | `Découvrir`, `Explorer` | **Primaire** |
| **Scientifique / Étudiant du supérieur** | Chercheur, membre de labo, étudiant en ingénierie ou océanographie | Méthode transparente, définition ajustable des canicules, valeurs numériques, export, sources citables | `Expert` | **Primaire** |
| **Grand public curieux** | Habitants du littoral, plongeurs, plaisanciers, familles | Réponse en quelques secondes et en français à *« Que se passe-t-il dans ma mer ? »*, partageable | `Découvrir` | **Primaire** |
| **Médiateur (Musée / Aquarium)** | Concepteur d'exposition ou éducateur en centre de sciences, aquarium ou parc marin | Mode borne (kiosque), tactile, remise à zéro auto, boucle d'attraction visuelle | `Découvrir`, `Explorer` | **Secondaire** |
| **Journaliste / Communicant** | Presse régionale, vulgarisateurs scientifiques | Visuels clairs à intégrer, chiffres clés faciles à citer | `Explorer` | **Secondaire** |
| **Acteurs locaux** | ONG, collectivités locales, équipes de communication | Visuels et contenus intégrables pour les campagnes de sensibilisation | `Explorer` | **Tertiaire** |

> 💡 **Focus Démo Hackathon :** La démo doit se concentrer sur **un élève, un enseignant et un scientifique** utilisant la même carte à des profondeurs différentes.

#### 4.1 Un moteur, trois profondeurs
La même carte et les mêmes données servent tous les publics ; seule la quantité d'explications et de contrôles change. Un sélecteur présent sur chaque écran permet d'approfondir ou de simplifier sans perdre sa position géographique ou temporelle.

| Profondeur | Public cible | Ce que l'utilisateur voit | Ce qui reste masqué |
| :--- | :--- | :--- | :--- |
| **1. Découvrir** | Élèves, grand public, visiteurs de musées | Une question par écran (*« Ma côte est-elle en canicule marine ? »*), légendes en langage courant, récit guidé, mode *« Ma côte »* | Centiles (percentiles), périodes de référence, valeurs brutes |
| **2. Explorer** | Enseignants, journalistes, curieux | Curseur temporel libre, explorateur d'événements, comparaisons, quiz, cartes partageables | Paramètres méthodologiques, exports bruts |
| **3. Expert** | Scientifiques, étudiants du supérieur | Laboratoire de définition (centile, période de référence, durée min., suppression de tendance), valeurs numériques, export CSV, méthodologie | **Rien :** chaque paramètre et chaque limite sont affichés |

#### 4.2 Comment nous allons surpasser les outils existants (Benchmark)
« Meilleur » est une affirmation que nous devons tester. Dès les premières heures, nous choisissons 2 ou 3 outils existants (ex. le service de suivi méditerranéen T-MEDNet / MHW Tracker et le visualiseur Copernicus Marine), nous donnons la même tâche à 5 non-scientifiques sur chacun d'eux, et nous comparons. Le résultat sera présenté lors du pitch.

| Critère | Comment on le teste | Cible `[Hypothèse]` |
| :--- | :--- | :--- |
| **Temps jusqu'à la 1re réponse** | Tâche : *« Votre plage a-t-elle connu une canicule marine l'été dernier ? »* (Chronométré) | **< 30 secondes** sur notre outil |
| **Compréhension** | Les testeurs réexpliquent la carte avec leurs propres mots | La majorité l'explique correctement sans aide |
| **Langue** | Vérification de l'interface, des légendes et du glossaire | **100 % en français**, avec des légendes en langage clair |
| **Transparence scientifique** | Un scientifique vérifie la page méthodologie et le mode `Expert` | Période de référence, seuil, résolution et limites tous visibles |
| **Usage mobile** | Exécution de la même tâche sur smartphone | Tâche accomplie sans friction sur téléphone |
| **Prêt pour la classe** | Un enseignant examine un kit pédagogique | Utilisable sans préparation supplémentaire |

---

### 5. User Stories principales
* **En tant qu'élève**, je veux choisir mon littoral et voir comment ses épisodes d'eau chaude ont évolué depuis le début des relevés satellites, afin que le sujet devienne concret et personnel.
* **En tant qu'élève**, je veux suivre un événement réel (ex. l'été 2022) étape par étape, afin de comprendre les causes, la propagation et les conséquences.
* **En tant qu'élève**, je veux modifier les conditions météo (soleil, vent, température initiale) et voir l'eau réagir, afin d'apprendre le mécanisme physique en jouant.
* **En tant qu'élève**, je veux voir ce qu'une canicule marine fait à des espèces comme les moules ou les gorgones, afin de comprendre pourquoi c'est grave.
* **En tant qu'enseignant**, je veux une séance prête à l'emploi avec des objectifs, une fiche d'activité et un quiz, afin de pouvoir l'utiliser dès demain.
* **En tant qu'enseignant**, je veux lancer une session de classe avec un simple code et voir les résultats agrégés sans collecter de données personnelles sur mes élèves.
* **En tant que médiateur de musée**, je veux un mode kiosque qui se réinitialise tout seul et affiche une boucle d'attraction, afin de pouvoir laisser l'écran sans surveillance.
* **En tant que scientifique**, je veux un mode expert où je peux modifier la définition d'une canicule marine et voir les événements se recalculer, afin d'avoir confiance dans l'outil.

---

### 6. Fonctionnalités (Feature Set)
> **Clé de priorité :** `P0` = MVP Hackathon | `P1` = Bonus fort pour la démo | `P2` = Feuille de route post-hackathon

#### 6.0 Transversal : Niveaux de lecture et lisibilité
| ID | Fonctionnalité | Description | Priorité |
| :---: | :--- | :--- | :---: |
| **M1** | **Sélecteur de profondeur** | Bascule `Découvrir` / `Explorer` / `Expert` sur chaque écran ; conserve le lieu et la date lors du changement | `P0` |
| **M2** | **Écrans à question unique** | La vue par défaut répond à une seule question (*« Ma côte est-elle en canicule marine ? »*) avec un verdict clair d'abord, les détails ensuite | `P0` |
| **M3** | **Légende en langage clair** | Échelle de couleurs avec des mots (*Normal, Chaud, Très chaud, Exceptionnel*) à côté des degrés ; palette adaptée aux daltoniens | `P0` |
| **M4** | **Glossaire français au survol** | Chaque terme technique affiche une courte définition en français ; vocabulaire unifié dans tout l'outil | `P0` |
| **M5** | **Explications adaptatives** | Le même événement expliqué selon trois niveaux de détail | `P1` |
| **M6** | **Conditions actuelles** | Dernières conditions issues du produit *Near-Real-Time* avec le même verdict clair `[Dépend de l'accès aux données, à vérifier]` | `P1` |

#### 6.1 Explorer
| ID | Fonctionnalité | Description | Priorité |
| :---: | :--- | :--- | :---: |
| **E1** | **Carte thermique interactive** | Carte des côtes françaises avec curseur temporel, anomalie quotidienne de température de surface (SST), lecture/pause, transitions fluides | `P0` |
| **E2** | **Suivi d'événements** | Canicules détectées comme objets spatio-temporels (ID, début, pic, fin, surface, catégorie d'intensité) ; clic sur un événement pour voir son cycle de vie | `P0` |
| **E3** | **Mode « Ma côte »** | Choix d'un lieu : affichage de sa frise de réchauffement (*warming stripes*) depuis 1982, ses pires événements et le nombre de jours de canicule par an | `P0` |
| **E4** | **Comparateur** | Vue scindée (split view) : deux côtes ou deux étés côte à côte | `P1` |
| **E5** | **Mer et Air synchronisés** | Vue synchronisée des canicules atmosphériques et marines pour un été choisi | `P2` |

#### 6.2 Apprendre
| ID | Fonctionnalité | Description | Priorité |
| :---: | :--- | :--- | :---: |
| **L1** | **Récit guidé : Été 2022** | 6 à 8 étapes avec narration, états de la carte et une question par étape (l'air chauffe, la mer répond, l'événement s'étend, les conséquences) | `P0` |
| **L2** | **Bac à sable « Pourquoi ça arrive ? »** | Curseurs (ensoleillement, vent, température initiale) pilotant un modèle simplifié de colonne d'eau ; clairement étiqueté comme modèle pédagogique | `P1` |
| **L3** | **Fiches Conséquences** | Espèces et activités (moules, huîtres, gorgones, posidonies, pêche, tourisme) avec seuils de stress thermique et cas réels documentés `[Vérifier chaque source]` | `P0` |
| **L4** | **Glossaire et explicatifs** | Définitions courtes et illustrées : anomalie, période de référence (baseline), centile (percentile), canicule marine, malaïgue | `P0` |
| **L5** | **Curseur prospectif (+1 °C, +2 °C)** | Décale la série historique observée pour illustrer comment le nombre de jours de canicule par an évoluerait ; étiqueté comme illustration et non comme projection climatique | `P1` |

#### 6.3 Jouer
| ID | Fonctionnalité | Description | Priorité |
| :---: | :--- | :--- | :---: |
| **P1** | **Scénarios de jeu de rôle** | *« Vous êtes conchyliculteur / gérant de club de plongée / gestionnaire de parc marin »* : une canicule se déroule sur de vraies données, le joueur prend des décisions et voit les conséquences | `P1` |
| **P2** | **Prédire puis révéler** | Les élèves devinent comment une côte a évolué dans le temps, puis la vraie donnée s'affiche ; score et explication | `P0` |
| **P3** | **Quiz et défis** | Courts quiz à chaque étape du récit, badges pour les parcours complétés | `P1` |

#### 6.4 Enseigner
| ID | Fonctionnalité | Description | Priorité |
| :---: | :--- | :--- | :---: |
| **T1** | **Kits pédagogiques** | Pour chaque activité : objectifs d'apprentissage, durée, prérequis, fiche élève imprimable et notes pour l'enseignant (au moins 2 kits) | `P0` |
| **T2** | **Code de session classe** | L'enseignant crée une session, les élèves rejoignent avec un code sans données personnelles ; l'enseignant voit les résultats agrégés anonymes | `P1` |
| **T3** | **Niveaux de difficulté** | Mode simplifié (collège), mode standard (lycée), mode expert (supérieur) | `P1` |
| **T4** | **Alignement sur les programmes** | Tableau reliant chaque activité aux thèmes et compétences des programmes officiels de l'Éducation nationale `[À vérifier]` | `P1` |
| **T5** | **Guide enseignant et FAQ** | Guide d'une page, conseils pour des séances de 30 minutes et 55 minutes | `P0` |

#### 6.5 Partager et déployer
| ID | Fonctionnalité | Description | Priorité |
| :---: | :--- | :--- | :---: |
| **S1** | **Mode Kiosque (Musée)** | Plein écran, larges cibles tactiles, réinitialisation après inactivité, boucle d'attraction, aucun lien externe sortant | `P1` |
| **S2** | **Cartes partageables** | Export d'une image de *« Ma côte »* avec ses statistiques clés et un lien / QR code | `P1` |
| **S3** | **Widget intégrable** | Version `iframe` d'une carte ou d'un récit pour les sites web de médias ou de musées | `P2` |
| **S4** | **Multilingue** | Français d'abord, anglais ensuite ; architecture prête pour d'autres langues | `P0` (FR) / `P1` (EN) |
| **S5** | **Build hors-ligne (Offline)** | Version locale avec données préchargées pour les musées ou établissements scolaires à faible connexion | `P2` |

#### 6.6 Couche Expert
| ID | Fonctionnalité | Description | Priorité |
| :---: | :--- | :--- | :---: |
| **X1** | **Laboratoire de définition (Hobday)** | Ajustement du seuil en centile, de la période de référence, de la durée minimale et du retrait de tendance ; mise à jour en direct | `P1` |
| **X2** | **Export de données** | Téléchargement des tables d'événements et des séries temporelles d'anomalies au format CSV / JSON | `P1` |
| **X3** | **Page Méthodologie** | Jeux de données utilisés, versions, étapes de traitement, limites connues, comment citer l'outil | `P0` |

---

### 7. Principes d'expérience utilisateur (UX)
1. **Le personnel d'abord :** Toujours partir d'un lieu qui compte pour l'utilisateur.
2. **Apprendre en faisant :** Chaque concept scientifique est associé à une interaction directe.
3. **Données réelles, limites honnêtes :** Ne jamais afficher une valeur fictive ou illustrative sans l'étiqueter explicitement.
4. **Boucles courtes :** L'expérience principale fonctionne en 5 minutes ; les parcours plus profonds sont optionnels.
5. **Espoir et capacité d'agir :** Montrer les conséquences sans laisser l'utilisateur impuissant ; chaque parcours se termine par de la compréhension et des pistes d'action.

---

### 8. Approche technique

#### 8.1 Architecture
1. **Pipeline de données hors-ligne (Python) :**
   - Téléchargement de la température de surface de la mer (SST) depuis le **Copernicus Marine Service** : série retraitée (*Reprocessed*) couvrant l'ère satellitaire + produit temps quasi-réel (*Near-Real-Time*) pour les mois récents comme l'été 2026 `[Vérifier la jonction des deux séries]`.
   - Calcul de la climatologie quotidienne et des anomalies par pixel avec `xarray`.
   - Détection des canicules marines selon la définition de **Hobday et al. (2016)**, puis labellisation des événements connectés dans l'espace et le temps (ex. via `scipy.ndimage.label`).
   - Export de fichiers compacts : grilles d'anomalies en tableaux binaires ou tuiles, tables d'événements en JSON/Parquet, séries temporelles par lieu.
2. **Front-end Web statique :**
   - Rendu cartographique fluide (Leaflet / MapLibre / WebGL).
   - Framework moderne (React + TypeScript + Vite) pour le récit, les quiz, les graphiques et l'interface.
   - Données chargées sous forme de fichiers statiques ou via un backend léger mis en cache.
3. **Backend léger (FastAPI Python) :**
   - Service de calcul à la volée pour le laboratoire de définition Hobday, mise en cache locale et gestion des sessions de classe anonymes.
4. **Hébergement :** Hébergement statique + CDN ; la version kiosque ou hors-ligne embarque les mêmes fichiers localement.

#### 8.2 Rigueur scientifique
* Documenter clairement la période de référence (ex. 1982–2011) et le seuil de centile (ex. 90e centile) selon Hobday et al. (2016).
* Indiquer la résolution spatiale des données et ce qu'elle implique (les lagunes côtières étroites sont mal résolues par satellite seul).
* Valider la détection sur des événements connus (ex. été 2003, été 2022, été 2023) et comparer avec la littérature publiée.
* Faire relire les explications, les seuils biologiques et le modèle bac à sable par un scientifique du **Cerema** avant publication.
* Référencer chaque jeu de données avec sa source, son DOI/ID produit, sa version et sa licence.

#### 8.3 Exigences non-fonctionnelles

| Domaine | Exigence |
| :--- | :--- |
| **Performance** | Fonctionne sur un ordinateur scolaire ou une tablette milieu de gamme ; premier affichage de la carte en < 5 secondes sur une connexion scolaire typique. |
| **Accessibilité** | Palettes adaptées au daltonisme, navigation au clavier, alternatives textuelles, sous-titres sur tout contenu audio/vidéo, cible WCAG 2.1 AA `[À vérifier]`. |
| **Vie privée (RGPD)** | Aucun compte pour les élèves ; aucune donnée personnelle collectée ; codes de session anonymes uniquement. |
| **Fiabilité** | Actifs statiques, dégradation gracieuse si un fichier manque, données pré-générées de secours prêtes pour la démo. |
| **Maintenabilité** | Code open-source, pipeline de données documenté qu'un nouveau contributeur peut relancer facilement. |
| **Localisation** | Textes structurés pour faciliter la traduction, français par défaut. |

---

### 9. Métriques de succès

#### Pendant la démo du Hackathon
* [ ] Un parcours complet et fonctionnel : choisir une côte, suivre le récit, répondre à une question, lire une fiche espèce/conséquence.
* [ ] Au moins un événement réel suivi de bout en bout.
* [ ] Une vue méthodologique expliquant l'algorithme de Hobday, les données et leurs limites.
* [ ] Au moins deux kits pédagogiques et un guide enseignant.
* [ ] Un benchmark de lisibilité réalisé auprès d'au moins 5 non-scientifiques comparant notre outil à 2 ou 3 outils existants.

#### Après le lancement `[Cibles hypothétiques à calibrer]`
* Nombre d'enseignants menant une séance complète sans assistance technique.
* Part des élèves terminant le parcours guidé.
* Gain d'apprentissage mesuré par un mini-questionnaire avant/après.
* Nombre de classes, musées ou organisations utilisant ou partageant l'outil.

---

### 10. Plan de Hackathon (48 heures, équipe de 10)

| Pôle (Workstream) | Effectif | Livrables |
| :--- | :---: | :--- |
| **Données & Détection** | 3 | Téléchargement Copernicus, climatologie, anomalies, détection Hobday, exports JSON |
| **Carte & Interactions** | 2 | Carte thermique, curseur temporel, vue événements, mode « Ma côte » |
| **Contenu & Pédagogie** | 2 | Script du récit, fiches espèces/conséquences, quiz, kits enseignants |
| **Design & UX** | 1 | Identité visuelle, mises en page, accessibilité, mode musée/kiosque |
| **Pitch, Validation & Doc** | 2 | Interviews enseignants/médiateurs, maintien du PRD/BMC, slides, benchmark, script de démo |

#### Chronologie (Timeline)
* **Heures 0 à 4 :** Alignement sur le périmètre, choix de la région et de la période, configuration du dépôt Git, accès aux données et système de design ; début des entretiens enseignants.
* **Heures 4 à 16 :** Pipeline de données et première carte ; rédaction parallèle du script et des fiches espèces.
* **Heures 16 à 28 :** Suivi des événements, mode « Ma côte » et mode musée intégrés à la carte.
* **Heures 28 à 38 :** Graphiques analytiques (Comprendre), kits enseignants, finitions UI, passe d'accessibilité.
* **Heures 38 à 44 :** Tests avec de vrais utilisateurs (benchmark), correction de bugs, page méthodologie.
* **Heures 44 à 48 :** Répétition du pitch, vidéo de secours (fallback), soumission finale.

> ⚠️ **Règle d'or :** À partir de la 24e heure, il doit toujours y avoir une démo fonctionnelle de bout en bout. Les nouvelles fonctionnalités n'entrent que si elles ne cassent rien.

---

### 11. Risques et mitigations

| Risque | Impact | Mitigation |
| :--- | :--- | :--- |
| **Téléchargement ou traitement des données trop long** | Retarde tout le projet | Commencer avec une région et des points côtiers ciblés ; pré-calculer tôt ; garder un fichier JSON statique de secours dans le dépôt (`public/data/`). |
| **Imprécision scientifique dans les modèles simplifiés ou seuils** | Perte de crédibilité auprès du Cerema | Étiqueter clairement les simplifications ; sourcer chaque seuil thermique d'espèce ; faire relire par un scientifique avant le pitch. |
| **Dérive du périmètre (Scope creep)** | Fonctionnalités inachevées | Liste `P0` stricte ; une histoire forte, quelques interactions parfaitement polies. |
| **Le contenu ressemble à un quiz générique** | Faible différenciation | Garder les vraies données Copernicus et l'algorithme de Hobday au centre ; mettre en valeur la couche Expert. |
| **Résolution satellite trop grossière pour des affirmations très locales** | Message trompeur | L'indiquer clairement dans l'interface ; parler de côtes et de sous-régions, pas de parcs à huîtres individuels. |
| **Pas de retour d'enseignants réels** | Outil inadapté à la salle de classe | Interviewer des enseignants dès le début ; tester le kit avec de vrais utilisateurs. |
| **Inquiétudes liées à la vie privée des mineurs** | Bloque l'adoption scolaire | Aucun compte utilisateur ; codes anonymes ; zéro collecte de données personnelles. |
| **Deux publics, une interface surchargée** | Aucun public n'est bien servi | Séparation claire des vues (`Visualiser`, `Comprendre`, `Partager` / niveaux de lecture) ; tester chaque vue séparément. |

---

### 12. Questions ouvertes
1. Qu'attendent exactement le Cerema et les organisateurs comme livrable final, et quels jeux de données sont privilégiés ?
2. Quelle région et quelle période offrent le meilleur compromis entre intérêt narratif et taille de fichier ?
3. Quelle tranche d'âge ciblons-nous en priorité (collège Cycle 4 ou lycée) ?
4. Quelle est la licence exacte des données Copernicus et des illustrations d'espèces réutilisées ?
5. Qui héberge et maintient l'outil après le hackathon (bien commun open-source) ?
6. Quel scientifique du réseau Cerema / Valerian peut relire nos explications ?
7. Quels outils existants utilisons-nous pour le benchmark, et qui sont nos 5 testeurs non-scientifiques ?
8. Comment joindre proprement la série retraitée (*Reprocessed*) et le produit temps quasi-réel (*Near-Real-Time*) pour afficher l'été 2026 ?

---

## Partie 2 : Business Model Canvas (Modèle de pérennité d'intérêt général)

> 🌱 **Philosophie Open-Source & Bien Commun :**  
> Ce projet n'a pas vocation à être un produit commercial fermé. Tout le code et le contenu sont ouverts : quiconque souhaite réutiliser, adapter ou déployer notre travail est encouragé à le faire afin de maximiser la sensibilisation aux canicules marines. Le modèle ci-dessous vise uniquement à assurer la **viabilité financière et la pérennité d'un outil d'intérêt public** (gratuit pour les écoles et le public, soutenu par les institutions).

| Bloc | Contenu |
| :--- | :--- |
| **1. Segments d'utilisateurs** | 1. **Enseignants et établissements scolaires** (collèges et lycées).<br>2. **Scientifiques, laboratoires et étudiants du supérieur** ayant besoin d'une vue transparente et citable (réseau Cerema).<br>3. **Grand public curieux** : habitants du littoral, plongeurs, plaisanciers, familles.<br>4. **Musées, aquariums, centres de culture scientifique (CCSTI), parcs naturels marins**.<br>5. **Médias et vulgarisateurs scientifiques** intégrant des cartes et citant des chiffres.<br>6. **Institutions, collectivités et ONG** engagées dans la protection de l'océan. |
| **2. Propositions de valeur** | • **Grand public & Élèves :** La réponse à *« Ma côte est-elle en canicule marine ? »* en quelques secondes et en français, suivie d'un récit visuel pour comprendre pourquoi.<br>• **Enseignants :** Une séance prête à l'emploi sur des données réelles, alignée sur les programmes, en moins de 15 minutes de préparation.<br>• **Scientifiques :** Une méthode transparente (Hobday et al.) avec définition ajustable, valeurs numériques et export, dans le même outil.<br>• **Musées & Médias :** Une vue prête pour borne interactive (kiosque) ou intégrable, bien plus lisible que les visualiseurs experts existants.<br>• **Tous :** Un seul moteur open-source à plusieurs niveaux de lecture. |
| **3. Canaux de diffusion** | Réseaux d'enseignants et portails de ressources pédagogiques (Éduthèque, sites académiques), réseaux de musées et d'aquariums, communication du Cerema et du Projet Valerian, presse régionale et scientifique, événements de sensibilisation à l'océan, réseaux sociaux via les fiches exportables *« Ma côte »*. |
| **4. Relations utilisateurs** | Libre-service gratuit et sans inscription pour les écoles et le public ; guide enseignant et FAQ ; boucle de retour avec les professeurs et chercheurs ; accompagnement dédié pour les musées ; mises à jour saisonnières (nouveaux étés, nouveaux récits) et dépôt open-source collaboratif. |
| **5. Sources de financement (Pérennité)** | 1. **Subventions publiques et financements institutionnels** (programmes de culture océanique, ministères, régions littorales, fondations) — la base la plus réaliste `[Hypothèse]`.<br>2. **Déploiements sur mesure pour musées et aquariums** (installation sur borne tactile, personnalisation locale, maintenance).<br>3. **Éditions co-financées** par des collectivités côtières, des ports ou des aires marines protégées.<br>4. **Ateliers de formation** pour enseignants et médiateurs scientifiques.<br>*L'accès au cœur de l'outil et au code source reste 100 % gratuit et ouvert.* |
| **6. Ressources clés** | Données satellites ouvertes (Copernicus Marine), pipeline de détection et de suivi (Python), moteur cartographique et analytique interactif, glossaire français et contenus pédagogiques, résultats du benchmark de lisibilité, validation scientifique par le Cerema et ses partenaires. |
| **7. Activités clés** | Rafraîchissement et traitement des données (dont mises à jour temps quasi-réel), détection et validation des événements, tests de lisibilité avec des non-scientifiques, co-création de contenus avec des enseignants, développement front-end et maintenance open-source. |
| **8. Partenaires clés** | **Cerema** et le **Projet Valerian** (science et crédibilité), **Copernicus Marine Service** et Mercator Océan, enseignants et académies, musées, aquariums et parcs naturels marins (OFB), ONG et fondations pour l'océan, universités (évaluation de l'impact pédagogique). |
| **9. Structure de coûts** | Temps de développement et de design (coût initial principal), tests utilisateurs, hébergement et stockage de données (très faibles car les données pré-calculées sont légères et ouvertes), production de contenu pédagogique en français, relecture scientifique. |

### Pourquoi ce modèle fonctionne
* **Les coûts d'infrastructure sont minimes** car les données sont ouvertes et l'architecture repose principalement sur des fichiers pré-calculés.
* **Le public cible (écoles, citoyens) n'a rien à payer**, de sorte que l'adoption n'est jamais bloquée par des contraintes budgétaires ou administratives.
* **La licence ouverte accélère l'impact :** toute réutilisation par un autre acteur démultiplie la sensibilisation aux canicules marines sans coût marginal pour nous.
* **Le même moteur sert les classes, les musées, les citoyens et les scientifiques**, mutualisant tout l'effort de développement.

### Ce qu'il nous reste à tester
1. Notre outil est-il mesurablement plus lisible que les outils existants pour des non-scientifiques (benchmark de la section 4.2) ?
2. Les enseignants l'utiliseraient-ils réellement en classe, et qu'est-ce qui les ferait revenir ?
3. Les scientifiques trouvent-ils le niveau `Expert` / `Comprendre` suffisamment rigoureux pour être cité ?
4. Quels musées ou parcs marins souhaiteraient déployer le mode kiosque sur leurs bornes ?
5. Quels appels à projets publics ou fondations correspondent à cette thématique `[À vérifier]` ?

---

## Partie 3 : Trame du Pitch (pour le Jury)

1. **Accroche (Hook) :** *« En août 2026, la mer dans le golfe du Lion était environ 6 °C au-dessus de la normale. Pouvez-vous dire, en 10 secondes, si votre plage a été touchée ? La plupart des gens ne le peuvent pas. »* `[Vérifier le chiffre exact]`
2. **Problème :** Les données existent, mais les outils actuels sont conçus pour des experts et majoritairement en anglais. Le grand public, les enseignants et même de nombreux étudiants perdent un temps précieux à essayer de les décrypter.
3. **Solution :** Un observatoire francophone avec une carte interactive, une question claire par écran et trois profondeurs d'analyse (`Visualiser / Découvrir`, `Comprendre / Explorer`, `Partager / Expert`).
4. **Différenciation :** Beaucoup plus lisible (testé face aux outils existants) ; événements de canicules suivis avec leur impact sur les espèces locales ; historique de *« votre côte »* ; un laboratoire interactif permettant d'explorer la méthode de Hobday elle-même ; et des kits prêts à enseigner.
5. **Crédibilité :** Vraies données du Copernicus Marine Service, méthode scientifique de référence (Hobday et al., 2016) documentée, limites clairement affichées, validation sur des événements historiques.
6. **Impact et ouverture :** 100 % gratuit et open-source pour les écoles, la recherche et le grand public ; conçu comme un bien commun numérique.
7. **Demande (Ask) :** L'appui du **Cerema** et du **Projet Valerian** pour affiner la validation scientifique et lancer un pilote avec des classes partenaires et un espace muséal.

### 🎬 Script de démo (3 minutes)
1. **Ouverture (Mode Visite / Découvrir) :** Afficher le verdict immédiat pour une côte française, parcourir le littoral et observer l'anomalie thermique.
2. **Impact biologique :** Cliquer sur une espèce locale (ex. gorgone rouge ou moule de Méditerranée) pour lire sa fiche de seuil thermique et comprendre le risque concret.
3. **Passage à l'analyse (Vue Comprendre / Expert) :** Basculer sur les graphiques temporels (séries quotidiennes, *strip plot* des vagues de chaleur, méthode de Hobday) et ajuster les paramètres d'analyse en direct.
4. **Clôture (Vue Partager & Benchmark) :** Montrer l'export de rapport/carte partageable et conclure sur les résultats du test de lisibilité face aux outils existants.