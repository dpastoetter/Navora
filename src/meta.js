import { appState } from './state.js';
import { getDestinationImage } from './images.js';

export function updateOgMeta() {
  const trip = appState.trip;
  const title = trip?.title ? `${trip.title} — Navora` : 'Navora — Travel Planning';
  const desc = trip?.tagline || trip?.destination || 'Plan gorgeous, shareable travel itineraries.';
  document.title = title;
  setMeta('og:title', title);
  setMeta('og:description', desc);
  setMeta('description', desc);
  const img = trip?.destination ? getDestinationImage(trip.destination) : '';
  if (img) setMeta('og:image', img);
}

function setMeta(prop, content) {
  let el = document.querySelector(`meta[property="${prop}"], meta[name="${prop}"]`);
  if (!el) {
    el = document.createElement('meta');
    if (prop.startsWith('og:')) el.setAttribute('property', prop);
    else el.setAttribute('name', prop);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}
