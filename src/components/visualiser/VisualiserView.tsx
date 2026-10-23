// Tab 1 "Visualiser": the map (whole background) plus floating chips and pop-ups.
// Keyboard order: header → Façades, Pelagos → catalogue → date, legend → map (pins, zoom) → card.
import type { GeoJsonObject } from 'geojson';
import { Filter, Maximize2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CopernicusData } from '../../hooks/useCopernicusData';
import type { MapSettings } from '../../hooks/useMapSettings';
import { useMarineZone } from '../../hooks/useMarineZone';
import { useSpeciesImages } from '../../hooks/useSpeciesImages';
import { matchesFacade, speciesForMode } from '../../lib/species';
import type { MapCell, SpeciesItem } from '../../types';
import { MapDateControl } from '../layout/DateControl';
import { CHIP } from '../layout/Header';
import { RealWorldMap } from '../map/RealWorldMap';
import { Popover } from '../ui/Popover';
import { FilterPanel } from './FilterPanel';
import { MapLegend } from './MapLegend';
import { PelagosCard } from './PelagosCard';
import { SpeciesCard } from './SpeciesCard';
import { SpeciesCatalog } from './SpeciesCatalog';

interface Props {
  data: CopernicusData;
  settings: MapSettings;
  cells: MapCell[];
  isMapLoading: boolean;
  selectedSpecies: SpeciesItem | null;
  onSelectSpecies: (sp: SpeciesItem) => void;
  onClearSpecies: () => void;
}

/** Species passing the facade (basin / Pelagos) and trend filters, for the current mode. */
function filteredSpecies(settings: MapSettings, zone: GeoJsonObject | null): SpeciesItem[] {
  return speciesForMode(settings.expert).filter(
    (sp) => matchesFacade(sp, settings.basin, zone) && (settings.trend === 'Tous' || sp.trend === settings.trend),
  );
}

type Panel = 'filters' | 'catalog' | 'date' | null;

