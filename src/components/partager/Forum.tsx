// Right column of "Partager": local discussion thread (see hooks/useForum.ts).
import { Radio } from 'lucide-react';
import type { ForumState } from '../../hooks/useForum';

/** State comes from App so messages survive switching tabs. */
export function Forum({ forum }: { forum: ForumState }) {
  return (
    <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-0 shadow-sm flex flex-col h-[min(600px,75dvh)]">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-2xl">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Radio className="w-4 h-4 text-indigo-600" /> Forum d'Analyse Participative
        </h3>
        <span className="text-[10px] font-bold px-2 py-1 bg-emerald-100 text-emerald-800 rounded-full">3 Observateurs en ligne</span>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50/30">
        {forum.messages.map((msg) => (
          <div key={msg.id} className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${msg.avatarBg}`}>{msg.initials}</div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-bold text-slate-800">{msg.author}</span>
                <span className="text-[10px] text-slate-400">{msg.time}</span>
                {msg.badge && <span className="text-[9px] px-1.5 bg-blue-100 text-blue-700 rounded uppercase font-bold">{msg.badge}</span>}
              </div>
              <div className={`mt-1 text-xs text-slate-600 border p-3 rounded-2xl rounded-tl-none shadow-sm leading-relaxed ${msg.bubbleStyle}`}>{msg.content}</div>
            </div>
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          forum.send();
        }}
        className="p-4 border-t border-slate-100 bg-white rounded-b-2xl"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={forum.input}
            onChange={(e) => forum.setInput(e.target.value)}
            placeholder="Partagez une observation ou un relevé terrain..."
            aria-label="Votre message"
            className="tap flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-indigo-400 focus:bg-white transition-colors"
          />
          <button
            type="submit"
            disabled={!forum.input.trim()}
            className="tap px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
          >
            Envoyer
          </button>
        </div>
      </form>
    </div>
  );
}
