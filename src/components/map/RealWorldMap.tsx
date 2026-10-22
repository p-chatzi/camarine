// Leaflet map of French waters: base tiles + satellite SST pixels + species pins.
// Each layer is handled by its own hook in this folder.
import 'leaflet/dist/leaflet.css';
import { useRef } from 'react';
import type { GeoJsonObject } from 'geojson';
import type { ColorMode, MapFocus, MapCell, MapDataType, PipelineRecord, SpeciesItem, Telemetry } from '../../types';
import { useFranceOutline } from './useFranceOutline';
import { useLeafletMap } from './useLeafletMap';
import { useMapCamera } from './useMapCamera';
import { useSatelliteRaster } from './useSatelliteRaster';
import { useSpeciesMarkers } from './useSpeciesMarkers';
import { useThermalLayer } from './useThermalLayer';
import { useZoneHighlight } from './useZoneHighlight';

interface Props {
  species: SpeciesItem[];
  selectedSpecies: SpeciesItem | null;
  onSelectSpecies: (sp: SpeciesItem) => void;
  onClearSelection: () => void;
  focusedBasin: MapFocus;
  /** Marine zone to highlight (Pelagos), null = none. */
  zoneGeometry: GeoJsonObject | null;
  showThermalOverlay: boolean;
  showSatelliteRaster: boolean;
  cells: MapCell[];
  mapDate: string;
  isMapLoading: boolean;
  colorMode: ColorMode;
  dataType: MapDataType;
  telemetry: Telemetry | null;
  records: PipelineRecord[];
}

export function RealWorldMap(props: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const leaflet = useLeafletMap(containerRef, props.onClearSelection);

  useSatelliteRaster(leaflet?.map, props.showSatelliteRaster);
  useFranceOutline(leaflet?.map);
  useZoneHighlight(leaflet?.map, props.zoneGeometry);
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
      {/* Non-blocking: the previous day's pixels stay visible and usable while the new day loads. */}
      {leaflet && props.isMapLoading && (
        <div role="status" className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="bg-white/95 px-4 py-2 rounded-full shadow-lg flex items-center gap-2 border border-sky-200">
            <div className="w-4 h-4 border-2 border-sky-200 border-t-sky-600 rounded-full animate-spin" />
            <span className="text-xs font-bold text-sky-900">Chargement des pixels SST du {props.mapDate}…</span>
          </div>
        </div>
      )}
    </div>
  );
}
