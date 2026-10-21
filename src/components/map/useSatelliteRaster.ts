// Optional NASA GHRSST L4 raster tiles over France (fixed date: 2023-08-15).
import L from 'leaflet';
import { useEffect } from 'react';
import { SATELLITE_RASTER_URL } from '../../config';
import { DATA_LATLNG_BOUNDS } from './useLeafletMap';

export function useSatelliteRaster(map: L.Map | undefined, visible: boolean) {
  useEffect(() => {
    if (!map || !visible) return;
    const layer = L.tileLayer(SATELLITE_RASTER_URL, {
      opacity: 0.55,
      maxNativeZoom: 7,
      maxZoom: 13,
      bounds: DATA_LATLNG_BOUNDS,
      attribution: 'SST Raster: Copernicus / GHRSST L4',
    }).addTo(map);
    return () => {
      map.removeLayer(layer);
    };
  }, [map, visible]);
}
