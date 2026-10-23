// Login (+ second factor), sign-up, e-mail confirmation, forgotten / new password.
import { Eye, EyeOff, KeyRound, Smartphone, Ticket } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { api, type Me } from '../../forum/api';
import { startProofOfWork, type SolvedPow } from '../../forum/pow';
import { forumHref, go } from '../../forum/router';
import type { ForumSession } from '../../forum/useForumSession';
import { loginWithSecurityKey, webauthnSupported } from '../../forum/webauthn';
import { CARD, ErrorText, Field, INPUT, Notice, PRIMARY, SECONDARY, Spinner, useSubmit } from './ui';

const PASSWORD_MAX = 256;

const SSO_ERRORS: Record<string, string> = {
  'sso-annule': 'Connexion annulée.',
  'sso-session-expiree': 'La connexion a expiré ou a été ouverte dans un autre navigateur : recommencez.',
  'sso-jeton-invalide': 'La réponse du fournisseur n’a pas pu être vérifiée : recommencez.',
  'sso-refuse': 'Le fournisseur a refusé la connexion.',
  'sso-indisponible': 'Ce mode de connexion n’est pas disponible.',
  'sso-email-existant': 'Un compte existe déjà avec cette adresse : connectez-vous avec votre mot de passe, puis liez ce fournisseur depuis « Mon compte ».',
  'sso-deja-lie': 'Ce compte Google / Microsoft est déjà lié à un autre compte Camarine.',
  'sso-sans-email': 'Le fournisseur n’a pas communiqué d’adresse e-mail.',
  'sso-limite': 'Trop de comptes créés depuis cette connexion aujourd’hui.',
  'sso-compte-suspendu': 'Ce compte est suspendu.',
};

export function PasswordField({ label, value, onChange, autoComplete, hint }: { label: string; value: string; onChange: (v: string) => void; autoComplete: string; hint?: string }) {
  const [show, setShow] = useState(false);
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-slate-800 mb-1">
        {label}
      </label>
      <span className="relative block">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          maxLength={PASSWORD_MAX}
          required
          aria-describedby={hint ? `${id}-hint` : undefined}
          className={`${INPUT} pr-12`}
        />
        <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} aria-pressed={show} className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center text-slate-500 hover:text-slate-800">
          {show ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
        </button>
      </span>
      {hint && (
        <span id={`${id}-hint`} className="block mt-1 text-xs text-slate-500">
          {hint}
        </span>
      )}
    </div>
  );
}

export function SsoButtons({ session, intent = 'login' }: { session: ForumSession; intent?: 'login' | 'link' }) {
  const start = useSubmit(async (provider: string) => {
    const { url } = await api<{ url: string }>(`/auth/sso/${provider}/start`, { body: { intent } });
    window.location.assign(url);
  });
  const providers = session.me?.providers ?? [];
  if (!providers.length) return null;
  return (
    <div className="space-y-2">
      {providers.map((p) => (
        <button key={p.id} type="button" onClick={() => void start.run(p.id)} disabled={start.busy} className={`${SECONDARY} w-full`}>
          {intent === 'link' ? `Lier mon compte ${p.label}` : `Continuer avec ${p.label}`}
        </button>
      ))}
      <ErrorText>{start.error}</ErrorText>
    </div>
  );
}

