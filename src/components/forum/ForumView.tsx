// "Forum" section: layout + hash routing (#/forum/...) to every forum page.
// Reading is open to everyone; writing needs an account with a confirmed e-mail.
import { ChevronRight, Fish, Leaf, Lock, LogIn, LogOut, MessagesSquare, Pin, Search, Settings, ShieldCheck, UserPlus } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, type CategoryInfo } from '../../forum/api';
import { forumHref, go, useForumRoute } from '../../forum/router';
import { useForumSession, type ForumSession } from '../../forum/useForumSession';
import { AccountPage } from './AccountPage';
import { AdminPage } from './AdminPage';
import { ForgotPage, LoginPage, ResetPage, SignupPage, VerifyPage } from './AuthPages';
import { PrivacyPage } from './PrivacyPage';
import { CategoryPage, SearchPage, ThreadPage } from './ThreadPages';
import { CARD, ErrorText, Notice, SECONDARY, Spinner, formatDate, useSubmit } from './ui';

export function useCategories() {
  const [cats, setCats] = useState<CategoryInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<CategoryInfo[]>('/categories').then(setCats, (err: Error) => setError(err.message));
  }, []);
  return { cats, error };
}

function TopBar({ session }: { session: ForumSession }) {
  const { user } = session;
  const [q, setQ] = useState('');
  const logout = useSubmit(async () => {
    await api('/auth/logout', { body: {} });
    await session.refresh();
    go('');
  });

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <a href={forumHref()} className="flex items-center gap-2 text-xl sm:text-2xl font-black text-slate-900">
        <MessagesSquare className="w-6 h-6 text-sky-700" aria-hidden="true" /> Forum
      </a>
      <form
        role="search"
        className="order-3 sm:order-none w-full sm:w-auto sm:flex-1 sm:max-w-sm"
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim().length >= 3) go(`recherche?q=${encodeURIComponent(q.trim())}`);
        }}
      >
        <label className="relative block">
          <span className="sr-only">Rechercher dans le forum</span>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un sujet…" maxLength={80} className="w-full min-h-11 rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-sky-600" />
        </label>
      </form>
      <div className="flex items-center gap-2">
        {user ? (
          <>
            {user.role === 'admin' && (
              <a href={forumHref('admin')} className={SECONDARY} title="Administration">
                <ShieldCheck className="w-4 h-4" aria-hidden="true" /> <span className="hidden md:inline">Admin</span>
              </a>
            )}
            <a href={forumHref('compte')} className={SECONDARY}>
              <Settings className="w-4 h-4" aria-hidden="true" /> <span className="max-w-32 truncate">{user.display_name}</span>
            </a>
            <button onClick={() => void logout.submit()} className={SECONDARY} aria-label="Se déconnecter" title="Se déconnecter">
              <LogOut className="w-4 h-4" aria-hidden="true" />
            </button>
          </>
        ) : (
          <>
            <a href={forumHref('connexion')} className={SECONDARY}>
              <LogIn className="w-4 h-4" aria-hidden="true" /> Connexion
            </a>
            <a href={forumHref('inscription')} className={`${SECONDARY} !bg-sky-700 !text-white !border-sky-700 hover:!bg-sky-800`}>
              <UserPlus className="w-4 h-4" aria-hidden="true" /> <span className="hidden sm:inline">Créer un compte</span>
              <span className="sm:hidden">Inscription</span>
            </a>
          </>
        )}
      </div>
    </div>
  );
}

function UnverifiedBanner({ session }: { session: ForumSession }) {
  const resend = useSubmit(() => api('/auth/resend-verification', { body: {} }));
  const [sent, setSent] = useState(false);
  if (!session.user || session.user.email_verified) return null;
  return (
    <Notice tone="warning">
      Confirmez votre adresse e-mail pour pouvoir écrire (lien envoyé à {session.user.email}).{' '}
      {sent ? (
        <strong>Nouveau lien envoyé.</strong>
      ) : (
        <button className="underline font-semibold" onClick={async () => (await resend.submit()) !== undefined && setSent(true)}>
          Renvoyer le lien
        </button>
      )}
      {resend.error && <span className="block text-rose-700">{resend.error}</span>}
    </Notice>
  );
}

