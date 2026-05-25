import { DRAFT_KEY } from './constants.js';
import { appState } from './state.js';

const THEME_KEY = 'navora-theme';
const SHARE_MAP_KEY = 'navora-share-map-open';
const SEEN_HINT_KEY = 'navora-seen-hint';
const SEEN_SHARE_TIP_KEY = 'navora-seen-share-tip';
const LAST_BLOCK_KEY = 'navora-last-block';

export function loadPrefs() {
  try {
    const theme = localStorage.getItem(THEME_KEY);
    if (theme === 'light' || theme === 'dark') appState.theme = theme;
    const map = localStorage.getItem(SHARE_MAP_KEY);
    if (map === '1') appState.shareMapOpen = true;
    if (map === '0') appState.shareMapOpen = false;
    const block = localStorage.getItem(LAST_BLOCK_KEY);
    if (block === 'morning' || block === 'afternoon' || block === 'evening') {
      appState.lastFabBlock = block;
    }
  } catch (_) { /* ignore */ }
}

export function saveTheme() {
  try {
    localStorage.setItem(THEME_KEY, appState.theme);
  } catch (_) { /* ignore */ }
}

export function saveShareMapOpen() {
  try {
    localStorage.setItem(SHARE_MAP_KEY, appState.shareMapOpen ? '1' : '0');
  } catch (_) { /* ignore */ }
}

export function saveLastFabBlock(block) {
  appState.lastFabBlock = block;
  try {
    localStorage.setItem(LAST_BLOCK_KEY, block);
  } catch (_) { /* ignore */ }
}

export function hasSeenHomeHint() {
  try {
    return localStorage.getItem(SEEN_HINT_KEY) === '1';
  } catch (_) {
    return true;
  }
}

export function markHomeHintSeen() {
  try {
    localStorage.setItem(SEEN_HINT_KEY, '1');
  } catch (_) { /* ignore */ }
}

export function hasSeenShareTip() {
  try {
    return localStorage.getItem(SEEN_SHARE_TIP_KEY) === '1';
  } catch (_) {
    return true;
  }
}

export function markShareTipSeen() {
  try {
    localStorage.setItem(SEEN_SHARE_TIP_KEY, '1');
  } catch (_) { /* ignore */ }
}

export function getDraftSavedAt() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw).savedAt || null;
  } catch (_) {
    return null;
  }
}
