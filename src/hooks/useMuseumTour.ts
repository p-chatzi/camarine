// Guided "Fresque Murale" tour: auto-advances through a section's species every 11.5 s with narration.
// ⚠ Only active when mode === 'museum', and no button in the header currently sets that mode.
import { useEffect, useRef, useState } from 'react';
import { MUSEUM_SECTIONS } from '../data/museumSections';
import { SPECIES_DATA } from '../data/species';
import type { AppMode, BasinFilter, MuseumSection, SpeciesItem } from '../types';
import type { AudioControls } from './useAudio';

const STEP_DURATION_MS = 11500;

const SECTION_BASIN: Record<string, BasinFilter> = {
  med: 'Méditerranée',
  plankton: 'Méditerranée',
  atl: 'Atlantique',
  manche: 'Manche',
};

/** Species of a section, skipping ids that no longer exist. */
export function sectionSpecies(section: MuseumSection): SpeciesItem[] {
  return section.speciesIds
    .map((id) => SPECIES_DATA.find((s) => s.id === id))
    .filter((s): s is SpeciesItem => s !== undefined);
}

interface Options {
  mode: AppMode;
  audio: AudioControls;
  setBasin: (b: BasinFilter) => void;
  setSelectedSpecies: (sp: SpeciesItem) => void;
  /** Selects + narrates (same as clicking a map pin). */
  selectSpecies: (sp: SpeciesItem) => void;
}

export function useMuseumTour({ mode, audio, setBasin, setSelectedSpecies, selectSpecies }: Options) {
  const [section, setSection] = useState<MuseumSection>(MUSEUM_SECTIONS[0]);
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSectionDone, setIsSectionDone] = useState(false);
  const [showDrawer, setShowDrawer] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startSection = (sec: MuseumSection) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSection(sec);
    setStepIndex(0);
    setIsSectionDone(false);
    setIsPlaying(true);
    if (!audio.ambientOn) audio.startAmbient();

    const basin = SECTION_BASIN[sec.id];
    if (basin) setBasin(basin);

    const first = SPECIES_DATA.find((s) => s.id === sec.speciesIds[0]);
    if (first) {
      setSelectedSpecies(first);
      if (audio.voiceOn) {
        audio.speak(`Chapitre ${sec.buttonNumber} : ${sec.title}. ${first.name}. ${first.narrationText}`);
      }
    }
  };

  const finishSection = () => {
    setIsPlaying(false);
    setIsSectionDone(true);
  };

  /** Manual "Suivant" button. */
  const next = () => {
    const list = sectionSpecies(section);
    if (stepIndex < list.length - 1) {
      setStepIndex(stepIndex + 1);
      selectSpecies(list[stepIndex + 1]);
    } else {
      finishSection();
    }
  };

  // Auto-advance timer.
  useEffect(() => {
    if (mode !== 'museum' || !isPlaying) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }
    const list = sectionSpecies(section);
    timerRef.current = setTimeout(() => {
      if (stepIndex < list.length - 1) {
        const nextSp = list[stepIndex + 1];
        setStepIndex(stepIndex + 1);
        setSelectedSpecies(nextSp);
        if (audio.voiceOn) audio.speak(`${nextSp.name}. ${nextSp.narrationText}`);
      } else {
        finishSection();
        if (audio.voiceOn) {
          audio.speak(
            `Fin de la séquence ${section.title}. Appuyez sur un autre bouton de la fresque murale pour explorer le bassin suivant.`,
          );
        }
      }
    }, STEP_DURATION_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [mode, isPlaying, stepIndex, section, audio.voiceOn]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    section,
    stepIndex,
    isPlaying,
    setIsPlaying,
    isSectionDone,
    showDrawer,
    setShowDrawer,
    startSection,
    next,
    stop: () => setIsPlaying(false),
  };
}

export type MuseumTour = ReturnType<typeof useMuseumTour>;
