import { renderHintsHtml } from './hints.js';
import { renderPackingHtml } from './packing.js';
import { renderWeatherStrip } from './weather.js';
import { appState } from './state.js';
import { createIcons, formatRelativeTime } from './utils.js';
import { getDraftSavedAt } from './prefs.js';
import { renderActivityCard } from './render.js';

export function refreshSidebarPanels(weatherDays) {
  const hints = document.querySelector('[data-partial="hints"]');
  if (hints) {
    const day = appState.trip?.days.find(d => d.id === appState.activeDayId);
    if (day) hints.innerHTML = renderHintsHtml(day);
  }
  const packing = document.querySelector('[data-partial="packing"]');
  if (packing && appState.trip) packing.innerHTML = renderPackingHtml(appState.trip);
  const weather = document.querySelector('[data-partial="weather-inner"]')
    || document.querySelector('[data-partial="weather"]');
  if (weather && appState.trip) {
    weather.innerHTML = renderWeatherWeatherPanel(weatherDays);
  }
  updateDraftIndicator();
  createIcons();
}

function renderWeatherWeatherPanel(weatherDays) {
  const trip = appState.trip;
  const hasDates = trip?.days.some(d => d.date);
  if (!weatherDays?.length) {
    if (!hasDates) {
      return `<p class="weather-nudge">Add dates to each day for a forecast. <button type="button" class="btn-link-inline" data-action="focus-day-date">Set date</button></p>`;
    }
    return '<p style="font-size:0.8rem;color:var(--text-muted)">Forecast unavailable.</p>';
  }
  return renderWeatherStrip(weatherDays, trip.days);
}

export function updateDraftIndicator() {
  const el = document.querySelector('[data-partial="draft-status"]');
  if (!el || !appState.trip) return;
  const at = getDraftSavedAt();
  el.textContent = at ? `Saved locally · ${formatRelativeTime(at)}` : 'Saved locally';
}

export function updateDayHeader(day) {
  if (!day) return;
  const titleEl = document.querySelector('.builder-days-panel .day-title');
  const metaEl = document.querySelector('.builder-days-panel .day-meta');
  if (titleEl) titleEl.textContent = day.label;
  if (metaEl) {
    metaEl.textContent = day.date
      ? new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', {
          weekday: 'long', month: 'long', day: 'numeric'
        })
      : 'No date set';
  }
}

export function replaceActivityCard(dayId, block, actId) {
  const day = appState.trip?.days.find(d => d.id === dayId);
  const act = day?.blocks[block]?.find(a => a.id === actId);
  const list = document.querySelector(
    `.activity-list[data-day-id="${dayId}"][data-block="${block}"]`
  );
  const old = list?.querySelector(`[data-act-id="${actId}"]`);
  if (!act || !list || !old) return false;
  const html = renderActivityCard(act, dayId, block, false);
  const wrap = document.createElement('div');
  wrap.innerHTML = html.trim();
  const neu = wrap.firstElementChild;
  if (!neu) return false;
  old.replaceWith(neu);
  createIcons();
  if (typeof window.__navoraBindDrag === 'function') window.__navoraBindDrag();
  return true;
}

export function updateGeocodeBadge(actId) {
  const card = document.querySelector(`[data-act-id="${actId}"]`);
  if (!card) return;
  const locInput = card.querySelector('[data-field="location"]');
  if (!locInput) return;
  let badge = card.querySelector('.geocode-status');
  const status = appState.geocodeStatus[actId];
  const act = findActivity(actId);
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'geocode-status';
    locInput.parentElement?.appendChild(badge);
  }
  if (status === 'pending') {
    badge.textContent = 'Finding on map…';
    badge.dataset.state = 'pending';
  } else if (status === 'ok' || (act?.lat != null && act?.lng != null)) {
    badge.textContent = 'On map';
    badge.dataset.state = 'ok';
  } else if (status === 'fail') {
    badge.textContent = 'Not found';
    badge.dataset.state = 'fail';
  } else {
    badge.textContent = '';
    badge.removeAttribute('data-state');
  }
}

function findActivity(actId) {
  for (const day of appState.trip?.days || []) {
    for (const block of ['morning', 'afternoon', 'evening']) {
      const a = day.blocks[block]?.find(x => x.id === actId);
      if (a) return a;
    }
  }
  return null;
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
