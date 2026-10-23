# Forum de Camarine

Forum intégré à Camarine (section **Forum**, adresses `#/forum/…`). Lecture ouverte à tous ; écriture avec un compte à l’e-mail confirmé.

## Rubriques et rôles

| Rubrique | Qui crée un sujet | Qui répond |
| --- | --- | --- |
| **Questions & réponses** | tout membre | **scientifiques validés** et admins (réponse publiée tout de suite) ; les autres membres font une **proposition**, visible de son auteur et des scientifiques, publiée quand un scientifique la **valide** |
| **Zoom sur les espèces** → Faune / Flore → une rubrique par espèce | tout membre | tout membre |
| **Zone Pelagos**, **Bons gestes**, **Suggestions** | tout membre | tout membre |

Les rubriques d’espèces sont lues dans `src/data/species.ts` au démarrage du backend : ajouter une espèce ajoute sa rubrique. Chaque fiche espèce de la carte a un lien « Discuter de cette espèce sur le forum ».

Rôles :

- **Membre** : tout compte à l’e-mail confirmé.
- **Scientifique** : demande depuis « Mon compte » (institution, domaine, ORCID facultatif, présentation), **validée à la main par un admin**.
- **Admin** : nommé depuis le serveur (`python -m backend.forum promote …`) ou par un autre admin. **Double authentification obligatoire** : sans elle, les pages d’administration restent fermées.

Modération : signalement de messages par les membres ; les admins masquent / rétablissent un message, verrouillent / épinglent / masquent un sujet, suspendent un compte, changent un rôle. Toutes ces actions sont dans le **journal d’audit**.

## Lancer en local

```sh
python -m pip install -r backend/requirements.txt
npm install
CAMARINE_DEV=1 python -m uvicorn backend.main:app --app-dir . --reload --port 8000
npm run dev   # http://localhost:5173/#/forum
```

En mode dev (`CAMARINE_DEV=1`) sans SMTP, **les e-mails (lien de confirmation, mot de passe oublié…) s’affichent dans la console du backend** : copiez le lien dans le navigateur.

Premier admin :

```sh
# 1. créez votre compte sur le site et confirmez l’e-mail
python -m backend.forum promote votre@adresse admin
# 2. sur le site : Mon compte → Double authentification (application ou clé de sécurité)
python -m backend.forum users    # liste des comptes
python -m backend.forum purge    # purge de rétention immédiate
```

Les clés de sécurité / passkeys ne fonctionnent qu’en HTTPS ou sur `http://localhost` (pas sur `http://127.0.0.1` ni sur l’adresse IP du réseau local : utilisez un tunnel HTTPS pour tester sur téléphone).

## Variables d’environnement

| Variable | Rôle | Défaut |
| --- | --- | --- |
| `CAMARINE_DEV` | `1` = développement : cookies sans `Secure`, e-mails dans la console | désactivé |
| `CAMARINE_PUBLIC_URL` | adresse publique du site (liens des e-mails, SSO, WebAuthn) | `http://localhost:5173` |
| `CAMARINE_SECRET_KEY` | clé HMAC des défis anti-robot | générée dans `forum_data/keys.json` |
| `CAMARINE_DATA_KEY` | clé Fernet qui chiffre les secrets TOTP | générée dans `forum_data/keys.json` |
| `CAMARINE_FORUM_DB` | base de données SQLAlchemy | `sqlite:///forum_data/forum.db` |
| `CAMARINE_FORUM_DIR` | dossier des données du forum | `forum_data` |
| `CAMARINE_WEBAUTHN_RP_ID` | domaine des clés de sécurité | hôte de `CAMARINE_PUBLIC_URL` |
| `CAMARINE_COOKIE_SECURE` | forcer `Secure` / préfixe `__Host-` | activé hors dev |
| `CAMARINE_GOOGLE_CLIENT_ID` / `_SECRET` | SSO Google | désactivé |
| `CAMARINE_MICROSOFT_CLIENT_ID` / `_SECRET` / `_TENANT` | SSO Microsoft | désactivé, tenant `common` |
| `CAMARINE_PRIVACY_CONTACT` | adresse affichée sur la page RGPD | vide |
| `CAMARINE_CHECK_BREACHED_PASSWORDS` | refuser les mots de passe connus des fuites (Have I Been Pwned) | activé |
| `CAMARINE_LOG_RETENTION_DAYS` | durée du journal de sécurité | 180 |
| `CAMARINE_SMTP_*`, `CAMARINE_NOTIFY_FROM` | envoi des e-mails (voir README) | — |

