import { BLOCKS } from './constants.js';
import { escapeHtml } from './utils.js';

export function parseTime(t) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function getDayHints(day) {
  const hints = [];
  const all = [];
  for (const block of BLOCKS) {
    for (const a of day.blocks[block] || []) {
      if (a.title || a.location) all.push({ ...a, block });
    }
  }
  if (all.length === 0) {
    hints.push({ type: 'info', text: 'This day has no stops yet — add activities or use a template.', action: null });
    return hints;
  }
  const evening = day.blocks.evening.filter(a => a.title || a.location);
  if (evening.length === 0) {
    hints.push({ type: 'warn', text: 'No evening plan — consider dinner or wind-down.', action: null });
  }
  const timed = all.filter(a => a.timeStart);
  if (timed.length > 6) {
    hints.push({ type: 'warn', text: 'Rushed day — 6+ timed stops. Consider spreading across days.', action: null });
  }
  const hasTransport = all.some(a => a.category === 'transport');
  const hasStay = all.some(a => a.category === 'stay');
  if (hasTransport && hasStay && all.length <= 4) {
    hints.push({ type: 'info', text: 'Travel day — light sightseeing fits well.', action: null });
  }
  let foodStreak = 0;
  for (const a of all) {
    if (a.category === 'food') {
      foodStreak++;
      if (foodStreak >= 3) {
        hints.push({ type: 'warn', text: 'Three food stops in a row — mix in culture or nature?', action: 'culture' });
        break;
      }
    } else foodStreak = 0;
  }
  for (const a of timed) {
    if (a.timeStart && a.timeEnd) {
      const s = parseTime(a.timeStart);
      const e = parseTime(a.timeEnd);
      if (s != null && e != null && e <= s) {
        hints.push({ type: 'warn', text: `"${a.title || 'Activity'}" ends before it starts.`, action: null });
      }
    }
  }
  for (let i = 0; i < timed.length; i++) {
    for (let j = i + 1; j < timed.length; j++) {
      const a = timed[i], b = timed[j];
      const aS = parseTime(a.timeStart), aE = parseTime(a.timeEnd || a.timeStart);
      const bS = parseTime(b.timeStart), bE = parseTime(b.timeEnd || b.timeStart);
      if (aS != null && aE != null && bS != null && bE != null && aS < bE && bS < aE) {
        hints.push({ type: 'warn', text: `Time overlap: "${a.title || 'Stop'}" and "${b.title || 'Stop'}".`, action: null });
      }
    }
  }
  const transportOnly = all.length > 0 && all.every(a => a.category === 'transport');
  if (transportOnly) {
    hints.push({ type: 'warn', text: 'Only transport listed — add sights or meals.', action: 'culture' });
  }
  if (hints.length === 0) {
    hints.push({ type: 'info', text: 'Day rhythm looks balanced. Nice work!', action: null });
  }
  return hints;
}

export function renderHintsHtml(day) {
  return getDayHints(day).map(h => `
    <div class="hint-item ${h.type === 'warn' ? 'warn' : ''}">
      <i data-lucide="${h.type === 'warn' ? 'alert-triangle' : 'sparkles'}"></i>
      <span>${escapeHtml(h.text)}</span>
      ${h.action ? `<button type="button" class="hint-action" data-action="apply-template" data-template="${h.action}">Fix</button>` : ''}
    </div>
  `).join('');
}
