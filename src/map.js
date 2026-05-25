import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { BLOCKS } from './constants.js';
import { appState, getActiveDay } from './state.js';
import { escapeHtml } from './utils.js';
import { getRoute } from './router.js';

export function getMapPoints(dayFilter) {
  const points = [];
  const days = dayFilter
    ? appState.trip?.days.filter(d => d.id === dayFilter) || []
    : appState.trip?.days || [];
  for (const day of days) {
    for (const block of BLOCKS) {
      for (const a of day.blocks[block] || []) {
        if (a.lat != null && a.lng != null && (a.title || a.location)) {
          points.push({ ...a, dayLabel: day.label, block });
        }
      }
    }
  }
  return points;
}

export function destroyMap() {
  if (appState.mapInstance) {
    appState.mapInstance.remove();
    appState.mapInstance = null;
    appState.mapPolyline = null;
    appState.mapMarkers = [];
  }
}

export function getActiveMapContainerId() {
  if (getRoute() === 'view' && appState.shareMapOpen) return 'map-share';
  if (window.innerWidth < 768 && appState.mobileTab === 'map') return 'map-leaflet-mobile';
  if (window.innerWidth >= 768 && getRoute() === 'plan') return 'map-leaflet';
  return null;
}

export function refreshMap(containerId) {
  const id = containerId || getActiveMapContainerId();
  if (!id) return;
  const el = document.getElementById(id);
  if (!el || !appState.trip) return;

  const day = getActiveDay();
  const points = getMapPoints(id === 'map-share' ? null : day?.id);

  destroyMap();
  if (points.length === 0) {
    el.innerHTML = '<p class="geocode-spinner">Add locations and tab out of the field to geocode pins.</p>';
    return;
  }
  el.innerHTML = '';
  const map = L.map(el, { scrollWheelZoom: false }).setView([points[0].lat, points[0].lng], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  const latlngs = [];
  points.forEach((p, i) => {
    const m = L.marker([p.lat, p.lng]).addTo(map);
    m.bindPopup(`<strong>${escapeHtml(p.title || 'Stop')}</strong><br>${escapeHtml(p.location)}`);
    latlngs.push([p.lat, p.lng]);
    appState.mapMarkers.push(m);
  });

  if (latlngs.length > 1) {
    appState.mapPolyline = L.polyline(latlngs, { color: '#01696f', weight: 3, opacity: 0.75 }).addTo(map);
    map.fitBounds(appState.mapPolyline.getBounds(), { padding: [24, 24] });
  }

  appState.mapInstance = map;
}