`forum_data/` est ignoré par git. **Sauvegardez la base et les deux clés ensemble** : sans `CAMARINE_DATA_KEY`, les applications d’authentification enregistrées ne peuvent plus être vérifiées.

## Configurer le SSO

Adresse de retour à déclarer chez le fournisseur : `https://<votre-site>/api/forum/auth/sso/<google|microsoft>/callback`.

- **Google** : Google Cloud Console → API et services → Identifiants → « ID client OAuth » de type *Application Web* ; écran de consentement avec les champs d’application `openid`, `email`, `profile`.
- **Microsoft** : portail Entra ID → Inscriptions d’applications → Nouvelle inscription ; types de comptes « Comptes dans un annuaire organisationnel et comptes Microsoft personnels » (tenant `common`) ; plateforme *Web* avec l’adresse de retour ; Certificats et secrets → nouveau secret client (notez sa date d’expiration).

Les boutons « Continuer avec Google / Microsoft » n’apparaissent que si le fournisseur est configuré.

## Mise en ligne : liste de contrôle

1. **HTTPS** obligatoire, site et API **sur la même origine** (cookie de session `SameSite=Lax`).
2. `CAMARINE_SECRET_KEY` et `CAMARINE_DATA_KEY` dans les variables d’environnement ou un gestionnaire de secrets ; `CAMARINE_DEV` absent.
3. PostgreSQL plutôt que SQLite dès qu’il y a du trafic ; sauvegardes chiffrées et testées.
4. uvicorn derrière nginx avec `--proxy-headers --forwarded-allow-ips=<IP du proxy>` (sinon tous les visiteurs ont l’IP du proxy).
5. **Un seul processus uvicorn**, ou bien déplacer les limites anti-abus (aujourd’hui en mémoire) vers Redis.
6. SMTP avec SPF, DKIM et DMARC sur le domaine d’envoi (sinon les e-mails de confirmation finissent en indésirables).
7. En-têtes de sécurité sur le site (nginx) : `Content-Security-Policy`, `Strict-Transport-Security`, `Permissions-Policy` (voir les suggestions de sécurité).
8. Compléter la page **Confidentialité & RGPD** (responsable du traitement, hébergeur, prestataire e-mail, date) et tenir le **registre des traitements**.
9. Publier `/.well-known/security.txt` avec un contact pour signaler une faille.

## Sécurité : ce qui est en place

