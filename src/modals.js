import { MAX_URL_CHARS } from './constants.js';
import { exportTripJson } from './export-trip.js';
import { getSharePayloadLength } from './share-url.js';
let activeModal = null;

const SHORTCUTS_HTML = `
  <h3 id="modal-title">Keyboard shortcuts</h3>
  <table class="shortcuts-table">
    <tbody>
      <tr><td><kbd>/</kbd></td><td>Focus destination (home)</td></tr>
      <tr><td><kbd>?</kbd></td><td>Show this help</td></tr>
      <tr><td><kbd>n</kbd></td><td>New activity (morning, builder)</td></tr>
      <tr><td><kbd>1</kbd>–<kbd>9</kbd></td><td>Switch day</td></tr>
      <tr><td><kbd>Ctrl</kbd>+<kbd>Z</kbd></td><td>Undo</td></tr>
      <tr><td><kbd>Esc</kbd></td><td>Close dialog</td></tr>
    </tbody>
  </table>
  <div class="modal-actions">
    <button type="button" class="btn btn-primary" data-action="close-modal">Got it</button>
  </div>
`;

function ensureModalRoot() {
  let root = document.getElementById('modal-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'modal-root';
    root.className = 'modal-backdrop';
    root.hidden = true;
    root.setAttribute('role', 'presentation');
    document.body.appendChild(root);
  }
  return root;
}

export function openModal(html, id = 'dialog') {
  const root = ensureModalRoot();
  root.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">${html}</div>`;
  root.hidden = false;
  activeModal = id;
  const first = root.querySelector('button, [href], input, select, textarea');
  first?.focus();
}

export function closeModal() {
  const root = document.getElementById('modal-root');
  if (root) {
    root.hidden = true;
    root.innerHTML = '';
  }
  activeModal = null;
}

export function isModalOpen() {
  return activeModal != null;
}

export function openShortcutsModal() {
  openModal(SHORTCUTS_HTML, 'shortcuts');
}

export function openShareTooLargeModal() {
  const len = getSharePayloadLength();
  openModal(`
    <h3 id="modal-title">Trip too large to share via link</h3>
    <p>Compressed size is about <strong>${len.toLocaleString()}</strong> characters (limit ${MAX_URL_CHARS.toLocaleString()}). Export JSON and send the file instead.</p>
    <div class="modal-actions">
      <button type="button" class="btn btn-primary" data-action="export-json-modal">Export JSON</button>
      <button type="button" class="btn btn-ghost" data-action="close-modal">Cancel</button>
    </div>
  `, 'share-large');
}

export function handleModalAction(action) {
  if (action === 'close-modal') {
    closeModal();
    return true;
  }
  if (action === 'export-json-modal') {
    closeModal();
    exportTripJson();
    return true;
  }
  return false;
}
