// HTML tooltips shown when hovering a satellite pixel (Leaflet needs raw HTML strings).
import { BASELINE } from '../../config';

/** Daily mode: one pixel, one day. */
export function dailyPixelTooltip(sst: number, categoryName: string, categoryColor: string): string {
  return `
          <div style="font-family: sans-serif; font-size: 11px; line-height: 1.35; padding: 4px; min-width: 150px;">
            <strong style="color: #0f172a;">Pixel Copernicus (Jour J)</strong><br/>
            Température : <b>${sst.toFixed(2)}°C</b><br/>
            Statut : <span style="color: ${categoryColor}; font-weight: bold;">${categoryName}</span>
          </div>
        `;
}

interface PeriodTooltip {
  avgSst: number;
  peakSst: number;
  threshold: number;
  frequency: number;
  meanDuration: number;
  categoryName: string;
  categoryColor: string;
}

/** Period mode: averaged pixel with frequency/duration. */
export function periodPixelTooltip(t: PeriodTooltip): string {
  return `
          <div style="font-family: sans-serif; font-size: 11px; line-height: 1.4; padding: 6px; min-width: 190px; color: #1e293b;">
            <strong style="color: #0f172a; font-size: 12px; border-bottom: 1px solid #cbd5e1; display: block; padding-bottom: 4px; margin-bottom: 6px;">
              Analyse Période (${BASELINE.start}-${BASELINE.end})
            </strong>
            <b>SST Moyenne :</b> ${t.avgSst.toFixed(2)}°C<br/>
            <b>Pic Max :</b> <span style="color: #e11d48;">${t.peakSst.toFixed(2)}°C</span><br/>
            <b>Seuil P90 (30 ans) :</b> ${t.threshold.toFixed(2)}°C<br/>
            <div style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed #cbd5e1;">
              <b>Fréquence :</b> ${t.frequency} canicule(s)<br/>
              <b>Durée moy :</b> ${t.meanDuration} jours<br/>
              <div style="margin-top: 6px; padding: 4px; border-radius: 4px; background: ${t.categoryColor}; color: white; font-weight: bold; text-align: center; font-size: 11px;">
                ${t.categoryName}
              </div>
            </div>
          </div>
        `;
}
