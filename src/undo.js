import { appState } from './state.js';
import { cloneTrip } from './utils.js';

const MAX_UNDO = 8;

export function pushUndo(label) {
  if (!appState.trip) return;
  appState.undoStack.push({
    label,
    trip: cloneTrip(appState.trip),
    activeDayId: appState.activeDayId
  });
  if (appState.undoStack.length > MAX_UNDO) appState.undoStack.shift();
}

export function popUndo() {
  const entry = appState.undoStack.pop();
  if (!entry) return false;
  appState.skipBroadcast = true;
  appState.trip = entry.trip;
  appState.activeDayId = entry.activeDayId;
  appState.skipBroadcast = false;
  return true;
}

export function canUndo() {
  return appState.undoStack.length > 0;
}
