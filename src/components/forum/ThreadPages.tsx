// Category (list of threads + new thread), thread (messages, Q&A answers and proposals), search.
import { CheckCircle2, Clock, Flag, MessageSquarePlus, Pencil, Trash2, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api, type PostData, type ThreadData, type ThreadSummary } from '../../forum/api';
import { forumHref, go } from '../../forum/router';
import type { ForumSession } from '../../forum/useForumSession';
import { Breadcrumb, ThreadFlags, useCategories } from './ForumView';
import { AuthorLine, CARD, DANGER, ErrorText, Field, Notice, PRIMARY, PostBody, SECONDARY, Spinner, TextArea, formatDate, useSubmit } from './ui';

interface CategoryResponse {
  category: { slug: string; parent: string | null; title: string; description: string; kind: 'qa' | 'discussion' | 'group'; species_id: string | null };
  page: number;
  pages: number;
  threads: ThreadSummary[];
}

function WriteGate({ session, children }: { session: ForumSession; children: React.ReactNode }) {
  if (!session.user)
    return (
      <Notice>
        <a href={forumHref('connexion')} className="font-semibold underline">
          Connectez-vous
        </a>{' '}
        ou{' '}
        <a href={forumHref('inscription')} className="font-semibold underline">
          créez un compte
        </a>{' '}
        pour écrire.
      </Notice>
    );
  if (!session.user.email_verified) return <Notice tone="warning">Confirmez votre adresse e-mail pour écrire.</Notice>;
  return <>{children}</>;
}

function NewThreadForm({ slug, isQa, onCancel }: { slug: string; isQa: boolean; onCancel: () => void }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const send = useSubmit(async () => {
    const { id } = await api<{ id: number }>(`/categories/${slug}/threads`, { body: { title, body } });
    go(`sujet/${id}`);
  });
  return (
    <form onSubmit={send.submit} className={`${CARD} p-4 space-y-3`}>
      <h2 className="font-bold text-slate-900">{isQa ? 'Poser une question' : 'Nouveau sujet'}</h2>
      <Field label="Titre" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={8} maxLength={160} placeholder={isQa ? 'ex. Pourquoi le corail rouge meurt-il après une canicule ?' : ''} />
      <TextArea label={isQa ? 'Votre question, avec le contexte' : 'Message'} value={body} onChange={(e) => setBody(e.target.value)} required rows={6} maxLength={10000} hint="Texte simple ; les liens http(s) deviennent cliquables." />
      <ErrorText>{send.error}</ErrorText>
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={send.busy} className={PRIMARY}>
          Publier
        </button>
        <button type="button" onClick={onCancel} className={SECONDARY}>
          Annuler
        </button>
      </div>
    </form>
  );
}

