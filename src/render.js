import { BLOCKS, BLOCK_LABELS, CATEGORIES, MOODS } from './constants.js';
import { appState, getActiveDay, createBlankTrip } from './state.js';
import { SAMPLE_TRIPS } from './samples.js';
import { escapeHtml, formatDateRange, createIcons } from './utils.js';
import { getDestinationImage, resolveActivityImage, renderPhotoHtml } from './images.js';
import { renderHintsHtml } from './hints.js';
import { renderPackingHtml } from './packing.js';
import { renderWeatherStrip } from './weather.js';
import { buildTimelineHtml } from './export-trip.js';
import { isEmbedMode } from './router.js';
import { canUndo } from './undo.js';
import {
  refreshMap, destroyMap, getActiveMapContainerId
} from './map.js';
import { syncUrlToTrip, getRoute } from './router.js';
import { encodeTripPayload } from './share-url.js';
import {
  reorderActivity
} from './trip-ops.js';
import { showPresenceOnActivity, clearPresenceBadges, refreshSidebarPanels } from './partial.js';

let dragState = null;
let weatherDays = null;

export function setWeatherDays(days) {
  weatherDays = days;
}

export function renderActivityCard(act, dayId, block, isNew) {
  const enterClass = isNew ? ' activity-enter' : '';
  const presence = appState.editingActivityId && appState.editingActivityId !== act.id && appState.syncConnected
    ? '<span class="presence-badge">live</span>' : '';
  const catOptions = CATEGORIES.map(c =>
    `<option value="${c}" ${act.category === c ? 'selected' : ''}>${c}</option>`
  ).join('');
  const imgUrl = resolveActivityImage(act, appState.trip?.destination);
  return `
    <div class="card activity-card${enterClass}" data-day-id="${dayId}" data-block="${block}" data-act-id="${act.id}">
      <div class="activity-card-header">
        <span class="drag-handle" draggable="true" data-action="noop" aria-label="Drag to reorder"><i data-lucide="grip-vertical"></i></span>
        <div class="activity-photo-wrap">
          ${renderPhotoHtml(imgUrl, 'activity-photo', act.title || act.location)}
          <button type="button" class="btn btn-ghost btn-sm photo-fetch-btn" data-action="fetch-activity-image"
                  data-day-id="${dayId}" data-block="${block}" data-act-id="${act.id}">Find photo</button>
        </div>
        <div class="activity-fields">
          <input class="input" type="text" placeholder="Activity title" value="${escapeHtml(act.title)}"
                 data-action="update-activity" data-field="title" data-day-id="${dayId}" data-block="${block}" data-act-id="${act.id}">
          <div class="activity-row">
            <input class="input" type="text" placeholder="Location" value="${escapeHtml(act.location)}"
                   data-action="update-activity" data-field="location" data-day-id="${dayId}" data-block="${block}" data-act-id="${act.id}"
                   data-blur-action="geocode-activity">
            <select data-action="update-activity" data-field="category" data-day-id="${dayId}" data-block="${block}" data-act-id="${act.id}" aria-label="Category">
              ${catOptions}
            </select>
          </div>
          <div class="time-row">
            <input type="time" value="${act.timeStart || ''}" title="Start" aria-label="Start time"
                   data-action="update-activity" data-field="timeStart" data-day-id="${dayId}" data-block="${block}" data-act-id="${act.id}">
            <span style="color:var(--text-muted);font-size:0.8rem">–</span>
            <input type="time" value="${act.timeEnd || ''}" title="End" aria-label="End time"
                   data-action="update-activity" data-field="timeEnd" data-day-id="${dayId}" data-block="${block}" data-act-id="${act.id}">
          </div>
          <span class="pill pill-${act.category}">${act.category}</span>
          ${act.lat != null ? '<span style="font-size:0.7rem;color:var(--accent)">on map</span>' : ''}
          <textarea class="input" rows="2" placeholder="Notes" data-action="update-activity" data-field="notes"
                    data-day-id="${dayId}" data-block="${block}" data-act-id="${act.id}">${escapeHtml(act.notes)}</textarea>
          <input class="input" type="url" placeholder="Optional link" value="${escapeHtml(act.link)}"
                 data-action="update-activity" data-field="link" data-day-id="${dayId}" data-block="${block}" data-act-id="${act.id}">
        </div>
        <button type="button" class="btn-icon" data-action="delete-activity" data-day-id="${dayId}" data-block="${block}" data-act-id="${act.id}" aria-label="Delete activity">
          <i data-lucide="trash-2"></i>
        </button>
        ${presence}
      </div>
      <div class="activity-row mobile-only" style="margin-top:0.5rem">
        <button type="button" class="btn btn-ghost btn-sm" data-action="move-up" data-day-id="${dayId}" data-block="${block}" data-act-id="${act.id}">↑</button>
        <button type="button" class="btn btn-ghost btn-sm" data-action="move-down" data-day-id="${dayId}" data-block="${block}" data-act-id="${act.id}">↓</button>
      </div>
    </div>`;
}

