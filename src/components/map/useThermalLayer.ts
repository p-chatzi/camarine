// Draws the satellite SST pixels, coloured by SST or by Hobday category.
// All pixels are painted into ONE canvas image (fast even with ~100k pixels) and a single
// tooltip follows the mouse, looking up the pixel under the cursor.
import L from 'leaflet';
import { useEffect } from 'react';
import { FALLBACK_CLIMATOLOGY, FALLBACK_THRESHOLD, MAP_CELL_RESOLUTION } from '../../config';
import { getSstColor } from '../../lib/colors';
import { CATEGORY_HEX, CATEGORY_NAMES, classifyHobday } from '../../lib/hobday';
import type { ColorMode, MapCell, MapDataType, PipelineRecord, Telemetry } from '../../types';
import { dailyPixelTooltip, periodPixelTooltip } from './thermalPopups';

interface PixelValues extends MapCell {
  displaySst: number; // drives SST colour
  hobdaySst: number; // drives Hobday category
}

/**
 * In 'average' mode each pixel is blended with the point time series.
 * ⚠ This is a visual approximation, not a per-pixel period average computed from data.
 */
function pixelValues(cells: MapCell[], colorMode: ColorMode, records: PipelineRecord[]): PixelValues[] {
  if (colorMode !== 'average' || records.length === 0) {
    return cells.map((c) => ({ ...c, displaySst: c.sst, hobdaySst: c.sst }));
  }
  const avg = records.reduce((acc, r) => acc + r.sst, 0) / (records.length || 1);
  const max = Math.max(...records.map((r) => r.sst));
  return cells.map((c) => ({
    ...c,
    displaySst: +(c.sst * 0.4 + avg * 0.6).toFixed(2),
    hobdaySst: +(c.sst + (max - avg) * 0.3).toFixed(2),
  }));
}

/** Colour, opacity and tooltip of one pixel. */
interface StyledPixel extends PixelValues {
  color: string;
  opacity: number;
  tooltip: () => string;
}

function stylePixels(
  pixels: PixelValues[],
  dataType: MapDataType,
  isPeriod: boolean,
  climatology: number,
  threshold: number,
): StyledPixel[] {
  return pixels.map((px) => {
    const { level } = classifyHobday(px.hobdaySst, climatology, threshold, 0.4);
    const inHeatwave = level > 0;
    const catName = inHeatwave ? CATEGORY_NAMES[level as 1] : 'Normale';
    const catColor = CATEGORY_HEX[level];
    return {
      ...px,
      color: dataType === 'mhw' ? catColor : getSstColor(px.displaySst),
      // In heatwave view, normal pixels are almost transparent so hot zones stand out.
      opacity: dataType === 'mhw' ? (inHeatwave ? 0.65 : 0.08) : 0.45,
      tooltip: () => {
        if (!isPeriod) return dailyPixelTooltip(px.displaySst, catName, catColor);
        // ⚠ Frequency and duration are pseudo-random (seeded by coordinates), NOT computed from events.
        const seed = Math.abs(px.lat * 1000 + px.lon * 1000);
        return periodPixelTooltip({
          avgSst: px.displaySst,
          peakSst: px.hobdaySst,
          threshold,
          frequency: inHeatwave ? Math.floor((seed % 3) + 1) : 0,
          meanDuration: inHeatwave ? Math.floor((seed % 15) + 5) : 0,
          categoryName: catName,
          categoryColor: catColor,
        });
      },
    };
  });
}

// ---- Raster building -------------------------------------------------------

const RES = MAP_CELL_RESOLUTION;
const mercatorY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
const inverseMercatorY = (y: number) => (360 / Math.PI) * Math.atan(Math.exp(y)) - 90;

/** Regular-grid index of the pixels, so a lat/lon can be looked up in O(1). */
class PixelGrid {
  readonly minLat: number;
  readonly minLon: number;
  readonly rows: number;
  readonly cols: number;
  private readonly cells = new Map<number, StyledPixel>();

  constructor(pixels: StyledPixel[]) {
    let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
    for (const p of pixels) {
      minLat = Math.min(minLat, p.lat); maxLat = Math.max(maxLat, p.lat);
      minLon = Math.min(minLon, p.lon); maxLon = Math.max(maxLon, p.lon);
    }
    this.minLat = minLat;
    this.minLon = minLon;
    this.rows = Math.round((maxLat - minLat) / RES) + 1;
    this.cols = Math.round((maxLon - minLon) / RES) + 1;
    for (const p of pixels) this.cells.set(this.key(this.row(p.lat), this.col(p.lon)), p);
  }

