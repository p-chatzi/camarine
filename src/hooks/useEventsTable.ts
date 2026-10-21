// Search / sort / pagination state for the heatwave events table ("Comprendre" tab).
import { useEffect, useMemo, useState } from 'react';
import {
  eventCumulativeIntensity,
  eventDuration,
  eventPeakDate,
  getHobdayCategory,
  UNKNOWN_CATEGORY,
  type HobdayCategory,
} from '../lib/hobday';
import type { MhwEvent, PipelineRecord } from '../types';

export interface TableRow extends MhwEvent {
  originalIdx: number;
  computedCumulative: number | undefined;
  duration: number | undefined;
  categoryData: HobdayCategory;
}

export type SortKey = 'originalIdx' | 'start' | 'peak' | 'end' | 'duration' | 'computedCumulative' | 'category';
type SortConfig = { key: SortKey; direction: 'asc' | 'desc' } | null;

/** Adds index, cumulative intensity and Hobday category to each event (most recent first). */
function buildRows(events: MhwEvent[], records: PipelineRecord[]): TableRow[] {
  return [...events].reverse().map((ev, idx, arr) => {
    let cumulative = eventCumulativeIntensity(ev);
    if (cumulative === undefined && records.length > 0) {
      cumulative = records
        .filter((r) => r.date >= ev.start && r.date <= ev.end)
        .reduce((acc, r) => acc + Math.max(0, r.sst - r.threshold), 0);
    }
    const peakRec = records.find((r) => r.date === eventPeakDate(ev));
    return {
      ...ev,
      peak: eventPeakDate(ev), // normalised so the "Pic" column can be sorted
      originalIdx: arr.length - idx,
      computedCumulative: cumulative,
      duration: eventDuration(ev),
      categoryData: peakRec ? getHobdayCategory(peakRec.sst, peakRec.climatology, peakRec.threshold) : UNKNOWN_CATEGORY,
    };
  });
}

// Strings (ISO dates) and numbers both compare correctly with < / >.
function sortValue(row: TableRow, key: SortKey): number | undefined {
  return (key === 'category' ? row.categoryData.num : row[key]) as number | undefined;
}

export function useEventsTable(events: MhwEvent[], records: PipelineRecord[]) {
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortConfig>(null);

  const allRows = useMemo(() => buildRows(events, records), [events, records]);

  const filteredRows = useMemo(() => {
    if (!search) return allRows;
    const term = search.toLowerCase();
    return allRows.filter(
      (r) => r.start.includes(term) || r.end.includes(term) || r.originalIdx.toString().includes(term),
    );
  }, [allRows, search]);

  const sortedRows = useMemo(() => {
    if (!sort) return filteredRows;
    return [...filteredRows].sort((a, b) => {
      const av = sortValue(a, sort.key);
      const bv = sortValue(b, sort.key);
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av < bv) return sort.direction === 'asc' ? -1 : 1;
      if (av > bv) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredRows, sort]);

  // Back to page 1 whenever the visible set changes.
  useEffect(() => setPage(1), [search, rowsPerPage, sort]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / rowsPerPage));
  const pageRows = sortedRows.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  /** Click on a header: asc → desc → asc… */
  const requestSort = (key: SortKey) => {
    const direction = sort && sort.key === key && sort.direction === 'asc' ? 'desc' : 'asc';
    setSort({ key, direction });
  };

  return { page, setPage, rowsPerPage, setRowsPerPage, search, setSearch, sort, requestSort, totalPages, pageRows };
}

export type EventsTableState = ReturnType<typeof useEventsTable>;
