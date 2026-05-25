import { BLOCKS, CATEGORIES } from './constants.js';
import { escapeHtml } from './utils.js';

const SUGGESTIONS = {
  food: ['Reusable water bottle', 'Snacks for transit'],
  culture: ['Comfortable walking shoes', 'Camera / phone charger'],
  nature: ['Hiking shoes', 'Sunscreen', 'Rain layer'],
  transport: ['Transit card / tickets', 'Portable charger'],
  stay: ['Toiletries', 'Sleep mask', 'Universal adapter']
};

export function buildPackingSuggestions(trip) {
  const set = new Set();
  for (const day of trip?.days || []) {
    for (const block of BLOCKS) {
      for (const a of day.blocks[block] || []) {
        if (a.title || a.location) {
          (SUGGESTIONS[a.category] || []).forEach(i => set.add(i));
        }
      }
    }
  }
  return [...set];
}

export function renderPackingHtml(trip) {
  const items = buildPackingSuggestions(trip);
  const packed = trip.packing || {};
  const all = [...new Set([...items, ...Object.keys(packed)])];
  if (!all.length) return '<p style="font-size:0.8rem;color:var(--text-muted)">Add activities to get packing suggestions.</p>';
  return `<ul class="packing-list">${all.map(item => {
    const checked = packed[item] ? 'checked' : '';
    return `<li><label><input type="checkbox" data-action="toggle-pack" data-item="${escapeHtml(item)}" ${checked}> ${escapeHtml(item)}</label></li>`;
  }).join('')}</ul>`;
}
