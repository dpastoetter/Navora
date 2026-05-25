import { uid, cloneTrip, showToast } from './utils.js';
import { appState, normalizeActivity, normalizeTrip, createBlankTrip, getActiveDay } from './state.js';
import { DAY_TEMPLATES } from './samples.js';
import { BLOCKS } from './constants.js';
import { pushUndo } from './undo.js';
import { enrichTripImages } from './images.js';
import { scheduleSaveDraft } from './draft.js';
import { scheduleBroadcast } from './sync.js';

export function loadTrip(tripData, keepIds = false) {
  const raw = cloneTrip(tripData);
  appState.trip = normalizeTrip(raw);
  if (!keepIds) {
    appState.trip.days = appState.trip.days.map(d => ({
      ...d,
      id: uid(),
      blocks: {
        morning: d.blocks.morning.map(a => ({ ...normalizeActivity(a), id: uid() })),
        afternoon: d.blocks.afternoon.map(a => ({ ...normalizeActivity(a), id: uid() })),
        evening: d.blocks.evening.map(a => ({ ...normalizeActivity(a), id: uid() }))
      }
    }));
  }
  appState.activeDayId = appState.trip.days[0]?.id || null;
  enrichTripImages(appState.trip);
  scheduleBroadcast();
  scheduleSaveDraft();
}

export function applyDayTemplate(templateKey) {
  const tpl = DAY_TEMPLATES[templateKey];
  const day = getActiveDay();
  if (!tpl || !day) return;
  pushUndo('template');
  for (const block of BLOCKS) {
    day.blocks[block] = tpl.blocks[block].map(item =>
      normalizeActivity({ ...item, id: uid() })
    );
  }
  scheduleBroadcast();
  scheduleSaveDraft();
  showToast(`Applied: ${tpl.label}`);
}

export function addDay() {
  if (!appState.trip) return;
  const n = appState.trip.days.length + 1;
  const id = uid();
  appState.trip.days.push({
    id,
    label: `Day ${n}`,
    date: '',
    blocks: { morning: [], afternoon: [], evening: [] }
  });
  appState.activeDayId = id;
  scheduleBroadcast();
  scheduleSaveDraft();
}

export function removeDay(dayId) {
  if (!appState.trip || appState.trip.days.length <= 1) return;
  pushUndo('remove-day');
  appState.trip.days = appState.trip.days.filter(d => d.id !== dayId);
  if (appState.activeDayId === dayId) appState.activeDayId = appState.trip.days[0].id;
  scheduleBroadcast();
  scheduleSaveDraft();
}

export function updateDay(dayId, field, value) {
  const day = appState.trip?.days.find(d => d.id === dayId);
  if (day) {
    day[field] = value;
    scheduleBroadcast();
    scheduleSaveDraft();
  }
}

export function addActivity(dayId, block) {
  const day = appState.trip?.days.find(d => d.id === dayId);
  if (!day) return null;
  const actId = uid();
  day.blocks[block].push(normalizeActivity({
    id: actId,
    title: '',
    location: '',
    notes: '',
    category: 'culture',
    link: ''
  }));
  appState.newActivityIds.add(actId);
  scheduleBroadcast();
  scheduleSaveDraft();
  return actId;
}

export function updateActivity(dayId, block, actId, field, value) {
  const day = appState.trip?.days.find(d => d.id === dayId);
  const act = day?.blocks[block]?.find(a => a.id === actId);
  if (!act) return false;
  act[field] = value;
  if (field === 'location') {
    act.lat = null;
    act.lng = null;
  }
  if (['title', 'location', 'notes', 'link'].includes(field)) {
    appState.editingActivityId = actId;
    scheduleBroadcast();
    scheduleSaveDraft();
    return false;
  }
  scheduleBroadcast();
  scheduleSaveDraft();
  return ['category', 'timeStart', 'timeEnd'].includes(field);
}

export function deleteActivity(dayId, block, actId) {
  pushUndo('delete');
  const day = appState.trip?.days.find(d => d.id === dayId);
  if (!day) return;
  day.blocks[block] = day.blocks[block].filter(a => a.id !== actId);
  scheduleBroadcast();
  scheduleSaveDraft();
}

export function reorderActivity(dayId, block, fromIndex, toIndex) {
  const list = appState.trip?.days.find(d => d.id === dayId)?.blocks[block];
  if (!list || fromIndex === toIndex) return;
  pushUndo('reorder');
  const [item] = list.splice(fromIndex, 1);
  list.splice(toIndex, 0, item);
  scheduleBroadcast();
  scheduleSaveDraft();
}

export function duplicateTrip() {
  if (!appState.trip) return;
  loadTrip(cloneTrip(appState.trip));
  appState.trip.title += ' (copy)';
  showToast('Trip duplicated');
}

export { createBlankTrip };