export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Fil d’Ariane" className="text-sm text-slate-500">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />}
            {it.href ? (
              <a href={it.href} className="hover:text-sky-800 underline-offset-2 hover:underline">
                {it.label}
              </a>
            ) : (
              <span aria-current="page" className="text-slate-800 font-semibold">
                {it.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function CategoryRow({ cat }: { cat: CategoryInfo }) {
  return (
    <a href={forumHref(`rubrique/${cat.slug}`)} className="flex items-center justify-between gap-3 px-4 py-3 min-h-14 hover:bg-sky-50/70 transition-colors">
      <span className="min-w-0">
        <span className="block font-bold text-slate-900">{cat.title}</span>
        {cat.description && <span className="block text-sm text-slate-500 line-clamp-2">{cat.description}</span>}
      </span>
      <span className="shrink-0 text-right text-xs text-slate-500">
        <span className="block font-semibold text-slate-700">
          {cat.threads} sujet{cat.threads > 1 ? 's' : ''}
        </span>
        {cat.last_activity_at && <span className="block">{formatDate(cat.last_activity_at)}</span>}
      </span>
    </a>
  );
}

function Home() {
  const { cats, error } = useCategories();
  const byParent = useMemo(() => {
    const map = new Map<string | null, CategoryInfo[]>();
    for (const c of cats ?? []) map.set(c.parent, [...(map.get(c.parent) ?? []), c]);
    return map;
  }, [cats]);
  if (error) return <ErrorText>{error}</ErrorText>;
  if (!cats) return <Spinner />;
  const top = byParent.get(null) ?? [];
  const speciesGroup = (slug: string) =>
    (byParent.get(slug) ?? []).map((c) => (
      <li key={c.slug}>
        <a href={forumHref(`rubrique/${c.slug}`)} className="flex items-center justify-between gap-2 px-3 py-2 min-h-11 rounded-xl hover:bg-sky-50">
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-slate-900 truncate">{c.title}</span>
            <span className="block text-xs italic text-slate-500 truncate">{c.description}</span>
          </span>
          <span className="text-xs text-slate-500 shrink-0">{c.threads}</span>
        </a>
      </li>
    ));

  return (
    <div className="space-y-4">
      {top.map((cat) =>
        cat.kind === 'group' ? (
          <section key={cat.slug} className={CARD} aria-labelledby={`cat-${cat.slug}`}>
            <h2 id={`cat-${cat.slug}`} className="px-4 pt-4 font-bold text-slate-900">
              {cat.title}
            </h2>
            <p className="px-4 text-sm text-slate-500">{cat.description}</p>
            <div className="grid md:grid-cols-2 gap-2 p-2">
              {(byParent.get(cat.slug) ?? []).map((group) => (
                <div key={group.slug}>
                  <h3 className="flex items-center gap-1.5 px-3 pt-2 pb-1 text-xs font-extrabold uppercase tracking-wider text-sky-800">
                    {group.slug.endsWith('faune') ? <Fish className="w-4 h-4" aria-hidden="true" /> : <Leaf className="w-4 h-4" aria-hidden="true" />}
                    {group.title}
                  </h3>
                  <ul>{speciesGroup(group.slug)}</ul>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section key={cat.slug} className={`${CARD} overflow-hidden`}>
            <CategoryRow cat={cat} />
          </section>
        ),
      )}
    </div>
  );
}

export function ThreadFlags({ pinned, locked }: { pinned: boolean; locked: boolean }) {
  return (
    <>
      {pinned && <Pin className="w-4 h-4 text-amber-600 shrink-0" aria-label="Épinglé" />}
      {locked && <Lock className="w-4 h-4 text-slate-500 shrink-0" aria-label="Verrouillé" />}
    </>
  );
}

function Page({ session }: { session: ForumSession }) {
  const route = useForumRoute();
  const [head, id] = route.parts;
  // Role, e-mail confirmation… may have changed meanwhile (admin decision, link opened in another tab).
  const { refresh } = session;
  useEffect(() => {
    void refresh();
  }, [head, refresh]);
  const pages: Record<string, () => ReactNode> = {
    '': () => <Home />,
    rubrique: () => <CategoryPage slug={id ?? ''} session={session} page={Number(route.query.get('page') || 1)} />,
    sujet: () => <ThreadPage id={Number(id)} session={session} />,
    recherche: () => <SearchPage q={route.query.get('q') ?? ''} />,
    connexion: () => <LoginPage session={session} query={route.query} />,
    inscription: () => <SignupPage session={session} />,
    verifier: () => <VerifyPage session={session} token={route.query.get('token') ?? ''} />,
    'mot-de-passe-oublie': () => <ForgotPage />,
    'nouveau-mot-de-passe': () => <ResetPage token={route.query.get('token') ?? ''} />,
    compte: () => <AccountPage session={session} query={route.query} />,
    admin: () => <AdminPage session={session} />,
    confidentialite: () => <PrivacyPage contact={session.me?.privacy_contact} />,
  };
  const render = pages[head ?? ''];
  return render ? <>{render()}</> : <ErrorText>Page introuvable.</ErrorText>;
}

export function ForumView() {
  const session = useForumSession();
  return (
    <main className="flex-1 overflow-y-auto w-full px-3 sm:px-4 lg:px-8 pb-10 pt-1">
      <div className="max-w-5xl mx-auto space-y-4">
        <TopBar session={session} />
        {session.error && <ErrorText>{session.error}</ErrorText>}
        <UnverifiedBanner session={session} />
        {session.me ? <Page session={session} /> : !session.error && <Spinner />}
        <footer className="pt-6 text-xs text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
          <a href={forumHref('confidentialite')} className="hover:text-slate-600 underline-offset-2 hover:underline">
            Confidentialité &amp; RGPD
          </a>
          <span>Pas de publicité, pas de traceur : un seul cookie, celui de la connexion.</span>
        </footer>
      </div>
    </main>
  );
}