function renderTimeBlocks(day) {
  return BLOCKS.map(block => {
    const activities = day.blocks[block] || [];
    const listHtml = activities.length === 0
      ? `<div class="empty-state" data-action="add-activity" data-day-id="${day.id}" data-block="${block}">
           <i data-lucide="plus-circle" style="margin-bottom:0.5rem"></i>
           <p>Add your first stop</p>
         </div>`
      : activities.map(act =>
          renderActivityCard(act, day.id, block, appState.newActivityIds.has(act.id))
        ).join('');
    return `
      <section class="time-block">
        <div class="time-block-header">
          <h3>${BLOCK_LABELS[block]}</h3>
          <button type="button" class="btn btn-ghost btn-sm builder-desktop-only" data-action="add-activity" data-day-id="${day.id}" data-block="${block}">
            <i data-lucide="plus"></i> Add
          </button>
        </div>
        <div class="activity-list" data-day-id="${day.id}" data-block="${block}">${listHtml}</div>
      </section>`;
  }).join('');
}

export function renderHome() {
  const samples = SAMPLE_TRIPS.map((t, i) => {
    const grad = [
      '135deg, #01696f 0%, #0a3d40 50%, #171614 100%',
      '135deg, #2d4a6f 0%, #1a2838 50%, #171614 100%',
      '135deg, #6f4a2d 0%, #38281a 50%, #171614 100%'
    ][i];
    return `
      <article class="card sample-card" data-action="load-sample" data-sample-index="${i}">
        <div class="sample-thumb" style="background-image:url('${getDestinationImage(t.destination)}'), linear-gradient(${grad})"></div>
        <div class="sample-body">
          <h3>${escapeHtml(t.title)}</h3>
          <p>${escapeHtml(formatDateRange(t.startDate, t.endDate))}</p>
        </div>
      </article>`;
  }).join('');

  return `
    <div class="home">
      <header class="top-bar">
        <button type="button" class="brand" data-action="go-home">Navora</button>
        <button type="button" class="btn-icon" data-action="toggle-theme" aria-label="Toggle theme">
          <i data-lucide="${appState.theme === 'dark' ? 'sun' : 'moon'}"></i>
        </button>
      </header>
      <section class="home-hero">
        <h1 class="home-logo display">Navora</h1>
        <p class="home-tagline">Plan gorgeous, shareable itineraries your friends will actually read.</p>
        <form class="home-search" data-action="destination-submit">
          <input class="input" type="text" name="destination" id="home-destination" placeholder="Where are you going?" required aria-label="Destination">
          <button type="submit" class="btn btn-primary">Go</button>
        </form>
        <button type="button" class="btn btn-primary" data-action="plan-blank">Plan a trip</button>
        ${loadDraftBanner()}
      </section>
      <section class="home-samples">
        <h2>Inspiration</h2>
        <div class="sample-grid">${samples}</div>
      </section>
    </div>`;
}

function loadDraftBanner() {
  try {
    if (localStorage.getItem('navora-draft-v1')) {
      return `<button type="button" class="btn btn-ghost" style="margin-top:0.75rem" data-action="resume-draft">Resume saved draft</button>`;
    }
  } catch (_) { /* ignore */ }
  return '';
}