  private row = (lat: number) => Math.round((lat - this.minLat) / RES);
  private col = (lon: number) => Math.round((lon - this.minLon) / RES);
  private key = (r: number, c: number) => r * this.cols + c;

  at(lat: number, lon: number): StyledPixel | undefined {
    const r = this.row(lat), c = this.col(lon);
    if (r < 0 || c < 0 || r >= this.rows || c >= this.cols) return undefined;
    return this.cells.get(this.key(r, c));
  }

  /** Geographic extent of the pixel edges. */
  bounds(): L.LatLngBounds {
    return L.latLngBounds(
      [this.minLat - RES / 2, this.minLon - RES / 2],
      [this.minLat + (this.rows - 0.5) * RES, this.minLon + (this.cols - 0.5) * RES],
    );
  }
}

/**
 * Paints the grid into a canvas. Leaflet stretches images linearly in Web-Mercator, so canvas
 * rows are spaced in Mercator Y (not in latitude) to keep pixels aligned with the coastline.
 */
function paintCanvas(grid: PixelGrid): string {
  const bounds = grid.bounds();
  const yTop = mercatorY(bounds.getNorth());
  const yBottom = mercatorY(bounds.getSouth());
  const width = grid.cols;
  const height = grid.rows;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const image = ctx.createImageData(width, height);
  const rgbCache = new Map<string, [number, number, number]>();

  for (let row = 0; row < height; row++) {
    const lat = inverseMercatorY(yTop - ((row + 0.5) / height) * (yTop - yBottom));
    for (let col = 0; col < width; col++) {
      const px = grid.at(lat, grid.minLon + col * RES);
      if (!px) continue;
      let rgb = rgbCache.get(px.color);
      if (!rgb) {
        const n = parseInt(px.color.slice(1), 16);
        rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
        rgbCache.set(px.color, rgb);
      }
      const i = (row * width + col) * 4;
      image.data[i] = rgb[0];
      image.data[i + 1] = rgb[1];
      image.data[i + 2] = rgb[2];
      image.data[i + 3] = Math.round(px.opacity * 255);
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas.toDataURL();
}

// ---- Hook ------------------------------------------------------------------

interface Options {
  map: L.Map | undefined;
  layer: L.LayerGroup | undefined;
  visible: boolean;
  cells: MapCell[];
  colorMode: ColorMode;
  dataType: MapDataType;
  telemetry: Telemetry | null;
  records: PipelineRecord[];
}

export function useThermalLayer({ map, layer, visible, cells, colorMode, dataType, telemetry, records }: Options) {
  useEffect(() => {
    if (!map || !layer) return;
    layer.clearLayers();
    if (!visible || cells.length === 0) return;

    const isPeriod = colorMode === 'average';
    const pixels = stylePixels(
      pixelValues(cells, colorMode, isPeriod ? records : []),
      dataType,
      isPeriod,
      telemetry?.climatology || FALLBACK_CLIMATOLOGY,
      telemetry?.threshold || FALLBACK_THRESHOLD,
    );
    const grid = new PixelGrid(pixels);
    L.imageOverlay(paintCanvas(grid), grid.bounds(), { className: 'sst-raster', interactive: false }).addTo(layer);

    // One tooltip that follows the cursor and shows the pixel underneath.
    const tooltip = L.tooltip({ direction: 'top', offset: [0, -8] });
    const onMove = (e: L.LeafletMouseEvent) => {
      const px = grid.at(e.latlng.lat, e.latlng.lng);
      if (!px) {
        map.closeTooltip(tooltip);
        return;
      }
      tooltip.setLatLng(e.latlng).setContent(px.tooltip());
      if (!map.hasLayer(tooltip)) map.openTooltip(tooltip);
    };
    const onOut = () => map.closeTooltip(tooltip);
    // Touch screens have no hover: a tap on the sea shows the pixel value for a few seconds.
    // (Browsers emit a synthetic "mouseout" right after a tap, so it must not close the tooltip there.)
    const isTouch = window.matchMedia?.('(hover: none)').matches ?? false;
    map.on('mousemove', onMove);
    if (!isTouch) map.on('mouseout', onOut);
    let hideTimer: number | undefined;
    const onTap = (e: L.LeafletMouseEvent) => {
      onMove(e);
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => map.closeTooltip(tooltip), 4000);
    };
    if (isTouch) map.on('click', onTap);
    return () => {
      map.off('mousemove', onMove);
      if (!isTouch) map.off('mouseout', onOut);
      if (isTouch) map.off('click', onTap);
      window.clearTimeout(hideTimer);
      map.closeTooltip(tooltip);
    };
  }, [map, layer, visible, cells, colorMode, dataType, telemetry, records]);
}