export function VisualiserView(props: Props) {
  const { data, settings, selectedSpecies } = props;
  // One pop-up at a time (they are bottom sheets on phones and would stack).
  const [panel, setPanel] = useState<Panel>(null);
  const toggle = (next: Exclude<Panel, null>) => setPanel((current) => (current === next ? null : next));
  const filtersRef = useRef<HTMLButtonElement>(null);
  const zone = useMarineZone(settings.basin);
  const matching = useMemo(() => filteredSpecies(settings, zone), [settings.basin, settings.trend, settings.expert, zone]); // eslint-disable-line react-hooks/exhaustive-deps
  // Pins only appear in "Mode Impact Biologique".
  const species = settings.dataType === 'impact' ? matching : [];
  const catalogSpecies = useMemo(() => speciesForMode(true), []);
  const { images, isLoading: imagesLoading } = useSpeciesImages(selectedSpecies);

  // Leaving expert mode closes the card of an expert-only species (its pin is no longer shown).
  const { onClearSpecies } = props;
  useEffect(() => {
    if (!settings.expert && selectedSpecies?.audience === 'expert') onClearSpecies();
    if (!settings.expert) setPanel((p) => (p === 'catalog' ? null : p));
  }, [settings.expert, selectedSpecies, onClearSpecies]);

  // Escape closes the species card. (An open pop-up handles Escape itself and closes first.)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedSpecies) onClearSpecies();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedSpecies, onClearSpecies]);

  /** Picking a species in the catalogue makes sure its pin is visible, then opens its card. */
  const selectFromCatalog = (sp: SpeciesItem) => {
    if (settings.dataType !== 'impact') settings.setDataType('impact');
    if (settings.trend !== 'Tous' && settings.trend !== sp.trend) settings.setTrend('Tous');
    if (!matchesFacade(sp, settings.basin, zone)) settings.setBasin('Tous');
    setPanel(null);
    props.onSelectSpecies(sp);
  };

  return (
    <div className={`flex-1 relative overflow-hidden ${selectedSpecies ? 'camarine-card-open' : ''}`}>
      {/* Left, under the header: filters, "whole France", Pelagos card. Above the bottom chips. */}
      <div className="absolute top-16 left-3 bottom-[5.5rem] z-30 flex flex-col items-start gap-2 pointer-events-none max-w-[calc(100%-1.5rem)]">
        <div className="flex items-center gap-2">
          <button
            ref={filtersRef}
            onClick={() => toggle('filters')}
            aria-expanded={panel === 'filters'}
            aria-controls="filter-panel"
            aria-haspopup="dialog"
            className={`${CHIP} flex items-center gap-2 px-3.5 text-sm font-bold transition-colors ${
              panel === 'filters' ? '!bg-sky-700 !border-sky-800 text-white' : 'text-slate-800 hover:bg-white'
            }`}
          >
            <Filter className={`w-4 h-4 shrink-0 ${panel === 'filters' ? 'text-sky-200' : 'text-sky-600'}`} aria-hidden="true" />
            <span>Façades</span>
            {settings.activeFiltersCount > 0 && (
              <span className="min-w-5 px-1.5 rounded-full bg-rose-500 text-white text-[11px] font-extrabold" aria-label={`${settings.activeFiltersCount} filtre(s) actif(s)`}>
                {settings.activeFiltersCount}
              </span>
            )}
          </button>
          {settings.focusedBasin && (
            <button
              onClick={() => settings.setBasin('Tous')}
              title="Vue France entière"
              aria-label="Vue France entière"
              className={`${CHIP} min-w-11 px-3 flex items-center justify-center gap-1.5 text-sm font-bold text-sky-800 hover:bg-white`}
            >
              <Maximize2 className="w-4 h-4" aria-hidden="true" />
              <span className="hidden xl:inline">Vue France entière</span>
            </button>
          )}
        </div>

        {settings.basin === 'Pelagos' && (
          <PelagosCard speciesInZone={matching.length} pinsHidden={settings.dataType !== 'impact'} isLoading={zone === null} />
        )}
      </div>

      {panel === 'filters' && (
        <Popover id="filter-panel" label="Façades et affichage de la carte" anchorRef={filtersRef} onClose={() => setPanel(null)} width={340}>
          <FilterPanel settings={settings} onClose={() => setPanel(null)} />
        </Popover>
      )}

      {/* Right, under the header (expert mode): species catalogue. */}
      {settings.expert && (
        <div className="absolute top-16 right-3 z-30 pointer-events-none">
          <SpeciesCatalog
            species={catalogSpecies}
            selectedId={selectedSpecies?.id ?? null}
            isOpen={panel === 'catalog'}
            onToggle={() => toggle('catalog')}
            onSelect={selectFromCatalog}
          />
        </div>
      )}

      {/* Bottom-left: date of the map (opens the date pop-up) and legend. Above the map credits. */}
      <div className="camarine-bottom-chips absolute left-3 bottom-7 z-30 flex flex-wrap-reverse items-end gap-2 pointer-events-none max-w-[calc(100%-1.5rem)]">
        <MapDateControl data={data} settings={settings} isLoading={props.isMapLoading} open={panel === 'date'} onOpenChange={(open) => setPanel(open ? 'date' : null)} />
        <MapLegend />
      </div>

      {/* The map is the whole background (controls float over it, z-30); after them in the DOM so
          keyboard users reach the controls before the pins. */}
      <RealWorldMap
        species={species}
        selectedSpecies={selectedSpecies}
        onSelectSpecies={props.onSelectSpecies}
        onClearSelection={props.onClearSpecies}
        focusedBasin={settings.focusedBasin}
        zoneGeometry={zone}
        showThermalOverlay={settings.showThermalOverlay}
        showSatelliteRaster={settings.showSatelliteRaster}
        cells={props.cells}
        colorMode={settings.colorMode}
        dataType={settings.dataType}
        telemetry={data.telemetry}
        records={data.records}
      />

      {selectedSpecies && (
        <SpeciesCard
          species={selectedSpecies}
          images={images}
          imagesLoading={imagesLoading}
          year={data.telemetry?.year || 2026}
          heatFactor={data.heatFactor}
          onClose={props.onClearSpecies}
          onBack={
            settings.expert
              ? () => {
                  props.onClearSpecies();
                  setPanel('catalog');
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
