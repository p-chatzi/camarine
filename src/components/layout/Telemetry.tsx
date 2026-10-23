// Expert mode, in the date pop-up: values of the selected day at the monitored point (Toulon).
// They come from /api/mhw: SST averaged over a small box (±0.05°, ~10 km) around PIPELINE_LOCATION.
// (Was a pill in the bottom bar, itself a floating pill over the map before; both took map space.)
import type { Telemetry as TelemetryValues } from '../../types';

export function Telemetry({ telemetry }: { telemetry: TelemetryValues }) {
  const isWarm = telemetry.anomaly > 0;
  return (
    <section aria-label="Télémétrie Copernicus du jour" className="rounded-xl bg-sky-50 border border-sky-200/90 p-3 text-xs">
      <p className="flex items-center gap-1.5 font-bold text-slate-800 mb-2">
        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse motion-reduce:animate-none" aria-hidden="true" />
        Copernicus · {telemetry.date}
      </p>
      <dl className="grid grid-cols-3 gap-2 text-center">
        <div title="Température de surface moyenne du jour sur une boîte de ±0,05° (~10 km) autour de Toulon (43° N, 6° E), Copernicus Marine">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">SST Toulon</dt>
          <dd className="text-sm font-extrabold text-rose-600">{telemetry.sst.toFixed(2)} °C</dd>
        </div>
        <div title="SST moyenne attendue ce jour de l’année à Toulon, période de référence 1991–2020">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Climatologie</dt>
          <dd className="text-sm font-extrabold text-sky-700">{telemetry.climatology.toFixed(2)} °C</dd>
        </div>
        <div title="SST moyenne Toulon − climatologie 1991–2020">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Anomalie</dt>
          <dd className={`text-sm font-extrabold ${isWarm ? 'text-rose-600' : 'text-sky-600'}`}>
            {isWarm ? '+' : ''}
            {telemetry.anomaly.toFixed(2)} °C
          </dd>
        </div>
      </dl>
    </section>
  );
}