function SecondFactor({ session, initialMethods }: { session: ForumSession; initialMethods: string[] | null }) {
  const [methods, setMethods] = useState<string[] | null>(initialMethods);
  const [mode, setMode] = useState<'totp' | 'webauthn' | 'recovery'>('totp');
  const [code, setCode] = useState('');
  useEffect(() => {
    if (methods) return;
    api<{ methods: string[] }>('/auth/mfa/methods').then((r) => setMethods(r.methods), () => setMethods([]));
  }, [methods]);
  useEffect(() => {
    if (methods && !methods.includes('totp')) setMode(methods.includes('webauthn') ? 'webauthn' : 'recovery');
  }, [methods]);
  const done = async () => {
    await session.refresh();
    go('');
  };
  const verify = useSubmit(async () => {
    if (mode === 'webauthn') await loginWithSecurityKey();
    else await api(`/auth/mfa/${mode}`, { body: { code } });
    await done();
  });
  if (!methods) return <Spinner />;
  if (!methods.length) return <ErrorText>La connexion a expiré : recommencez.</ErrorText>;
  const tabs = [
    { id: 'totp', label: 'Application', icon: Smartphone },
    { id: 'webauthn', label: 'Clé / passkey', icon: KeyRound },
    { id: 'recovery', label: 'Code de secours', icon: Ticket },
  ].filter((t) => methods.includes(t.id)) as { id: typeof mode; label: string; icon: typeof Smartphone }[];

  return (
    <form onSubmit={verify.submit} className="space-y-4">
      <h2 className="text-lg font-bold text-slate-900">Double authentification</h2>
      {tabs.length > 1 && (
        <div role="group" aria-label="Méthode" className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-100">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" aria-pressed={mode === id} onClick={() => setMode(id)} className={`tap min-h-10 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 ${mode === id ? 'bg-white shadow-sm text-sky-900' : 'text-slate-600'}`}>
              <Icon className="w-4 h-4" aria-hidden="true" /> {label}
            </button>
          ))}
        </div>
      )}
      {mode === 'totp' && (
        <Field label="Code à 6 chiffres de votre application" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} required autoFocus />
      )}
      {mode === 'recovery' && <Field label="Un de vos codes de secours" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" maxLength={20} required autoFocus />}
      {mode === 'webauthn' && <p className="text-sm text-slate-600">{webauthnSupported() ? 'Branchez ou touchez votre clé, ou utilisez la passkey de votre appareil.' : 'Ce navigateur ne gère pas les clés de sécurité.'}</p>}
      <ErrorText>{verify.error}</ErrorText>
      <button type="submit" disabled={verify.busy} className={`${PRIMARY} w-full`}>
        {mode === 'webauthn' ? 'Utiliser ma clé' : 'Valider'}
      </button>
    </form>
  );
}

export function LoginPage({ session, query }: { session: ForumSession; query: URLSearchParams }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfa, setMfa] = useState<string[] | null | 'ask'>(query.get('mfa') ? 'ask' : null);
  const login = useSubmit(async () => {
    const res = await api<{ status: string; methods?: string[] }>('/auth/login', { body: { email, password } });
    if (res.status === 'mfa') {
      setMfa(res.methods ?? []);
      return;
    }
    await session.refresh();
    go('');
  });
  const ssoError = SSO_ERRORS[query.get('erreur') ?? ''];
  if (session.user && !mfa) return <Notice tone="success">Vous êtes connecté·e en tant que {session.user.display_name}.</Notice>;

  return (
    <div className={`${CARD} max-w-md mx-auto p-5 sm:p-6 space-y-4`}>
      {mfa ? (
        <SecondFactor session={session} initialMethods={mfa === 'ask' ? null : mfa} />
      ) : (
        <>
          <h1 className="text-xl font-black text-slate-900">Connexion</h1>
          {ssoError && <ErrorText>{ssoError}</ErrorText>}
          <SsoButtons session={session} />
          {(session.me?.providers.length ?? 0) > 0 && <p className="text-center text-xs text-slate-500">ou avec votre e-mail</p>}
          <form onSubmit={login.submit} className="space-y-3">
            <Field label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required maxLength={254} />
            <PasswordField label="Mot de passe" value={password} onChange={setPassword} autoComplete="current-password" />
            <ErrorText>{login.error}</ErrorText>
            <button type="submit" disabled={login.busy} className={`${PRIMARY} w-full`}>
              Se connecter
            </button>
          </form>
          <p className="flex flex-wrap justify-between gap-2 text-sm">
            <a href={forumHref('mot-de-passe-oublie')} className="text-sky-700 underline underline-offset-2">
              Mot de passe oublié ?
            </a>
            <a href={forumHref('inscription')} className="text-sky-700 underline underline-offset-2">
              Créer un compte
            </a>
          </p>
        </>
      )}
    </div>
  );
}

