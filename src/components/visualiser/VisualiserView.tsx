// Tab 1 "Visualiser": the map plus its floating panels.
// DOM order = keyboard order: map controls (filters, Pelagos, catalogue) → map (pins, zoom) → card.
import type { GeoJsonObject } from 'geojson';
import { Filter, Maximize2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { CopernicusData } from '../../hooks/useCopernicusData';
import type { MapSettings } from '../../hooks/useMapSettings';
import { useMarineZone } from '../../hooks/useMarineZone';
import { useSpeciesImages } from '../../hooks/useSpeciesImages';
import { matchesFacade, speciesForMode } from '../../lib/species';
import type { MapCell, SpeciesItem } from '../../types';
import { RealWorldMap } from '../map/RealWorldMap';
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

export function VisualiserView(props: Props) {
  const { data, settings, selectedSpecies } = props;
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
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
  }, [settings.expert, selectedSpecies, onClearSpecies]);

  // Escape closes the top-most panel: species card, then catalogue, then filters.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (selectedSpecies) onClearSpecies();
      else if (isCatalogOpen) setIsCatalogOpen(false);
      else if (isFilterOpen) setIsFilterOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedSpecies, isCatalogOpen, isFilterOpen, onClearSpecies]);

  /** Picking a species in the catalogue makes sure its pin is visible, then opens its card. */
  const selectFromCatalog = (sp: SpeciesItem) => {
    if (settings.dataType !== 'impact') settings.setDataType('impact');
    if (settings.trend !== 'Tous' && settings.trend !== sp.trend) settings.setTrend('Tous');
    if (!matchesFacade(sp, settings.basin, zone)) settings.setBasin('Tous');
    setIsCatalogOpen(false);
    props.onSelectSpecies(sp);
  };

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      <div className={`relative flex-1 w-full h-full overflow-hidden ${selectedSpecies ? 'camarine-card-open' : ''}`}>
        {/* Top-left: filters, "whole France", filter panel, Pelagos card. Limited to the map height
            (panels scroll inside) and transparent to clicks except on the panels themselves. */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute top-3 sm:top-4 left-3 sm:left-4 bottom-16 z-30 flex flex-col items-start gap-2.5 pointer-events-none max-w-[calc(100%-1.5rem)]"
        >
          <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
            <button
              onClick={() => setIsFilterOpen((open) => !open)}
              aria-expanded={isFilterOpen}
              aria-controls="filter-panel"
              className={`tap flex items-center gap-2.5 px-4 py-2.5 rounded-2xl font-bold text-xs shadow-lg border transition-all ${
                isFilterOpen ? 'bg-sky-700 text-white border-sky-800 shadow-sky-900/20' : 'bg-white/95 hover:bg-white text-slate-800 border-sky-200 shadow-sky-950/10'
              }`}
            >
              <Filter className={`w-4 h-4 ${isFilterOpen ? 'text-sky-200' : 'text-sky-600'}`} aria-hidden="true" />
              <span>Façades & Calques SST</span>
              {settings.activeFiltersCount > 0 && (
                <span className="px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold" aria-label={`${settings.activeFiltersCount} filtre(s) actif(s)`}>
                  {settings.activeFiltersCount}
                </span>
              )}
            </button>
            {settings.focusedBasin && (
              <button
                onClick={() => settings.setBasin('Tous')}
                title="Vue France entière"
                className="tap px-3.5 py-2.5 rounded-2xl bg-white/95 hover:bg-sky-50 text-xs font-bold text-sky-800 border border-sky-300 shadow-lg flex items-center justify-center gap-1.5"
              >
                <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
                {/* Icon only below 1024 px: keeps one row next to "Façades" and clear of the card / catalogue. */}
                <span className="sr-only lg:not-sr-only">Vue France Entière</span>
              </button>
            )}
          </div>

          {isFilterOpen && <FilterPanel settings={settings} onClose={() => setIsFilterOpen(false)} />}
          {/* Below 1024 px: hidden while a species card is open (not enough room, it would hide the selected pin). */}
          {settings.basin === 'Pelagos' && !isFilterOpen && (
            <div className={`contents ${selectedSpecies ? 'max-lg:hidden' : ''}`}>
              <PelagosCard speciesInZone={matching.length} pinsHidden={settings.dataType !== 'impact'} isLoading={zone === null} />
            </div>
          )}
        </div>

        {/* Top-right (expert mode): species catalogue. The species card (rendered after it) covers it when open. */}
        {settings.expert && (
          <SpeciesCatalog
            species={catalogSpecies}
            selectedId={selectedSpecies?.id ?? null}
            isOpen={isCatalogOpen}
            onToggle={() => setIsCatalogOpen((open) => !open)}
            onSelect={selectFromCatalog}
          />
        )}

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
          mapDate={data.selectedDate}
          isMapLoading={props.isMapLoading}
          colorMode={settings.colorMode}
          dataType={settings.dataType}
          telemetry={data.telemetry}
          records={data.records}
        />

        <MapLegend />

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
                    setIsCatalogOpen(true);
                  }
                : undefined
            }
          />
        )}
      </div>
    </div>
  );
}
