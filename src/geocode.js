import { appState } from './state.js';

let lastFetchAt = 0;
const MIN_INTERVAL_MS = 1100;

async function rateLimitedFetch(fn) {
  const now = Date.now();
  const wait = Math.max(0, MIN_INTERVAL_MS - (now - lastFetchAt));
  if (wait) await new Promise(r => setTimeout(r, wait));
  lastFetchAt = Date.now();
  return fn();
}

export async function geocodeLocation(query, destination) {
  const key = `${query}|${destination}`.toLowerCase().trim();
  if (!query.trim()) return null;
  if (appState.geocodeCache[key]) return appState.geocodeCache[key];

  return rateLimitedFetch(async () => {
    appState.geocoding = true;
    const q = destination ? `${query}, ${destination}` : query;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      if (data[0]) {
        const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        appState.geocodeCache[key] = result;
        return result;
      }
    } catch (_) { /* offline */ }
    finally {
      appState.geocoding = false;
    }
    return null;
  });
}

export async function geocodeActivity(dayId, block, actId, onDone) {
  const day = appState.trip?.days.find(d => d.id === dayId);
  const act = day?.blocks[block]?.find(a => a.id === actId);
  if (!act?.location?.trim()) return;
  const coords = await geocodeLocation(act.location, appState.trip?.destination);
  if (coords) {
    act.lat = coords.lat;
    act.lng = coords.lng;
    onDone?.();
  }
}

export async function geocodeAllForDay(dayId, onDone) {
  const day = appState.trip?.days.find(d => d.id === dayId);
  if (!day) return;
  for (const block of ['morning', 'afternoon', 'evening']) {
    for (const a of day.blocks[block] || []) {
      if (a.location?.trim()) await geocodeActivity(day.id, block, a.id);
    }
  }
  onDone?.();
}
