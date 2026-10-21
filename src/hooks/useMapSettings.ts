// Map filters, layer toggles and expert mode. Kept in App so they survive switching tabs.
import { useEffect, useState } from 'react';
import type { BasinFilter, ColorMode, MapDataType, TileStyle, TrendFilter } from '../types';

const EXPERT_KEY = 'camarine.expert';

function readExpert(): boolean {
  try {
    return localStorage.getItem(EXPERT_KEY) === '1';
  } catch {
    return false;
  }
}

export function useMapSettings() {
  const [basin, setBasin] = useState<BasinFilter>('Tous');
  const [trend, setTrend] = useState<TrendFilter>('Tous');
  const [showThermalOverlay, setShowThermalOverlay] = useState(true);
  const [showSatelliteRaster, setShowSatelliteRaster] = useState(false);
  const [showSourceInfo, setShowSourceInfo] = useState(false);
  /** Expert mode: shows telemetry pill, data sources and product ids. Remembered per browser. */
  const [expert, setExpert] = useState(readExpert);
  useEffect(() => {
    try {
      localStorage.setItem(EXPERT_KEY, expert ? '1' : '0');
    } catch {
      /* storage unavailable: ignore */
    }
  }, [expert]);
  const [colorMode, setColorMode] = useState<ColorMode>('daily');
  const [dataType, setDataType] = useState<MapDataType>('sst');
  const [tileStyle, setTileStyle] = useState<TileStyle>('voyager');

  return {
    basin, setBasin,
    trend, setTrend,
    showThermalOverlay, setShowThermalOverlay,
    showSatelliteRaster, setShowSatelliteRaster,
    showSourceInfo, setShowSourceInfo,
    expert, toggleExpert: () => setExpert((e) => !e),
    colorMode, setColorMode,
    dataType, setDataType,
    tileStyle, setTileStyle,
    /** Map zooms on this basin; null = whole of France. */
    focusedBasin: basin === 'Tous' ? null : basin,
    activeFiltersCount: (basin !== 'Tous' ? 1 : 0) + (trend !== 'Tous' ? 1 : 0),
  };
}

export type MapSettings = ReturnType<typeof useMapSettings>;
