import { DESTINATION_FILES, SIGHT_FILES } from './data/curated-images.js';
import { appState } from './state.js';
import { escapeHtml, heroImageUrl } from './utils.js';

const BASE = import.meta.env.BASE_URL || '/';

export function assetImage(relativePath) {
  if (!relativePath) return '';
  const clean = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
  return `${BASE}${clean}`;
}

/** Strip base or leading slash so bundled paths stay portable in trip JSON */
export function bundledImageRelative(url) {
  if (!url || url.startsWith('http')) return url || '';
  let path = url;
  if (BASE !== '/' && path.startsWith(BASE)) path = path.slice(BASE.length);
  if (path.startsWith('/')) path = path.slice(1);
  return path.startsWith('images/') ? path : url;
}

export function resolveImageSrc(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const rel = bundledImageRelative(url);
  if (rel.startsWith('images/')) return assetImage(rel);
  return url;
}

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
  for (const [key, path] of Object.entries(DESTINATION_FILES)) {
    if (lower.includes(key)) return assetImage(path);
  }
  return heroImageUrl(destination);
}

export function lookupCuratedSightPath(title, location) {
  const slug = slugify(title);
  if (SIGHT_FILES[slug]) return SIGHT_FILES[slug];
  const locSlug = slugify(location);
  if (locSlug && SIGHT_FILES[locSlug]) return SIGHT_FILES[locSlug];
  return '';
}

export function lookupCuratedSight(title, location) {
  return resolveImageSrc(lookupCuratedSightPath(title, location));
}

export function resolveActivityImage(act, destination) {
  if (act.imageUrl) {
    const resolved = resolveImageSrc(act.imageUrl);
    if (resolved) return resolved;
  }
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
          const path = lookupCuratedSightPath(act.title, act.location);
          if (path) act.imageUrl = path;
        } else if (!act.imageUrl.startsWith('http')) {
          act.imageUrl = bundledImageRelative(act.imageUrl);
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
  if (act.imageUrl && resolveActivityImage(act, destination)) {
    return resolveActivityImage(act, destination);
  }
  const curatedPath = lookupCuratedSightPath(act.title, act.location);
  if (curatedPath) {
    act.imageUrl = curatedPath;
    return resolveImageSrc(curatedPath);
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
  const src = resolveImageSrc(url);
  if (!src) {
    return `<div class="${className} photo-placeholder" aria-hidden="true"><i data-lucide="image"></i></div>`;
  }
  return `<img class="${className}" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async">`;
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
