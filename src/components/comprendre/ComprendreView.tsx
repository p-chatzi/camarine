// Tab 2 "Comprendre": KPIs, Hobday explanation, strip plot, daily chart, events table.
import type { CopernicusData } from '../../hooks/useCopernicusData';
import { DailyChart } from './DailyChart';
import { EventsTable } from './EventsTable';
import { HeatwaveStripPlot } from './HeatwaveStripPlot';
import { HobdayExplainer } from './HobdayExplainer';
import { KpiRow } from './KpiRow';

interface Props {
  data: CopernicusData;
  cellCount: number;
}

export function ComprendreView({ data, cellCount }: Props) {
  return (
    <main className="flex-1 overflow-y-auto w-full px-4 lg:px-8 py-6 bg-slate-50">
      <div className="max-w-7xl mx-auto space-y-6">
        <KpiRow
          maxAnomaly={data.maxAnnualAnomaly}
          eventCount={data.events.length}
          cellCount={cellCount}
          dayCount={data.records.length}
          method={data.pipeline?.method?.method || 'Hobday et al.'}
        />
        <HobdayExplainer />
        <HeatwaveStripPlot records={data.records} events={data.events} />
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
          <DailyChart records={data.records} events={data.events} />
          <EventsTable events={data.events} records={data.records} />
        </div>
      </div>
    </main>
  );
}
