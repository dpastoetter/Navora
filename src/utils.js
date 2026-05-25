let idCounter = 0;

export function uid() {
  return crypto.randomUUID?.() || `id-${++idCounter}-${Date.now()}`;
}

export function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s ?? '';
  return d.innerHTML;
}

export function cloneTrip(trip) {
  return JSON.parse(JSON.stringify(trip));
}

export function emptyBlocks() {
  return { morning: [], afternoon: [], evening: [] };
}

export function formatDateRange(start, end) {
  if (!start) return '';
  const opts = { month: 'short', day: 'numeric', year: 'numeric' };
  const s = new Date(start + 'T12:00:00').toLocaleDateString('en-US', opts);
  if (!end || end === start) return s;
  const e = new Date(end + 'T12:00:00').toLocaleDateString('en-US', opts);
  return `${s} – ${e}`;
}

export function heroImageUrl(destination) {
  if (!destination?.trim()) return '';
  const seed = encodeURIComponent(destination.trim().toLowerCase());
  return `https://picsum.photos/seed/${seed}/1600/900`;
}

export function showToast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.remove('show'), 2500);
}

export function createIcons() {
  if (typeof lucide !== 'undefined') lucide.createIcons();
}
