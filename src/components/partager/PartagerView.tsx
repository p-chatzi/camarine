// Tab 3 "Partager": data export + community forum.
import { Database, MessagesSquare } from 'lucide-react';
import { useState } from 'react';
import { buildExport, downloadExport, type ExportContext } from '../../lib/export';
import type { CopernicusData } from '../../hooks/useCopernicusData';
import type { MapSettings } from '../../hooks/useMapSettings';
import type { ExportFormat } from '../../types';
import { ExportPanel } from './ExportPanel';
import { ExportPreviewModal } from './ExportPreviewModal';

interface Props {
  data: CopernicusData;
  settings: MapSettings;
  exportContext: ExportContext;
}

export function PartagerView({ data, settings, exportContext }: Props) {
  const [previewFormat, setPreviewFormat] = useState<ExportFormat | null>(null);

  return (
    <main className="flex-1 overflow-y-auto w-full px-3 sm:px-4 lg:px-8 pb-8 pt-1">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <Database className="w-6 h-6 text-indigo-600" /> Centre de Partage & Données
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Exportez les séries temporelles Copernicus, ou échangez sur le forum.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <ExportPanel
            data={data}
            settings={settings}
            onDownload={(f) => downloadExport(f, exportContext)}
            onPreview={() => setPreviewFormat('json')}
          />
          <a
            href="#/forum"
            className="lg:col-span-2 block bg-white border border-emerald-200 rounded-2xl p-5 shadow-sm hover:border-emerald-400 transition-colors"
          >
            <span className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <MessagesSquare className="w-5 h-5 text-emerald-700" aria-hidden="true" /> Forum
            </span>
            <span className="block mt-1 text-sm text-slate-600">
              Posez vos questions aux scientifiques, discutez d’une espèce ou de la zone Pelagos, partagez les bons gestes et vos suggestions.
            </span>
          </a>
        </div>
      </div>

      {previewFormat && (
        <ExportPreviewModal
          format={previewFormat}
          content={buildExport(previewFormat, exportContext)}
          onChangeFormat={setPreviewFormat}
          onClose={() => setPreviewFormat(null)}
          onDownload={() => downloadExport(previewFormat, exportContext)}
        />
      )}
    </main>
  );
}
