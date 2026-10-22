// Highlights the selected marine zone (e.g. Pelagos): teal fill + dashed border, between the SST
// pixels and the France outline, so the temperatures underneath stay readable.
import type { GeoJsonObject } from 'geojson';
import L from 'leaflet';
import { useEffect } from 'react';
import { ringsAsLines } from '../../lib/geo';

const PANE = 'zoneHighlight';

// Fill without stroke (polygon) + border drawn as lines: no straight clip edges when zoomed in.
const FILL: L.PathOptions = { stroke: false, fillColor: '#14b8a6', fillOpacity: 0.16, interactive: false };
const BORDER: L.PathOptions = { color: '#0f766e', weight: 3, dashArray: '8 6', fill: false, interactive: false };

export function useZoneHighlight(map: L.Map | undefined, geometry: GeoJsonObject | null) {
  useEffect(() => {
    if (!map || !geometry) return;
    if (!map.getPane(PANE)) map.createPane(PANE).style.zIndex = '430'; // pixels 400 < zone < outline 450
    const renderer = L.svg({ pane: PANE });
    const layer = L.layerGroup([
      L.geoJSON(geometry, { pane: PANE, style: FILL, renderer } as L.GeoJSONOptions),
      L.geoJSON(ringsAsLines(geometry), { pane: PANE, style: BORDER, renderer } as L.GeoJSONOptions),
    ]).addTo(map);
    return () => {
      layer.remove();
    };
  }, [map, geometry]);
}