- **Mots de passe** : 12 à 256 caractères, tout caractère accepté, normalisés NFKC ; refus des mots de passe faibles (zxcvbn), contenant l’e-mail ou le pseudo, ou présents dans une fuite connue (HIBP, k-anonymat) ; stockés en **Argon2id** (sel aléatoire, paramètres RFC 9106, re-hachage automatique si les paramètres augmentent).
- **Connexion** : message identique pour e-mail inconnu et mauvais mot de passe (et même temps de calcul) ; délai croissant après 5 échecs sur un compte ; 10 essais par IP / 15 min.
- **Sessions** : jeton aléatoire de 256 bits dans un cookie `HttpOnly`, `Secure`, `SameSite=Lax`, préfixe `__Host-` ; seule son empreinte SHA-256 est en base ; nouveau jeton à chaque connexion et changement de droits ; 7 jours d’inactivité / 30 jours maximum ; liste et déconnexion des appareils.
- **CSRF** : en-tête `X-Camarine` obligatoire sur toute écriture, plus le jeton CSRF de la session.
- **Double authentification** : TOTP (toutes les applications), WebAuthn (YubiKey, passkeys), 10 codes de secours à usage unique ; secret TOTP chiffré, code non rejouable ; 5 essais par connexion.
- **SSO** : OpenID Connect avec PKCE, `state` à usage unique lié au navigateur, `nonce`, signature vérifiée sur les clés publiques du fournisseur ; comptes reliés par identifiant stable (jamais par e-mail : protège de l’attaque « nOAuth » de Microsoft).
- **Mode « sudo »** : mot de passe redemandé (ou connexion de moins de 10 min) pour changer le mot de passe ou la double authentification, ou supprimer le compte ; e-mail d’alerte après chaque changement sensible.
- **Anti-robot discret** : preuve de travail calculée par le navigateur pendant la saisie (≈ 1 s, aucun clic), pot de miel, délai minimal, 3 comptes par IP et par jour, e-mail confirmé pour écrire.
- **Entrées** : schémas stricts (champs inconnus refusés, pas de conversion de types), tailles limitées (corps HTTP 64 Ko), texte normalisé et nettoyé des caractères invisibles ou de contrôle, affiché comme texte (jamais du HTML) ; liens limités à http(s), `rel="nofollow ugc noopener noreferrer"`.
- **Journaux** : journal de sécurité (connexions, échecs, changements de sécurité ; IP et navigateur, 180 jours) et journal d’audit des actions de modération.

## RGPD

Données, finalités, durées et droits sont détaillés sur la page **Confidentialité & RGPD** du forum (lien discret en bas de chaque page du forum, dans « À propos » et à l’inscription). Côté code :

- minimisation : e-mail jamais affiché, IP des limites anti-abus jamais écrite sur disque, aucun traceur ni service tiers côté navigateur ;
- durées appliquées automatiquement (`backend/forum/maintenance.py`) : journal de sécurité 180 jours, comptes non confirmés 7 jours, sessions et liens expirés ;
- droits : export JSON (accès, portabilité), modification du pseudo et des messages, suppression du compte (messages conservés sous « Compte supprimé ») ;
- un seul cookie, strictement nécessaire : pas de bandeau de consentement ;
- âge minimum 15 ans (case à cocher à l’inscription).

## NIS2

La directive NIS2 vise les entités « essentielles » et « importantes » de secteurs listés, en général à partir de 50 salariés ou 10 M€ de chiffre d’affaires. En France, elle **n’est pas encore transposée** (octobre 2026) : le projet de loi « Résilience » attend son examen à l’Assemblée nationale, et la Commission européenne a saisi la Cour de justice de l’UE en juillet 2026 pour ce retard. **Un forum associatif ou personnel comme Camarine n’y serait très probablement pas soumis.** Ses mesures (article 21) sont néanmoins de bonnes pratiques, et le forum en applique déjà une partie : authentification multifacteur (obligatoire pour les admins), chiffrement, journalisation et traçabilité, gestion des accès par rôles, dépendances reconnues et versions bornées. Restent à organiser hors du code : procédure de gestion d’incident (qui prévient qui, en combien de temps), sauvegardes testées, mises à jour régulières des dépendances, sensibilisation des admins.

## Limites connues

- Limites anti-abus en mémoire : remises à zéro au redémarrage, non partagées entre plusieurs processus.
- Pas de notifications (« quelqu’un a répondu à votre question ») ni de votes « utile ».
- Recherche simple (titres et textes, `LIKE`) : suffisante pour quelques milliers de sujets.
- Pas de migrations de schéma (Alembic) : la base est créée au démarrage ; une évolution des tables demandera une migration.
- Le SSO n’a pas pu être testé contre les vrais serveurs Google / Microsoft depuis l’environnement de développement (tests unitaires de la validation des jetons uniquement).
