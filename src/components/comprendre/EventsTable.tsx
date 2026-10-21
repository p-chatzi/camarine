// Sortable, searchable, paginated table of detected heatwaves.
import { eventPeakDate } from '../../lib/hobday';
import { useEventsTable, type SortKey } from '../../hooks/useEventsTable';
import type { MhwEvent, PipelineRecord } from '../../types';

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'originalIdx', label: 'Numéro' },
  { key: 'start', label: 'Début' },
  { key: 'peak', label: 'Pic' },
  { key: 'end', label: 'Fin' },
  { key: 'duration', label: 'Durée (j)' },
  { key: 'computedCumulative', label: 'Intensité' },
  { key: 'category', label: 'Catégorie' },
];

/** Up to 5 page numbers centred on the current page. */
function visiblePages(page: number, total: number): number[] {
  const pages: number[] = [];
  for (let i = 0; i < Math.min(5, total); i++) {
    let n = page <= 3 ? i + 1 : page + i - 2;
    if (page > total - 2 && total > 5) n = total - 4 + i;
    if (n <= total) pages.push(n);
  }
  return pages;
}

interface Props {
  events: MhwEvent[];
  records: PipelineRecord[];
}

export function EventsTable({ events, records }: Props) {
  const t = useEventsTable(events, records);

  const sortIcon = (key: SortKey) => {
    if (!t.sort || t.sort.key !== key) return <span className="text-slate-300 ml-1 text-xs">↕</span>;
    return <span className="text-blue-600 ml-1 text-xs">{t.sort.direction === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col font-sans">
      <div className="p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-slate-800">Afficher</span>
          <select
            value={t.rowsPerPage}
            onChange={(e) => t.setRowsPerPage(Number(e.target.value))}
            className="border border-slate-300 rounded px-2 py-1 text-sm text-slate-700 outline-none cursor-pointer hover:border-slate-400"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={1000}>Tous</option>
          </select>
          <span className="text-sm font-bold text-slate-800">entrées</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-slate-800">Rechercher :</span>
          <input
            type="text"
            value={t.search}
            onChange={(e) => t.setSearch(e.target.value)}
            placeholder="Année, numéro..."
            className="border border-slate-300 rounded px-3 py-1 w-48 focus:border-blue-500 outline-none transition-colors"
          />
        </div>
      </div>

      <div className="overflow-x-auto w-full border-t border-slate-200 min-h-[300px]">
        <table className="w-full text-center text-[13px] text-slate-700">
          <thead>
            <tr className="border-b-2 border-slate-200 bg-slate-50/50 select-none">
              {COLUMNS.map((col) => (
                <th key={col.key} className="py-4 px-4 font-bold align-bottom cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => t.requestSort(col.key)}>
                  {col.label} {sortIcon(col.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {t.pageRows.map((ev) => (
              <tr key={ev.id || ev.originalIdx} className="hover:bg-blue-50/50 transition-colors">
                <td className="py-3 px-4">{ev.originalIdx}</td>
                <td className="py-3 px-4 font-mono">{ev.start}</td>
                <td className="py-3 px-4 font-mono">{eventPeakDate(ev)}</td>
                <td className="py-3 px-4 font-mono">{ev.end}</td>
                <td className="py-3 px-4">{ev.duration}</td>
                <td className="py-3 px-4 font-medium">{ev.computedCumulative != null ? ev.computedCumulative.toFixed(2) : '—'}</td>
                <td className="py-3 px-4 flex justify-center">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${ev.categoryData.color}`}>{ev.categoryData.name}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t border-slate-200 bg-white flex flex-col items-center gap-4">
        {t.totalPages > 1 && (
          <div className="flex items-center gap-1 text-sm select-none">
            <button disabled={t.page === 1} onClick={() => t.setPage((p) => Math.max(1, p - 1))} className="px-3 py-1.5 text-slate-500 hover:text-blue-600 disabled:opacity-40 cursor-pointer">
              Précédent
            </button>
            {visiblePages(t.page, t.totalPages).map((n) => (
              <button
                key={n}
                onClick={() => t.setPage(n)}
                className={`px-3 py-1.5 rounded transition-colors ${t.page === n ? 'bg-blue-50 border border-blue-200 text-blue-700 shadow-sm font-bold' : 'text-slate-700 hover:bg-slate-50 border border-transparent'}`}
              >
                {n}
              </button>
            ))}
            <button
              disabled={t.page === t.totalPages}
              onClick={() => t.setPage((p) => Math.min(t.totalPages, p + 1))}
              className="px-3 py-1.5 text-slate-700 hover:text-blue-600 disabled:opacity-40 cursor-pointer"
            >
              Suivant
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