export function renderBuilder() {
  if (!appState.trip) {
    appState.trip = createBlankTrip();
    appState.activeDayId = appState.trip.days[0].id;
  }
  if (!appState.activeDayId && appState.trip.days[0]) {
    appState.activeDayId = appState.trip.days[0].id;
  }
  const trip = appState.trip;
  const day = getActiveDay();
  if (!day) return renderHome();

  const dayList = trip.days.map(d => `
    <div class="day-item ${d.id === appState.activeDayId ? 'active' : ''}" data-action="select-day" data-day-id="${d.id}">
      <i data-lucide="calendar-days"></i>
      <span>${escapeHtml(d.label)}</span>
      ${trip.days.length > 1 ? `<button type="button" class="btn-icon" style="padding:0.2rem" data-action="remove-day" data-day-id="${d.id}" aria-label="Remove day"><i data-lucide="x"></i></button>` : ''}
    </div>
  `).join('');

  const dayChips = trip.days.map(d => `
    <button type="button" class="day-chip ${d.id === appState.activeDayId ? 'active' : ''}" data-action="select-day" data-day-id="${d.id}">${escapeHtml(d.label)}</button>
  `).join('');

  const moodButtons = MOODS.filter(m => m !== 'default').map(m => `
    <button type="button" class="mood-btn ${trip.shareMood === m ? 'active' : ''}" data-action="set-mood" data-mood="${m}">${m.replace('-', ' ')}</button>
  `).join('');

  const isMobileDays = appState.mobileTab === 'days';
  const isMobileMap = appState.mobileTab === 'map';
  const isMobileShare = appState.mobileTab === 'share';
  const geocodeStatus = appState.geocoding ? '<p class="geocode-spinner">Geocoding…</p>' : '';

  return `
    <div class="builder">
      <aside class="builder-sidebar builder-desktop-only">
        <button type="button" class="brand" data-action="go-home" style="text-align:left;margin-bottom:0.5rem">← Navora</button>
        <input class="trip-title-input" type="text" value="${escapeHtml(trip.title)}" data-action="update-trip" data-field="title" placeholder="Trip title" aria-label="Trip title">
        <input class="input" type="text" value="${escapeHtml(trip.destination)}" data-action="update-trip" data-field="destination" placeholder="Destination" aria-label="Destination">
        <input class="input" type="text" value="${escapeHtml(trip.tagline)}" data-action="update-trip" data-field="tagline" placeholder="Tagline">
        <div style="display:flex;gap:0.5rem">
          <input class="input" type="date" value="${trip.startDate}" data-action="update-trip" data-field="startDate" aria-label="Start date">
          <input class="input" type="date" value="${trip.endDate}" data-action="update-trip" data-field="endDate" aria-label="End date">
        </div>
        <div class="day-edit-row">
          <label>Active day</label>
          <input class="input" type="text" value="${escapeHtml(day.label)}" data-action="update-day" data-field="label" data-day-id="${day.id}" placeholder="Day label">
          <input class="input" type="date" value="${day.date || ''}" data-action="update-day" data-field="date" data-day-id="${day.id}" aria-label="Day date">
        </div>
        <div class="day-list">${dayList}</div>
        <button type="button" class="btn btn-ghost btn-sm" data-action="add-day"><i data-lucide="plus"></i> Add day</button>
        <div class="sidebar-section">
          <h4>Day template</h4>
          <select class="input" data-action="apply-template" style="font-size:0.875rem" aria-label="Day template">
            <option value="">Apply to this day…</option>
            <option value="culture">City culture day</option>
            <option value="food">Food crawl</option>
            <option value="nature">Travel + nature</option>
          </select>
        </div>
        <div class="sidebar-section">
          <h4>Day insights</h4>
          <div class="hints-list" data-partial="hints">${renderHintsHtml(day)}</div>
        </div>
        <div class="sidebar-section" data-partial="weather">
          <h4>Weather</h4>
          ${weatherDays ? renderWeatherStrip(weatherDays, trip.days) : '<p style="font-size:0.8rem;color:var(--text-muted)">Set day dates for forecast.</p>'}
        </div>
        <div class="sidebar-section">
          <h4>Shareview mood</h4>
          <div class="mood-picker">${moodButtons}</div>
        </div>
        <div class="sidebar-section">
          <h4>Packing</h4>
          <div data-partial="packing">${renderPackingHtml(trip)}</div>
        </div>
        <div class="sidebar-section">
          <h4>Trip tools</h4>
          <div style="display:flex;flex-direction:column;gap:0.35rem">
            <button type="button" class="btn btn-ghost btn-sm" data-action="export-json"><i data-lucide="download"></i> Export JSON</button>
            <button type="button" class="btn btn-ghost btn-sm" data-action="import-json"><i data-lucide="upload"></i> Import JSON</button>
            <button type="button" class="btn btn-ghost btn-sm" data-action="duplicate-trip"><i data-lucide="copy"></i> Duplicate trip</button>
            ${canUndo() ? '<button type="button" class="btn btn-ghost btn-sm" data-action="undo">Undo</button>' : ''}
          </div>
        </div>
        <div class="sidebar-section">
          <h4>Live sync</h4>
          ${appState.syncConnected ? `<p class="sync-status"><span class="sync-dot live"></span> Connected · ${escapeHtml(appState.syncRoom || '')}</p>` : '<p class="sync-status"><span class="sync-dot"></span> Offline</p>'}
          <input class="input" type="text" placeholder="Room code" value="${escapeHtml(appState.syncRoom || '')}" data-action="set-room-input" style="font-size:0.85rem;margin-bottom:0.35rem" aria-label="Sync room code">
          <div style="display:flex;gap:0.35rem;flex-wrap:wrap">
            <button type="button" class="btn btn-ghost btn-sm" data-action="create-room">Create room</button>
            <button type="button" class="btn btn-ghost btn-sm" data-action="join-room">Join</button>
          </div>
        </div>
        <div class="sidebar-actions">
          <button type="button" class="btn btn-primary" data-action="go-view"><i data-lucide="share-2"></i> Preview Shareview</button>
          <button type="button" class="btn btn-ghost btn-sm" data-action="copy-share">Copy share link</button>
          <button type="button" class="btn btn-ghost btn-sm" data-action="print-view">Print itinerary</button>
          <button type="button" class="btn-icon" data-action="toggle-theme" aria-label="Toggle theme"><i data-lucide="${appState.theme === 'dark' ? 'sun' : 'moon'}"></i></button>
        </div>
      </aside>
      <main class="builder-main">
        <header class="top-bar mobile-only">
          <button type="button" class="brand" data-action="go-home">Navora</button>
          <button type="button" class="btn-icon" data-action="toggle-theme" aria-label="Toggle theme"><i data-lucide="${appState.theme === 'dark' ? 'sun' : 'moon'}"></i></button>
        </header>
        <div class="mobile-panel ${isMobileDays ? 'active' : ''} mobile-only"><div class="day-chips">${dayChips}</div></div>
        <div class="mobile-panel ${isMobileMap ? 'active' : ''} mobile-only">
          <p style="padding:0.75rem 1rem 0;font-size:0.85rem;color:var(--text-muted)">${escapeHtml(trip.destination || 'Tab out of location fields to geocode.')}</p>
          ${geocodeStatus}
          <div class="map-wrap"><div id="map-leaflet-mobile" style="height:100%;min-height:280px"></div></div>
          <button type="button" class="btn btn-ghost btn-sm" style="margin:0 1rem 1rem" data-action="geocode-day">Geocode today's stops</button>
        </div>
        <div class="mobile-panel ${isMobileShare ? 'active' : ''} mobile-only">
          <div class="share-preview">
            <button type="button" class="btn btn-primary" data-action="go-view">Open Shareview</button>
            <button type="button" class="btn btn-ghost" data-action="copy-share">Copy share link</button>
            <button type="button" class="btn btn-ghost" data-action="export-card">Download story card</button>
          </div>
        </div>
        <div class="builder-days-panel ${isMobileDays ? '' : 'mobile-hidden'}">
          <div class="builder-header builder-desktop-only">
            <div class="day-title-wrap">
              <h2 class="day-title">${escapeHtml(day.label)}</h2>
              <p class="day-meta">${day.date ? escapeHtml(new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })) : 'No date set'}</p>
            </div>
            <button type="button" class="btn btn-primary" data-action="go-view">Shareview</button>
          </div>
          <div class="map-wrap builder-desktop-only" style="margin-bottom:1.25rem;height:220px">
            <div id="map-leaflet" style="height:100%"></div>
          </div>
          ${geocodeStatus}
          <div class="builder-days-content">${renderTimeBlocks(day)}</div>
        </div>
      </main>
      <button type="button" class="fab-add mobile-only" data-action="fab-add" aria-label="Add activity"><i data-lucide="plus"></i></button>
      <nav class="mobile-tabs mobile-only">
        <div class="mobile-tabs-inner">
          <button type="button" class="mobile-tab ${appState.mobileTab === 'days' ? 'active' : ''}" data-action="mobile-tab" data-tab="days"><i data-lucide="calendar"></i> Days</button>
          <button type="button" class="mobile-tab ${appState.mobileTab === 'map' ? 'active' : ''}" data-action="mobile-tab" data-tab="map"><i data-lucide="map"></i> Map</button>
          <button type="button" class="mobile-tab ${appState.mobileTab === 'share' ? 'active' : ''}" data-action="mobile-tab" data-tab="share"><i data-lucide="share-2"></i> Share</button>
        </div>
      </nav>
    </div>`;
}

