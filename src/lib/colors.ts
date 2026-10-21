/** Color scale for sea surface temperature (15°C → 30°C). */
export function getSstColor(tempC: number): string {
  if (tempC >= 28.0) return '#be123c'; // Deep crimson heatwave
  if (tempC >= 26.5) return '#e11d48'; // Rose red
  if (tempC >= 24.5) return '#f97316'; // Orange
  if (tempC >= 22.0) return '#f59e0b'; // Amber
  if (tempC >= 19.5) return '#eab308'; // Yellow warm
  if (tempC >= 17.5) return '#10b981'; // Temperate emerald
  return '#0ea5e9'; // Cool ocean blue
}
