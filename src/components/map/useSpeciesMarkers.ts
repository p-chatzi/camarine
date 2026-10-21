// Species pins: red "−" for declining species, green "+" for proliferating ones.
import L from 'leaflet';
import { useEffect, useRef } from 'react';
import type { SpeciesItem } from '../../types';

function pinHtml(sp: SpeciesItem, isSelected: boolean): string {
  const isDecline = sp.trend === 'decline';
  const badgeColor = isDecline ? '#e11d48' : '#10b981';
  const ringColor = isDecline ? 'rgba(225, 29, 72, 0.28)' : 'rgba(16, 185, 129, 0.28)';
  const borderColor = isDecline ? '#fecdd3' : '#a7f3d0';
  const sign = isDecline ? '−' : '+';
  const size = isSelected ? '38px' : '30px';

  return `
        <div style="display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -50%); cursor: pointer; user-select: none;">
          <div style="
            position: relative; width: ${size}; height: ${size}; border-radius: 9999px;
            background: ${badgeColor}; border: 3px solid #ffffff;
            box-shadow: 0 0 0 ${isSelected ? '8px' : '5px'} ${ringColor}, 0 6px 14px rgba(15, 23, 42, 0.25);
            display: flex; align-items: center; justify-content: center;
            color: #ffffff; font-weight: 900; font-size: ${isSelected ? '18px' : '15px'}; line-height: 1;
            transition: all 0.2s ease;
          ">${sign}</div>
          <div style="
            margin-top: 5px; padding: 2px 8px; border-radius: 9999px;
            background: ${isSelected ? '#0f172a' : 'rgba(255, 255, 255, 0.96)'};
            color: ${isSelected ? '#ffffff' : '#0f172a'};
            border: 1.5px solid ${isSelected ? badgeColor : borderColor};
            font-size: 11px; font-weight: 700; white-space: nowrap;
            box-shadow: 0 2px 8px rgba(15, 23, 42, 0.14);
          ">${sp.name}</div>
        </div>
      `;
}

export function useSpeciesMarkers(
  layer: L.LayerGroup | undefined,
  species: SpeciesItem[],
  selected: SpeciesItem | null,
  onSelect: (sp: SpeciesItem) => void,
) {
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!layer) return;
    layer.clearLayers();
    for (const sp of species) {
      const icon = L.divIcon({
        className: 'custom-species-leaflet-pin',
        html: pinHtml(sp, selected?.id === sp.id),
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });
      const marker = L.marker(sp.coords, { icon }).addTo(layer);
      marker.setZIndexOffset(1000);
      marker.on('click', (e: L.LeafletMouseEvent) => {
        e.originalEvent?.stopPropagation(); // don't trigger the map's "clear selection" click
        onSelectRef.current(sp);
      });
    }
  }, [layer, species, selected]);
}