export function CategoryPage({ slug, session, page }: { slug: string; session: ForumSession; page: number }) {
  const [data, setData] = useState<CategoryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);
  const { cats } = useCategories();
  useEffect(() => {
    setData(null);
    api<CategoryResponse>(`/categories/${encodeURIComponent(slug)}?page=${page}`).then(setData, (err: Error) => setError(err.message));
  }, [slug, page]);
  if (error) return <ErrorText>{error}</ErrorText>;
  if (!data) return <Spinner />;
  const { category } = data;
  const parent = cats?.find((c) => c.slug === category.parent);
  const grandParent = parent ? cats?.find((c) => c.slug === parent.parent) : undefined;
  const isQa = category.kind === 'qa';

  return (
    <div className="space-y-4">
      <Breadcrumb items={[{ label: 'Forum', href: forumHref() }, ...(grandParent ? [{ label: grandParent.title }] : []), ...(parent ? [{ label: parent.title }] : []), { label: category.title }]} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900">{category.title}</h1>
          <p className={`text-sm text-slate-600 ${category.species_id ? 'italic' : ''}`}>{category.description}</p>
          {isQa && <p className="mt-1 text-sm text-slate-600">Les scientifiques validés répondent ; chacun peut proposer une réponse, qu’un scientifique validera.</p>}
        </div>
        {category.kind !== 'group' && !writing && session.user?.email_verified && (
          <button onClick={() => setWriting(true)} className={PRIMARY}>
            <MessageSquarePlus className="w-4 h-4" aria-hidden="true" /> {isQa ? 'Poser une question' : 'Nouveau sujet'}
          </button>
        )}
      </div>
      {category.kind !== 'group' && (writing ? <NewThreadForm slug={slug} isQa={isQa} onCancel={() => setWriting(false)} /> : <WriteGate session={session}>{null}</WriteGate>)}
      <ul className={`${CARD} divide-y divide-slate-100 overflow-hidden`}>
        {data.threads.length === 0 && <li className="p-6 text-center text-sm text-slate-500">Aucun sujet pour l’instant. Lancez la discussion !</li>}
        {data.threads.map((t) => (
          <li key={t.id}>
            <a href={forumHref(`sujet/${t.id}`)} className={`flex items-center justify-between gap-3 px-4 py-3 min-h-14 hover:bg-sky-50/70 ${t.hidden ? 'opacity-60' : ''}`}>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 font-semibold text-slate-900">
                  <ThreadFlags pinned={t.pinned} locked={t.locked} />
                  <span className="truncate">{t.title}</span>
                </span>
                <span className="block text-xs text-slate-500">
                  {t.author.name} · {formatDate(t.created_at)}
                </span>
              </span>
              <span className="shrink-0 flex items-center gap-2 text-xs text-slate-500">
                {isQa && (t.answered ? <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">Répondu</span> : <span className="px-2 py-0.5 rounded-full bg-slate-100 font-semibold">En attente</span>)}
                <span>
                  {t.replies} rép.
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
      {data.pages > 1 && (
        <nav aria-label="Pages" className="flex justify-center gap-2">
          {page > 1 && (
            <a className={SECONDARY} href={forumHref(`rubrique/${slug}?page=${page - 1}`)}>
              Précédent
            </a>
          )}
          <span className="self-center text-sm text-slate-600">
            Page {page} / {data.pages}
          </span>
          {page < data.pages && (
            <a className={SECONDARY} href={forumHref(`rubrique/${slug}?page=${page + 1}`)}>
              Suivant
            </a>
          )}
        </nav>
      )}
    </div>
  );
}

function PostCard({ post, session, onChange, label }: { post: PostData; session: ForumSession; onChange: () => void; label?: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post.body);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState('');
  const [reported, setReported] = useState(false);
  const action = useSubmit(async (fn: () => Promise<unknown>) => {
    await fn();
    onChange();
  });
  const run = (fn: () => Promise<unknown>) => void action.run(fn);
  const isAdmin = session.user?.role === 'admin';
  const tone = post.status === 'pending' ? 'border-amber-300 bg-amber-50/40' : post.status === 'rejected' ? 'border-rose-200 bg-rose-50/40' : post.kind === 'answer' ? 'border-emerald-200' : 'border-slate-200';

  return (
    <article className={`bg-white border rounded-2xl p-4 space-y-2 ${tone}`} aria-label={label}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <AuthorLine author={post.author} date={post.created_at} />
        <span className="flex flex-wrap items-center gap-1.5 text-xs">
          {post.kind === 'answer' && post.validated_by && (
            <span className="inline-flex items-center gap-1 text-emerald-800 font-semibold">
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Validée par {post.validated_by.name}
            </span>
          )}
          {post.status === 'pending' && (
            <span className="inline-flex items-center gap-1 text-amber-800 font-semibold">
              <Clock className="w-4 h-4" aria-hidden="true" /> Proposition en attente de validation
            </span>
          )}
          {post.status === 'rejected' && (
            <span className="inline-flex items-center gap-1 text-rose-700 font-semibold">
              <XCircle className="w-4 h-4" aria-hidden="true" /> Proposition non retenue
            </span>
          )}
          {post.edited_at && post.status !== 'deleted' && <span className="text-slate-400">modifié</span>}
        </span>
      </div>
      {post.status === 'deleted' ? (
        <p className="text-sm italic text-slate-400">Message supprimé.</p>
      ) : post.status === 'hidden' && !isAdmin ? (
        <p className="text-sm italic text-slate-400">Message masqué par la modération.</p>
      ) : editing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              await api(`/posts/${post.id}`, { method: 'PATCH', body: { body: draft } });
              setEditing(false);
            });
          }}
          className="space-y-2"
        >
          <TextArea label="Modifier le message" value={draft} onChange={(e) => setDraft(e.target.value)} rows={5} maxLength={10000} />
          <div className="flex gap-2">
            <button className={PRIMARY}>Enregistrer</button>
            <button type="button" className={SECONDARY} onClick={() => setEditing(false)}>
              Annuler
            </button>
          </div>
        </form>
      ) : (
        <>
          {post.status === 'hidden' && <p className="text-xs font-bold text-rose-700">Masqué au public (vous le voyez en tant qu’admin)</p>}
          <PostBody text={post.body} />
        </>
      )}
      <ErrorText>{action.error}</ErrorText>
      {post.status !== 'deleted' && !editing && (
        <div className="flex flex-wrap gap-2 pt-1">
          {post.can_validate && (
            <>
              <button className={`${PRIMARY} !bg-emerald-700 hover:!bg-emerald-800`} onClick={() => run(() => api(`/posts/${post.id}/validate`, { body: {} }))}>
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Valider la réponse
              </button>
              <button className={DANGER} onClick={() => run(() => api(`/posts/${post.id}/reject`, { body: { note: '' } }))}>
                Refuser
              </button>
            </>
          )}
          {post.can_edit && (
            <button className={SECONDARY} onClick={() => setEditing(true)}>
              <Pencil className="w-4 h-4" aria-hidden="true" /> Modifier
            </button>
          )}
          {(post.can_edit || isAdmin) && (
            <button className={SECONDARY} onClick={() => window.confirm('Supprimer ce message ?') && run(() => api(`/posts/${post.id}/delete`, { body: {} }))}>
              <Trash2 className="w-4 h-4" aria-hidden="true" /> Supprimer
            </button>
          )}
          {isAdmin && post.status === 'published' && (
            <button className={SECONDARY} onClick={() => run(() => api(`/admin/posts/${post.id}/hide`, { body: {} }))}>
              Masquer
            </button>
          )}
          {isAdmin && post.status === 'hidden' && (
            <button className={SECONDARY} onClick={() => run(() => api(`/admin/posts/${post.id}/unhide`, { body: {} }))}>
              Rétablir
            </button>
          )}
          {session.user?.email_verified && post.author.id !== session.user.id && post.status === 'published' && !reported && (
            <button className={`${SECONDARY} !text-slate-500`} onClick={() => setReporting((v) => !v)} aria-expanded={reporting}>
              <Flag className="w-4 h-4" aria-hidden="true" /> Signaler
            </button>
          )}
          {reported && <span className="self-center text-xs text-slate-500">Signalement envoyé, merci.</span>}
        </div>
      )}
      {reporting && (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              await api(`/posts/${post.id}/report`, { body: { reason } });
              setReporting(false);
              setReported(true);
            });
          }}
        >
          <div className="flex-1 min-w-48">
            <Field label="Pourquoi ?" value={reason} onChange={(e) => setReason(e.target.value)} minLength={5} maxLength={500} required placeholder="Insultant, faux, publicité, hors sujet…" />
          </div>
          <button className={PRIMARY}>Envoyer</button>
        </form>
      )}
    </article>
  );
}

