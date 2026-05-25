import './styles/main.css';
import { appState } from './state.js';
import { tryHydrateFromUrl } from './share-url.js';
import { getRoute } from './router.js';
import { loadDraft, scheduleSaveDraft } from './draft.js';
import { loadPrefs } from './prefs.js';
import { updateDraftIndicator } from './partial.js';
import { joinSyncRoom } from './sync.js';
import { fetchWeatherForTrip } from './weather.js';
import { renderApp, initRender, setWeatherDays } from './render.js';
import { handleAction, handleInput, handleBlur, handleKeydown, importTripJson } from './actions.js';
import { closeModal, handleModalAction } from './modals.js';
import { updateOgMeta } from './meta.js';
import { refreshSidebarPanels } from './partial.js';
import LZString from 'lz-string';

function render(options = { full: true }) {
  renderApp(options);
  if (options.full && appState.trip && (getRoute() === 'plan' || getRoute() === 'view')) {
    loadWeather();
  }
  updateOgMeta();
}

async function loadWeather() {
  const days = await fetchWeatherForTrip();
  window.__navoraWeather = days;
  setWeatherDays(days);
  refreshSidebarPanels(days);
}

function checkCdn() {
  const missing = [];
  if (typeof lucide === 'undefined') missing.push('Icons');
  if (typeof LZString === 'undefined' && !LZString) missing.push('Compression');
  if (missing.length) {
    const banner = document.getElementById('cdn-banner');
    if (banner) {
      banner.hidden = false;
      banner.textContent = `Some features unavailable (${missing.join(', ')}). Check your connection.`;
    }
  }
}

function boot() {
  initRender(render);
  checkCdn();
  loadPrefs();
  document.documentElement.dataset.theme = appState.theme;
  window.__navoraUpdateDraftIndicator = updateDraftIndicator;

  tryHydrateFromUrl(room => {
    setTimeout(() => joinSyncRoom(room, () => render({ full: true })), 600);
  });

  if (!appState.trip && getRoute() === 'home') {
    const params = new URL(location.href).searchParams;
    if (params.get('resume') === '1') loadDraft();
  }

  render({ full: true });

  window.addEventListener('hashchange', () => {
    tryHydrateFromUrl(room => joinSyncRoom(room, () => render({ full: true })));
    if (getRoute() === 'plan' && appState.trip && !appState.activeDayId) {
      appState.activeDayId = appState.trip.days[0]?.id;
    }
    render({ full: true });
  });

  window.addEventListener('resize', () => {
    if (getRoute() === 'plan') render({ full: false });
  });

  document.getElementById('app').addEventListener('click', e => handleAction(e, render));
  document.getElementById('modal-root')?.addEventListener('click', e => {
    if (e.target.id === 'modal-root') closeModal();
    else if (e.target.closest('[data-action]')) {
      const action = e.target.closest('[data-action]').dataset.action;
      if (handleModalAction(action)) render({ full: true });
    }
  });
  document.getElementById('app').addEventListener('submit', e => handleAction(e, render));
  document.getElementById('app').addEventListener('input', e => {
    handleInput(e, render);
    scheduleSaveDraft();
  });
  document.getElementById('app').addEventListener('change', e => {
    handleInput(e, render);
    scheduleSaveDraft();
  });
  document.getElementById('app').addEventListener('blur', e => handleBlur(e, render), true);
  document.addEventListener('keydown', e => handleKeydown(e, render));

  document.getElementById('import-file').addEventListener('change', e => {
    const file = e.target.files?.[0];
    if (file) importTripJson(file, render);
    e.target.value = '';
  });
}

boot();
