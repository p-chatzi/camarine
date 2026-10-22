// Expert mode, in the bottom bar: values of the selected day at the monitored point (Toulon).
// They come from /api/mhw: SST averaged over a small box (±0.05°, ~10 km) around PIPELINE_LOCATION.
// (Was a floating pill at the top of the map; it collided with the map buttons below 1440 px.)
import type { Telemetry as TelemetryValues } from '../../types';

export function Telemetry({ telemetry }: { telemetry: TelemetryValues }) {
  const isWarm = telemetry.anomaly > 0;
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-1.5 rounded-full bg-sky-50 border border-sky-200/90 text-xs">
      <span className="flex items-center gap-1.5 font-bold text-slate-800">
        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping motion-reduce:animate-none" aria-hidden="true" />
        Copernicus : {telemetry.date}
      </span>
      <span className="text-slate-300" aria-hidden="true">|</span>
      <span title="Température de surface moyenne du jour sur une boîte de ±0,05° (~10 km) autour de Toulon (43° N, 6° E), Copernicus Marine">
        SST moyenne Toulon : <strong className="text-rose-600">{telemetry.sst.toFixed(2)}°C</strong>
      </span>
      <span className="text-slate-300" aria-hidden="true">|</span>
      <span title="SST moyenne attendue ce jour de l’année à Toulon, période de référence 1991–2020">
        Climatologie : <strong className="text-sky-700">{telemetry.climatology.toFixed(2)}°C</strong>
      </span>
      <span className="text-slate-300" aria-hidden="true">|</span>
      <span title="SST moyenne Toulon − climatologie 1991–2020">
        Anomalie :{' '}
        <strong className={isWarm ? 'text-rose-600 font-bold' : 'text-sky-600 font-bold'}>
          {isWarm ? '+' : ''}
          {telemetry.anomaly.toFixed(2)}°C
        </strong>
      </span>
    </div>
  );
}
