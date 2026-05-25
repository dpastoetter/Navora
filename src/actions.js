import { appState } from './state.js';
import { getRoute, navigate, buildHash } from './router.js';
import { tryHydrateFromUrl } from './share-url.js';
import { encodeTripPayload } from './share-url.js';
import { clearDraft, loadDraft } from './draft.js';
import { popUndo, canUndo } from './undo.js';
import { geocodeActivity, geocodeAllForDay } from './geocode.js';
import { createSyncRoom, joinSyncRoom, teardownPeer } from './sync.js';
import { exportTripCard, exportTripJson, exportIcs } from './export-trip.js';
import { SAMPLE_TRIPS } from './samples.js';
import {
  loadTrip, createBlankTrip, applyDayTemplate, addDay, removeDay, updateDay,
  addActivity, updateActivity, deleteActivity, reorderActivity, duplicateTrip,
  duplicateActivity
} from './trip-ops.js';
import { showToast, countGeocodedStops, createIcons } from './utils.js';
import { updateOgMeta } from './meta.js';
import {
  refreshSidebarPanels, updateDayHeader, replaceActivityCard, updateGeocodeBadge
} from './partial.js';
import { updateActivityPill } from './partial.js';
import {
  openShortcutsModal, closeModal, isModalOpen, handleModalAction, openShareTooLargeModal
} from './modals.js';
import { saveTheme, saveShareMapOpen, saveLastFabBlock, markHomeHintSeen, markShareTipSeen } from './prefs.js';
import { getSharePayloadLength } from './share-url.js';
import { fetchActivityImage } from './images.js';
import { enrichTripImages } from './images.js';
import { prefetchTripImages } from './images.js';

function setCopyButtonCopied() {
  const btn = document.querySelector('[data-copy-btn]');
  const label = document.querySelector('[data-copy-label]');
  if (label) label.textContent = 'Copied!';
  if (btn) btn.classList.add('is-copied');
  setTimeout(() => {
    if (label) label.textContent = 'Copy link';
    btn?.classList.remove('is-copied');
  }, 2000);
}

export function copyShareLink() {
  if (!appState.trip) {
    showToast('No trip to share');
    return;
  }
  if (getSharePayloadLength() > 7500) {
    openShareTooLargeModal();
    return;
  }
  if (!encodeTripPayload()) {
    openShareTooLargeModal();
    return;
  }
  const url = location.origin + location.pathname + location.search + buildHash('view');
  navigator.clipboard.writeText(url)
    .then(() => {
      showToast('Share link copied!');
      setCopyButtonCopied();
    })
    .catch(() => showToast('Copy failed'));
}

function maybeAutoOpenShareMap() {
  if (countGeocodedStops(appState.trip) >= 2) {
    appState.shareMapOpen = true;
    saveShareMapOpen();
  }
}

