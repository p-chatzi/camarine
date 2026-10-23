// All calls to /api/forum. Same origin only: the session is an HttpOnly cookie the page can't read.
// Every write carries `X-Camarine: 1` and, once logged in, the session's CSRF token (kept in memory,
// never in localStorage).
let csrfToken = '';

export function setCsrf(token: string): void {
  csrfToken = token;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function messageFor(status: number, detail: unknown): string {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return 'Champs invalides : vérifiez le formulaire.'; // pydantic 422
  if (status === 404 || status === 405) return `Le serveur ne connaît pas le forum (HTTP ${status}) : backend pas à jour ou pas redémarré ?`;
  if (status === 413) return 'Message trop long.';
  if (status === 429) return 'Trop de requêtes : patientez un peu.';
  if (status >= 500) return `Le serveur a rencontré une erreur (HTTP ${status}).`;
  return `Requête refusée (HTTP ${status}).`;
}

export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const method = options.method ?? (options.body === undefined ? 'GET' : 'POST');
  const headers: Record<string, string> = {};
  if (method !== 'GET') {
    headers['Content-Type'] = 'application/json';
    headers['X-Camarine'] = '1';
    if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
  }
  let response: Response;
  try {
    response = await fetch(`/api/forum${path}`, {
      method,
      headers,
      credentials: 'same-origin',
      body: method === 'GET' ? undefined : JSON.stringify(options.body ?? {}),
    });
  } catch {
    throw new ApiError(0, 'Serveur injoignable : vérifiez votre connexion.');
  }
  const data = response.headers.get('content-type')?.includes('application/json') ? await response.json() : null;
  if (!response.ok) throw new ApiError(response.status, messageFor(response.status, data?.detail));
  return data as T;
}

// ------------------------------------------------------------------ types

export type Role = 'member' | 'scientist' | 'admin' | 'deleted';

export interface Author {
  id: number | null;
  name: string;
  role: Role;
}

export interface Me {
  user: {
    id: number;
    email: string;
    email_verified: boolean;
    display_name: string;
    role: Exclude<Role, 'deleted'>;
    role_label: string;
    has_password: boolean;
    created_at: string;
  } | null;
  csrf?: string;
  mfa?: {
    enabled: boolean;
    totp: boolean;
    webauthn: { id: number; name: string; created_at: string; last_used_at: string | null }[];
    recovery_remaining: number;
  };
  identities?: { id: number; provider: string; email: string; created_at: string }[];
  scientist_request?: { status: 'pending' | 'approved' | 'rejected'; created_at: string; note: string } | null;
  providers: { id: string; label: string }[];
  /** Who to write to about personal data (CAMARINE_PRIVACY_CONTACT on the server). */
  privacy_contact?: string;
  recovery_codes?: string[];
}

export interface CategoryInfo {
  slug: string;
  parent: string | null;
  title: string;
  description: string;
  kind: 'qa' | 'discussion' | 'group';
  species_id: string | null;
  threads: number;
  last_activity_at: string | null;
}

export interface ThreadSummary {
  id: number;
  title: string;
  author: Author;
  created_at: string;
  last_activity_at: string;
  replies: number;
  answered: boolean;
  pinned: boolean;
  locked: boolean;
  hidden: boolean;
}

export interface PostData {
  id: number;
  kind: 'question' | 'answer' | 'proposal' | 'message';
  status: 'published' | 'pending' | 'rejected' | 'hidden' | 'deleted';
  body: string;
  author: Author;
  created_at: string;
  edited_at: string | null;
  validated_by: Author | null;
  validated_at: string | null;
  can_edit: boolean;
  can_validate: boolean;
}

export interface ThreadData {
  thread: {
    id: number;
    title: string;
    author: Author;
    created_at: string;
    locked: boolean;
    pinned: boolean;
    hidden: boolean;
    category: { slug: string; parent: string | null; title: string; kind: CategoryInfo['kind'] };
  };
  posts: PostData[];
  can_post: boolean;
  reply_mode: 'answer' | 'proposal' | 'message';
}

export interface PowChallenge {
  salt: string;
  exp: number;
  bits: number;
  purpose: string;
  sig: string;
}
