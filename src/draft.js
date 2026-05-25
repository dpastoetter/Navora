import { DRAFT_KEY } from './constants.js';
import { appState, normalizeTrip } from './state.js';

let saveTimer = null;

export function saveDraft() {
  if (!appState.trip) return;
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      trip: appState.trip,
      theme: appState.theme,
      activeDayId: appState.activeDayId,
      savedAt: Date.now()
    }));
  } catch (_) { /* quota */ }
}

export function scheduleSaveDraft() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveDraft, 500);
}

export function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!data.trip) return false;
    appState.trip = normalizeTrip(data.trip);
    appState.theme = data.theme || 'dark';
    appState.activeDayId = data.activeDayId || appState.trip.days[0]?.id;
    return true;
  } catch (_) {
    return false;
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch (_) { /* ignore */ }
}
