import { describe, expect, it } from 'vitest';
import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, Result, RoomStatePayload, ServerToClientEvents, SessionInfo } from '@colt/shared';
import { startServer } from '../server/src/index.js';
import { Database } from '../server/src/persistence/Database.js';
import { RoomManager } from '../server/src/rooms/RoomManager.js';

type ClientSock = Socket<ServerToClientEvents, ClientToServerEvents>;

function connect(url: string): Promise<ClientSock> {
  return new Promise((resolve, reject) => {
    const s: ClientSock = io(url, { transports: ['websocket'], forceNew: true });
    s.once('connect', () => resolve(s));
    s.once('connect_error', reject);
  });
}

function call<T>(fn: (cb: (r: Result<T>) => void) => void): Promise<Result<T>> {
  return new Promise((resolve) => fn(resolve));
}

describe('server persistence & multiplayer integration', () => {
  it('persists rooms to SQLite and restores them on RoomManager restart', () => {
    const db = new Database(':memory:');
    const rm1 = new RoomManager(db);
    const { room, session } = rm1.createRoom({ playerName: 'Host', roomName: 'TestTrain' });
    rm1.joinRoom({ roomCode: room.info.code, playerName: 'Guest1' });
    rm1.joinRoom({ roomCode: room.info.code, playerName: 'Guest2' });

    const loaded = db.loadRooms();
    expect(loaded).toHaveLength(1);
    expect(loaded[0]!.code).toBe(room.info.code);
    expect(loaded[0]!.state.lobby).toHaveLength(3);

    const rm2 = new RoomManager(db);
    const resumed = rm2.resumeSession(session.token);
    expect(resumed.room.info.code).toBe(room.info.code);
    expect(resumed.session.playerId).toBe(session.playerId);
    db.close();
  });

  it('runs a live 3-player room over Socket.IO with per-viewer redaction', async () => {
    const srv = await startServer({ port: 0, host: '127.0.0.1', dbPath: ':memory:' });
    const url = `http://127.0.0.1:${srv.port}`;

    const [c1, c2, c3] = await Promise.all([connect(url), connect(url), connect(url)]);
    const states: Record<string, RoomStatePayload> = {};
    c1.on('room:state', (p) => (states.p1 = p));
    c2.on('room:state', (p) => (states.p2 = p));
    c3.on('room:state', (p) => (states.p3 = p));

    try {
      const ping = await call<{ serverTime: number; version: string }>((cb) => c1.emit('system:ping', cb));
      expect(ping.ok).toBe(true);

      const created = await call<SessionInfo>((cb) => c1.emit('room:create', { playerName: 'A', roomName: 'R' }, cb));
      expect(created.ok).toBe(true);
      if (!created.ok) return;
      const code = created.data.roomCode;

      await call((cb) => c2.emit('room:join', { roomCode: code, playerName: 'B' }, cb));
      await call((cb) => c3.emit('room:join', { roomCode: code, playerName: 'C' }, cb));

      await call((cb) => c1.emit('lobby:selectCharacter', { character: 'ghost' }, cb));
      await call((cb) => c2.emit('lobby:selectCharacter', { character: 'doc' }, cb));
      await call((cb) => c3.emit('lobby:selectCharacter', { character: 'tuco' }, cb));

      await call((cb) => c1.emit('lobby:ready', { ready: true }, cb));
      await call((cb) => c2.emit('lobby:ready', { ready: true }, cb));
      await call((cb) => c3.emit('lobby:ready', { ready: true }, cb));

      const started = await call((cb) => c1.emit('game:start', cb));
      expect(started.ok).toBe(true);

      await new Promise((r) => setTimeout(r, 40));
      expect(states.p1?.game.phase).toBe('planning');
      // p1 sees its own hand, not p2's hand
      expect(states.p1?.game.players[0]!.hand).toBeDefined();
      expect(states.p1?.game.players[1]!.hand).toBeUndefined();
      // p2 (Doc) sees 7 cards in own hand
      expect(states.p2?.game.players[1]!.hand).toHaveLength(7);

      // Ghost plays first card face down
      const ghostCardId = states.p1!.game.players[0]!.hand!.find((c) => c.kind === 'action')!.id;
      const playRes = await call((cb) => c1.emit('game:playCard', { cardId: ghostCardId, faceDown: true }, cb));
      expect(playRes.ok).toBe(true);

      await new Promise((r) => setTimeout(r, 40));
      // p1 sees its own face-down card; p2 sees null
      expect(states.p1?.game.actionStack[0]!.card).not.toBeNull();
      expect(states.p2?.game.actionStack[0]!.card).toBeNull();
    } finally {
      c1.disconnect();
      c2.disconnect();
      c3.disconnect();
      await srv.close();
    }
  });
});
