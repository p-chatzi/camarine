// Left column of "Partager": choose day/period, download CSV/JSON, open the preview.
import { Download, Eye, FileJson, FileSpreadsheet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DATA_SOURCES } from '../../data/metadata';
import type { CopernicusData } from '../../hooks/useCopernicusData';
import type { MapSettings } from '../../hooks/useMapSettings';
import type { ExportFormat } from '../../types';

interface Props {
  data: CopernicusData;
  settings: MapSettings;
  onDownload: (format: ExportFormat) => void;
  onPreview: () => void;
}

function ModeToggle({ settings }: { settings: MapSettings }) {
  const btn = (active: boolean) =>
    `px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${active ? 'bg-sky-600 text-white' : 'text-slate-600 hover:text-slate-900'}`;
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Mode d'export</span>
      <div className="flex bg-white rounded-lg p-0.5 border border-sky-200">
        <button onClick={() => settings.setColorMode('daily')} className={btn(settings.colorMode === 'daily')}>
          Jour J
        </button>
        <button onClick={() => settings.setColorMode('average')} className={btn(settings.colorMode === 'average')}>
          Période
        </button>
      </div>
    </div>
  );
}

function DayPicker({ data }: { data: CopernicusData }) {
  const current = data.telemetry?.date || data.selectedDate || '';
  const [draft, setDraft] = useState(current);
  useEffect(() => setDraft(current), [current]);

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <label className="text-[10px] font-semibold text-slate-500">Date précise (Jour J) :</label>
        <input
          type="date"
          min={data.startDate}
          max={data.endDate}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            data.selectExistingDate(e.target.value);
          }}
          className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-sky-300 text-sky-900 font-bold text-xs outline-none cursor-pointer"
        />
      </div>
      <button
        type="button"
        onClick={() => data.selectDate(draft)}
        className="w-full py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer"
      >
        Valider la date
      </button>
    </div>
  );
}

function PeriodPicker({ data }: { data: CopernicusData }) {
  const inputClass =
    'w-full px-2 py-1 border border-slate-200 rounded-md text-[11px] font-bold text-slate-800 outline-none focus:border-sky-500 cursor-pointer bg-white';
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <div className="flex-1 space-y-1">
          <label className="text-[10px] font-semibold text-slate-500">Du :</label>
          <input type="date" value={data.startDate} onChange={(e) => data.setStartDate(e.target.value)} className={inputClass} />
        </div>
        <div className="flex-1 space-y-1">
          <label className="text-[10px] font-semibold text-slate-500">Au :</label>
          <input type="date" value={data.endDate} onChange={(e) => data.setEndDate(e.target.value)} className={inputClass} />
        </div>
      </div>
      <button
        onClick={data.reload}
        className="w-full py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
      >
        Actualiser les données
      </button>
    </div>
  );
}

export function ExportPanel({ data, settings, onDownload, onPreview }: Props) {
  return (
    <div className="lg:col-span-1 space-y-6">
      <div className="bg-white border border-sky-200 rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Export Open Data</h3>

        <div className="space-y-3 bg-sky-50/70 p-3.5 rounded-xl border border-sky-100">
          <ModeToggle settings={settings} />
          {settings.colorMode === 'daily' ? <DayPicker data={data} /> : <PeriodPicker data={data} />}
        </div>

        <div className="space-y-2.5">
          <button
            onClick={() => onDownload('csv')}
            className="w-full px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-bold text-xs flex items-center justify-between transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" /> Matrice .CSV
            </span>
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDownload('json')}
            className="w-full px-4 py-2.5 rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 font-bold text-xs flex items-center justify-between transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <FileJson className="w-4 h-4" /> Payload .JSON
            </span>
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onPreview}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Eye className="w-4 h-4" /> Aperçu brut
          </button>
        </div>

        <div className="p-3 rounded-xl bg-sky-50/50 border border-sky-100 text-[10px] text-slate-500">
          <strong className="text-sky-900 block mb-1">Source : {DATA_SOURCES.provider}</strong>
          Climatologie {DATA_SOURCES.climatology} • {DATA_SOURCES.method}
        </div>
      </div>
    </div>
  );
}
