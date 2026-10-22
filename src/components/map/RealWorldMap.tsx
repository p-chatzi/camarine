// Leaflet map of French waters: base tiles + satellite SST pixels + species pins.
// Each layer is handled by its own hook in this folder.
import 'leaflet/dist/leaflet.css';
import { useRef } from 'react';
import type { Basin, ColorMode, MapCell, MapDataType, PipelineRecord, SpeciesItem, Telemetry, TileStyle } from '../../types';
import { useFranceOutline } from './useFranceOutline';
import { useLeafletMap } from './useLeafletMap';
import { useMapCamera } from './useMapCamera';
import { useSatelliteRaster } from './useSatelliteRaster';
import { useSpeciesMarkers } from './useSpeciesMarkers';
import { useThermalLayer } from './useThermalLayer';

interface Props {
  species: SpeciesItem[];
  selectedSpecies: SpeciesItem | null;
  onSelectSpecies: (sp: SpeciesItem) => void;
  onClearSelection: () => void;
  focusedBasin: Basin | null;
  showThermalOverlay: boolean;
  showSatelliteRaster: boolean;
  cells: MapCell[];
  mapDate: string;
  isMapLoading: boolean;
  tileStyle: TileStyle;
  colorMode: ColorMode;
  dataType: MapDataType;
  telemetry: Telemetry | null;
  records: PipelineRecord[];
}

export function RealWorldMap(props: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const leaflet = useLeafletMap(containerRef, props.tileStyle, props.onClearSelection);

  useSatelliteRaster(leaflet?.map, props.showSatelliteRaster);
  useFranceOutline(leaflet?.map);
  useMapCamera(leaflet?.map, props.focusedBasin, props.selectedSpecies);
  useThermalLayer({
    map: leaflet?.map,
    layer: leaflet?.thermalLayer,
    visible: props.showThermalOverlay,
    cells: props.cells,
    colorMode: props.colorMode,
    dataType: props.dataType,
    telemetry: props.telemetry,
    records: props.records,
  });
  useSpeciesMarkers(leaflet?.map, leaflet?.markersLayer, props.species, props.selectedSpecies, props.onSelectSpecies);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full z-10" />
      {leaflet && props.isMapLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/40 backdrop-blur-[2px] transition-all">
          <div className="bg-white/95 px-6 py-4 rounded-2xl shadow-xl flex flex-col items-center gap-3 border border-sky-200 animate-in fade-in zoom-in duration-200">
            <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin"></div>
            <span className="text-sm font-bold text-sky-900">Extraction des thermiques du {props.mapDate}</span>
          </div>
        </div>
      )}
    </div>
  );
}
