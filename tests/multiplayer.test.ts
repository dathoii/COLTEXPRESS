import { describe, expect, it } from 'vitest';
import { io, type Socket } from 'socket.io-client';
import type {
  CharacterId,
  ClientToServerEvents,
  Result,
  RoomStatePayload,
  ServerToClientEvents,
  SessionInfo,
} from '@colt/shared';
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

const wait = (ms = 35) => new Promise((r) => setTimeout(r, ms));

describe('Phase 5 Multiplayer & Room Lifecycle', () => {
  it('supports invite-only room with optional password, 3-6 player cap, and spectator overflow', async () => {
    const srv = await startServer({ port: 0, host: '127.0.0.1', dbPath: ':memory:' });
    const url = `http://127.0.0.1:${srv.port}`;
    const clients: ClientSock[] = [];
    const newClient = async () => {
      const c = await connect(url);
      clients.push(c);
      return c;
    };

    try {
      const cHost = await newClient();
      const created = await call<SessionInfo>((cb) =>
        cHost.emit('room:create', { playerName: 'Host', roomName: 'SecretTrain', password: 'colt' }, cb),
      );
      expect(created.ok).toBe(true);
      if (!created.ok) return;
      const code = created.data.roomCode;

      // Wrong password rejected
      const cBad = await newClient();
      const wrong = await call<SessionInfo>((cb) =>
        cBad.emit('room:join', { roomCode: code, playerName: 'Intruder', password: 'nope' }, cb),
      );
      expect(wrong.ok).toBe(false);
      if (!wrong.ok) expect(wrong.error.code).toBe('WRONG_PASSWORD');

      // Unknown room code rejected
      const unknown = await call<SessionInfo>((cb) =>
        cBad.emit('room:join', { roomCode: 'ZZZZZ', playerName: 'Intruder' }, cb),
      );
      expect(unknown.ok).toBe(false);
      if (!unknown.ok) expect(unknown.error.code).toBe('ROOM_NOT_FOUND');

      // Join 5 more players (total 6)
      for (let i = 2; i <= 6; i++) {
        const c = await newClient();
        const res = await call<SessionInfo>((cb) =>
          c.emit('room:join', { roomCode: code, playerName: `P${i}`, password: 'colt' }, cb),
        );
        expect(res.ok).toBe(true);
      }

      // 7th player rejected with ROOM_FULL
      const c7 = await newClient();
      const full = await call<SessionInfo>((cb) =>
        c7.emit('room:join', { roomCode: code, playerName: 'P7', password: 'colt' }, cb),
      );
      expect(full.ok).toBe(false);
      if (!full.ok) expect(full.error.code).toBe('ROOM_FULL');

      // 7th user CAN join as spectator without taking a seat
      const specRes = await call<SessionInfo>((cb) =>
        c7.emit('room:join', { roomCode: code, playerName: 'Watcher', password: 'colt', asSpectator: true }, cb),
      );
      expect(specRes.ok).toBe(true);
      if (specRes.ok) expect(specRes.data.role).toBe('spectator');
    } finally {
      clients.forEach((c) => c.disconnect());
      await srv.close();
    }
  });

  it('supports Dedicated Server mode (host does not take a player seat) and Spectator redaction/isolation', async () => {
    const srv = await startServer({ port: 0, host: '127.0.0.1', dbPath: ':memory:' });
    const url = `http://127.0.0.1:${srv.port}`;
    const [cMod, c1, c2, c3, cSpec] = await Promise.all([
      connect(url),
      connect(url),
      connect(url),
      connect(url),
      connect(url),
    ]);

    const states: Record<string, RoomStatePayload> = {};
    cMod.on('room:state', (p) => (states.mod = p));
    c1.on('room:state', (p) => (states.p1 = p));
    cSpec.on('room:state', (p) => (states.spec = p));

    try {
      const created = await call<SessionInfo>((cb) =>
        cMod.emit('room:create', { playerName: 'DedicatedMod', roomName: 'DedTrain', hostMode: 'dedicated' }, cb),
      );
      expect(created.ok).toBe(true);
      if (!created.ok) return;
      expect(created.data.role).toBe('host-moderator');
      const code = created.data.roomCode;

      await call((cb) => c1.emit('room:join', { roomCode: code, playerName: 'Alice' }, cb));
      await call((cb) => c2.emit('room:join', { roomCode: code, playerName: 'Bob' }, cb));
      await call((cb) => c3.emit('room:join', { roomCode: code, playerName: 'Cara' }, cb));
      await call((cb) => cSpec.emit('room:join', { roomCode: code, playerName: 'Spec', asSpectator: true }, cb));

      // Spectator cannot select character
      const specPick = await call((cb) => cSpec.emit('lobby:selectCharacter', { character: 'belle' }, cb));
      expect(specPick.ok).toBe(false);
      if (!specPick.ok) expect(specPick.error.code).toBe('FORBIDDEN');

      // 3 players pick characters & ready
      const chars: CharacterId[] = ['ghost', 'doc', 'tuco'];
      for (const [idx, c] of [c1, c2, c3].entries()) {
        await call((cb) => c.emit('lobby:selectCharacter', { character: chars[idx]! }, cb));
        await call((cb) => c.emit('lobby:ready', { ready: true }, cb));
      }

      // Player cannot start in dedicated mode; dedicated host starts
      const playerStart = await call((cb) => c1.emit('game:start', cb));
      expect(playerStart.ok).toBe(false);
      const modStart = await call((cb) => cMod.emit('game:start', cb));
      expect(modStart.ok).toBe(true);

      await wait();
      expect(states.p1?.game.players).toHaveLength(3);
      expect(states.spec?.role).toBe('spectator');
      // Spectator cannot see any player's hand or purse values
      expect(states.spec?.game.players.every((p) => p.hand === undefined)).toBe(true);
      expect(states.spec?.game.players.every((p) => p.loot.every((l) => l.value === null))).toBe(true);
      // Dedicated moderator also sees redacted view
      expect(states.mod?.game.players.every((p) => p.hand === undefined)).toBe(true);

      // Ghost plays card face down; spectator cannot see card content
      const ghostCard = states.p1!.game.players[0]!.hand!.find((c) => c.kind === 'action')!.id;
      await call((cb) => c1.emit('game:playCard', { cardId: ghostCard, faceDown: true }, cb));
      await wait();
      expect(states.spec?.game.actionStack[0]!.card).toBeNull();

      // Spectator cannot draw or play
      const specDraw = await call((cb) => cSpec.emit('game:draw', cb));
      expect(specDraw.ok).toBe(false);
      if (!specDraw.ok) expect(specDraw.error.code).toBe('FORBIDDEN');
    } finally {
      [cMod, c1, c2, c3, cSpec].forEach((c) => c.disconnect());
      await srv.close();
    }
  });

  it('handles disconnect, Host Pause/Resume, reconnect, duplicate event protection, leave, and room close', async () => {
    const srv = await startServer({ port: 0, host: '127.0.0.1', dbPath: ':memory:' });
    const url = `http://127.0.0.1:${srv.port}`;
    const [c1, c2, c3, c4] = await Promise.all([connect(url), connect(url), connect(url), connect(url)]);

    const states: Record<string, RoomStatePayload> = {};
    let closedReason = '';
    c1.on('room:state', (p) => (states.p1 = p));
    c2.on('room:state', (p) => (states.p2 = p));
    c3.on('room:state', (p) => (states.p3 = p));
    c3.on('room:closed', (p) => (closedReason = p.reason));

    try {
      const s1 = await call<SessionInfo>((cb) => c1.emit('room:create', { playerName: 'Host' }, cb));
      if (!s1.ok) throw new Error('create failed');
      const code = s1.data.roomCode;
      const s2 = await call<SessionInfo>((cb) => c2.emit('room:join', { roomCode: code, playerName: 'Bob' }, cb));
      await call((cb) => c3.emit('room:join', { roomCode: code, playerName: 'Cara' }, cb));
      const s4 = await call<SessionInfo>((cb) => c4.emit('room:join', { roomCode: code, playerName: 'LeaveMe' }, cb));
      expect(s4.ok).toBe(true);

      // c4 leaves lobby cleanly
      await call((cb) => c4.emit('room:leave', cb));
      await wait();
      expect(states.p1?.game.lobby).toHaveLength(3);

      for (const [idx, c] of [c1, c2, c3].entries()) {
        const chars: CharacterId[] = ['doc', 'tuco', 'belle'];
        await call((cb) => c.emit('lobby:selectCharacter', { character: chars[idx]! }, cb));
        await call((cb) => c.emit('lobby:ready', { ready: true }, cb));
      }
      await call((cb) => c1.emit('game:start', cb));
      await wait();

      // Duplicate event protection: same requestId cannot fire twice
      const firstCard = states.p1!.game.players[0]!.hand!.find((c) => c.kind === 'action')!.id;
      const play1 = await call((cb) =>
        c1.emit('game:playCard', { cardId: firstCard, requestId: 'req-1' }, cb),
      );
      expect(play1.ok).toBe(true);
      const dup = await call((cb) =>
        c1.emit('game:playCard', { cardId: firstCard, requestId: 'req-1' }, cb),
      );
      expect(dup.ok).toBe(false);
      if (!dup.ok) expect(dup.error.code).toBe('DUPLICATE_EVENT');

      // Player 2 disconnects mid-game
      c2.disconnect();
      await wait(60);
      expect(states.p1?.game.players[1]!.connected).toBe(false);

      // Non-host cannot pause
      const badPause = await call((cb) => c3.emit('room:pause', { reason: 'Wait' }, cb));
      expect(badPause.ok).toBe(false);

      // Host pauses match
      const pauseRes = await call((cb) => c1.emit('room:pause', { reason: 'Waiting for Bob' }, cb));
      expect(pauseRes.ok).toBe(true);
      await wait();
      expect(states.p1?.room.paused).toBe(true);

      // Actions rejected while paused
      const drawWhilePaused = await call((cb) => c3.emit('game:draw', {}, cb));
      expect(drawWhilePaused.ok).toBe(false);
      if (!drawWhilePaused.ok) expect(drawWhilePaused.error.code).toBe('ROOM_PAUSED');

      // Player 2 reconnects with saved session token
      const c2Re = await connect(url);
      let reState: RoomStatePayload | undefined;
      c2Re.on('room:state', (p) => (reState = p));
      if (!s2.ok) return;
      const resumed = await call<SessionInfo>((cb) => c2Re.emit('session:resume', { token: s2.data.token }, cb));
      expect(resumed.ok).toBe(true);
      await wait();
      expect(reState?.game.players[1]!.connected).toBe(true);
      expect(reState?.game.players[1]!.hand).toHaveLength(6);

      // Host resumes match -> Bob can play now
      const resumeRes = await call((cb) => c1.emit('room:resume', cb));
      expect(resumeRes.ok).toBe(true);
      await wait();
      const bCard = reState!.game.players[1]!.hand!.find((c) => c.kind === 'action')!.id;
      const bPlay = await call((cb) => c2Re.emit('game:playCard', { cardId: bCard }, cb));
      expect(bPlay.ok).toBe(true);

      // Host closes room
      const closeRes = await call((cb) => c1.emit('room:close', cb));
      expect(closeRes.ok).toBe(true);
      await wait();
      expect(closedReason).toContain('closed');
      c2Re.disconnect();
    } finally {
      [c1, c2, c3, c4].forEach((c) => c.disconnect());
      await srv.close();
    }
  });

  it('saves and restores full room state, spectators, pause state, and backup snapshot across restarts', () => {
    const db = new Database(':memory:');
    const rm1 = new RoomManager(db);
    const { room, session } = rm1.createRoom({
      playerName: 'DedHost',
      roomName: 'BackupTrain',
      hostMode: 'dedicated',
      fromDashboard: true,
    });
    const p1 = rm1.joinRoom({ roomCode: room.info.code, playerName: 'A' });
    const p2 = rm1.joinRoom({ roomCode: room.info.code, playerName: 'B' });
    const p3 = rm1.joinRoom({ roomCode: room.info.code, playerName: 'C' });
    rm1.joinRoom({ roomCode: room.info.code, playerName: 'Spec', asSpectator: true });

    room.engine.selectCharacter(p1.session.playerId, 'doc');
    room.engine.selectCharacter(p2.session.playerId, 'tuco');
    room.engine.selectCharacter(p3.session.playerId, 'belle');
    room.engine.setReady(p1.session.playerId, true);
    room.engine.setReady(p2.session.playerId, true);
    room.engine.setReady(p3.session.playerId, true);
    rm1.startMatch(room.info.code, session.playerId);
    rm1.pauseMatch(room.info.code, session.playerId, 'Server restart backup');

    const backup = db.exportBackup();
    expect(backup.rooms).toHaveLength(1);

    // Wipe DB and restore from backup into a fresh RoomManager
    db.deleteRoom(room.info.code);
    expect(db.loadRooms()).toHaveLength(0);
    const restoredCount = db.importBackup(backup);
    expect(restoredCount).toBe(1);

    const rm2 = new RoomManager(db);
    const restored = rm2.getRoom(room.info.code);
    expect(restored.info.hostMode).toBe('dedicated');
    expect(restored.info.paused).toBe(true);
    expect(restored.info.pauseReason).toBe('Server restart backup');
    expect(restored.info.spectators).toHaveLength(1);
    expect(restored.engine.phase).toBe('planning');
    expect(restored.engine.state.players).toHaveLength(3);
    db.close();
  });

  it('restores hostControlId after spectator switch + joinRoom, supports BotController + timer config + rematch', async () => {
    const db = new Database(':memory:');
    const rm = new RoomManager(db);
    const { room, session: hostSess } = rm.createRoom({
      playerName: 'FirstHost',
      roomName: 'BotTrain',
      hostMode: 'player',
      turnTimeoutSec: 30,
    });
    expect(room.info.turnTimeoutSec).toBe(30);

    // Host moves to spectator leaving lobby empty; joining player should inherit hostControlId
    rm.switchLobbyRole(room.info.code, hostSess.token, hostSess.playerId, 'player', true);
    expect(room.hostControlId).toBeFalsy();
    const { session: p1 } = rm.joinRoom({ roomCode: room.info.code, playerName: 'NewHost' });
    expect(room.hostControlId).toBe(p1.playerId);

    // New host adds bots, configures turn timer, removes one, re-adds, and starts
    rm.addBot(room.info.code, p1.playerId, { difficulty: 'easy', character: 'django' });
    rm.addBot(room.info.code, p1.playerId, { difficulty: 'normal', character: 'belle' });
    expect(room.engine.state.lobby).toHaveLength(3);
    const botToRemove = room.engine.state.lobby.find((l) => l.isBot)!;
    rm.removeBot(room.info.code, p1.playerId, botToRemove.id);
    expect(room.engine.state.lobby).toHaveLength(2);
    rm.addBot(room.info.code, p1.playerId, { difficulty: 'normal', character: 'tuco' });
    rm.updateConfig(room.info.code, p1.playerId, { turnTimeoutSec: 45 });
    expect(room.info.turnTimeoutSec).toBe(45);

    room.engine.selectCharacter(p1.playerId, 'doc');
    room.engine.setReady(p1.playerId, true);
    rm.startMatch(room.info.code, p1.playerId);
    expect(room.engine.phase).toBe('planning');
    expect(room.info.turnDeadlineAt).toBeTypeOf('number');

    // Rematch is rejected while match is still in progress
    expect(() => rm.rematch(room.info.code, p1.playerId)).toThrow(/Action not allowed/);

    // Restore a completed ('gameEnd') match snapshot and trigger rematch
    const snap = db.exportBackup();
    const updatedSnap = JSON.parse(JSON.stringify(snap).replace('"phase":"planning"', '"phase":"gameEnd"'));
    db.deleteRoom(room.info.code);
    db.importBackup(updatedSnap);
    const rm2 = new RoomManager(db);
    rm2.rematch(room.info.code, p1.playerId);
    const rematched = rm2.getRoom(room.info.code);
    expect(rematched.engine.phase).toBe('lobby');
    expect(rematched.engine.state.lobby).toHaveLength(3);
    expect(rematched.engine.state.lobby.filter((l) => l.isBot)).toHaveLength(2);
    db.close();

    // Live Socket.IO BotController verification
    const srv = await startServer({ port: 0, host: '127.0.0.1', dbPath: ':memory:' });
    const url = `http://127.0.0.1:${srv.port}`;
    const cHost = await connect(url);
    let lastState: RoomStatePayload | undefined;
    cHost.on('room:state', (p) => (lastState = p));

    try {
      const created = await call<SessionInfo>((cb) =>
        cHost.emit('room:create', { playerName: 'SoloBandit', turnTimeoutSec: 25 }, cb),
      );
      expect(created.ok).toBe(true);
      await call((cb) => cHost.emit('lobby:selectCharacter', { character: 'doc' }, cb));
      await call((cb) => cHost.emit('lobby:ready', { ready: true }, cb));
      await call((cb) => cHost.emit('room:updateConfig', { turnTimeoutSec: 20 }, cb));
      const b1 = await call((cb) => cHost.emit('lobby:addBot', { difficulty: 'easy', character: 'django' }, cb));
      const b2 = await call((cb) => cHost.emit('lobby:addBot', { difficulty: 'normal', character: 'cheyenne' }, cb));
      expect(b1.ok).toBe(true);
      expect(b2.ok).toBe(true);

      const started = await call((cb) => cHost.emit('game:start', cb));
      expect(started.ok).toBe(true);
      await wait(80);
      // Human plays 1 card so turn advances to Bot 1
      const cId = lastState!.game.players[0]!.hand!.find((c) => c.kind === 'action')!.id;
      await call((cb) => cHost.emit('game:playCard', { cardId: cId }, cb));
      // Wait up to 2s for bots (520ms cadence each) to take their turns automatically
      for (let i = 0; i < 20; i++) {
        await wait(120);
        if (lastState && lastState.game.actionStack.length >= 3) break;
      }
      expect(lastState?.game.actionStack.length).toBeGreaterThanOrEqual(3);
      expect(lastState?.room.turnTimeoutSec).toBe(20);
    } finally {
      cHost.disconnect();
      await srv.close();
    }
  });
});