export function renderShareview() {
  const trip = appState.trip;
  const embed = isEmbedMode();
  if (!trip) {
    return `
      <div class="shareview${embed ? ' embed-mode' : ''}">
        <div class="share-toolbar">
          <button type="button" class="brand" data-action="go-home">Navora</button>
        </div>
        <div class="share-body" style="text-align:center;padding:4rem 1rem">
          <p style="color:var(--text-muted)">No trip planned yet.</p>
          <button type="button" class="btn btn-primary" data-action="plan-blank">Plan a trip</button>
        </div>
      </div>`;
  }

  const mood = trip.shareMood && trip.shareMood !== 'default' ? trip.shareMood : '';
  const heroStyle = trip.destination ? `background-image:url('${getDestinationImage(trip.destination)}')` : '';
  const heroClass = trip.destination ? 'share-hero' : 'share-hero share-hero-fallback';
  const timelineHtml = buildTimelineHtml(trip);
  const weatherHtml = weatherDays ? renderWeatherStrip(weatherDays, trip.days) : '';

  return `
    <div class="shareview${embed ? ' embed-mode' : ''}" ${mood ? `data-share-mood="${mood}"` : ''}>
      <div class="share-toolbar">
        <button type="button" class="brand" data-action="go-plan">← Edit</button>
        <div class="toolbar-row">
          <button type="button" class="btn btn-ghost btn-sm" data-action="copy-share"><i data-lucide="link"></i> Copy link</button>
          <button type="button" class="btn btn-ghost btn-sm" data-action="export-card"><i data-lucide="image"></i> Card</button>
          <button type="button" class="btn btn-ghost btn-sm" data-action="export-ics"><i data-lucide="calendar"></i> ICS</button>
          <button type="button" class="btn btn-ghost btn-sm" data-action="print-view"><i data-lucide="printer"></i> Print</button>
          <button type="button" class="btn-icon" data-action="toggle-theme" aria-label="Toggle theme"><i data-lucide="${appState.theme === 'dark' ? 'sun' : 'moon'}"></i></button>
        </div>
      </div>
      <div class="${heroClass}" style="${heroStyle}">
        <div class="share-hero-overlay"></div>
        <div class="share-hero-content">
          <h1>${escapeHtml(trip.title)}</h1>
          <p class="dates">${escapeHtml(formatDateRange(trip.startDate, trip.endDate))}</p>
          ${trip.tagline ? `<p class="tagline">${escapeHtml(trip.tagline)}</p>` : ''}
        </div>
      </div>
      <div class="share-body">
        ${weatherHtml}
        <div class="share-map-panel card" style="padding:0 1rem 1rem;margin-bottom:1.5rem">
          <button type="button" class="share-map-toggle" data-action="toggle-share-map">
            Route overview <i data-lucide="${appState.shareMapOpen ? 'chevron-up' : 'chevron-down'}"></i>
          </button>
          ${appState.shareMapOpen ? '<div class="map-wrap"><div id="map-share" style="height:100%;min-height:240px"></div></div>' : ''}
        </div>
        ${timelineHtml}
      </div>
      <footer class="share-footer">
        <p>Made with Navora</p>
        <button type="button" class="btn btn-primary" data-action="plan-own">Plan your own</button>
      </footer>
    </div>`;
}

