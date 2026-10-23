// "Mon compte": profile, scientist status, password, second factors, linked SSO accounts, sessions,
// and the RGPD rights (export, deletion).
import QRCode from 'qrcode';
import { Download, KeyRound, Laptop, ShieldCheck, Smartphone, Trash2 } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { api, type Me } from '../../forum/api';
import { forumHref, go } from '../../forum/router';
import type { ForumSession } from '../../forum/useForumSession';
import { addSecurityKey, webauthnSupported } from '../../forum/webauthn';
import { PasswordField, SsoButtons } from './AuthPages';
import { CARD, DANGER, ErrorText, Field, Notice, PRIMARY, SECONDARY, TextArea, formatDate, useSubmit } from './ui';

function Section({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <section className={`${CARD} p-4 sm:p-5 space-y-3`} aria-label={title}>
      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Password (or recent login for SSO-only accounts) asked before a sensitive change. */
function SudoField({ me, value, onChange }: { me: Me; value: string; onChange: (v: string) => void }) {
  if (!me.user?.has_password) return <p className="text-xs text-slate-500">Compte sans mot de passe : possible dans les 10 minutes suivant votre connexion.</p>;
  return <PasswordField label="Mot de passe actuel (confirmation)" value={value} onChange={onChange} autoComplete="current-password" />;
}

function RecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const text = codes.join('\n');
  return (
    <div className="space-y-2 border-2 border-amber-300 bg-amber-50 rounded-xl p-3">
      <p className="text-sm font-bold text-amber-950">Vos codes de secours : notez-les maintenant, ils ne seront plus affichés.</p>
      <p className="text-xs text-amber-900">Chaque code permet une connexion si vous perdez votre téléphone ou votre clé.</p>
      <ul className="grid grid-cols-2 gap-1 font-mono text-sm">
        {codes.map((c) => (
          <li key={c} className="bg-white rounded px-2 py-1 border border-amber-200">
            {c}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={SECONDARY} onClick={() => void navigator.clipboard?.writeText(text)}>
          Copier
        </button>
        <a className={SECONDARY} download="camarine-codes-de-secours.txt" href={`data:text/plain;charset=utf-8,${encodeURIComponent(`Codes de secours Camarine\n\n${text}\n`)}`}>
          Télécharger
        </a>
        <button type="button" className={PRIMARY} onClick={onDone}>
          C’est noté
        </button>
      </div>
    </div>
  );
}

function TotpSetup({ onDone }: { onDone: (me: Me) => void }) {
  const [setup, setSetup] = useState<{ secret: string; uri: string; qr: string } | null>(null);
  const [code, setCode] = useState('');
  const start = useSubmit(async () => {
    const res = await api<{ secret: string; uri: string }>('/me/totp/setup', { body: {} });
    setSetup({ ...res, qr: await QRCode.toDataURL(res.uri, { margin: 1, width: 200 }) });
  });
  const confirm = useSubmit(async () => onDone(await api<Me>('/me/totp/confirm', { body: { code } })));
  if (!setup)
    return (
      <button className={PRIMARY} onClick={() => void start.submit()} disabled={start.busy}>
        <Smartphone className="w-4 h-4" aria-hidden="true" /> Ajouter une application d’authentification
      </button>
    );
  return (
    <form onSubmit={confirm.submit} className="space-y-3 border border-slate-200 rounded-xl p-3">
      <p className="text-sm text-slate-700">
        Scannez ce QR code avec votre application (Google Authenticator, Microsoft Authenticator, Aegis, 2FAS, 1Password, Bitwarden…), puis tapez le code affiché.
      </p>
      <img src={setup.qr} alt="QR code à scanner avec votre application d’authentification" width={200} height={200} className="border border-slate-200 rounded-lg" />
      <details className="text-xs text-slate-600">
        <summary className="cursor-pointer">Impossible de scanner ? Clé à saisir</summary>
        <code className="block mt-1 break-all select-all bg-slate-50 p-2 rounded">{setup.secret}</code>
      </details>
      <Field label="Code à 6 chiffres" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={7} required />
      <ErrorText>{confirm.error}</ErrorText>
      <button className={PRIMARY} disabled={confirm.busy}>
        Activer
      </button>
    </form>
  );
}

function Security({ me, setMe }: { me: Me; setMe: (m: Me) => void }) {
  const mfa = me.mfa!;
  const [codes, setCodes] = useState<string[] | null>(null);
  const [keyName, setKeyName] = useState('');
  const [sudo, setSudo] = useState('');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [pwDone, setPwDone] = useState(false);
  const apply = (m: Me) => {
    setMe(m);
    if (m.recovery_codes?.length) setCodes(m.recovery_codes);
  };
  const addKey = useSubmit(async () => apply(await addSecurityKey(keyName.trim() || 'Clé de sécurité')));
  const act = useSubmit(async (path: string) => {
    apply(await api<Me>(path, { body: { password: sudo } }));
    setSudo('');
  });
  const changePw = useSubmit(async () => {
    setMe(await api<Me>('/me/password', { body: { current, new: next } }));
    setCurrent('');
    setNext('');
    setPwDone(true);
  });

  return (
    <>
      <Section title="Double authentification" icon={<ShieldCheck className="w-5 h-5 text-emerald-700" aria-hidden="true" />}>
        {mfa.enabled ? <Notice tone="success">Activée.</Notice> : <Notice tone="warning">Non activée : un mot de passe volé suffirait pour prendre votre compte.</Notice>}
        {codes && <RecoveryCodes codes={codes} onDone={() => setCodes(null)} />}
        <div className="space-y-2">
          <h3 className="font-semibold text-slate-800">Application d’authentification</h3>
          {mfa.totp ? <p className="text-sm text-slate-600">Activée.</p> : <TotpSetup onDone={apply} />}
        </div>
        <div className="space-y-2">
          <h3 className="font-semibold text-slate-800">Clés de sécurité et passkeys</h3>
          <p className="text-xs text-slate-500">YubiKey, Titan…, ou la passkey de votre téléphone / ordinateur (empreinte, visage, code).</p>
          <ul className="space-y-1">
            {mfa.webauthn.map((k) => (
              <li key={k.id} className="flex flex-wrap items-center justify-between gap-2 border border-slate-200 rounded-xl px-3 py-2 text-sm">
                <span>
                  <KeyRound className="inline w-4 h-4 mr-1 text-slate-500" aria-hidden="true" />
                  <strong>{k.name}</strong> <span className="text-slate-500">· ajoutée {formatDate(k.created_at)}{k.last_used_at ? ` · utilisée ${formatDate(k.last_used_at)}` : ''}</span>
                </span>
                <button className={DANGER} onClick={() => void act.run(`/me/webauthn/${k.id}/delete`)} aria-label={`Retirer la clé ${k.name}`}>
                  Retirer
                </button>
              </li>
            ))}
          </ul>
          {webauthnSupported() ? (
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-48">
                <Field label="Nom de la clé" value={keyName} onChange={(e) => setKeyName(e.target.value)} maxLength={60} placeholder="ex. YubiKey bleue, téléphone" />
              </div>
              <button className={SECONDARY} onClick={() => void addKey.submit()} disabled={addKey.busy}>
                <KeyRound className="w-4 h-4" aria-hidden="true" /> Ajouter une clé / passkey
              </button>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Ce navigateur ne gère pas les clés de sécurité.</p>
          )}
          <ErrorText>{addKey.error}</ErrorText>
        </div>
        {mfa.enabled && (
          <div className="space-y-2 border-t border-slate-100 pt-3">
            <h3 className="font-semibold text-slate-800">Codes de secours et désactivation</h3>
            <p className="text-sm text-slate-600">{mfa.recovery_remaining} code(s) de secours restant(s).</p>
            <SudoField me={me} value={sudo} onChange={setSudo} />
            <div className="flex flex-wrap gap-2">
              <button className={SECONDARY} onClick={() => void act.run('/me/recovery-codes')}>
                Nouveaux codes de secours
              </button>
              {mfa.totp && (
                <button className={DANGER} onClick={() => void act.run('/me/totp/disable')}>
                  Retirer l’application
                </button>
              )}
            </div>
            <ErrorText>{act.error}</ErrorText>
          </div>
        )}
      </Section>

      <Section title="Mot de passe">
        {me.user?.has_password ? (
          <form onSubmit={changePw.submit} className="space-y-3 max-w-md">
            <PasswordField label="Mot de passe actuel" value={current} onChange={setCurrent} autoComplete="current-password" />
            <PasswordField label="Nouveau mot de passe" value={next} onChange={setNext} autoComplete="new-password" hint="12 à 256 caractères ; vos autres sessions seront fermées." />
            <ErrorText>{changePw.error}</ErrorText>
            {pwDone && <Notice tone="success">Mot de passe changé.</Notice>}
            <button className={PRIMARY} disabled={changePw.busy}>
              Changer
            </button>
          </form>
        ) : (
          <p className="text-sm text-slate-600">
            Vous vous connectez avec Google / Microsoft. Pour ajouter un mot de passe : <a href={forumHref('mot-de-passe-oublie')} className="underline">« Mot de passe oublié »</a>.
          </p>
        )}
      </Section>
    </>
  );
}

function Sessions({ session }: { session: ForumSession }) {
  const [rows, setRows] = useState<{ id: number; current: boolean; created_at: string; last_seen_at: string; ip: string; user_agent: string; method: string }[]>([]);
  const load = () => void api<typeof rows>('/me/sessions').then(setRows, () => undefined);
  useEffect(load, []);
  const revoke = useSubmit(async (id: number) => {
    await api(`/me/sessions/${id}/revoke`, { body: {} });
    load();
  });
  const all = useSubmit(async () => {
    await api('/auth/logout-all', { body: {} });
    await session.refresh();
    go('connexion');
  });
  return (
    <Section title="Appareils connectés" icon={<Laptop className="w-5 h-5 text-slate-600" aria-hidden="true" />}>
      <ul className="space-y-1">
        {rows.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 border border-slate-200 rounded-xl px-3 py-2 text-sm">
            <span className="min-w-0">
              <span className="block truncate font-semibold text-slate-800">{s.user_agent || 'Navigateur inconnu'}</span>
              <span className="block text-xs text-slate-500">
                {s.ip} · connecté {formatDate(s.created_at)} ({s.method}) · actif {formatDate(s.last_seen_at)}
              </span>
            </span>
            {s.current ? <span className="text-xs font-bold text-emerald-700">Cet appareil</span> : (
              <button className={SECONDARY} onClick={() => void revoke.run(s.id)}>
                Déconnecter
              </button>
            )}
          </li>
        ))}
      </ul>
      <button className={DANGER} onClick={() => void all.submit()}>
        Déconnecter tous les appareils
      </button>
    </Section>
  );
}

function ScientistStatus({ me, setMe }: { me: Me; setMe: (m: Me) => void }) {
  const [form, setForm] = useState({ institution: '', field: '', orcid: '', justification: '' });
  const send = useSubmit(async () => setMe(await api<Me>('/me/scientist-request', { body: form })));
  const user = me.user!;
  if (user.role !== 'member') return <Notice tone="success">Statut : {user.role_label}. Vos réponses sont publiées directement et vous validez les propositions.</Notice>;
  const req = me.scientist_request;
  if (req?.status === 'pending') return <Notice>Demande envoyée le {formatDate(req.created_at)} : un administrateur va l’examiner.</Notice>;
  return (
    <form onSubmit={send.submit} className="space-y-3">
      {req?.status === 'rejected' && <Notice tone="warning">Demande précédente refusée{req.note ? ` : ${req.note}` : ''}.</Notice>}
      <p className="text-sm text-slate-600">Chercheur·se, ingénieur·e, gestionnaire d’aire marine… ? Demandez le statut scientifique : vos réponses seront publiées directement et vous validerez celles des autres. Un administrateur vérifie chaque demande.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Institution" value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} required maxLength={160} placeholder="ex. MIO, Ifremer, Parc national…" />
        <Field label="Domaine" value={form.field} onChange={(e) => setForm({ ...form, field: e.target.value })} required maxLength={160} placeholder="ex. écologie benthique" />
      </div>
      <Field label="ORCID (facultatif)" value={form.orcid} onChange={(e) => setForm({ ...form, orcid: e.target.value })} maxLength={40} placeholder="0000-0000-0000-0000" />
      <TextArea label="Votre activité (poste, publications, liens…)" value={form.justification} onChange={(e) => setForm({ ...form, justification: e.target.value })} required minLength={20} maxLength={2000} rows={4} />
      <ErrorText>{send.error}</ErrorText>
      <button className={PRIMARY} disabled={send.busy || !user.email_verified}>
        Envoyer la demande
      </button>
    </form>
  );
}

function Profile({ me, setMe }: { me: Me; setMe: (m: Me) => void }) {
  const user = me.user!;
  const [name, setName] = useState(user.display_name);
  const save = useSubmit(async () => setMe(await api<Me>('/me', { method: 'PATCH', body: { display_name: name } })));
  return (
    <form onSubmit={save.submit} className="space-y-3 max-w-md">
      <p className="text-sm text-slate-600">
        E-mail : <strong>{user.email}</strong> {user.email_verified ? '(confirmé, jamais affiché)' : '(à confirmer)'} · membre depuis {formatDate(user.created_at)}
      </p>
      <Field label="Pseudo" value={name} onChange={(e) => setName(e.target.value)} required minLength={3} maxLength={30} />
      <ErrorText>{save.error}</ErrorText>
      <button className={PRIMARY} disabled={save.busy || name === user.display_name}>
        Enregistrer
      </button>
    </form>
  );
}

function MyData({ me, session }: { me: Me; session: ForumSession }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const del = useSubmit(async () => {
    await api('/me/delete', { body: { password, confirm } });
    await session.refresh();
    go('');
  });
  return (
    <Section title="Mes données">
      <a href="/api/forum/me/export" download className={SECONDARY}>
        <Download className="w-4 h-4" aria-hidden="true" /> Télécharger mes données (JSON)
      </a>
      <details className="border border-rose-200 rounded-xl p-3">
        <summary className="cursor-pointer font-semibold text-rose-700">Supprimer mon compte</summary>
        <form onSubmit={del.submit} className="space-y-3 mt-3 max-w-md">
          <p className="text-sm text-slate-600">Le compte et vos données de connexion sont supprimés définitivement. Vos messages restent, signés « Compte supprimé ».</p>
          <SudoField me={me} value={password} onChange={setPassword} />
          <Field label="Tapez SUPPRIMER pour confirmer" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="off" />
          <ErrorText>{del.error}</ErrorText>
          <button className={DANGER} disabled={del.busy || confirm !== 'SUPPRIMER'}>
            <Trash2 className="w-4 h-4" aria-hidden="true" /> Supprimer définitivement
          </button>
        </form>
      </details>
    </Section>
  );
}

export function AccountPage({ session, query }: { session: ForumSession; query: URLSearchParams }) {
  const { me, setMe } = session;
  const unlink = useSubmit(async (id: number) => setMe(await api<Me>(`/me/identities/${id}/unlink`, { body: {} })));
  if (!me?.user)
    return (
      <Notice>
        <a href={forumHref('connexion')} className="underline font-semibold">
          Connectez-vous
        </a>{' '}
        pour gérer votre compte.
      </Notice>
    );
  const linked = query.get('lie');
  const available = me.providers.filter((p) => !me.identities?.some((i) => i.provider === p.id));
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-slate-900">Mon compte</h1>
      {linked && <Notice tone="success">Compte {linked === 'google' ? 'Google' : 'Microsoft'} lié.</Notice>}
      <Section title="Profil">
        <Profile me={me} setMe={setMe} />
      </Section>
      <Section title="Statut scientifique">
        <ScientistStatus me={me} setMe={setMe} />
      </Section>
      <Security me={me} setMe={setMe} />
      {(me.identities?.length || available.length) > 0 && (
        <Section title="Comptes liés (Google, Microsoft)">
          <ul className="space-y-1">
            {me.identities?.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 border border-slate-200 rounded-xl px-3 py-2 text-sm">
                <span>
                  <strong className="capitalize">{i.provider}</strong> {i.email && <span className="text-slate-500">· {i.email}</span>}
                </span>
                <button className={SECONDARY} onClick={() => void unlink.run(i.id)}>
                  Délier
                </button>
              </li>
            ))}
          </ul>
          <ErrorText>{unlink.error}</ErrorText>
          {available.length > 0 && <SsoButtons session={{ ...session, me: { ...me, providers: available } }} intent="link" />}
        </Section>
      )}
      <Sessions session={session} />
      <MyData me={me} session={session} />
    </div>
  );
}
