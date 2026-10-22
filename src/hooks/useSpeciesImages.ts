// Photos of the selected species: curated list if any, otherwise the Wikipedia/Commons image.
import { useEffect, useState } from 'react';
import { fetchWikimediaImages } from '../api/wikimedia';
import { SPECIES_GALLERY_IMAGES } from '../data/speciesImages';
import type { SpeciesImage, SpeciesItem } from '../types';

/** Session cache so re-opening a card doesn't call Wikimedia again. */
const fetched = new Map<string, SpeciesImage[]>();

export function useSpeciesImages(species: SpeciesItem | null): { images: SpeciesImage[]; isLoading: boolean } {
  const curated = species ? SPECIES_GALLERY_IMAGES[species.id] : undefined;
  const [state, setState] = useState<{ id: string | null; images: SpeciesImage[]; isLoading: boolean }>({
    id: null,
    images: [],
    isLoading: false,
  });

  useEffect(() => {
    if (!species || curated) return;
    const cached = fetched.get(species.id);
    if (cached) {
      setState({ id: species.id, images: cached, isLoading: false });
      return;
    }
    const controller = new AbortController();
    setState({ id: species.id, images: [], isLoading: true });
    fetchWikimediaImages(species.scientificName, species.name, controller.signal)
      .then((images) => {
        fetched.set(species.id, images);
        setState({ id: species.id, images, isLoading: false });
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        setState({ id: species.id, images: [], isLoading: false });
      });
    return () => controller.abort();
  }, [species?.id, curated]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!species) return { images: [], isLoading: false };
  if (curated) return { images: curated, isLoading: false };
  if (state.id !== species.id) return { images: [], isLoading: true };
  return { images: state.images, isLoading: state.isLoading };
}
