// Loads the /api/mhw time series and tracks which day is selected.
// Everything that depends on "the selected day" (telemetry, heat factor) is derived here.
import { useEffect, useMemo, useState } from 'react';
import { fetchPipeline } from '../api/copernicus';
import { DEFAULT_START_DATE } from '../config';
import { todayIso, yearOf } from '../lib/dates';
import type { AnnualAnomaly, Pipeline, PipelineRecord, Telemetry } from '../types';

/** Mean anomaly per year (used for the "Pic d'anomalie" KPI). */
function annualAnomalies(records: PipelineRecord[]): AnnualAnomaly[] {
  const annual = new Map<number, { sum: number; count: number }>();
  for (const r of records) {
    if (r.anomaly === null) continue;
    const year = yearOf(r.date);
    const cur = annual.get(year) ?? { sum: 0, count: 0 };
    annual.set(year, { sum: cur.sum + r.anomaly, count: cur.count + 1 });
  }
  return Array.from(annual, ([year, v]) => ({
    year,
    meanAnomaly: +(v.sum / v.count).toFixed(3),
  }));
}

export function useCopernicusData() {
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState(DEFAULT_START_DATE);
  const [endDate, setEndDate] = useState(todayIso());
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [annual, setAnnual] = useState<AnnualAnomaly[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const reload = () => {
    setIsLoading(true);
    fetchPipeline(startDate, endDate)
      .then((payload) => {
        setPipeline(payload);
        if (!payload?.records) return;
        const target = payload.activeDate || payload.records[payload.records.length - 1].date;
        const idx = payload.records.findIndex((r) => r.date === target);
        setSelectedIndex(idx !== -1 ? idx : payload.records.length - 1);
        setAnnual(annualAnomalies(payload.records));
      })
      .catch(() => {
        setPipeline(null);
        setAnnual([]);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(reload, []); // eslint-disable-line react-hooks/exhaustive-deps

  const records = pipeline?.records ?? [];
  const selectedRecord: PipelineRecord | undefined = records[selectedIndex] ?? records[records.length - 1];
  const selectedDate = selectedRecord?.date ?? '';

  const telemetry = useMemo<Telemetry | null>(() => {
    if (!selectedRecord) return null;
    return {
      date: selectedRecord.date,
      year: yearOf(selectedRecord.date),
      sst: selectedRecord.sst,
      climatology: selectedRecord.climatology,
      threshold: selectedRecord.threshold,
      anomaly: selectedRecord.anomaly ?? 0,
    };
  }, [selectedRecord]);

  /** 0.18 – 1, scales with today's anomaly. Used to interpolate species SST estimates. */
  const heatFactor = useMemo(
    () => (telemetry ? Math.min(1, Math.max(0.18, telemetry.anomaly / 4.0)) : 0.2),
    [telemetry],
  );

  const maxAnnualAnomaly = useMemo(
    () => (annual.length ? Math.max(...annual.map((s) => s.meanAnomaly || 0)) : 0),
    [annual],
  );

  /** Select a day only if it exists in the loaded series. */
  const selectExistingDate = (date: string) => {
    const idx = records.findIndex((r) => r.date === date);
    if (idx !== -1) setSelectedIndex(idx);
  };

  /**
   * Select any day. If it is not in the loaded series, a placeholder record is inserted
   * that copies the current telemetry values (so the map can still load that day's pixels).
   * ⚠ The placeholder's SST/threshold are NOT real data for that day.
   */
  const selectDate = (date: string) => {
    if (!date) return;
    const idx = records.findIndex((r) => r.date === date);
    if (idx !== -1) {
      setSelectedIndex(idx);
      return;
    }
    if (!pipeline) return;
    const placeholder: PipelineRecord = {
      date,
      sst: telemetry?.sst || 22.0,
      climatology: telemetry?.climatology || 20.0,
      threshold: telemetry?.threshold || 22.0,
      anomaly: telemetry?.anomaly || 0,
    };
    const updated = [...pipeline.records, placeholder].sort((a, b) => a.date.localeCompare(b.date));
    setPipeline({ ...pipeline, records: updated });
    setSelectedIndex(updated.findIndex((r) => r.date === date));
  };

  return {
    isLoading,
    reload,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    pipeline,
    records,
    events: pipeline?.events ?? [],
    selectedDate,
    selectDate,
    selectExistingDate,
    telemetry,
    heatFactor,
    maxAnnualAnomaly,
  };
}

export type CopernicusData = ReturnType<typeof useCopernicusData>;
