// Species pins: red "−" for declining species, green "+" for proliferating ones.
// When many pins are shown (expert mode), labels only appear on hover below DENSE_LABELS_MIN_ZOOM.
import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { DENSE_LABELS_MIN_ZOOM, DENSE_LABELS_NARROW_MAP_PX, DENSE_LABELS_SPECIES_COUNT } from '../../config';
import type { SpeciesItem } from '../../types';

const COMPACT_CLASS = 'camarine-labels-compact';

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

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
          <div class="camarine-pin-label${isSelected ? ' is-selected' : ''}" style="
            margin-top: 5px; padding: 2px 8px; border-radius: 9999px;
            background: ${isSelected ? '#0f172a' : 'rgba(255, 255, 255, 0.96)'};
            color: ${isSelected ? '#ffffff' : '#0f172a'};
            border: 1.5px solid ${isSelected ? badgeColor : borderColor};
            font-size: 11px; font-weight: 700; white-space: nowrap;
            box-shadow: 0 2px 8px rgba(15, 23, 42, 0.14);
          ">${escapeHtml(sp.name)}</div>
        </div>
      `;
}

export function useSpeciesMarkers(
  map: L.Map | undefined,
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
      const marker = L.marker(sp.coords, { icon, title: `${sp.name} (${sp.scientificName})`, alt: sp.name }).addTo(layer);
      marker.setZIndexOffset(selected?.id === sp.id ? 2000 : 1000);
      marker.on('click', (e: L.LeafletMouseEvent) => {
        e.originalEvent?.stopPropagation(); // don't trigger the map's "clear selection" click
        onSelectRef.current(sp);
      });
      // Keyboard: Leaflet makes the pin focusable (role=button) but Enter/Space did not open it.
      const el = marker.getElement();
      if (el) {
        el.setAttribute('aria-label', `${sp.name} (${sp.scientificName}), ${sp.trend === 'decline' ? 'en déclin' : 'favorisée par la chaleur'} — ouvrir la fiche`);
        el.addEventListener('keydown', (ev) => {
          if (ev.key !== 'Enter' && ev.key !== ' ') return;
          ev.preventDefault();
          ev.stopPropagation();
          onSelectRef.current(sp);
        });
      }
    }
  }, [layer, species, selected]);

  // Dense mode: hide labels at low zoom (hover, keyboard focus or selection still shows them, see
  // index.css). Dense = many pins, or a narrow map (phones) where even a few labels overlap.
  const manyPins = species.length > DENSE_LABELS_SPECIES_COUNT;
  useEffect(() => {
    if (!map) return;
    const container = map.getContainer();
    const apply = () => {
      const dense = manyPins || map.getSize().x < DENSE_LABELS_NARROW_MAP_PX;
      container.classList.toggle(COMPACT_CLASS, dense && map.getZoom() < DENSE_LABELS_MIN_ZOOM);
    };
    apply();
    map.on('zoomend resize', apply);
    return () => {
      map.off('zoomend resize', apply);
      container.classList.remove(COMPACT_CLASS);
    };
  }, [map, manyPins]);
}
