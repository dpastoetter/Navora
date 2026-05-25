import html2canvas from 'html2canvas';
import { BLOCKS, BLOCK_LABELS, CAT_ICONS } from './constants.js';
import { appState } from './state.js';
import { buildHash } from './router.js';
import { escapeHtml, formatDateRange, showToast } from './utils.js';
import { getDestinationImage, resolveActivityImage, renderPhotoHtml } from './images.js';

function icsEscape(s) {
  return (s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function formatIcsDate(dateStr, timeStr) {
  if (!dateStr) return null;
  const d = dateStr.replace(/-/g, '');
  if (!timeStr) return `${d}`;
  const t = timeStr.replace(':', '') + '00';
  return `${d}T${t}`;
}

export function exportIcs() {
  if (!appState.trip) return;
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Navora//Trip//EN'];
  const uidBase = Date.now();
  let n = 0;
  for (const day of appState.trip.days) {
    for (const block of BLOCKS) {
      for (const a of day.blocks[block] || []) {
        if (!a.title && !a.location) continue;
        if (!day.date && !a.timeStart) continue;
        const dtstart = formatIcsDate(day.date, a.timeStart);
        if (!dtstart) continue;
        const dtend = a.timeEnd
          ? formatIcsDate(day.date, a.timeEnd)
          : formatIcsDate(day.date, a.timeStart);
        lines.push('BEGIN:VEVENT');
        lines.push(`UID:navora-${uidBase}-${n++}@navora.app`);
        lines.push(`DTSTART:${dtstart}`);
        if (dtend) lines.push(`DTEND:${dtend}`);
        lines.push(`SUMMARY:${icsEscape(a.title || a.location)}`);
        if (a.location) lines.push(`LOCATION:${icsEscape(a.location)}`);
        if (a.notes) lines.push(`DESCRIPTION:${icsEscape(a.notes)}`);
        lines.push('END:VEVENT');
      }
    }
  }
  lines.push('END:VCALENDAR');
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${(appState.trip.title || 'trip').replace(/\s+/g, '-').toLowerCase()}.ics`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('Calendar file downloaded');
}

export function exportTripJson() {
  if (!appState.trip) return;
  const blob = new Blob([JSON.stringify(appState.trip, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${(appState.trip.title || 'trip').replace(/\s+/g, '-').toLowerCase()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('Trip exported');
}

export function buildExportCardHtml() {
  const trip = appState.trip;
  if (!trip) return '';
  const hero = trip.destination
    ? `style="background-image:url('${getDestinationImage(trip.destination)}')"`
    : 'style="background:linear-gradient(135deg,#01696f,#171614)"';
  let daysHtml = '';
  for (const day of trip.days) {
    let stops = '';
    for (const block of BLOCKS) {
      for (const a of day.blocks[block] || []) {
        if (!a.title && !a.location) continue;
        stops += `<div class="export-stop"><span class="pill pill-${a.category}">${a.category}</span> ${escapeHtml(a.title || a.location)}</div>`;
      }
    }
    if (stops) daysHtml += `<div class="export-mini-day"><h3>${escapeHtml(day.label)}</h3>${stops}</div>`;
  }
  const shareUrl = location.href.split('#')[0] + buildHash('view');
  return `
    <div class="export-card-hero" ${hero}>
      <h2>${escapeHtml(trip.title)}</h2>
    </div>
    <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.75rem">${escapeHtml(formatDateRange(trip.startDate, trip.endDate))}</p>
    ${trip.tagline ? `<p style="font-style:italic;margin-bottom:1rem;font-size:0.85rem">${escapeHtml(trip.tagline)}</p>` : ''}
    ${daysHtml}
    <div class="export-watermark">Made with Navora</div>`;
}

export async function exportTripCard() {
  if (!appState.trip) {
    showToast('Nothing to export');
    return;
  }
  const root = document.getElementById('export-root');
  root.innerHTML = buildExportCardHtml();
  document.documentElement.dataset.theme = appState.theme;
  try {
    const canvas = await html2canvas(root, {
      scale: 2,
      backgroundColor: appState.theme === 'dark' ? '#171614' : '#faf7f2'
    });
    const a = document.createElement('a');
    a.download = `${(appState.trip.title || 'navora').replace(/\s+/g, '-').toLowerCase()}-card.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
    showToast('Card downloaded');
  } catch (_) {
    showToast('Export failed');
  }
}

export function buildTimelineHtml(trip) {
  let html = '';
  for (const day of trip.days) {
    let dayItems = '';
    for (const block of BLOCKS) {
      const acts = (day.blocks[block] || []).filter(a => a.title || a.location);
      if (!acts.length) continue;
      dayItems += `<p class="timeline-block-label">${BLOCK_LABELS[block]}</p>`;
      for (const act of acts) {
        const icon = CAT_ICONS[act.category] || 'map-pin';
        const linkHtml = act.link
          ? `<a href="${escapeHtml(act.link)}" target="_blank" rel="noopener">Visit link →</a>`
          : '';
        const imgUrl = resolveActivityImage(act, trip.destination);
        dayItems += `
          <div class="timeline-item${imgUrl ? ' has-photo' : ''}">
            <div class="timeline-icon timeline-icon-${act.category}">
              <i data-lucide="${icon}"></i>
            </div>
            ${imgUrl ? `<div class="timeline-photo">${renderPhotoHtml(imgUrl, 'timeline-thumb', act.title)}</div>` : ''}
            <div class="timeline-body">
            <h4>${escapeHtml(act.title || 'Untitled')}</h4>
            ${act.timeStart ? `<p style="font-size:0.75rem;color:var(--text-muted);margin-bottom:0.2rem">${escapeHtml(act.timeStart)}${act.timeEnd ? ' – ' + escapeHtml(act.timeEnd) : ''}</p>` : ''}
            ${act.location ? `<p class="loc">${escapeHtml(act.location)}</p>` : ''}
            ${act.notes ? `<p class="notes">${escapeHtml(act.notes)}</p>` : ''}
            ${linkHtml}
            </div>
          </div>`;
      }
    }
    if (dayItems) {
      html += `
        <section class="timeline-day">
          <h2 class="timeline-day-label">${escapeHtml(day.label)}${day.date ? ` · ${escapeHtml(new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))}` : ''}</h2>
          <div class="timeline">${dayItems}</div>
        </section>`;
    }
  }
  return html || '<p style="color:var(--text-muted);text-align:center">Add activities in the builder to see your timeline.</p>';
}
