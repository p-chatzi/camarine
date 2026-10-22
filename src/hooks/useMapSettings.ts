// Map filters, layer toggles and expert mode. Kept in App so they survive switching tabs.
import { useState } from 'react';
import type { BasinFilter, ColorMode, MapDataType, MapFocus, TrendFilter } from '../types';

export function useMapSettings() {
  const [basin, setBasin] = useState<BasinFilter>('Tous');
  const [trend, setTrend] = useState<TrendFilter>('Tous');
  const [showThermalOverlay, setShowThermalOverlay] = useState(true);
  const [showSatelliteRaster, setShowSatelliteRaster] = useState(false);
  const [showSourceInfo, setShowSourceInfo] = useState(false);
  /** Expert mode: telemetry pill, data sources, species catalogue. Always OFF when the page loads. */
  const [expert, setExpert] = useState(false);
  const [colorMode, setColorMode] = useState<ColorMode>('daily');
  /** Default view = "Mode Impact Biologique" (SST pixels + species pins). */
  const [dataType, setDataType] = useState<MapDataType>('impact');

  return {
    basin, setBasin,
    trend, setTrend,
    showThermalOverlay, setShowThermalOverlay,
    showSatelliteRaster, setShowSatelliteRaster,
    showSourceInfo, setShowSourceInfo,
    expert, toggleExpert: () => setExpert((e) => !e),
    colorMode, setColorMode,
    dataType, setDataType,
    /** Map zooms on this basin or marine zone; null = whole of France. */
    focusedBasin: (basin === 'Tous' ? null : basin) as MapFocus,
    activeFiltersCount: (basin !== 'Tous' ? 1 : 0) + (trend !== 'Tous' ? 1 : 0),
  };
}

export type MapSettings = ReturnType<typeof useMapSettings>;
