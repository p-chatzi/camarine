// Administration: scientist requests, reports, users (roles, bans), audit log, security events.
// The server refuses all of it unless the admin has a second factor enabled.
import { useEffect, useState } from 'react';
import { api } from '../../forum/api';
import { forumHref } from '../../forum/router';
import type { ForumSession } from '../../forum/useForumSession';
import { AuthorLine, CARD, DANGER, ErrorText, Field, Notice, PRIMARY, PostBody, SECONDARY, Spinner, formatDate, useSubmit } from './ui';

type Tab = 'requests' | 'reports' | 'users' | 'audit' | 'security';

interface SciRequest {
  id: number;
  user: { id: number; name: string; email: string; created_at: string };
  institution: string;
  field: string;
  orcid: string;
  justification: string;
  created_at: string;
}

function useLoad<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () => void api<T>(path).then(setData, (err: Error) => setError(err.message));
  useEffect(load, [path]); // eslint-disable-line react-hooks/exhaustive-deps
  return { data, error, reload: load };
}

function Requests() {
  const { data, error, reload } = useLoad<SciRequest[]>('/admin/scientist-requests');
  const [notes, setNotes] = useState<Record<number, string>>({});
  const decide = useSubmit(async (id: number, decision: 'approve' | 'reject') => {
    await api(`/admin/scientist-requests/${id}`, { body: { decision, note: notes[id] ?? '' } });
    reload();
  });
  if (error) return <ErrorText>{error}</ErrorText>;
  if (!data) return <Spinner />;
  if (!data.length) return <Notice>Aucune demande en attente.</Notice>;
  return (
    <ul className="space-y-3">
      {data.map((r) => (
        <li key={r.id} className={`${CARD} p-4 space-y-2`}>
          <p className="font-bold text-slate-900">
            {r.user.name} <span className="font-normal text-slate-500">· {r.user.email} · inscrit {formatDate(r.user.created_at)}</span>
          </p>
          <p className="text-sm">
            <strong>{r.institution}</strong> — {r.field}
            {r.orcid && (
              <>
                {' '}
                · ORCID{' '}
                <a href={`https://orcid.org/${r.orcid}`} target="_blank" rel="noreferrer" className="underline">
                  {r.orcid}
                </a>
              </>
            )}
          </p>
          <PostBody text={r.justification} />
          <p className="text-xs text-slate-500">Vérifiez l’identité (ORCID, page de l’institution, e-mail professionnel) avant de valider.</p>
          <Field label="Note (envoyée à la personne en cas de refus)" value={notes[r.id] ?? ''} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} maxLength={500} />
          <div className="flex gap-2">
            <button className={PRIMARY} onClick={() => void decide.run(r.id, 'approve')}>
              Valider
            </button>
            <button className={DANGER} onClick={() => void decide.run(r.id, 'reject')}>
              Refuser
            </button>
          </div>
        </li>
      ))}
      <ErrorText>{decide.error}</ErrorText>
    </ul>
  );
}

function Reports() {
  const { data, error, reload } = useLoad<{ id: number; reason: string; created_at: string; post: { id: number; thread_id: number; body: string; status: string; author: { id: number | null; name: string; role: 'member' } } }[]>('/admin/reports');
  const resolve = useSubmit(async (id: number, action: 'dismiss' | 'hide') => {
    await api(`/admin/reports/${id}`, { body: { action } });
    reload();
  });
  if (error) return <ErrorText>{error}</ErrorText>;
  if (!data) return <Spinner />;
  if (!data.length) return <Notice>Aucun signalement ouvert.</Notice>;
  return (
    <ul className="space-y-3">
      {data.map((r) => (
        <li key={r.id} className={`${CARD} p-4 space-y-2`}>
          <p className="text-sm">
            <strong>Motif :</strong> {r.reason} <span className="text-slate-500">· {formatDate(r.created_at)}</span>
          </p>
          <div className="border-l-4 border-slate-200 pl-3">
            <AuthorLine author={r.post.author} date={r.created_at} />
            <PostBody text={r.post.body} />
          </div>
          <div className="flex flex-wrap gap-2">
            <a className={SECONDARY} href={forumHref(`sujet/${r.post.thread_id}`)}>
              Voir le sujet
            </a>
            <button className={DANGER} onClick={() => void resolve.run(r.id, 'hide')}>
              Masquer le message
            </button>
            <button className={SECONDARY} onClick={() => void resolve.run(r.id, 'dismiss')}>
              Classer sans suite
            </button>
          </div>
        </li>
      ))}
      <ErrorText>{resolve.error}</ErrorText>
    </ul>
  );
}

