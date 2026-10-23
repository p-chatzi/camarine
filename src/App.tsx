// Root component: owns the state shared between tabs and picks which tab to render.
// Tab-specific UI lives in components/<tab>/; data loading lives in hooks/.
import { useState } from 'react';
import { Header } from './components/layout/Header';
import { LoadingScreen } from './components/layout/LoadingScreen';
import { ComprendreView } from './components/comprendre/ComprendreView';
import { PartagerView } from './components/partager/PartagerView';
import { VisualiserView } from './components/visualiser/VisualiserView';
import { useCopernicusData } from './hooks/useCopernicusData';
import { useForum } from './hooks/useForum';
import { useMapCells } from './hooks/useMapCells';
import { useMapSettings } from './hooks/useMapSettings';
import type { ExportContext } from './lib/export';
import { getSpeciesSst } from './lib/speciesSst';
import type { AppMode, SpeciesItem } from './types';

export default function App() {
  const [mode, setMode] = useState<AppMode>('visualiser');
  const [selectedSpecies, setSelectedSpecies] = useState<SpeciesItem | null>(null);

  const data = useCopernicusData();
  const map = useMapCells(data.selectedDate);
  const settings = useMapSettings();
  const forum = useForum();

  const changeMode = (next: AppMode) => {
    setMode(next);
    setSelectedSpecies(null);
  };

  if (data.isLoading) return <LoadingScreen />;

  const exportContext: ExportContext = {
    colorMode: settings.colorMode,
    startDate: data.startDate,
    endDate: data.endDate,
    selectedDate: data.selectedDate,
    telemetry: data.telemetry,
    pipeline: data.pipeline,
    speciesSst: (coords) => getSpeciesSst(coords, map.cells, data.telemetry, data.heatFactor),
  };

  return (
    // Visualiser: the map fills the whole window and the header floats over it (no bar, no footer).
    // Comprendre / Partager: the same floating chips, above a scrolling page.
    <div className="relative h-dvh w-full bg-slate-50 text-slate-800 font-sans selection:bg-sky-500 selection:text-white flex flex-col overflow-hidden">
      <Header mode={mode} onChangeMode={changeMode} expert={settings.expert} onToggleExpert={settings.toggleExpert} overlay={mode === 'visualiser'} />

      {mode === 'visualiser' && (
        <VisualiserView
          data={data}
          settings={settings}
          cells={map.cells}
          isMapLoading={map.isLoading}
          selectedSpecies={selectedSpecies}
          onSelectSpecies={setSelectedSpecies}
          onClearSpecies={() => setSelectedSpecies(null)}
        />
      )}
      {mode === 'comprendre' && <ComprendreView data={data} cellCount={map.cells.length} />}
      {mode === 'partager' && <PartagerView data={data} settings={settings} exportContext={exportContext} forum={forum} />}

    </div>
  );
}
