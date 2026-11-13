import type { Server, Socket } from 'socket.io';
import {
  GameError,
  isGameError,
  PROTOCOL_VERSION,
  type ClientToServerEvents,
  type CommandGuard,
  type ParticipantRole,
  type Result,
  type ServerToClientEvents,
} from '@colt/shared';
import type { ActiveRoom, RoomManager } from '../rooms/RoomManager.js';
import { createLogger } from '../logger.js';

const log = createLogger('socket');

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

interface SocketSession {
  roomCode: string;
  playerId: string;
  token: string;
  role: ParticipantRole;
}

export interface RoomBroadcaster {
  broadcastRoom: (room: ActiveRoom) => void;
  broadcastClosed: (roomCode: string, reason: string) => void;
}

export function attachSocketHandlers(
  io: TypedServer,
  rooms: RoomManager,
  onRoomBroadcast?: (room: ActiveRoom) => void,
): RoomBroadcaster {
  const socketSessions = new Map<string, SocketSession>();
  const socketsByParticipant = new Map<string, Set<TypedSocket>>();
  /** token -> Set of processed requestIds (bounded FIFO) */
  const seenRequests = new Map<string, string[]>();

  function trackSocket(sock: TypedSocket, s: SocketSession): void {
    const prev = socketSessions.get(sock.id);
    if (prev) untrackSocket(sock, prev);
    socketSessions.set(sock.id, s);
    sock.join(s.roomCode);
    const key = `${s.roomCode}:${s.playerId}`;
    let set = socketsByParticipant.get(key);
    if (!set) socketsByParticipant.set(key, (set = new Set()));
    set.add(sock);
  }

  function untrackSocket(sock: TypedSocket, s: SocketSession): void {
    sock.leave(s.roomCode);
    const key = `${s.roomCode}:${s.playerId}`;
    const set = socketsByParticipant.get(key);
    if (set) {
      set.delete(sock);
      if (set.size === 0) socketsByParticipant.delete(key);
    }
    socketSessions.delete(sock.id);
  }

  /** Broadcasts redacted per-viewer GameView to players, spectators, and host-moderators. */
  function broadcastRoom(room: ActiveRoom): void {
    const state = room.engine.state;
    const participantIds = new Set<string>([
      ...state.lobby.map((l) => l.id),
      ...state.players.map((p) => p.id),
      ...room.spectators.keys(),
    ]);
    for (const pid of participantIds) {
      const set = socketsByParticipant.get(`${room.info.code}:${pid}`);
      if (!set || set.size === 0) continue;
      const isPlayer =
        state.lobby.some((l) => l.id === pid) || state.players.some((p) => p.id === pid);
      const spec = room.spectators.get(pid);
      const role: ParticipantRole = isPlayer
        ? 'player'
        : spec?.isModerator
          ? 'host-moderator'
          : 'spectator';
      const view = room.engine.view(isPlayer ? pid : null);
      for (const sock of set) {
        sock.emit('room:state', { room: room.info, game: view, role });
      }
    }
    onRoomBroadcast?.(room);
  }

  function broadcastClosed(roomCode: string, reason: string): void {
    io.to(roomCode).emit('room:closed', { roomCode, reason });
    for (const [sockId, s] of [...socketSessions.entries()]) {
      if (s.roomCode === roomCode) {
        const sock = io.sockets.sockets.get(sockId);
        if (sock) untrackSocket(sock, s);
      }
    }
  }

  function wrap<T>(sock: TypedSocket, ack: unknown, fn: () => T): void {
    const reply = typeof ack === 'function' ? (ack as (r: Result<T>) => void) : null;
    try {
      const data = fn();
      reply?.({ ok: true, data });
    } catch (err) {
      const code = isGameError(err) ? err.code : 'INTERNAL';
      const message = err instanceof Error ? err.message : 'Unexpected server error';
      if (code === 'INTERNAL') log.error(`Socket handler error on ${sock.id}`, err);
      else log.debug(`Rejected on ${sock.id}: ${code} - ${message}`);
      reply?.({ ok: false, error: { code, message } });
      if (!reply) sock.emit('system:error', { code, message });
    }
  }

  function requireSession(sock: TypedSocket): { session: SocketSession; room: ActiveRoom } {
    const session = socketSessions.get(sock.id);
    if (!session) throw new GameError('FORBIDDEN', 'Not in a room');
    const room = rooms.getRoom(session.roomCode);
    return { session, room };
  }

  function assertPlayerRole(session: SocketSession): void {
    if (session.role !== 'player') {
      throw new GameError('FORBIDDEN', 'Spectators cannot affect the match');
    }
  }

  function assertObject(val: unknown, label: string): Record<string, unknown> {
    if (!val || typeof val !== 'object' || Array.isArray(val)) {
      throw new GameError('BAD_REQUEST', `Invalid ${label} payload`);
    }
    return val as Record<string, unknown>;
  }

  function guardCommand(session: SocketSession, room: ActiveRoom, guard?: CommandGuard): void {
    if (!guard) return;
    if (guard.expectedVersion !== undefined && guard.expectedVersion !== room.engine.state.version) {
      throw new GameError('DUPLICATE_EVENT', 'Game state has advanced; duplicate or stale command ignored');
    }
    if (guard.requestId) {
      let list = seenRequests.get(session.token);
      if (!list) seenRequests.set(session.token, (list = []));
      if (list.includes(guard.requestId)) {
        throw new GameError('DUPLICATE_EVENT', 'Duplicate event requestId ignored');
      }
      list.push(guard.requestId);
      if (list.length > 100) list.shift();
    }
  }

  io.on('connection', (sock) => {
    log.debug(`Client connected: ${sock.id}`);

    sock.on('system:ping', (ack) => {
      wrap(sock, ack, () => ({ serverTime: Date.now(), version: PROTOCOL_VERSION }));
    });

    sock.on('room:create', (payload, ack) => {
      wrap(sock, ack, () => {
        const p = assertObject(payload, 'room:create');
        if (typeof p.playerName !== 'string') throw new GameError('BAD_REQUEST', 'playerName required');
        const { room, session } = rooms.createRoom({
          playerName: p.playerName,
          roomName: typeof p.roomName === 'string' ? p.roomName : undefined,
          hostMode: p.hostMode === 'dedicated' ? 'dedicated' : 'player',
          password: typeof p.password === 'string' ? p.password : undefined,
          turnTimeoutSec: typeof p.turnTimeoutSec === 'number' ? p.turnTimeoutSec : undefined,
        });
        trackSocket(sock, { ...session });
        broadcastRoom(room);
        return session;
      });
    });

    sock.on('room:join', (payload, ack) => {
      wrap(sock, ack, () => {
        const p = assertObject(payload, 'room:join');
        if (typeof p.roomCode !== 'string' || typeof p.playerName !== 'string') {
          throw new GameError('BAD_REQUEST', 'roomCode and playerName required');
        }
        const { room, session } = rooms.joinRoom({
          roomCode: p.roomCode,
          playerName: p.playerName,
          password: typeof p.password === 'string' ? p.password : undefined,
          asSpectator: Boolean(p.asSpectator),
        });
        trackSocket(sock, { ...session });
        broadcastRoom(room);
        return session;
      });
    });

    sock.on('session:resume', (payload, ack) => {
      wrap(sock, ack, () => {
        const p = assertObject(payload, 'session:resume');
        if (typeof p.token !== 'string' || !p.token) throw new GameError('BAD_REQUEST', 'token required');
        const { room, session } = rooms.resumeSession(p.token);
        trackSocket(sock, { ...session });
        broadcastRoom(room);
        return session;
      });
    });

    sock.on('room:leave', (ack) => {
      wrap(sock, ack, () => {
        const s = socketSessions.get(sock.id);
        if (!s) return undefined;
        untrackSocket(sock, s);
        const room = rooms.leaveRoom(s.roomCode, s.playerId, s.token);
        if (room) broadcastRoom(room);
        return undefined;
      });
    });

    sock.on('room:pause', (payload, ack) => {
      wrap(sock, ack, () => {
        const { session, room } = requireSession(sock);
        const reason = payload && typeof payload.reason === 'string' ? payload.reason : undefined;
        rooms.pauseMatch(room.info.code, session.playerId, reason);
        broadcastRoom(room);
        return undefined;
      });
    });

    sock.on('room:resume', (ack) => {
      wrap(sock, ack, () => {
        const { session, room } = requireSession(sock);
        rooms.resumeMatch(room.info.code, session.playerId);
        broadcastRoom(room);
        return undefined;
      });
    });

    sock.on('room:close', (ack) => {
      wrap(sock, ack, () => {
        const { session, room } = requireSession(sock);
        const code = room.info.code;
        rooms.closeRoom(code, session.playerId);
        broadcastClosed(code, 'Room closed by host');
        return undefined;
      });
    });

    sock.on('lobby:selectCharacter', (payload, ack) => {
      wrap(sock, ack, () => {
        const p = assertObject(payload, 'lobby:selectCharacter');
        const { session, room } = requireSession(sock);
        assertPlayerRole(session);
        guardCommand(session, room, p as CommandGuard);
        room.engine.selectCharacter(session.playerId, (p.character as never) ?? null);
        rooms.persist(room);
        broadcastRoom(room);
        return undefined;
      });
    });

    sock.on('lobby:ready', (payload, ack) => {
      wrap(sock, ack, () => {
        const p = assertObject(payload, 'lobby:ready');
        const { session, room } = requireSession(sock);
        assertPlayerRole(session);
        guardCommand(session, room, p as CommandGuard);
        room.engine.setReady(session.playerId, Boolean(p.ready));
        rooms.persist(room);
        broadcastRoom(room);
        return undefined;
      });
    });

    sock.on('lobby:switchRole', (payload, ack) => {
      wrap(sock, ack, () => {
        const p = assertObject(payload, 'lobby:switchRole');
        const { session, room } = requireSession(sock);
        const res = rooms.switchLobbyRole(
          room.info.code,
          session.token,
          session.playerId,
          session.role,
          Boolean(p.asSpectator),
        );
        session.role = res.role;
        broadcastRoom(res.room);
        return { role: res.role };
      });
    });

    sock.on('lobby:addBot', (payload, ack) => {
      wrap(sock, ack, () => {
        const p = assertObject(payload, 'lobby:addBot');
        const { session, room } = requireSession(sock);
        guardCommand(session, room, p as CommandGuard);
        rooms.addBot(room.info.code, session.playerId, {
          difficulty: p.difficulty === 'easy' ? 'easy' : 'normal',
          character: typeof p.character === 'string' ? (p.character as never) : undefined,
        });
        broadcastRoom(room);
        return undefined;
      });
    });

    sock.on('lobby:removeBot', (payload, ack) => {
      wrap(sock, ack, () => {
        const p = assertObject(payload, 'lobby:removeBot');
        if (typeof p.playerId !== 'string') throw new GameError('BAD_REQUEST', 'playerId required');
        const { session, room } = requireSession(sock);
        guardCommand(session, room, p as CommandGuard);
        rooms.removeBot(room.info.code, session.playerId, p.playerId);
        broadcastRoom(room);
        return undefined;
      });
    });

    sock.on('room:updateConfig', (payload, ack) => {
      wrap(sock, ack, () => {
        const p = assertObject(payload, 'room:updateConfig');
        const { session, room } = requireSession(sock);
        guardCommand(session, room, p as CommandGuard);
        rooms.updateConfig(room.info.code, session.playerId, {
          turnTimeoutSec: typeof p.turnTimeoutSec === 'number' ? p.turnTimeoutSec : undefined,
        });
        broadcastRoom(room);
        return undefined;
      });
    });

    sock.on('game:start', (ack) => {
      wrap(sock, ack, () => {
        const { session, room } = requireSession(sock);
        rooms.startMatch(room.info.code, session.playerId);
        broadcastRoom(room);
        return undefined;
      });
    });

    sock.on('game:rematch', (ack) => {
      wrap(sock, ack, () => {
        const { session, room } = requireSession(sock);
        rooms.rematch(room.info.code, session.playerId);
        broadcastRoom(room);
        return undefined;
      });
    });

    sock.on('game:playCard', (payload, ack) => {
      wrap(sock, ack, () => {
        const p = assertObject(payload, 'game:playCard');
        if (typeof p.cardId !== 'string') throw new GameError('BAD_REQUEST', 'cardId required');
        const { session, room } = requireSession(sock);
        assertPlayerRole(session);
        rooms.assertNotPaused(room);
        guardCommand(session, room, p as CommandGuard);
        room.engine.playCard(session.playerId, p.cardId, Boolean(p.faceDown));
        rooms.refreshTurnDeadline(room);
        rooms.persist(room);
        broadcastRoom(room);
        return undefined;
      });
    });

    sock.on('game:draw', (payloadOrAck, maybeAck) => {
      const ack = typeof payloadOrAck === 'function' ? payloadOrAck : maybeAck;
      const guard = typeof payloadOrAck === 'function' ? undefined : (payloadOrAck as CommandGuard | undefined);
      wrap(sock, ack, () => {
        const { session, room } = requireSession(sock);
        assertPlayerRole(session);
        rooms.assertNotPaused(room);
        guardCommand(session, room, guard);
        room.engine.drawCards(session.playerId);
        rooms.refreshTurnDeadline(room);
        rooms.persist(room);
        broadcastRoom(room);
        return undefined;
      });
    });

    sock.on('game:resolve', (payload, ack) => {
      wrap(sock, ack, () => {
        const p = assertObject(payload, 'game:resolve');
        if (!p.choice || typeof p.choice !== 'object') throw new GameError('BAD_REQUEST', 'choice required');
        const { session, room } = requireSession(sock);
        assertPlayerRole(session);
        rooms.assertNotPaused(room);
        guardCommand(session, room, p as CommandGuard);
        room.engine.resolve(session.playerId, p.choice as never);
        rooms.refreshTurnDeadline(room);
        rooms.persist(room);
        broadcastRoom(room);
        return undefined;
      });
    });

    sock.on('disconnect', () => {
      const s = socketSessions.get(sock.id);
      if (s) {
        untrackSocket(sock, s);
        const room = rooms.markDisconnected(s.roomCode, s.playerId, s.role);
        if (room) broadcastRoom(room);
      }
      log.debug(`Client disconnected: ${sock.id}`);
    });
  });

  return { broadcastRoom, broadcastClosed };
}