/** Starts the discreet anti-bot work as soon as the form is shown. */
function useProofOfWork(purpose: 'signup' | 'reset') {
  const promise = useRef<Promise<SolvedPow> | null>(null);
  const start = () => {
    promise.current = startProofOfWork(purpose);
    promise.current.catch(() => undefined);
  };
  useEffect(start, []); // eslint-disable-line react-hooks/exhaustive-deps
  return async () => {
    try {
      return await promise.current!;
    } catch {
      start(); // challenge expired or server restarted: try once more
      return promise.current!;
    }
  };
}

export function SignupPage({ session }: { session: ForumSession }) {
  const [form, setForm] = useState({ display_name: '', email: '', password: '', accept: false, website: '' });
  const [sent, setSent] = useState<string | null>(null);
  const shownAt = useRef(Date.now());
  const getPow = useProofOfWork('signup');
  const signup = useSubmit(async () => {
    const pow = await getPow();
    const res = await api<{ message: string }>('/auth/register', { body: { ...form, pow, elapsed_ms: Date.now() - shownAt.current } });
    setSent(res.message);
  });
  const set = (k: keyof typeof form) => (v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));
  if (session.user) return <Notice>Vous avez déjà un compte : {session.user.display_name}.</Notice>;
  if (sent)
    return (
      <div className={`${CARD} max-w-md mx-auto p-6 space-y-3`}>
        <h1 className="text-xl font-black text-slate-900">Vérifiez vos e-mails</h1>
        <Notice tone="success">{sent}</Notice>
        <p className="text-sm text-slate-600">Cliquez sur le lien reçu pour activer votre compte (pensez aux indésirables). Sans confirmation, le compte est supprimé au bout de 7 jours.</p>
      </div>
    );

  return (
    <div className={`${CARD} max-w-md mx-auto p-5 sm:p-6 space-y-4`}>
      <h1 className="text-xl font-black text-slate-900">Créer un compte</h1>
      <SsoButtons session={session} />
      {(session.me?.providers.length ?? 0) > 0 && <p className="text-center text-xs text-slate-500">ou avec votre e-mail</p>}
      <form onSubmit={signup.submit} className="space-y-3">
        <Field label="Pseudo (public)" value={form.display_name} onChange={(e) => set('display_name')(e.target.value)} autoComplete="nickname" required minLength={3} maxLength={30} hint="3 à 30 caractères : lettres, chiffres, espaces, . - _ '" />
        <Field label="E-mail (jamais affiché)" type="email" value={form.email} onChange={(e) => set('email')(e.target.value)} autoComplete="email" required maxLength={254} />
        <PasswordField
          label="Mot de passe"
          value={form.password}
          onChange={set('password')}
          autoComplete="new-password"
          hint={`12 à ${PASSWORD_MAX} caractères, tous autorisés (espaces, accents, emoji…). Une phrase de plusieurs mots est idéale. ${form.password.length ? `${form.password.length} caractère${form.password.length > 1 ? 's' : ''}.` : ''}`}
        />
        {/* Honeypot: hidden from humans and screen readers; bots fill every field. */}
        <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
          <label>
            Site web
            <input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set('website')(e.target.value)} name="website" />
          </label>
        </div>
        <label className="flex items-start gap-3 text-sm text-slate-700">
          <input type="checkbox" checked={form.accept} onChange={(e) => set('accept')(e.target.checked)} required className="mt-0.5 w-5 h-5 accent-sky-700" />
          <span>
            J’ai 15 ans ou plus et j’ai lu la{' '}
            <a href={forumHref('confidentialite')} target="_blank" rel="noreferrer" className="underline">
              politique de confidentialité
            </a>
            .
          </span>
        </label>
        <ErrorText>{signup.error}</ErrorText>
        <button type="submit" disabled={signup.busy} className={`${PRIMARY} w-full`}>
          {signup.busy ? 'Création…' : 'Créer mon compte'}
        </button>
      </form>
      <p className="text-sm">
        Déjà inscrit·e ?{' '}
        <a href={forumHref('connexion')} className="text-sky-700 underline underline-offset-2">
          Se connecter
        </a>
      </p>
    </div>
  );
}

