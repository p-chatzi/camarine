// Photo carousel of the species card: auto-advances every 6.5 s, pauses on hover.
import { useEffect, useState } from 'react';
import type { SpeciesImage } from '../types';

const SLIDE_MS = 6500;

export function useSpeciesCarousel(speciesId: string | undefined, images: SpeciesImage[] | null) {
  const [index, setIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => setIndex(0), [speciesId]);

  useEffect(() => {
    if (!images || images.length < 2 || isHovering) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % images.length), SLIDE_MS);
    return () => window.clearInterval(timer);
  }, [isHovering, speciesId, images]);

  const next = () => images && images.length > 0 && setIndex((i) => (i + 1) % images.length);

  return { index, setIndex, next, setIsHovering };
}
