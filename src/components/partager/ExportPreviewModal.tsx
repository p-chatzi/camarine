// Modal showing the raw CSV/JSON that would be downloaded.
import { Download, X } from 'lucide-react';
import type { ExportFormat } from '../../types';

interface Props {
  format: ExportFormat;
  content: string;
  onChangeFormat: (f: ExportFormat) => void;
  onClose: () => void;
  onDownload: () => void;
}

export function ExportPreviewModal({ format, content, onChangeFormat, onClose, onDownload }: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-sky-200 rounded-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-sky-100 flex items-center justify-between bg-sky-50/60">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onChangeFormat('csv')}
              className={`px-3 py-1 rounded-lg text-xs font-bold ${format === 'csv' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border border-sky-200'}`}
            >
              Format CSV
            </button>
            <button
              onClick={() => onChangeFormat('json')}
              className={`px-3 py-1 rounded-lg text-xs font-bold ${format === 'json' ? 'bg-sky-600 text-white' : 'bg-white text-slate-600 border border-sky-200'}`}
            >
              Format JSON
            </button>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white border border-sky-200 text-slate-500 hover:text-slate-900">
            <X className="w-4 h-4" />
          </button>
        </div>
        <pre className="p-4 text-xs font-mono text-slate-800 overflow-auto flex-1 bg-sky-50/30">{content}</pre>
        <div className="p-4 border-t border-sky-100 flex justify-end gap-2 bg-white">
          <button onClick={onDownload} className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-2">
            <Download className="w-4 h-4" />
            <span>Télécharger .{format}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
