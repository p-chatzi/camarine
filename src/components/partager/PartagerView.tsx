// Tab 3 "Partager": data export + community forum.
import { Database } from 'lucide-react';
import { useState } from 'react';
import { buildExport, downloadExport, type ExportContext } from '../../lib/export';
import type { CopernicusData } from '../../hooks/useCopernicusData';
import type { MapSettings } from '../../hooks/useMapSettings';
import type { ForumState } from '../../hooks/useForum';
import type { ExportFormat } from '../../types';
import { ExportPanel } from './ExportPanel';
import { ExportPreviewModal } from './ExportPreviewModal';
import { Forum } from './Forum';

interface Props {
  data: CopernicusData;
  settings: MapSettings;
  exportContext: ExportContext;
  forum: ForumState;
}

export function PartagerView({ data, settings, exportContext, forum }: Props) {
  const [previewFormat, setPreviewFormat] = useState<ExportFormat | null>(null);

  return (
    <main className="flex-1 overflow-y-auto w-full px-3 sm:px-4 lg:px-8 pb-8 pt-1">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <Database className="w-6 h-6 text-indigo-600" /> Centre de Partage & Données
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Exportez les séries temporelles Copernicus ou discutez des anomalies avec la communauté scientifique.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <ExportPanel
            data={data}
            settings={settings}
            onDownload={(f) => downloadExport(f, exportContext)}
            onPreview={() => setPreviewFormat('json')}
          />
          <Forum forum={forum} />
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
