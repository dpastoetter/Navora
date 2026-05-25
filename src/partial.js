import { renderHintsHtml } from './hints.js';
import { renderPackingHtml } from './packing.js';
import { renderWeatherStrip } from './weather.js';
import { appState } from './state.js';
import { createIcons } from './utils.js';

export function refreshSidebarPanels(weatherDays) {
  const hints = document.querySelector('[data-partial="hints"]');
  if (hints) {
    const day = appState.trip?.days.find(d => d.id === appState.activeDayId);
    if (day) hints.innerHTML = renderHintsHtml(day);
  }
  const packing = document.querySelector('[data-partial="packing"]');
  if (packing && appState.trip) packing.innerHTML = renderPackingHtml(appState.trip);
  const weather = document.querySelector('[data-partial="weather"]');
  if (weather && weatherDays && appState.trip) {
    weather.innerHTML = renderWeatherStrip(weatherDays, appState.trip.days);
  }
  createIcons();
}

export function updateActivityPill(actId, category) {
  const card = document.querySelector(`[data-act-id="${actId}"]`);
  if (!card) return;
  const pill = card.querySelector('.pill');
  if (pill) {
    pill.className = `pill pill-${category}`;
    pill.textContent = category;
  }
}

export function clearPresenceBadges() {
  document.querySelectorAll('.presence-badge').forEach(el => el.remove());
}

export function showPresenceOnActivity(actId) {
  if (!appState.editingActivityId || appState.editingActivityId === actId) return;
  const card = document.querySelector(`[data-act-id="${actId}"]`);
  if (!card || card.querySelector('.presence-badge')) return;
  const badge = document.createElement('span');
  badge.className = 'presence-badge';
  badge.textContent = 'syncing…';
  card.querySelector('.activity-card-header')?.appendChild(badge);
}
