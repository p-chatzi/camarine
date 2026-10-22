// Pure geometry helpers (no Leaflet, no React).
import type { GeoJsonObject, MultiPolygon, Polygon, Position } from 'geojson';
import type { LatLon } from '../types';

/** Ray casting on one ring ([lon, lat] positions). */
function inRing(lon: number, lat: number, ring: Position[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function inPolygon(lon: number, lat: number, rings: Position[][]): boolean {
  return inRing(lon, lat, rings[0]) && !rings.slice(1).some((hole) => inRing(lon, lat, hole));
}

/** Polygons of a FeatureCollection / Feature / (Multi)Polygon. */
function polygonsOf(obj: GeoJsonObject): Position[][][] {
  switch (obj.type) {
    case 'FeatureCollection':
      return (obj as GeoJSON.FeatureCollection).features.flatMap((f) => polygonsOf(f));
    case 'Feature':
      return (obj as GeoJSON.Feature).geometry ? polygonsOf((obj as GeoJSON.Feature).geometry) : [];
    case 'Polygon':
      return [(obj as Polygon).coordinates];
    case 'MultiPolygon':
      return (obj as MultiPolygon).coordinates;
    default:
      return [];
  }
}

/** True if the point is inside the (multi)polygon geometry (holes = islands are excluded). */
export function containsPoint(geometry: GeoJsonObject, [lat, lon]: LatLon): boolean {
  return polygonsOf(geometry).some((rings) => inPolygon(lon, lat, rings));
}

/**
 * Polygon rings → MultiLineString. Leaflet clips polygons to the visible area by adding edges
 * along the clip rectangle; when stroked, those edges show up as straight lines across the map.
 * Lines are clipped segment by segment, without those artificial edges.
 */
export function ringsAsLines(obj: GeoJsonObject): GeoJSON.MultiLineString {
  return { type: 'MultiLineString', coordinates: polygonsOf(obj).flat() };
}
