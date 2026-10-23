// Privacy notice of the forum (RGPD art. 12-14). Reached discreetly (forum footer, sign-up checkbox,
// "À propos"). Items marked "À compléter" must be filled before going online (see FORUM.md).
import type { ReactNode } from 'react';
import { forumHref } from '../../forum/router';
import { CARD } from './ui';

function H({ children }: { children: ReactNode }) {
  return <h2 className="pt-3 text-lg font-bold text-slate-900">{children}</h2>;
}

function Todo({ children }: { children: ReactNode }) {
  return <mark className="bg-amber-100 text-amber-950 px-1 rounded">[À compléter : {children}]</mark>;
}

export function PrivacyPage({ contact }: { contact?: string }) {
  return (
    <article className={`${CARD} p-5 sm:p-8 space-y-3 text-sm leading-relaxed text-slate-700 max-w-3xl`}>
      <h1 className="text-2xl font-black text-slate-900">Confidentialité &amp; RGPD</h1>
      <p>
        Cette page explique quelles données le forum de Camarine enregistre, pourquoi, combien de temps, et comment exercer vos droits (Règlement général sur la protection des données, « RGPD », et loi Informatique et Libertés). La carte et les autres
        sections de Camarine ne demandent aucun compte et n’enregistrent aucune donnée personnelle.
      </p>

      <H>Qui est responsable ?</H>
      <p>
        Responsable du traitement : <Todo>nom de la personne ou de l’association qui exploite le site, adresse</Todo>. Contact pour vos données :{' '}
        {contact ? <a href={`mailto:${contact}`} className="underline">{contact}</a> : <Todo>adresse e-mail dédiée (variable CAMARINE_PRIVACY_CONTACT)</Todo>}.
      </p>

      <H>Ce qui est enregistré, et pourquoi</H>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>
          <strong>Votre compte</strong> : adresse e-mail (jamais affichée), pseudo (public), mot de passe sous forme d’empreinte Argon2id (le mot de passe lui-même n’est jamais stocké), dates de création et de dernière connexion. Pour faire
          fonctionner le compte (base légale : exécution du service que vous demandez, art. 6-1-b RGPD).
        </li>
        <li>
          <strong>Double authentification</strong> : secret de l’application d’authentification (chiffré), clés publiques de vos clés de sécurité / passkeys, empreintes de vos codes de secours. Pour protéger votre compte (art. 6-1-b et 6-1-f).
        </li>
        <li>
          <strong>Connexion avec Google ou Microsoft</strong> (si vous la choisissez) : l’identifiant technique que le fournisseur nous transmet, votre e-mail et votre nom. Nous ne recevons jamais votre mot de passe Google / Microsoft.
        </li>
        <li>
          <strong>Vos messages</strong> : publics, signés de votre pseudo. <strong>Signalements</strong> : visibles des administrateurs seulement.
        </li>
        <li>
          <strong>Demande de statut scientifique</strong> : institution, domaine, ORCID, présentation. Visible des administrateurs seulement, pour vérifier votre statut.
        </li>
        <li>
          <strong>Journal de sécurité</strong> : date, adresse IP et navigateur des connexions, échecs de connexion et changements de sécurité. Pour détecter les intrusions et vous protéger (intérêt légitime, art. 6-1-f).
        </li>
        <li>
          <strong>Anti-abus</strong> : votre adresse IP est utilisée en mémoire, sans être enregistrée, pour limiter le nombre de comptes et de messages. La vérification anti-robot est un petit calcul fait par votre navigateur : aucun
          service tiers, aucun cookie.
        </li>
      </ul>

      <H>Combien de temps ?</H>
      <ul className="list-disc pl-5 space-y-1">
        <li>Compte : tant que vous le gardez ; supprimé 7 jours après l’inscription si l’adresse e-mail n’est jamais confirmée.</li>
        <li>Sessions de connexion : 7 jours sans activité, 30 jours au maximum.</li>
        <li>Journal de sécurité : 180 jours.</li>
        <li>Messages : tant que le forum existe ; à la suppression du compte, ils restent signés « Compte supprimé » (vous pouvez les supprimer un par un avant).</li>
      </ul>

      <H>Qui y a accès ?</H>
      <p>
        Les administrateurs du forum (avec double authentification obligatoire). Hébergeur : <Todo>nom et pays de l’hébergeur</Todo>. Envoi des e-mails : <Todo>prestataire SMTP</Todo>. Pour refuser les mots de passe connus dans des fuites, le
        serveur envoie au service « Have I Been Pwned » les 5 premiers caractères de l’empreinte SHA-1 du mot de passe choisi : ni le mot de passe, ni votre e-mail ne sont transmis. Aucune donnée n’est vendue ni utilisée pour de la publicité.
      </p>

      <H>Cookies</H>
      <p>
        Un seul cookie, strictement nécessaire : celui qui vous garde connecté·e (plus un cookie temporaire de quelques minutes pendant une connexion Google / Microsoft ou une double authentification). Pas de mesure d’audience, pas de
        publicité : ces cookies sont dispensés de consentement (art. 82 de la loi Informatique et Libertés).
      </p>

      <H>Vos droits</H>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          Accès et portabilité : <a href={forumHref('compte')} className="underline">Mon compte</a> → « Télécharger mes données ».
        </li>
        <li>Rectification : modifiez votre pseudo et vos messages vous-même.</li>
        <li>Effacement : « Mon compte » → « Supprimer mon compte ».</li>
        <li>Opposition, limitation, ou toute question : écrivez au contact ci-dessus (réponse sous un mois).</li>
        <li>
          Réclamation : auprès de la CNIL,{' '}
          <a href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noreferrer" className="underline">
            cnil.fr/plaintes
          </a>
          .
        </li>
      </ul>

      <H>Âge minimum</H>
      <p>15 ans (âge du consentement numérique en France). En dessous, l’accord d’un parent est nécessaire.</p>

      <H>Sécurité</H>
      <p>
        Connexion chiffrée (HTTPS), mots de passe en Argon2id, double authentification (application, clé de sécurité, passkey), secrets chiffrés, sessions révocables depuis « Mon compte », e-mail d’alerte à chaque changement sensible. En cas de
        violation de données présentant un risque, la CNIL est prévenue sous 72 heures et vous l’êtes aussi si le risque est élevé (art. 33-34 RGPD).
      </p>
      <p className="text-xs text-slate-400">Dernière mise à jour : <Todo>date de mise en ligne</Todo>.</p>
    </article>
  );
}
