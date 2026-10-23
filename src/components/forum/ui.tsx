// Small building blocks shared by the forum pages (forms, badges, messages).
import { BadgeCheck, Loader2, ShieldCheck } from 'lucide-react';
import { useId, useState, type FormEvent, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import type { Author } from '../../forum/api';

export const INPUT = 'w-full min-h-11 bg-white border border-slate-300 rounded-xl px-3 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20';
export const BUTTON = 'tap min-h-11 inline-flex items-center justify-center gap-2 px-4 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
export const PRIMARY = `${BUTTON} bg-sky-700 hover:bg-sky-800 text-white`;
export const SECONDARY = `${BUTTON} bg-white border border-slate-300 text-slate-800 hover:bg-slate-50`;
export const DANGER = `${BUTTON} bg-white border border-rose-300 text-rose-700 hover:bg-rose-50`;
export const CARD = 'bg-white border border-slate-200 rounded-2xl shadow-xs';

/** Label + input; the hint and the error are linked with aria-describedby (not part of the name). */
export function Field({ label, hint, error, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: ReactNode; error?: string | null }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-slate-800 mb-1">
        {label}
      </label>
      <input {...props} id={id} aria-invalid={!!error || undefined} aria-describedby={hint || error ? `${id}-desc` : undefined} className={`${INPUT} ${props.className ?? ''}`} />
      {(hint || error) && (
        <span id={`${id}-desc`} className="block mt-1 text-xs">
          {hint && <span className="block text-slate-500">{hint}</span>}
          {error && <span className="block font-semibold text-rose-700">{error}</span>}
        </span>
      )}
    </div>
  );
}

export function TextArea({ label, hint, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: ReactNode }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-slate-800 mb-1">
        {label}
      </label>
      <textarea {...props} id={id} aria-describedby={hint ? `${id}-hint` : undefined} className={`${INPUT} py-2 resize-y ${props.className ?? ''}`} />
      {hint && (
        <span id={`${id}-hint`} className="block mt-1 text-xs text-slate-500">
          {hint}
        </span>
      )}
    </div>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="text-sm font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
      {children}
    </p>
  );
}

export function Notice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'success' | 'warning' }) {
  const cls = { info: 'bg-sky-50 border-sky-200 text-sky-950', success: 'bg-emerald-50 border-emerald-200 text-emerald-900', warning: 'bg-amber-50 border-amber-300 text-amber-950' }[tone];
  return (
    <div role="status" className={`text-sm border rounded-xl px-3 py-2 ${cls}`}>
      {children}
    </div>
  );
}

export function Spinner({ label = 'Chargement…' }: { label?: string }) {
  return (
    <p role="status" className="flex items-center gap-2 text-sm text-slate-500 py-6 justify-center">
      <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> {label}
    </p>
  );
}

export function RoleBadge({ role }: { role: Author['role'] }) {
  if (role === 'scientist')
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-bold" title="Scientifique dont le statut a été vérifié par un administrateur">
        <BadgeCheck className="w-3.5 h-3.5" aria-hidden="true" /> Scientifique
      </span>
    );
  if (role === 'admin')
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[11px] font-bold">
        <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" /> Admin
      </span>
    );
  return null;
}

export function AuthorLine({ author, date }: { author: Author; date: string }) {
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
      <span className={`font-semibold ${author.role === 'deleted' ? 'italic text-slate-400' : 'text-slate-800'}`}>{author.name}</span>
      <RoleBadge role={author.role} />
      <time dateTime={date}>{formatDate(date)}</time>
    </span>
  );
}

export function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'à l’instant';
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
}

/** Plain text with paragraphs; http(s) links made clickable (never HTML from the server). */
export function PostBody({ text }: { text: string }) {
  return (
    <div className="space-y-2 text-[15px] leading-relaxed text-slate-800 break-words">
      {text.split(/\n{2,}/).map((para, i) => (
        <p key={i} className="whitespace-pre-line">
          {para.split(/(https?:\/\/[^\s<>"']+)/g).map((part, j) =>
            /^https?:\/\//.test(part) ? (
              <a key={j} href={part} target="_blank" rel="nofollow ugc noopener noreferrer" className="text-sky-700 underline underline-offset-2 break-all">
                {part}
              </a>
            ) : (
              part
            ),
          )}
        </p>
      ))}
    </div>
  );
}

/** Busy state + error display. `submit(e?)` for forms (no argument), `run(...args)` for buttons.
 *  The action throws to show an error. */
export function useSubmit<A extends unknown[], T>(action: (...args: A) => Promise<T>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (...args: A): Promise<T | undefined> => {
    if (busy) return undefined;
    setBusy(true);
    setError(null);
    try {
      return await action(...args);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
      return undefined;
    } finally {
      setBusy(false);
    }
  };
  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    return run(...([] as unknown as A));
  };
  return { busy, error, setError, submit, run };
}