export function VerifyPage({ session, token }: { session: ForumSession; token: string }) {
  const [state, setState] = useState<'busy' | 'ok' | string>('busy');
  const once = useRef(false);
  useEffect(() => {
    if (once.current) return;
    once.current = true;
    api<{ logged_in: boolean }>('/auth/verify-email', { body: { token } })
      .then(async () => {
        await session.refresh();
        setState('ok');
        window.history.replaceState(null, '', forumHref('verifier')); // drop the token from the address bar
      })
      .catch((err: Error) => setState(err.message));
  }, [token, session]);
  if (state === 'busy') return <Spinner label="Confirmation de votre adresse…" />;
  if (state !== 'ok') return <ErrorText>{state}</ErrorText>;
  return (
    <div className={`${CARD} max-w-md mx-auto p-6 space-y-3`}>
      <h1 className="text-xl font-black text-slate-900">Adresse confirmée</h1>
      <p className="text-sm text-slate-600">Votre compte est actif. Pensez à activer la double authentification dans « Mon compte ».</p>
      <div className="flex flex-wrap gap-2">
        <a href={forumHref()} className={PRIMARY}>
          Aller au forum
        </a>
        <a href={forumHref('compte')} className={SECONDARY}>
          Mon compte
        </a>
      </div>
    </div>
  );
}

export function ForgotPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState<string | null>(null);
  const getPow = useProofOfWork('reset');
  const send = useSubmit(async () => {
    const res = await api<{ message: string }>('/auth/password/forgot', { body: { email, pow: await getPow() } });
    setSent(res.message);
  });
  return (
    <form onSubmit={send.submit} className={`${CARD} max-w-md mx-auto p-5 sm:p-6 space-y-4`}>
      <h1 className="text-xl font-black text-slate-900">Mot de passe oublié</h1>
      {sent ? (
        <Notice tone="success">{sent}</Notice>
      ) : (
        <>
          <p className="text-sm text-slate-600">Recevez par e-mail un lien (valable 1 heure) pour choisir un nouveau mot de passe. Fonctionne aussi pour ajouter un mot de passe à un compte Google / Microsoft.</p>
          <Field label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required maxLength={254} />
          <ErrorText>{send.error}</ErrorText>
          <button type="submit" disabled={send.busy} className={`${PRIMARY} w-full`}>
            Envoyer le lien
          </button>
        </>
      )}
    </form>
  );
}

export function ResetPage({ token }: { token: string }) {
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const send = useSubmit(async () => {
    await api('/auth/password/reset', { body: { token, password } });
    setDone(true);
    window.history.replaceState(null, '', forumHref('nouveau-mot-de-passe'));
  });
  return (
    <form onSubmit={send.submit} className={`${CARD} max-w-md mx-auto p-5 sm:p-6 space-y-4`}>
      <h1 className="text-xl font-black text-slate-900">Nouveau mot de passe</h1>
      {done ? (
        <>
          <Notice tone="success">Mot de passe changé. Toutes vos sessions ont été fermées.</Notice>
          <a href={forumHref('connexion')} className={PRIMARY}>
            Se connecter
          </a>
        </>
      ) : (
        <>
          <PasswordField label="Nouveau mot de passe" value={password} onChange={setPassword} autoComplete="new-password" hint={`12 à ${PASSWORD_MAX} caractères, une phrase de plusieurs mots est idéale.`} />
          <ErrorText>{send.error}</ErrorText>
          <button type="submit" disabled={send.busy} className={`${PRIMARY} w-full`}>
            Enregistrer
          </button>
        </>
      )}
    </form>
  );
}

export type { Me };
