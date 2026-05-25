import { uid, emptyBlocks } from './utils.js';

export function normalizeActivity(a) {
  return {
    id: a.id || uid(),
    title: a.title || '',
    location: a.location || '',
    notes: a.notes || '',
    category: a.category || 'culture',
    link: a.link || '',
    timeStart: a.timeStart || '',
    timeEnd: a.timeEnd || '',
    lat: a.lat ?? null,
    lng: a.lng ?? null,
    imageUrl: a.imageUrl || ''
  };
}

export function normalizeTrip(trip) {
  return {
    title: trip.title || 'My Trip',
    destination: trip.destination || '',
    tagline: trip.tagline || '',
    startDate: trip.startDate || '',
    endDate: trip.endDate || '',
    shareMood: trip.shareMood || 'default',
    packing: trip.packing || {},
    days: (trip.days || []).map((d, i) => ({
      id: d.id || uid(),
      label: d.label || `Day ${i + 1}`,
      date: d.date || '',
      blocks: {
        morning: (d.blocks?.morning || []).map(normalizeActivity),
        afternoon: (d.blocks?.afternoon || []).map(normalizeActivity),
        evening: (d.blocks?.evening || []).map(normalizeActivity)
      }
    }))
  };
}

export function createBlankTrip(destination = '') {
  const dayId = uid();
  return normalizeTrip({
    title: destination ? `Trip to ${destination.split(',')[0]}` : 'My Trip',
    destination: destination || '',
    tagline: '',
    startDate: '',
    endDate: '',
    days: [{ id: dayId, label: 'Day 1', date: '', blocks: emptyBlocks() }]
  });
}

export const appState = {
  theme: 'dark',
  trip: null,
  activeDayId: null,
  mobileTab: 'days',
  newActivityIds: new Set(),
      geocodeCache: {},
      imageCache: {},
  mapInstance: null,
  mapPolyline: null,
  mapMarkers: [],
  shareMapOpen: false,
  syncRoom: null,
  peer: null,
  peerConn: null,
  syncConnected: false,
  skipBroadcast: false,
  editingActivityId: null,
  weatherCache: null,
  geocoding: false,
  undoStack: [],
  fullRender: true
};

export function getActiveDay() {
  if (!appState.trip) return null;
  return appState.trip.days.find(d => d.id === appState.activeDayId) || appState.trip.days[0];
}
