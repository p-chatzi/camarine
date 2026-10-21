import type { LatLon, MapCell, Telemetry } from '../types';

/** SST of the map pixel closest to `coords` (Manhattan distance). */
function nearestCellSst(coords: LatLon, cells: MapCell[]): number {
  const [lat, lon] = coords;
  let closest = cells[0];
  let minDist = Math.abs(closest.lat - lat) + Math.abs(closest.lon - lon);
  for (const cell of cells) {
    const dist = Math.abs(cell.lat - lat) + Math.abs(cell.lon - lon);
    if (dist < minDist) {
      minDist = dist;
      closest = cell;
    }
  }
  return closest.sst;
}

/**
 * Rough base temperature by latitude, used when no map pixels are loaded.
 * ⚠ Estimate, not observed data.
 */
function regionalBaseSst([lat]: LatLon): number {
  if (lat < 44) return 22.5; // Méditerranée
  if (lat < 48) return 18.0; // Atlantique Sud / Bretagne
  return 15.5; // Manche
}

/** SST at a species location: real pixel if available, otherwise an estimate. */
export function getSpeciesSst(
  coords: LatLon,
  cells: MapCell[],
  telemetry: Telemetry | null,
  heatFactor: number,
): number {
  if (cells.length > 0) return nearestCellSst(coords, cells);
  const anomaly = telemetry?.anomaly ?? heatFactor * 3.5;
  return +(regionalBaseSst(coords) + anomaly).toFixed(2);
}
