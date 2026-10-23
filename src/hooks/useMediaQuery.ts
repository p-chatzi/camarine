// Live result of a CSS media query (e.g. '(max-width: 639px)'), updated on resize / rotation.
import { useEffect, useState } from 'react';

function matches(query: string): boolean {
  try {
    return window.matchMedia(query).matches;
  } catch {
    return false;
  }
}

export function useMediaQuery(query: string): boolean {
  const [value, setValue] = useState(() => matches(query));
  useEffect(() => {
    let mql: MediaQueryList;
    try {
      mql = window.matchMedia(query);
    } catch {
      return;
    }
    const onChange = () => setValue(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return value;
}

/** Phones (portrait): panels open as bottom sheets instead of drop-downs. */
export const PHONE_QUERY = '(max-width: 639px)';