export function ThreadPage({ id, session }: { id: number; session: ForumSession }) {
  const [data, setData] = useState<ThreadData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const { cats } = useCategories();
  const load = useCallback(() => {
    api<ThreadData>(`/threads/${id}`).then(setData, (err: Error) => setError(err.message));
  }, [id]);
  useEffect(load, [load]);
  const send = useSubmit(async () => {
    const res = await api<{ status: string }>(`/threads/${id}/posts`, { body: { body: reply } });
    setReply('');
    setNotice(res.status === 'pending' ? 'Merci ! Votre proposition sera visible de tous dès qu’un scientifique l’aura validée.' : null);
    load();
  });
  const flags = useSubmit(async (body: Record<string, boolean>) => {
    await api(`/admin/threads/${id}`, { body });
    load();
  });

  if (error) return <ErrorText>{error}</ErrorText>;
  if (!data) return <Spinner />;
  const { thread } = data;
  const isQa = thread.category.kind === 'qa';
  const parent = cats?.find((c) => c.slug === thread.category.parent);
  const [first, ...rest] = data.posts;
  const answers = rest.filter((p) => !isQa || p.kind === 'answer');
  const proposals = isQa ? rest.filter((p) => p.kind === 'proposal') : [];
  const isAdmin = session.user?.role === 'admin';
  const modeLabel = { answer: 'Répondre (réponse de scientifique, publiée directement)', proposal: 'Proposer une réponse (publiée après validation par un scientifique)', message: 'Répondre' }[data.reply_mode];

  return (
    <div className="space-y-4">
      <Breadcrumb items={[{ label: 'Forum', href: forumHref() }, ...(parent ? [{ label: parent.title }] : []), { label: thread.category.title, href: forumHref(`rubrique/${thread.category.slug}`) }]} />
      <h1 className="flex items-start gap-2 text-2xl font-black text-slate-900 break-words">
        <ThreadFlags pinned={thread.pinned} locked={thread.locked} />
        {thread.title}
      </h1>
      {isAdmin && (
        <div className="flex flex-wrap gap-2" aria-label="Modération du sujet">
          <button className={SECONDARY} onClick={() => void flags.run({ locked: !thread.locked })}>
            {thread.locked ? 'Déverrouiller' : 'Verrouiller'}
          </button>
          <button className={SECONDARY} onClick={() => void flags.run({ pinned: !thread.pinned })}>
            {thread.pinned ? 'Désépingler' : 'Épingler'}
          </button>
          <button className={DANGER} onClick={() => void flags.run({ hidden: !thread.hidden })}>
            {thread.hidden ? 'Rendre visible' : 'Masquer le sujet'}
          </button>
          <ErrorText>{flags.error}</ErrorText>
        </div>
      )}
      {first && <PostCard post={first} session={session} onChange={load} label={isQa ? 'Question' : 'Premier message'} />}

      {isQa && (
        <h2 className="pt-2 text-lg font-bold text-slate-900">
          {answers.length ? `${answers.length} réponse${answers.length > 1 ? 's' : ''}` : 'Pas encore de réponse validée'}
        </h2>
      )}
      {answers.map((p) => (
        <PostCard key={p.id} post={p} session={session} onChange={load} />
      ))}
      {proposals.length > 0 && (
        <section className="space-y-3" aria-labelledby="proposals-title">
          <h2 id="proposals-title" className="pt-2 text-lg font-bold text-slate-900">
            Propositions de réponse
          </h2>
          <p className="text-sm text-slate-500">Visibles par leur auteur et par les scientifiques, jusqu’à validation.</p>
          {proposals.map((p) => (
            <PostCard key={p.id} post={p} session={session} onChange={load} />
          ))}
        </section>
      )}

      {thread.locked && !isAdmin ? (
        <Notice>Ce sujet est verrouillé.</Notice>
      ) : (
        <WriteGate session={session}>
          <form onSubmit={send.submit} className={`${CARD} p-4 space-y-3`}>
            <TextArea label={modeLabel} value={reply} onChange={(e) => setReply(e.target.value)} rows={5} maxLength={10000} required />
            <ErrorText>{send.error}</ErrorText>
            {notice && <Notice tone="success">{notice}</Notice>}
            <button type="submit" disabled={send.busy || reply.trim().length < 2} className={PRIMARY}>
              {data.reply_mode === 'proposal' ? 'Proposer' : 'Publier'}
            </button>
          </form>
        </WriteGate>
      )}
    </div>
  );
}

export function SearchPage({ q }: { q: string }) {
  const [results, setResults] = useState<{ id: number; title: string; category: string; last_activity_at: string }[] | null>(null);
  useEffect(() => {
    setResults(null);
    api<typeof results>(`/search?q=${encodeURIComponent(q)}`).then(setResults, () => setResults([]));
  }, [q]);
  return (
    <div className="space-y-3">
      <Breadcrumb items={[{ label: 'Forum', href: forumHref() }, { label: `Recherche « ${q} »` }]} />
      {!results ? (
        <Spinner />
      ) : results.length === 0 ? (
        <Notice>Aucun sujet ne correspond.</Notice>
      ) : (
        <ul className={`${CARD} divide-y divide-slate-100 overflow-hidden`}>
          {results.map((r) => (
            <li key={r.id}>
              <a href={forumHref(`sujet/${r.id}`)} className="block px-4 py-3 hover:bg-sky-50/70">
                <span className="block font-semibold text-slate-900">{r.title}</span>
                <span className="block text-xs text-slate-500">
                  {r.category} · {formatDate(r.last_activity_at)}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
