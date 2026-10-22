// Fallback photos for species without curated images (src/data/speciesImages.ts).
// Takes the main image of the species' Wikipedia article (fr, then en) and reads its author and
// licence from Wikimedia Commons, so the credit shown under the photo is the real one.
// Both APIs allow anonymous cross-origin reads with `origin=*`.
import type { SpeciesImage } from '../types';

const WIKIPEDIA_API = (lang: 'fr' | 'en') => `https://${lang}.wikipedia.org/w/api.php`;
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';

/** "Magallana gigas (= Crassostrea gigas)" → "Magallana gigas"; "Ostreopsis cf. ovata" → "Ostreopsis ovata". */
export function wikiTitleFor(scientificName: string): string {
  return scientificName
    .replace(/\(.*?\)/g, '')
    .replace(/\bcf\.\s*/g, '')
    .replace(/\bspp?\.$/, '')
    .split('&')[0]
    .trim();
}

/** Commons metadata fields are HTML snippets: keep the text only (never injected as HTML). */
function htmlToText(html: string | undefined): string {
  if (!html) return '';
  return new DOMParser().parseFromString(html, 'text/html').body.textContent?.trim() ?? '';
}

async function getJson(url: string, params: Record<string, string>, signal?: AbortSignal) {
  const query = new URLSearchParams({ format: 'json', formatversion: '2', origin: '*', ...params });
  const response = await fetch(`${url}?${query}`, { signal });
  if (!response.ok) throw new Error(`Wikimedia ${response.status}`);
  return response.json();
}

async function pageImageName(title: string, lang: 'fr' | 'en', signal?: AbortSignal): Promise<string | null> {
  const data = await getJson(WIKIPEDIA_API(lang), { action: 'query', prop: 'pageimages', piprop: 'name', redirects: '1', titles: title }, signal);
  return data?.query?.pages?.[0]?.pageimage ?? null;
}

async function commonsImage(fileName: string, alt: string, signal?: AbortSignal): Promise<SpeciesImage | null> {
  const data = await getJson(
    COMMONS_API,
    { action: 'query', prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '1280', titles: `File:${fileName}` },
    signal,
  );
  const info = data?.query?.pages?.[0]?.imageinfo?.[0];
  if (!info) return null;
  const meta = info.extmetadata ?? {};
  return {
    title: fileName.replace(/_/g, ' '),
    src: info.thumburl ?? info.url,
    alt,
    artist: htmlToText(meta.Artist?.value) || 'Wikimedia Commons',
    license: htmlToText(meta.LicenseShortName?.value) || 'voir Wikimedia Commons',
  };
}

/** Returns [] when nothing suitable is found (the card then shows a "photo à venir" block). */
export async function fetchWikimediaImages(scientificName: string, commonName: string, signal?: AbortSignal): Promise<SpeciesImage[]> {
  const title = wikiTitleFor(scientificName);
  for (const lang of ['fr', 'en'] as const) {
    const fileName = await pageImageName(title, lang, signal);
    if (!fileName) continue;
    const image = await commonsImage(fileName, `${commonName} (${title})`, signal);
    if (image) return [image];
  }
  return [];
}
