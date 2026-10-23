// Tab 2 "Comprendre": analysis period, KPIs, Hobday explanation, heatwave history, daily chart, events table.
import { useState } from 'react';
import type { CopernicusData } from '../../hooks/useCopernicusData';
import { PeriodControl } from '../layout/DateControl';
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
  const [periodOpen, setPeriodOpen] = useState(false);
  return (
    <main className="flex-1 overflow-y-auto w-full px-3 sm:px-4 lg:px-8 pb-8 pt-1">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">Comprendre les canicules marines</h2>
          <PeriodControl data={data} open={periodOpen} onOpenChange={setPeriodOpen} />
        </div>
        <KpiRow
          maxAnomaly={data.maxAnnualAnomaly}
          eventCount={data.events.length}
          cellCount={cellCount}
          dayCount={data.records.length}
          method={data.pipeline?.method?.method || 'Hobday et al.'}
        />
        <HobdayExplainer />
        <HeatwaveStripPlot records={data.records} events={data.events} />
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 items-start">
          <DailyChart records={data.records} events={data.events} />
          <EventsTable events={data.events} records={data.records} />
        </div>
      </div>
    </main>
  );
}