export function handleAction(e, render) {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;

  if (action === 'noop') {
    e.preventDefault();
    return;
  }

  if (handleModalAction(action)) {
    render({ full: true });
    return;
  }

  const full = () => render({ full: true });
  const partial = () => render({ full: false });

  switch (action) {
    case 'close-modal':
      closeModal();
      break;
    case 'dismiss-home-hint':
      markHomeHintSeen();
      full();
      break;
    case 'focus-day-date': {
      const day = appState.trip?.days.find(d => d.id === appState.activeDayId);
      document.querySelector(`[data-action="update-day"][data-field="date"][data-day-id="${day?.id}"]`)?.focus();
      break;
    }
    case 'jump-share-day': {
      const target = document.getElementById(`share-day-${el.dataset.dayId}`);
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      break;
    }
    case 'toggle-collapse': {
      const id = el.dataset.actId;
      if (appState.collapsedActivities.has(id)) appState.collapsedActivities.delete(id);
      else appState.collapsedActivities.add(id);
      const card = document.querySelector(`[data-act-id="${id}"]`);
      card?.classList.toggle('is-collapsed');
      createIcons();
      break;
    }
    case 'duplicate-activity': {
      const { dayId, block, actId } = el.dataset;
      const newId = duplicateActivity(dayId, block, actId);
      if (newId) full();
      break;
    }
    case 'fab-toggle':
      appState.fabMenuOpen = !appState.fabMenuOpen;
      full();
      break;
    case 'fab-pick-block': {
      const day = appState.trip?.days.find(d => d.id === appState.activeDayId);
      const block = el.dataset.block;
      if (day && block) {
        saveLastFabBlock(block);
        addActivity(day.id, block);
        appState.fabMenuOpen = false;
        full();
      }
      break;
    }
    case 'destination-submit': {
      e.preventDefault();
      const dest = el.querySelector('[name=destination]')?.value?.trim();
      if (dest) {
        loadTrip(createBlankTrip(dest));
        appState.trip.destination = dest;
        appState.trip.title = `Trip to ${dest.split(',')[0]}`;
        navigate('plan');
        full();
      }
      break;
    }
    case 'plan-blank':
      loadTrip(createBlankTrip());
      appState.activeDayId = appState.trip.days[0].id;
      navigate('plan');
      full();
      break;
    case 'resume-draft':
      if (loadDraft()) {
        navigate('plan');
        full();
        showToast('Draft restored');
      }
      break;
    case 'plan-own':
      teardownPeer();
      appState.trip = null;
      appState.activeDayId = null;
      appState.syncRoom = null;
      appState.undoStack = [];
      clearDraft();
      navigate('');
      full();
      break;
    case 'load-sample':
      loadTrip(SAMPLE_TRIPS[parseInt(el.dataset.sampleIndex, 10)]);
      navigate('plan');
      full();
      break;
    case 'go-home':
      navigate('');
      full();
      break;
    case 'go-plan':
      navigate('plan');
      full();
      break;
    case 'go-view':
      navigate('view');
      enrichTripImages(appState.trip);
      maybeAutoOpenShareMap();
      const hasActs = appState.trip?.days.some(d =>
        ['morning', 'afternoon', 'evening'].some(b => (d.blocks[b] || []).some(a => a.title))
      );
      if (hasActs) markShareTipSeen();
      prefetchTripImages(appState.trip, () => render({ full: true })).then(() => render({ full: true }));
      full();
      break;
    case 'fetch-activity-image': {
      const { dayId, block, actId } = el.dataset;
      const day = appState.trip?.days.find(d => d.id === dayId);
      const act = day?.blocks[block]?.find(a => a.id === actId);
      if (act) {
        fetchActivityImage(act, appState.trip?.destination).then(() => {
          showToast(act.imageUrl ? 'Photo added' : 'No photo found');
          render({ full: true });
        });
      }
      break;
    }
    case 'toggle-theme':
      appState.theme = appState.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = appState.theme;
      saveTheme();
      full();
      break;
    case 'copy-share':
      copyShareLink();
      break;
    case 'export-card':
      exportTripCard();
      break;
    case 'export-ics':
      exportIcs();
      break;
    case 'export-json':
      exportTripJson();
      break;
    case 'import-json':
      document.getElementById('import-file').click();
      break;
    case 'duplicate-trip':
      duplicateTrip();
      full();
      break;
    case 'undo':
      if (popUndo()) {
        full();
        showToast('Undone');
      }
      break;
    case 'apply-template':
      if (el.dataset.template) applyDayTemplate(el.dataset.template);
      else if (el.value) applyDayTemplate(el.value);
      full();
      break;
    case 'create-room':
      createSyncRoom(full);
      break;
    case 'join-room': {
      const room = appState.syncRoom || document.querySelector('[data-action=set-room-input]')?.value;
      joinSyncRoom(room, full);
      break;
    }
    case 'toggle-share-map':
      appState.shareMapOpen = !appState.shareMapOpen;
      saveShareMapOpen();
      full();
      break;
    case 'geocode-day': {
      const day = appState.trip?.days.find(d => d.id === appState.activeDayId);
      if (day) {
        geocodeAllForDay(day.id, () => {
          showToast('Geocoding complete');
          full();
        });
      }
      break;
    }
    case 'select-day':
      if (e.target.closest('[data-action=remove-day]')) return;
      appState.activeDayId = el.dataset.dayId;
      full();
      break;
    case 'add-day':
      addDay();
      full();
      break;
    case 'remove-day':
      e.stopPropagation();
      if (confirm('Remove this day and all its activities?')) {
        removeDay(el.dataset.dayId);
        full();
      }
      break;
    case 'add-activity':
      addActivity(el.dataset.dayId, el.dataset.block);
      full();
      break;
    case 'delete-activity':
      if (confirm('Delete this activity?')) {
        deleteActivity(el.dataset.dayId, el.dataset.block, el.dataset.actId);
        full();
      }
      break;
    case 'mobile-tab':
      appState.mobileTab = el.dataset.tab;
      full();
      break;
    case 'move-up':
    case 'move-down': {
      const { dayId, block, actId } = el.dataset;
      const list = appState.trip?.days.find(d => d.id === dayId)?.blocks[block];
      if (!list) break;
      const idx = list.findIndex(a => a.id === actId);
      const newIdx = action === 'move-up' ? idx - 1 : idx + 1;
      if (newIdx >= 0 && newIdx < list.length) reorderActivity(dayId, block, idx, newIdx);
      full();
      break;
    }
    case 'set-mood':
      if (appState.trip) {
        appState.trip.shareMood = el.dataset.mood;
        full();
      }
      break;
    case 'toggle-pack': {
      if (!appState.trip) break;
      const item = el.dataset.item;
      appState.trip.packing[item] = el.checked;
      partial();
      break;
    }
    case 'print-view':
      window.print();
      break;
    default:
      break;
  }
  updateOgMeta();
}

