// Modal showing the raw CSV/JSON that would be downloaded.
import { Download, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { ExportFormat } from '../../types';

interface Props {
  format: ExportFormat;
  content: string;
  onChangeFormat: (f: ExportFormat) => void;
  onClose: () => void;
  onDownload: () => void;
}

export function ExportPreviewModal({ format, content, onChangeFormat, onClose, onDownload }: Props) {
  // Dialog behaviour: focus inside on open, Escape closes, focus returns to the opener on close.
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      opener?.focus();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Aperçu de l'export ${format.toUpperCase()}`}
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-sky-200 rounded-2xl max-w-4xl w-full max-h-[90dvh] flex flex-col overflow-hidden shadow-2xl"
      >
        <div className="p-4 border-b border-sky-100 flex items-center justify-between bg-sky-50/60">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onChangeFormat('csv')}
              aria-pressed={format === 'csv'}
              className={`tap px-3 py-1 rounded-lg text-xs font-bold ${format === 'csv' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border border-sky-200'}`}
            >
              Format CSV
            </button>
            <button
              onClick={() => onChangeFormat('json')}
              aria-pressed={format === 'json'}
              className={`tap px-3 py-1 rounded-lg text-xs font-bold ${format === 'json' ? 'bg-sky-600 text-white' : 'bg-white text-slate-600 border border-sky-200'}`}
            >
              Format JSON
            </button>
          </div>
          <button ref={closeRef} onClick={onClose} aria-label="Fermer l'aperçu" className="tap flex items-center justify-center p-1.5 rounded-lg bg-white border border-sky-200 text-slate-500 hover:text-slate-900">
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
        <pre className="p-4 text-xs font-mono text-slate-800 overflow-auto flex-1 bg-sky-50/30">{content}</pre>
        <div className="p-4 border-t border-sky-100 flex justify-end gap-2 bg-white">
          <button onClick={onDownload} className="tap px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-2">
            <Download className="w-4 h-4" />
            <span>Télécharger .{format}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
