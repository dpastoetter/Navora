import Peer from 'peerjs';
import { appState, normalizeTrip } from './state.js';
import { showToast } from './utils.js';
import { syncUrlToTrip } from './router.js';
import { getRoute } from './router.js';

export function randomRoomId() {
  return 'navora-' + Math.random().toString(36).slice(2, 8);
}

export function teardownPeer() {
  appState.peerConn?.close();
  appState.peer?.destroy();
  appState.peerConn = null;
  appState.peer = null;
  appState.syncConnected = false;
  appState.editingActivityId = null;
}

export function createSyncRoom(onUpdate) {
  teardownPeer();
  appState.syncRoom = randomRoomId();
  appState.peer = new Peer(appState.syncRoom);
  appState.peer.on('open', () => {
    appState.syncConnected = true;
    showToast(`Room: ${appState.syncRoom}`);
    syncUrlToTrip(getRoute());
    onUpdate?.();
  });
  appState.peer.on('connection', conn => setupPeerConn(conn, onUpdate));
  appState.peer.on('error', () => showToast('Sync error — try another room'));
}

export function joinSyncRoom(roomId, onUpdate) {
  if (!roomId?.trim()) return;
  teardownPeer();
  appState.syncRoom = roomId.trim();
  appState.peer = new Peer();
  appState.peer.on('open', () => {
    const conn = appState.peer.connect(appState.syncRoom);
    setupPeerConn(conn, onUpdate);
  });
  appState.peer.on('error', () => showToast('Could not join room'));
}

export function setupPeerConn(conn, onUpdate) {
  appState.peerConn = conn;
  conn.on('open', () => {
    appState.syncConnected = true;
    showToast('Live sync connected');
    if (appState.trip) {
      conn.send(JSON.stringify({
        trip: appState.trip,
        theme: appState.theme,
        editing: appState.editingActivityId
      }));
    }
    onUpdate?.();
  });
  conn.on('data', data => {
    try {
      const msg = JSON.parse(data);
      if (msg.trip) {
        appState.skipBroadcast = true;
        appState.trip = normalizeTrip(msg.trip);
        if (msg.theme) appState.theme = msg.theme;
        if (msg.editing) appState.editingActivityId = msg.editing;
        if (!appState.activeDayId) appState.activeDayId = appState.trip.days[0]?.id;
        appState.skipBroadcast = false;
        onUpdate?.({ full: true });
      }
    } catch (_) { /* ignore */ }
  });
  conn.on('close', () => {
    appState.syncConnected = false;
    appState.editingActivityId = null;
    onUpdate?.();
  });
}

let broadcastTimer = null;

export function scheduleBroadcast(onPartial) {
  if (appState.skipBroadcast) return;
  clearTimeout(broadcastTimer);
  broadcastTimer = setTimeout(() => {
    syncUrlToTrip(getRoute());
    if (appState.peerConn?.open) {
      appState.peerConn.send(JSON.stringify({
        trip: appState.trip,
        theme: appState.theme,
        editing: appState.editingActivityId
      }));
    }
    onPartial?.();
  }, 400);
}
