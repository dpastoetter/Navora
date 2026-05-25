import { encodeTripPayload } from './share-url.js';
import { appState } from './state.js';

export function getHashParts() {
  const raw = location.hash.slice(1);
  const q = raw.indexOf('?');
  const path = (q >= 0 ? raw.slice(0, q) : raw).trim();
  const route = path === 'plan' ? 'plan' : path === 'view' ? 'view' : 'home';
  const params = new URLSearchParams(q >= 0 ? raw.slice(q + 1) : '');
  return { route, params };
}

export function getRoute() {
  return getHashParts().route;
}

export function isEmbedMode() {
  return getHashParts().params.get('embed') === '1';
}

export function buildHash(route) {
  let hash = route ? `#${route}` : '';
  const parts = [];
  const d = encodeTripPayload();
  if (d) parts.push(`d=${d}`);
  if (appState.syncRoom) parts.push(`room=${encodeURIComponent(appState.syncRoom)}`);
  if (getHashParts().params.get('embed') === '1') parts.push('embed=1');
  if (parts.length) hash += `?${parts.join('&')}`;
  return hash;
}

export function navigate(route) {
  if (!route) {
    location.hash = '';
    return;
  }
  location.hash = buildHash(route);
}

export function syncUrlToTrip(route) {
  if (!appState.trip || !route) return;
  const hash = buildHash(route);
  if (hash.length > 8000) return;
  history.replaceState(null, '', location.pathname + location.search + hash);
}