export function handleInput(e, render) {
  const el = e.target.closest('[data-action]');
  if (!el) return;

  if (el.dataset.action === 'update-trip') {
    if (appState.trip) appState.trip[el.dataset.field] = el.value;
    render({ full: false });
    return;
  }

  if (el.dataset.action === 'update-day') {
    updateDay(el.dataset.dayId, el.dataset.field, el.value);
    const day = appState.trip?.days.find(d => d.id === el.dataset.dayId);
    if (el.dataset.field === 'label' || el.dataset.field === 'date') {
      updateDayHeader(day);
      refreshSidebarPanels(window.__navoraWeather);
    }
    return;
  }

  if (el.dataset.action === 'update-activity') {
    const needsFull = updateActivity(
      el.dataset.dayId, el.dataset.block, el.dataset.actId, el.dataset.field, el.value
    );
    if (needsFull) {
      render({ full: true });
    } else if (el.dataset.field === 'category') {
      updateActivityPill(el.dataset.actId, el.value);
      refreshSidebarPanels(window.__navoraWeather);
    }
    return;
  }

  if (el.dataset.action === 'set-room-input') {
    appState.syncRoom = el.value;
  }

  if (el.dataset.action === 'apply-template' && el.value) {
    applyDayTemplate(el.value);
    el.value = '';
    render({ full: true });
  }
}

export function handleBlur(e, render) {
  const el = e.target.closest('[data-blur-action]');
  if (el?.dataset.blurAction === 'geocode-activity') {
    const { dayId, block, actId } = el.dataset;
    if (!el.value?.trim()) return;
    appState.geocodeStatus[actId] = 'pending';
    updateGeocodeBadge(actId);
    geocodeActivity(dayId, block, actId, () => {
      const day = appState.trip?.days.find(d => d.id === dayId);
      const act = day?.blocks[block]?.find(a => a.id === actId);
      appState.geocodeStatus[actId] = act?.lat != null ? 'ok' : 'fail';
      updateGeocodeBadge(actId);
      render({ full: true });
    });
    const day = appState.trip?.days.find(d => d.id === dayId);
    const act = day?.blocks[block]?.find(a => a.id === actId);
    if (act && !act.imageUrl && (act.title || act.location)) {
      fetchActivityImage(act, appState.trip?.destination).then(() => {
        replaceActivityCard(dayId, block, actId) || render({ full: true });
      });
    }
  }
}

export function handleKeydown(e, render) {
  const route = getRoute();

  if (e.key === 'Escape') {
    if (isModalOpen()) {
      closeModal();
      return;
    }
    if (appState.fabMenuOpen) {
      appState.fabMenuOpen = false;
      render({ full: true });
      return;
    }
  }

  if (e.key === '?' && !e.target.matches('input, textarea')) {
    e.preventDefault();
    openShortcutsModal();
    return;
  }

  if (e.target.matches('input, textarea, select') && e.key !== 'Escape') return;

  if (route === 'home' && e.key === '/') {
    e.preventDefault();
    document.getElementById('home-destination')?.focus();
    return;
  }

  if (route === 'plan' && appState.trip) {
    if (e.key === 'n' || e.key === 'N') {
      const day = appState.trip.days.find(d => d.id === appState.activeDayId);
      if (day) {
        addActivity(day.id, appState.lastFabBlock || 'morning');
        render({ full: true });
      }
      return;
    }
    const num = parseInt(e.key, 10);
    if (num >= 1 && num <= 9 && appState.trip.days[num - 1]) {
      appState.activeDayId = appState.trip.days[num - 1].id;
      render({ full: true });
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      if (popUndo()) render({ full: true });
    }
  }
}

export function importTripJson(file, render) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      loadTrip(JSON.parse(reader.result), true);
      navigate('plan');
      render({ full: true });
      showToast('Trip imported');
    } catch (_) {
      showToast('Invalid JSON file');
    }
  };
  reader.readAsText(file);
}
