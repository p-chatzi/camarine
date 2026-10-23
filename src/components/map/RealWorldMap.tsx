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
      {/* Loading of a new day: spinner in the date chip (layout/DateControl.tsx); the previous day's
          pixels stay visible and usable meanwhile. */}
    </div>
  );
}
