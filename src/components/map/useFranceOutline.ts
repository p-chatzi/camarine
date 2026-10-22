// France outline (metropole + Corsica) drawn above the SST pixels and below the species pins.
import L from 'leaflet';
import { useEffect } from 'react';
import { fetchFranceOutline } from '../../api/geo';

const PANE = 'franceOutline';

/** Thin dark line + soft halo so the outline reads on both base maps and over the SST pixels. */
const HALO_STYLE: L.PathOptions = { color: '#ffffff', weight: 4, opacity: 0.75, fill: false, interactive: false };
const LINE_STYLE: L.PathOptions = { color: '#0c4a6e', weight: 1.6, opacity: 0.95, fill: false, interactive: false };

export function useFranceOutline(map: L.Map | undefined) {
  useEffect(() => {
    if (!map) return;
    // overlayPane = 400 (SST pixels), markerPane = 600 (species pins): the outline sits in between.
    if (!map.getPane(PANE)) map.createPane(PANE).style.zIndex = '450';
    map.attributionControl.addAttribution('Contour : IGN Admin Express (Licence Ouverte)');

    const controller = new AbortController();
    const group = L.layerGroup().addTo(map);
    const renderer = L.svg({ pane: PANE }); // crisp line whatever the global preferCanvas setting

    fetchFranceOutline(controller.signal)
      .then((geojson) => {
        L.geoJSON(geojson, { pane: PANE, style: HALO_STYLE, renderer } as L.GeoJSONOptions).addTo(group);
        L.geoJSON(geojson, { pane: PANE, style: LINE_STYLE, renderer } as L.GeoJSONOptions).addTo(group);
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') console.warn('[Camarine] contour France indisponible :', err);
      });

    return () => {
      controller.abort();
      group.remove();
    };
  }, [map]);
}