function Users({ selfId }: { selfId: number }) {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const { data, error, reload } = useLoad<{ id: number; name: string; email: string; email_verified: boolean; role: string; status: string; mfa: boolean; created_at: string; last_login_at: string | null }[]>(`/admin/users?q=${encodeURIComponent(query)}`);
  const update = useSubmit(async (id: number, body: Record<string, string>) => {
    await api(`/admin/users/${id}`, { body });
    reload();
  });
  return (
    <div className="space-y-3">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(q);
        }}
      >
        <div className="flex-1">
          <Field label="Rechercher (pseudo ou e-mail)" value={q} onChange={(e) => setQ(e.target.value)} maxLength={80} />
        </div>
        <button className={`${SECONDARY} self-end`}>Chercher</button>
      </form>
      {error && <ErrorText>{error}</ErrorText>}
      {!data ? (
        <Spinner />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="p-2">Compte</th>
                <th className="p-2">Rôle</th>
                <th className="p-2">MFA</th>
                <th className="p-2">Dernière connexion</th>
                <th className="p-2">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((u) => (
                <tr key={u.id}>
                  <td className="p-2">
                    <strong>{u.name}</strong>
                    <span className="block text-xs text-slate-500">
                      {u.email} {u.email_verified ? '' : '(non confirmé)'}
                    </span>
                  </td>
                  <td className="p-2">
                    <select
                      aria-label={`Rôle de ${u.name}`}
                      value={u.role}
                      disabled={u.id === selfId}
                      onChange={(e) => window.confirm(`Passer ${u.name} en « ${e.target.value} » ?`) && void update.run(u.id, { role: e.target.value })}
                      className="min-h-10 rounded-lg border border-slate-300 bg-white px-2"
                    >
                      <option value="member">Membre</option>
                      <option value="scientist">Scientifique</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="p-2">{u.mfa ? 'oui' : 'non'}</td>
                  <td className="p-2">{formatDate(u.last_login_at)}</td>
                  <td className="p-2">
                    {u.id !== selfId && (
                      <button
                        className={u.status === 'banned' ? SECONDARY : DANGER}
                        onClick={() => window.confirm(u.status === 'banned' ? `Réactiver ${u.name} ?` : `Suspendre ${u.name} ? Ses sessions seront fermées.`) && void update.run(u.id, { status: u.status === 'banned' ? 'active' : 'banned' })}
                      >
                        {u.status === 'banned' ? 'Réactiver' : 'Suspendre'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ErrorText>{update.error}</ErrorText>
    </div>
  );
}

function Audit() {
  const { data, error } = useLoad<{ id: number; actor: { name: string }; action: string; target: string; detail: string; at: string }[]>('/admin/audit');
  if (error) return <ErrorText>{error}</ErrorText>;
  if (!data) return <Spinner />;
  return (
    <ul className="text-sm divide-y divide-slate-100">
      {data.map((a) => (
        <li key={a.id} className="py-2">
          <strong>{a.actor.name}</strong> · {a.action} · {a.target} {a.detail && <span className="text-slate-500">— {a.detail}</span>}{' '}
          <span className="text-xs text-slate-400">{formatDate(a.at)}</span>
        </li>
      ))}
    </ul>
  );
}

function SecurityEvents() {
  const { data, error } = useLoad<{ id: number; user_id: number | null; event: string; ip: string; user_agent: string; detail: string; at: string }[]>('/admin/security-events');
  if (error) return <ErrorText>{error}</ErrorText>;
  if (!data) return <Spinner />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <tbody className="divide-y divide-slate-100">
          {data.map((e) => (
            <tr key={e.id}>
              <td className="p-1.5 whitespace-nowrap">{new Date(e.at).toLocaleString('fr-FR')}</td>
              <td className="p-1.5 font-semibold">{e.event}</td>
              <td className="p-1.5">{e.user_id ?? '—'}</td>
              <td className="p-1.5">{e.ip}</td>
              <td className="p-1.5 text-slate-500 max-w-64 truncate">{e.user_agent}</td>
              <td className="p-1.5">{e.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminPage({ session }: { session: ForumSession }) {
  const [tab, setTab] = useState<Tab>('requests');
  const { data: overview, error } = useLoad<{ scientist_requests: number; reports: number; pending_proposals: number; users: number }>('/admin/overview');
  if (session.user?.role !== 'admin') return <ErrorText>Réservé aux administrateurs.</ErrorText>;
  if (error)
    return (
      <div className="space-y-2">
        <ErrorText>{error}</ErrorText>
        <a href={forumHref('compte')} className={PRIMARY}>
          Activer la double authentification
        </a>
      </div>
    );
  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'requests', label: 'Demandes scientifiques', count: overview?.scientist_requests },
    { id: 'reports', label: 'Signalements', count: overview?.reports },
    { id: 'users', label: 'Utilisateurs', count: overview?.users },
    { id: 'audit', label: 'Journal d’audit' },
    { id: 'security', label: 'Sécurité' },
  ];
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-slate-900">Administration</h1>
      {overview && overview.pending_proposals > 0 && <Notice>{overview.pending_proposals} proposition(s) de réponse attendent un scientifique.</Notice>}
      <div role="tablist" aria-label="Administration" className="flex flex-wrap gap-1">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={`tap min-h-10 px-3 rounded-xl text-sm font-semibold ${tab === t.id ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}>
            {t.label}
            {t.count ? ` (${t.count})` : ''}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {tab === 'requests' && <Requests />}
        {tab === 'reports' && <Reports />}
        {tab === 'users' && <Users selfId={session.user.id} />}
        {tab === 'audit' && <Audit />}
        {tab === 'security' && <SecurityEvents />}
      </div>
    </div>
  );
}
