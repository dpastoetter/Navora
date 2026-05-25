import { DESTINATION_IMAGES, SIGHT_IMAGES } from './data/curated-images.js';
import { appState } from './state.js';
import { escapeHtml, heroImageUrl } from './utils.js';

export function slugify(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function getDestinationImage(destination) {
  if (!destination?.trim()) return '';
  const lower = destination.toLowerCase();
  for (const [key, url] of Object.entries(DESTINATION_IMAGES)) {
    if (lower.includes(key)) return url;
  }
  return heroImageUrl(destination);
}

export function lookupCuratedSight(title, location) {
  const slug = slugify(title);
  if (SIGHT_IMAGES[slug]) return SIGHT_IMAGES[slug];
  const locSlug = slugify(location);
  if (locSlug && SIGHT_IMAGES[locSlug]) return SIGHT_IMAGES[locSlug];
  return '';
}

export function resolveActivityImage(act, destination) {
  if (act.imageUrl) return act.imageUrl;
  const curated = lookupCuratedSight(act.title, act.location);
  if (curated) return curated;
  const cacheKey = `img:${slugify(act.title)}|${slugify(act.location)}|${slugify(destination)}`;
  return appState.imageCache?.[cacheKey] || '';
}

export function enrichTripImages(trip) {
  if (!trip) return;
  if (!appState.imageCache) appState.imageCache = {};
  for (const day of trip.days) {
    for (const block of ['morning', 'afternoon', 'evening']) {
      for (const act of day.blocks[block] || []) {
        if (!act.imageUrl) {
          const url = lookupCuratedSight(act.title, act.location);
          if (url) act.imageUrl = url;
        }
      }
    }
  }
}

export async function fetchWikimediaThumbnail(query) {
  if (!query?.trim()) return null;
  const cacheKey = `wiki:${query.toLowerCase().trim()}`;
  if (appState.imageCache?.[cacheKey]) return appState.imageCache[cacheKey];

  try {
    const params = new URLSearchParams({
      action: 'query',
      generator: 'search',
      gsrsearch: query,
      gsrnamespace: '0',
      gsrlimit: '1',
      prop: 'pageimages',
      pithumbsize: '640',
      format: 'json',
      origin: '*'
    });
    const res = await fetch(`https://en.wikipedia.org/w/api.php?${params}`);
    const data = await res.json();
    const pages = data.query?.pages;
    if (!pages) return null;
    const page = Object.values(pages)[0];
    const src = page?.thumbnail?.source;
    if (src) {
      if (!appState.imageCache) appState.imageCache = {};
      appState.imageCache[cacheKey] = src;
      return src;
    }
  } catch (_) { /* offline */ }
  return null;
}

export async function fetchActivityImage(act, destination) {
  if (act.imageUrl) return act.imageUrl;
  const curated = lookupCuratedSight(act.title, act.location);
  if (curated) {
    act.imageUrl = curated;
    return curated;
  }
  const query = [act.title, act.location, destination].filter(Boolean).join(' ');
  const url = await fetchWikimediaThumbnail(query);
  if (url) {
    act.imageUrl = url;
    return url;
  }
  const fallback = heroImageUrl(query || destination);
  act.imageUrl = fallback;
  return fallback;
}

export function renderPhotoHtml(url, className, alt = '') {
  if (!url) return `<div class="${className} photo-placeholder" aria-hidden="true"><i data-lucide="image"></i></div>`;
  return `<img class="${className}" src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" loading="lazy" referrerpolicy="no-referrer" decoding="async">`;
}

export async function prefetchTripImages(trip, onProgress) {
  const tasks = [];
  for (const day of trip.days) {
    for (const block of ['morning', 'afternoon', 'evening']) {
      for (const act of day.blocks[block] || []) {
        if ((act.title || act.location) && !act.imageUrl) {
          tasks.push(() => fetchActivityImage(act, trip.destination));
        }
      }
    }
  }
  for (let i = 0; i < tasks.length; i++) {
    await tasks[i]();
    if (i % 2 === 1) onProgress?.();
    await new Promise(r => setTimeout(r, 350));
  }
}
