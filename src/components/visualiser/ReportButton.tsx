// "Signaler une erreur" on a species card: wrong data, missing source, wrong source / dead link.
// Opens a pop-up form (bottom sheet on phones). Sent to POST /api/reports; the maintainer is
// notified by e-mail or push (backend/notify.py). No personal data is asked for.
import { CheckCircle2, Flag, Send } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { REPORT_KINDS, REPORT_LIMITS, cleanReportMessage, isValidSourceUrl, submitReport, type ReportKind } from '../../api/reports';
import type { SpeciesItem } from '../../types';
import { Popover } from '../ui/Popover';

type Status = 'idle' | 'sending' | 'sent' | 'error';

const FIELD = 'w-full bg-white border border-sky-200 rounded-xl px-3 text-sm outline-none focus:border-sky-500';

function ReportForm({ species, onClose }: { species: SpeciesItem; onClose: () => void }) {
  const [kind, setKind] = useState<ReportKind>('donnee-erronee');
  const [message, setMessage] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const ids = useId();

  const clean = cleanReportMessage(message);
  const urlOk = isValidSourceUrl(sourceUrl);
  const canSubmit = clean.length >= REPORT_LIMITS.messageMin && urlOk && status !== 'sending';

  if (status === 'sent') {
    return (
      <div className="p-4 pt-2 sm:pt-4 space-y-3 text-sm" role="status">
        <p className="flex items-center gap-2 font-bold text-emerald-800">
          <CheckCircle2 className="w-5 h-5" aria-hidden="true" /> Merci, signalement envoyé !
        </p>
        <p className="text-slate-600">L’équipe Camarine va vérifier la fiche « {species.name} ».</p>
        <button onClick={onClose} className="tap h-11 w-full rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-bold">
          Fermer
        </button>
      </div>
    );
  }

  return (
    <form
      className="p-4 pt-2 sm:pt-4 space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!canSubmit) return;
        setStatus('sending');
        setError(null);
        try {
          await submitReport({ speciesId: species.id, speciesName: species.name, kind, message: clean, sourceUrl, website });
          setStatus('sent');
        } catch (err) {
          setStatus('error');
          setError(err instanceof Error ? err.message : 'Le signalement n’a pas été envoyé.');
        }
      }}
    >
      <div>
        <h2 className="text-sm font-extrabold text-sky-950">Signaler une erreur</h2>
        <p className="text-xs text-slate-500">
          Fiche « {species.name} ». Aucune donnée personnelle n’est demandée ni enregistrée.
        </p>
      </div>

      <fieldset>
        <legend className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Problème</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {REPORT_KINDS.map((k) => (
            <label
              key={k.id}
              className={`tap min-h-10 flex items-center gap-2 px-3 rounded-xl border text-sm cursor-pointer ${kind === k.id ? 'bg-sky-50 border-sky-500 text-sky-950 font-semibold' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
            >
              <input type="radio" name={`${ids}-kind`} value={k.id} checked={kind === k.id} onChange={() => setKind(k.id)} className="accent-sky-700" />
              {k.label}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Qu’est-ce qui ne va pas ?</span>
        <textarea
          rows={4}
          required
          minLength={REPORT_LIMITS.messageMin}
          maxLength={REPORT_LIMITS.message}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="ex. Le seuil de 28 °C vient d’une étude de 2018, pas de 2003 ; le statut UICN a changé en 2025…"
          className={`${FIELD} py-2 resize-y`}
        />
      </label>

      <label className="block">
        <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Source qui le montre (facultatif)</span>
        <input
          type="url"
          inputMode="url"
          maxLength={REPORT_LIMITS.url}
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          placeholder="https://…"
          aria-invalid={!urlOk}
          className={`${FIELD} h-11`}
        />
        {!urlOk && <span className="block mt-1 text-xs text-rose-700 font-semibold">Le lien doit commencer par http:// ou https://</span>}
      </label>

      {/* Honeypot: invisible to humans, bots fill it. */}
      <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" value={website} onChange={(e) => setWebsite(e.target.value)} className="hidden" name="website" />

      {error && (
        <p className="text-xs text-rose-700 font-semibold" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={!canSubmit}
        className="tap h-11 w-full flex items-center justify-center gap-2 rounded-xl bg-sky-700 hover:bg-sky-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-bold"
      >
        <Send className="w-4 h-4" aria-hidden="true" /> {status === 'sending' ? 'Envoi…' : 'Envoyer le signalement'}
      </button>
    </form>
  );
}

export function ReportButton({ species }: { species: SpeciesItem }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => setOpen(false), [species.id]);

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="species-report"
        aria-haspopup="dialog"
        title="Donnée ou source manquante / erronée ? Signalez-le"
        className="h-11 min-w-11 px-3 flex items-center justify-center gap-1.5 rounded-2xl bg-white hover:bg-amber-50 text-slate-600 hover:text-amber-800 border border-sky-200 shadow-sm shrink-0 text-sm font-semibold"
      >
        <Flag className="w-4 h-4" aria-hidden="true" />
        <span className="hidden sm:inline">Signaler</span>
        <span className="sr-only sm:hidden">Signaler une erreur sur cette fiche</span>
      </button>
      {open && (
        <Popover id="species-report" label={`Signaler une erreur sur la fiche ${species.name}`} anchorRef={buttonRef} onClose={() => setOpen(false)} align="end" width={420}>
          <ReportForm species={species} onClose={() => setOpen(false)} />
        </Popover>
      )}
    </>
  );
}
