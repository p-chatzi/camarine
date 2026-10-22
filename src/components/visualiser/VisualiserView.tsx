// Tab 1 "Visualiser": the map plus its floating panels.
import { Filter, Maximize2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { CopernicusData } from '../../hooks/useCopernicusData';
import type { MapSettings } from '../../hooks/useMapSettings';
import type { MuseumTour } from '../../hooks/useMuseumTour';
import { useSpeciesImages } from '../../hooks/useSpeciesImages';
import { speciesForMode } from '../../lib/species';
import type { AppMode, MapCell, SpeciesItem } from '../../types';
import { RealWorldMap } from '../map/RealWorldMap';
import { FilterPanel } from './FilterPanel';
import { MapLegend } from './MapLegend';
import { MuseumControls } from './MuseumControls';
import { MuseumPanel } from './MuseumPanel';
import { SpeciesCard } from './SpeciesCard';
import { SpeciesCatalog } from './SpeciesCatalog';
import { TelemetryPill } from './TelemetryPill';

interface Props {
  mode: AppMode;
  data: CopernicusData;
  settings: MapSettings;
  cells: MapCell[];
  isMapLoading: boolean;
  selectedSpecies: SpeciesItem | null;
  onSelectSpecies: (sp: SpeciesItem) => void;
  onClearSpecies: () => void;
  onSpeak: (text: string) => void;
  tour: MuseumTour;
}

/**
 * Species pins only appear in "impact" mode, filtered by basin and trend.
 * Normal mode shows the public species only; expert mode shows every species.
 */
function visibleSpecies(settings: MapSettings): SpeciesItem[] {
  if (settings.dataType !== 'impact') return [];
  return speciesForMode(settings.expert).filter(
    (sp) =>
      (settings.basin === 'Tous' || sp.basin === settings.basin) &&
      (settings.trend === 'Tous' || sp.trend === settings.trend),
  );
}

export function VisualiserView(props: Props) {
  const { mode, data, settings, selectedSpecies, tour } = props;
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const species = useMemo(() => visibleSpecies(settings), [settings.dataType, settings.basin, settings.trend, settings.expert]); // eslint-disable-line react-hooks/exhaustive-deps
  const catalogSpecies = useMemo(() => speciesForMode(true), []);
  const { images, isLoading: imagesLoading } = useSpeciesImages(selectedSpecies);

  // Leaving expert mode closes the card of an expert-only species (its pin is no longer shown).
  const { onClearSpecies } = props;
  useEffect(() => {
    if (!settings.expert && selectedSpecies?.audience === 'expert') onClearSpecies();
  }, [settings.expert, selectedSpecies, onClearSpecies]);

  /** Picking a species in the catalogue makes sure its pin is visible, then opens its card. */
  const selectFromCatalog = (sp: SpeciesItem) => {
    if (settings.dataType !== 'impact') settings.setDataType('impact');
    if (settings.trend !== 'Tous' && settings.trend !== sp.trend) settings.setTrend('Tous');
    if (settings.basin !== 'Tous' && settings.basin !== sp.basin) settings.setBasin('Tous');
    setIsCatalogOpen(false);
    props.onSelectSpecies(sp);
  };

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      <div className="relative flex-1 w-full h-full overflow-hidden">
        <RealWorldMap
          species={species}
          selectedSpecies={selectedSpecies}
          onSelectSpecies={props.onSelectSpecies}
          onClearSelection={props.onClearSpecies}
          focusedBasin={settings.focusedBasin}
          showThermalOverlay={settings.showThermalOverlay}
          showSatelliteRaster={settings.showSatelliteRaster}
          cells={props.cells}
          mapDate={data.selectedDate}
          isMapLoading={props.isMapLoading}
          tileStyle={settings.tileStyle}
          colorMode={settings.colorMode}
          dataType={settings.dataType}
          telemetry={data.telemetry}
          records={data.records}
        />

        {/* Top-left: filters button, "whole France" button, filter panel, museum panel */}
        <div onClick={(e) => e.stopPropagation()} className="absolute top-4 left-4 z-30 flex flex-col items-start gap-2.5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFilterOpen((open) => !open)}
              aria-expanded={isFilterOpen}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl font-bold text-xs shadow-lg border transition-all ${
                isFilterOpen ? 'bg-sky-700 text-white border-sky-800 shadow-sky-900/20' : 'bg-white/95 hover:bg-white text-slate-800 border-sky-200 shadow-sky-950/10'
              }`}
            >
              <Filter className={`w-4 h-4 ${isFilterOpen ? 'text-sky-200' : 'text-sky-600'}`} />
              <span>Façades & Calques SST</span>
              {settings.activeFiltersCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-extrabold">{settings.activeFiltersCount}</span>
              )}
            </button>
            {settings.focusedBasin && (
              <button
                onClick={() => settings.setBasin('Tous')}
                className="px-3.5 py-2.5 rounded-2xl bg-white/95 hover:bg-sky-50 text-xs font-bold text-sky-800 border border-sky-300 shadow-lg flex items-center gap-1.5"
              >
                <Maximize2 className="w-3.5 h-3.5" /> <span>Vue France Entière</span>
              </button>
            )}
          </div>

          {isFilterOpen && <FilterPanel settings={settings} onClose={() => setIsFilterOpen(false)} />}
          {mode === 'museum' && <MuseumPanel tour={tour} />}
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

        {settings.expert && data.telemetry && <TelemetryPill telemetry={data.telemetry} />}
        <MapLegend />

        {selectedSpecies && (
          <SpeciesCard
            species={selectedSpecies}
            images={images}
            imagesLoading={imagesLoading}
            year={data.telemetry?.year || 2026}
            heatFactor={data.heatFactor}
            onClose={props.onClearSpecies}
            onSpeak={props.onSpeak}
            onBack={
              settings.expert
                ? () => {
                    props.onClearSpecies();
                    setIsCatalogOpen(true);
                  }
                : undefined
            }
            footer={mode === 'museum' ? <MuseumControls tour={tour} /> : null}
          />
        )}
      </div>
    </div>
  );
}
