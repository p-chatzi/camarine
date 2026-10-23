// Tiny hash router for the forum: #/forum/<path>?<query>. Hash URLs can be shared and bookmarked,
// work without server configuration, and the token in "#/forum/verifier?token=…" never reaches the
// server logs (the fragment is not sent in HTTP requests).
import { useEffect, useState } from 'react';

export interface ForumRoute {
  /** e.g. ['sujet', '12'] for #/forum/sujet/12 */
  parts: string[];
  query: URLSearchParams;
}

export function parseHash(hash: string = window.location.hash): ForumRoute | null {
  const m = hash.match(/^#\/forum(?:\/([^?]*))?(?:\?(.*))?$/);
  if (!m) return null;
  return { parts: (m[1] ?? '').split('/').filter(Boolean).map(decodeURIComponent), query: new URLSearchParams(m[2] ?? '') };
}

export function forumHref(path = ''): string {
  return `#/forum${path ? `/${path}` : ''}`;
}

export function go(path = ''): void {
  window.location.hash = forumHref(path);
}

export function useForumRoute(): ForumRoute {
  const [route, setRoute] = useState<ForumRoute>(() => parseHash() ?? { parts: [], query: new URLSearchParams() });
  useEffect(() => {
    const onChange = () => {
      const next = parseHash();
      if (next) {
        setRoute(next);
        window.scrollTo?.({ top: 0 });
      }
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