export function bindDragDrop() {
  document.querySelectorAll('.drag-handle').forEach(handle => {
    handle.addEventListener('dragstart', e => {
      const card = handle.closest('.activity-card');
      if (!card) return;
      dragState = {
        dayId: card.dataset.dayId,
        block: card.dataset.block,
        actId: card.dataset.actId,
        fromIndex: [...card.parentElement.querySelectorAll('.activity-card')].indexOf(card)
      };
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    handle.addEventListener('dragend', () => {
      handle.closest('.activity-card')?.classList.remove('dragging');
      document.querySelectorAll('.activity-list.drag-over').forEach(el => el.classList.remove('drag-over'));
      dragState = null;
    });
  });

  document.querySelectorAll('.activity-list').forEach(list => {
    list.addEventListener('dragover', e => {
      if (!dragState || list.dataset.dayId !== dragState.dayId || list.dataset.block !== dragState.block) return;
      e.preventDefault();
      list.classList.add('drag-over');
      const dragging = document.querySelector('.activity-card.dragging');
      const after = getDragAfterElement(list, e.clientY);
      if (dragging) {
        if (after == null) list.appendChild(dragging);
        else list.insertBefore(dragging, after);
      }
    });
    list.addEventListener('drop', e => {
      e.preventDefault();
      list.classList.remove('drag-over');
      if (!dragState) return;
      const cards = [...list.querySelectorAll('.activity-card')];
      const toIndex = cards.findIndex(c => c.dataset.actId === dragState.actId);
      if (toIndex >= 0 && dragState.fromIndex !== toIndex) {
        reorderActivity(dragState.dayId, dragState.block, dragState.fromIndex, toIndex);
        window.__navoraRender?.({ full: true });
      }
    });
  });
}

function getDragAfterElement(container, y) {
  const els = [...container.querySelectorAll('.activity-card:not(.dragging)')];
  return els.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) return { offset, element: child };
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function afterRender(route) {
  if (route === 'plan' && appState.trip) {
    syncUrlToTrip('plan');
    if (getActiveMapContainerId()) setTimeout(() => refreshMap(), 50);
    else destroyMap();
    document.querySelectorAll('.activity-card').forEach(card => {
      showPresenceOnActivity(card.dataset.actId);
    });
  } else if (route === 'view' && appState.shareMapOpen && appState.trip) {
    setTimeout(() => refreshMap('map-share'), 50);
  } else {
    destroyMap();
  }
  clearPresenceBadges();
}

export function renderApp(options = { full: true }) {
  document.documentElement.dataset.theme = appState.theme;
  const route = getRoute();
  const app = document.getElementById('app');

  if (route === 'plan' && !appState.trip) {
    appState.trip = createBlankTrip();
    appState.activeDayId = appState.trip.days[0].id;
  }

  if (options.full) {
    if (route === 'home') app.innerHTML = renderHome();
    else if (route === 'plan') app.innerHTML = renderBuilder();
    else if (route === 'view') app.innerHTML = renderShareview();
    appState.newActivityIds.clear();
    createIcons();
    bindDragDrop();
    afterRender(route);
  } else {
    refreshSidebarPanels(weatherDays);
  }
}

export function initRender(fn) {
  window.__navoraRender = fn;
}
