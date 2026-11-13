/**
 * End-to-end Socket.IO + SQLite smoke test against the live authoritative server.
 * Verifies: HTTP health, 3-player room creation/join, character selection, ready,
 * game start, card play over WebSocket, and clean shutdown.
 */
import { io } from 'socket.io-client';
import { startServer } from '../server/src/index.ts';

function connectClient(url) {
  return new Promise((resolve, reject) => {
    const s = io(url, { transports: ['websocket'], forceNew: true });
    s.once('connect', () => resolve(s));
    s.once('connect_error', reject);
  });
}

function emitAck(sock, event, payload) {
  return new Promise((resolve) => {
    if (payload === undefined) sock.emit(event, resolve);
    else sock.emit(event, payload, resolve);
  });
}

const srv = await startServer({ port: 0, host: '127.0.0.1', dbPath: ':memory:' });
const baseUrl = `http://127.0.0.1:${srv.port}`;

try {
  const health = await fetch(`${baseUrl}/api/health`).then((r) => r.json());
  if (!health.ok) throw new Error('Health check failed');

  const [c1, c2, c3] = await Promise.all([
    connectClient(baseUrl),
    connectClient(baseUrl),
    connectClient(baseUrl),
  ]);

  let latestGame = null;
  c1.on('room:state', (p) => {
    latestGame = p.game;
  });

  const created = await emitAck(c1, 'room:create', { playerName: 'Alice', roomName: 'SmokeTest' });
  if (!created.ok) throw new Error('room:create failed: ' + JSON.stringify(created));
  const code = created.data.roomCode;

  const j2 = await emitAck(c2, 'room:join', { roomCode: code, playerName: 'Bob' });
  const j3 = await emitAck(c3, 'room:join', { roomCode: code, playerName: 'Charlie' });
  if (!j2.ok || !j3.ok) throw new Error('room:join failed');

  await emitAck(c1, 'lobby:selectCharacter', { character: 'doc' });
  await emitAck(c2, 'lobby:selectCharacter', { character: 'tuco' });
  await emitAck(c3, 'lobby:selectCharacter', { character: 'belle' });

  await emitAck(c1, 'lobby:ready', { ready: true });
  await emitAck(c2, 'lobby:ready', { ready: true });
  await emitAck(c3, 'lobby:ready', { ready: true });

  const started = await emitAck(c1, 'game:start');
  if (!started.ok) throw new Error('game:start failed: ' + JSON.stringify(started));

  await new Promise((r) => setTimeout(r, 40));
  if (!latestGame || latestGame.phase !== 'planning') {
    throw new Error(`Expected phase=planning, got ${latestGame?.phase}`);
  }

  const firstCardId = latestGame.players[0].hand.find((c) => c.kind === 'action').id;
  const played = await emitAck(c1, 'game:playCard', { cardId: firstCardId });
  if (!played.ok) throw new Error('game:playCard failed: ' + JSON.stringify(played));

  c1.disconnect();
  c2.disconnect();
  c3.disconnect();
  console.log(`SMOKE TEST PASSED on port ${srv.port} (room ${code}, stack=${latestGame.actionStack.length + 1})`);
} finally {
  await srv.close();
}
