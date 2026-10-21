// Root component: owns the state shared between tabs and picks which tab to render.
// Tab-specific UI lives in components/<tab>/; data loading lives in hooks/.
import { useState } from 'react';
import { BottomBar } from './components/layout/BottomBar';
import { Header } from './components/layout/Header';
import { LoadingScreen } from './components/layout/LoadingScreen';
import { ComprendreView } from './components/comprendre/ComprendreView';
import { PartagerView } from './components/partager/PartagerView';
import { VisualiserView } from './components/visualiser/VisualiserView';
import { useAudio } from './hooks/useAudio';
import { useCopernicusData } from './hooks/useCopernicusData';
import { useForum } from './hooks/useForum';
import { useMapCells } from './hooks/useMapCells';
import { useMapSettings } from './hooks/useMapSettings';
import { useMuseumTour } from './hooks/useMuseumTour';
import type { ExportContext } from './lib/export';
import { getSpeciesSst } from './lib/speciesSst';
import type { AppMode, SpeciesItem } from './types';

export default function App() {
  const [mode, setMode] = useState<AppMode>('visualiser');
  const [selectedSpecies, setSelectedSpecies] = useState<SpeciesItem | null>(null);

  const data = useCopernicusData();
  const map = useMapCells(data.selectedDate);
  const settings = useMapSettings();
  const audio = useAudio();
  const forum = useForum();

  /** Clicking a pin (or the museum "next" button). Narrates in museum mode. */
  const selectSpecies = (sp: SpeciesItem) => {
    setSelectedSpecies(sp);
    if (mode === 'museum' && audio.voiceOn) audio.speak(`${sp.name}. ${sp.narrationText}`);
  };

  const tour = useMuseumTour({ mode, audio, setBasin: settings.setBasin, setSelectedSpecies, selectSpecies });

  const changeMode = (next: AppMode) => {
    setMode(next);
    tour.stop();
    audio.stopSpeech();
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
    <div className="h-screen w-screen bg-sky-50 text-slate-800 font-sans selection:bg-sky-500 selection:text-white flex flex-col overflow-hidden">
      <Header mode={mode} onChangeMode={changeMode} audio={audio} expert={settings.expert} onToggleExpert={settings.toggleExpert} />

      {mode === 'visualiser' && (
        <VisualiserView
          mode={mode}
          data={data}
          settings={settings}
          cells={map.cells}
          isMapLoading={map.isLoading}
          selectedSpecies={selectedSpecies}
          onSelectSpecies={selectSpecies}
          onClearSpecies={() => setSelectedSpecies(null)}
          onSpeak={audio.speak}
          tour={tour}
        />
      )}
      {mode === 'comprendre' && <ComprendreView data={data} cellCount={map.cells.length} />}
      {mode === 'partager' && <PartagerView data={data} settings={settings} exportContext={exportContext} forum={forum} />}

      <BottomBar mode={mode} data={data} settings={settings} />
    </div>
  );
}
