// Top-centre pill: SST / climatology / anomaly of the selected day.
import type { Telemetry } from '../../types';

export function TelemetryPill({ telemetry }: { telemetry: Telemetry }) {
  const isWarm = telemetry.anomaly > 0;
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="hidden md:flex absolute top-4 left-1/2 -translate-x-1/2 z-30 items-center gap-3 px-4 py-2 rounded-full bg-white/95 backdrop-blur-md border border-sky-200/90 shadow-md text-xs"
    >
      <span className="flex items-center gap-1.5 font-bold text-slate-800">
        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
        Copernicus : {telemetry.date}
      </span>
      <span className="text-slate-300">|</span>
      <span title="Température de surface observée">
        SST : <strong className="text-rose-600">{telemetry.sst.toFixed(2)}°C</strong>
      </span>
      <span className="text-slate-300">|</span>
      <span title="Climatologie de référence">
        Climatologie : <strong className="text-sky-700">{telemetry.climatology.toFixed(2)}°C</strong>
      </span>
      <span className="text-slate-300">|</span>
      <span title="Écart par rapport à la moyenne">
        Anomalie :{' '}
        <strong className={isWarm ? 'text-rose-600 font-bold' : 'text-sky-600 font-bold'}>
          {isWarm ? '+' : ''}
          {telemetry.anomaly.toFixed(2)}°C
        </strong>
      </span>
    </div>
  );
}
