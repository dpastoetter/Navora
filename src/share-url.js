import LZString from 'lz-string';
import { MAX_URL_CHARS } from './constants.js';
import { appState, normalizeTrip } from './state.js';
import { enrichTripImages } from './images.js';

export function encodeTripPayload() {
  if (!appState.trip) return '';
  const payload = JSON.stringify({
    t: appState.trip,
    th: appState.theme,
    sm: appState.trip.shareMood
  });
  const encoded = LZString.compressToEncodedURIComponent(payload);
  if (encoded.length > MAX_URL_CHARS) return null;
  return encoded;
}

export function decodeTripPayload(encoded) {
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded);
    if (!json) return null;
    const data = JSON.parse(json);
    if (data.t) {
      const trip = normalizeTrip(data.t);
      if (data.sm) trip.shareMood = data.sm;
      return { trip, theme: data.th || 'dark' };
    }
  } catch (_) { /* ignore */ }
  return null;
}

export function tryHydrateFromUrl(onRoom) {
  const raw = location.hash.slice(1);
  const q = raw.indexOf('?');
  const params = new URLSearchParams(q >= 0 ? raw.slice(q + 1) : '');
  const d = params.get('d');
  if (d) {
    const decoded = decodeTripPayload(d);
    if (decoded) {
      appState.trip = decoded.trip;
      appState.theme = decoded.theme;
      appState.activeDayId = appState.trip.days[0]?.id || null;
      enrichTripImages(appState.trip);
    }
  }
  const room = params.get('room');
  if (room && room !== appState.syncRoom && onRoom) onRoom(room);
}
