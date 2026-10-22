// Bottom of the expert catalogue: "an important species is missing? Suggest it."
import { CheckCircle2, Lightbulb, Send } from 'lucide-react';
import { SUGGESTION_LIMITS, type SpeciesSuggestionForm } from '../../hooks/useSpeciesSuggestion';

export function SuggestionForm({ form }: { form: SpeciesSuggestionForm }) {
  if (form.status === 'sent') {
    return (
      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-2">
        <p className="flex items-center gap-1.5 font-bold">
          <CheckCircle2 className="w-4 h-4" /> Merci, suggestion envoyée !
        </p>
        <p className="text-[11px] text-emerald-800">L’équipe Camarine la relira avant de l’ajouter à la carte.</p>
        <button onClick={form.reset} className="tap text-[11px] font-semibold text-emerald-800 underline underline-offset-2">
          Suggérer une autre espèce
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void form.submit();
      }}
      className="p-3 rounded-xl bg-sky-50/80 border border-sky-200 space-y-2"
    >
      <p className="text-[11px] font-extrabold uppercase tracking-wider text-sky-900 flex items-center gap-1.5">
        <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> Une espèce manque ?
      </p>
      <label className="block space-y-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Nom de l’espèce (commun ou scientifique)</span>
        <input
          type="text"
          required
          minLength={2}
          maxLength={SUGGESTION_LIMITS.name}
          value={form.speciesName}
          onChange={(e) => form.setSpeciesName(e.target.value)}
          placeholder="ex. Oursin violet, Paracentrotus lividus"
          className="tap w-full bg-white border border-sky-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-sky-500"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pourquoi ? Description, zone, source…</span>
        <textarea
          rows={3}
          maxLength={SUGGESTION_LIMITS.message}
          value={form.message}
          onChange={(e) => form.setMessage(e.target.value)}
          placeholder="Ce que vous avez observé, où, et si possible une source."
          className="w-full bg-white border border-sky-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-sky-500 resize-y"
        />
        <span className="block text-right text-[10px] text-slate-400">
          {form.message.length} / {SUGGESTION_LIMITS.message}
        </span>
      </label>
      {/* Honeypot: hidden from humans, bots tend to fill it. */}
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={form.website}
        onChange={(e) => form.setWebsite(e.target.value)}
        className="hidden"
        name="website"
      />
      {form.error && <p className="text-[11px] text-rose-700 font-semibold">{form.error}</p>}
      <button
        type="submit"
        disabled={!form.canSubmit}
        className="tap w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-sky-700 hover:bg-sky-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold transition-colors"
      >
        <Send className="w-3.5 h-3.5" /> {form.status === 'sending' ? 'Envoi…' : 'Envoyer la suggestion'}
      </button>
      <p className="text-[10px] text-slate-500 leading-snug">Aucune donnée personnelle n’est demandée ni enregistrée.</p>
    </form>
  );
}
