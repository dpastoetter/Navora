import { appState } from './state.js';
import { escapeHtml } from './utils.js';
import { geocodeLocation } from './geocode.js';

export async function fetchWeatherForTrip() {
  const trip = appState.trip;
  if (!trip?.destination) return null;
  const cacheKey = `${trip.destination}-${trip.days.map(d => d.date).join(',')}`;
  if (appState.weatherCache?.key === cacheKey) return appState.weatherCache.data;

  const coords = await geocodeLocation(trip.destination, '');
  if (!coords) return null;

  const dates = trip.days.map(d => d.date).filter(Boolean);
  if (dates.length === 0) return null;

  const start = dates.sort()[0];
  const end = dates.sort()[dates.length - 1];
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&start_date=${start}&end_date=${end}`;
    const res = await fetch(url);
    const data = await res.json();
    const codes = data.daily?.weather_code || [];
    const max = data.daily?.temperature_2m_max || [];
    const min = data.daily?.temperature_2m_min || [];
    const days = (data.daily?.time || []).map((date, i) => ({
      date,
      code: codes[i],
      max: max[i],
      min: min[i]
    }));
    appState.weatherCache = { key: cacheKey, data: days };
    return days;
  } catch (_) {
    return null;
  }
}

const WMO = { 0: '☀️', 1: '🌤', 2: '⛅', 3: '☁️', 61: '🌧', 71: '❄️', 95: '⛈' };

export function weatherIcon(code) {
  if (WMO[code]) return WMO[code];
  if (code <= 3) return '☁️';
  if (code < 60) return '🌫';
  if (code < 70) return '🌧';
  if (code < 80) return '❄️';
  return '🌡';
}

export function renderWeatherStrip(days, tripDays) {
  if (!days?.length) return '';
  const byDate = Object.fromEntries(days.map(d => [d.date, d]));
  const items = tripDays
    .filter(d => d.date && byDate[d.date])
    .map(d => {
      const w = byDate[d.date];
      return `<div class="weather-day"><strong>${escapeHtml(d.label)}</strong>${weatherIcon(w.code)}<br>${Math.round(w.max)}° / ${Math.round(w.min)}°</div>`;
    });
  if (!items.length) return '';
  return `<div class="weather-strip">${items.join('')}</div>`;
}
