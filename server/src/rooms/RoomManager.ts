import { createHash, randomBytes } from 'node:crypto';
import { GameEngine } from '@colt/game-engine';
import {
  GameError,
  type BotDifficulty,
  type CharacterId,
  type HostMode,
  type ParticipantRole,
  type RoomInfo,
  type SessionInfo,
  type SpectatorInfo,
} from '@colt/shared';
import type { Database, RoomMeta, StoredRoom, StoredSession } from '../persistence/Database.js';
import { pickBotIdentity } from './BotController.js';
import { createLogger } from '../logger.js';

const log = createLogger('rooms');
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export interface ActiveRoom {
  info: RoomInfo;
  engine: GameEngine;
  /** token -> StoredSession */
  sessions: Map<string, StoredSession>;
  /** participantId -> count of connected sockets */
  socketsByParticipant: Map<string, number>;
  /** participantId -> SpectatorInfo (includes host-moderator when in dedicated mode) */
  spectators: Map<string, SpectatorInfo>;
  passwordHash: string | null;
  hostControlId: string | null;
  updatedAt: number;
  resultRecorded: boolean;
}

function hashPassword(raw?: string): string | null {
  const clean = raw?.trim();
  if (!clean) return null;
  const salt = randomBytes(8).toString('hex');
  const digest = createHash('sha256').update(`${salt}:${clean}`).digest('hex');
  return `${salt}:${digest}`;
}

function verifyPassword(hash: string | null, attempt?: string): boolean {
  if (!hash) return true;
  if (!attempt) return false;
  const [salt, digest] = hash.split(':');
  if (!salt || !digest) return false;
  const check = createHash('sha256').update(`${salt}:${attempt.trim()}`).digest('hex');
  return check === digest;
}

export interface CreateRoomOptions {
  playerName: string;
  roomName?: string;
  hostMode?: HostMode;
  password?: string;
  turnTimeoutSec?: number;
  /** True when created from Host Dashboard / API without binding a browser socket immediately. */
  fromDashboard?: boolean;
}

export interface JoinRoomOptions {
  roomCode: string;
  playerName: string;
  password?: string;
  asSpectator?: boolean;
}

export class RoomManager {
  private rooms = new Map<string, ActiveRoom>();
  private tokenIndex = new Map<string, { roomCode: string; playerId: string; role: ParticipantRole }>();

  constructor(private readonly db: Database) {
    this.reloadFromDatabase();
  }

  reloadFromDatabase(): void {
    this.rooms.clear();
    this.tokenIndex.clear();
    for (const stored of this.db.loadRooms()) {
      this.hydrate(stored);
    }
    if (this.rooms.size > 0) {
      log.info(`Restored ${this.rooms.size} room(s) from SQLite`);
    }
  }

  private hydrate(stored: StoredRoom): void {
    const engine = GameEngine.fromState(stored.state, { autoResolveSingleOption: false });
    const sessions = new Map<string, StoredSession>();
    for (const [token, raw] of Object.entries(stored.sessions)) {
      const entry: StoredSession = typeof raw === 'string' ? { playerId: raw, role: 'player' } : raw;
      sessions.set(token, entry);
      this.tokenIndex.set(token, { roomCode: stored.code, playerId: entry.playerId, role: entry.role });
      if (entry.role === 'player') engine.setConnected(entry.playerId, false);
    }

    const meta: RoomMeta = stored.meta ?? {
      hostMode: 'player',
      passwordHash: null,
      hostControlId: stored.state.hostId ?? null,
      paused: false,
      pauseReason: null,
      closed: false,
      spectators: [],
    };
    const spectators = new Map<string, SpectatorInfo>();
    for (const s of meta.spectators ?? []) {
      spectators.set(s.id, { ...s, connected: false });
    }

    const room: ActiveRoom = {
      info: {
        code: stored.code,
        name: stored.name,
        createdAt: stored.createdAt,
        hostMode: meta.hostMode,
        hasPassword: Boolean(meta.passwordHash),
        inviteOnly: true,
        paused: Boolean(meta.paused),
        pauseReason: meta.pauseReason ?? null,
        closed: Boolean(meta.closed),
        spectators: [...spectators.values()],
        turnTimeoutSec: meta.turnTimeoutSec ?? 0,
        turnDeadlineAt: null,
      },
      engine,
      sessions,
      socketsByParticipant: new Map(),
      spectators,
      passwordHash: meta.passwordHash ?? null,
      hostControlId: meta.hostControlId ?? stored.state.hostId ?? null,
      updatedAt: Date.now(),
      resultRecorded: stored.state.phase === 'gameEnd',
    };
    this.rooms.set(stored.code, room);
  }

  private genCode(): string {
    for (let attempt = 0; attempt < 100; attempt++) {
      const bytes = randomBytes(5);
      let code = '';
      for (const b of bytes) code += ALPHABET[b % ALPHABET.length];
      if (!this.rooms.has(code)) return code;
    }
    throw new GameError('INTERNAL', 'Could not allocate room code');
  }

  private genId(prefix: string): string {
    return `${prefix}_${randomBytes(6).toString('hex')}`;
  }

  createRoom(opts: CreateRoomOptions): { room: ActiveRoom; session: SessionInfo } {
    const cleanName = opts.playerName.trim().slice(0, 24);
    if (!cleanName) throw new GameError('BAD_REQUEST', 'Name required');

    const hostMode: HostMode = opts.hostMode ?? 'player';
    const turnTimeoutSec = Math.max(0, Math.min(120, Math.floor(opts.turnTimeoutSec ?? 0)));
    const code = this.genCode();
    const name = (opts.roomName?.trim() || `${cleanName}'s Train`).slice(0, 40);
    const engine = new GameEngine(code, `${code}-${Date.now()}`, { autoResolveSingleOption: false });
    const passwordHash = hashPassword(opts.password);

    const participantId = hostMode === 'player' ? this.genId('p') : this.genId('host');
    const role: ParticipantRole = hostMode === 'player' ? 'player' : 'host-moderator';
    const token = this.genId('tok');
    const spectators = new Map<string, SpectatorInfo>();

    if (hostMode === 'player') {
      engine.addPlayer(participantId, cleanName);
    } else if (!opts.fromDashboard) {
      spectators.set(participantId, {
        id: participantId,
        name: cleanName,
        connected: true,
        joinedAt: Date.now(),
        isModerator: true,
      });
    }

    const room: ActiveRoom = {
      info: {
        code,
        name,
        createdAt: Date.now(),
        hostMode,
        hasPassword: Boolean(passwordHash),
        inviteOnly: true,
        paused: false,
        pauseReason: null,
        closed: false,
        spectators: [...spectators.values()],
        turnTimeoutSec,
        turnDeadlineAt: null,
      },
      engine,
      sessions: new Map([[token, { playerId: participantId, role }]]),
      socketsByParticipant: new Map(opts.fromDashboard ? [] : [[participantId, 1]]),
      spectators,
      passwordHash,
      hostControlId: participantId,
      updatedAt: Date.now(),
      resultRecorded: false,
    };

    this.rooms.set(code, room);
    this.tokenIndex.set(token, { roomCode: code, playerId: participantId, role });
    this.persist(room);
    log.info(`Room ${code} (${hostMode}) created by ${cleanName} (${participantId})`);
    return { room, session: { playerId: participantId, token, roomCode: code, role } };
  }

  joinRoom(opts: JoinRoomOptions): { room: ActiveRoom; session: SessionInfo } {
    const cleanName = opts.playerName.trim().slice(0, 24);
    if (!cleanName) throw new GameError('BAD_REQUEST', 'Name required');

    const code = opts.roomCode.trim().toUpperCase();
    const room = this.rooms.get(code);
    if (!room || room.info.closed) throw new GameError('ROOM_NOT_FOUND', `Room "${code}" not found`);
    if (!verifyPassword(room.passwordHash, opts.password)) {
      throw new GameError('WRONG_PASSWORD', 'Incorrect room password');
    }

    const asSpectator = Boolean(opts.asSpectator) || room.engine.phase !== 'lobby';
    const token = this.genId('tok');

    if (asSpectator) {
      const specId = this.genId('spec');
      room.spectators.set(specId, {
        id: specId,
        name: cleanName,
        connected: true,
        joinedAt: Date.now(),
      });
      room.sessions.set(token, { playerId: specId, role: 'spectator' });
      room.socketsByParticipant.set(specId, 1);
      this.tokenIndex.set(token, { roomCode: code, playerId: specId, role: 'spectator' });
      this.persist(room);
      log.info(`Spectator ${cleanName} (${specId}) joined room ${code}`);
      return { room, session: { playerId: specId, token, roomCode: code, role: 'spectator' } };
    }

    const playerId = this.genId('p');
    room.engine.addPlayer(playerId, cleanName);
    if (room.info.hostMode === 'player' && !room.hostControlId) {
      room.hostControlId = room.engine.state.hostId;
    }
    room.sessions.set(token, { playerId, role: 'player' });
    room.socketsByParticipant.set(playerId, 1);
    this.tokenIndex.set(token, { roomCode: code, playerId, role: 'player' });
    this.persist(room);
    log.info(`Player ${cleanName} (${playerId}) joined room ${code}`);
    return { room, session: { playerId, token, roomCode: code, role: 'player' } };
  }

  switchLobbyRole(
    roomCode: string,
    token: string,
    participantId: string,
    currentRole: ParticipantRole,
    asSpectator: boolean,
  ): { room: ActiveRoom; role: ParticipantRole } {
    const room = this.getRoom(roomCode);
    if (room.engine.phase !== 'lobby') {
      throw new GameError('INVALID_PHASE', 'Role switching is only allowed in the lobby');
    }
    if (currentRole === 'host-moderator') {
      throw new GameError('FORBIDDEN', 'Dedicated host moderator cannot switch into a player seat');
    }
    if (asSpectator && currentRole === 'spectator') return { room, role: 'spectator' };
    if (!asSpectator && currentRole === 'player') return { room, role: 'player' };

    if (asSpectator) {
      const lobbyPlayer = room.engine.state.lobby.find((l) => l.id === participantId);
      const name = lobbyPlayer?.name ?? 'Spectator';
      room.engine.removePlayer(participantId);
      if (room.info.hostMode === 'player' && room.hostControlId === participantId) {
        room.hostControlId = room.engine.state.hostId;
      }
      room.spectators.set(participantId, { id: participantId, name, connected: true, joinedAt: Date.now() });
      room.sessions.set(token, { playerId: participantId, role: 'spectator' });
      this.tokenIndex.set(token, { roomCode: room.info.code, playerId: participantId, role: 'spectator' });
      this.persist(room);
      return { room, role: 'spectator' };
    } else {
      const spec = room.spectators.get(participantId);
      const name = spec?.name ?? 'Outlaw';
      room.engine.addPlayer(participantId, name);
      room.spectators.delete(participantId);
      if (room.info.hostMode === 'player' && !room.hostControlId) {
        room.hostControlId = room.engine.state.hostId;
      }
      room.sessions.set(token, { playerId: participantId, role: 'player' });
      this.tokenIndex.set(token, { roomCode: room.info.code, playerId: participantId, role: 'player' });
      this.persist(room);
      return { room, role: 'player' };
    }
  }

  resumeSession(token: string): { room: ActiveRoom; session: SessionInfo } {
    const entry = this.tokenIndex.get(token);
    if (!entry) throw new GameError('ROOM_NOT_FOUND', 'Session expired or not found');
    const room = this.rooms.get(entry.roomCode);
    if (!room || room.info.closed) throw new GameError('ROOM_NOT_FOUND', 'Room no longer exists');
    const count = (room.socketsByParticipant.get(entry.playerId) ?? 0) + 1;
    room.socketsByParticipant.set(entry.playerId, count);
    if (entry.role === 'player') {
      room.engine.setConnected(entry.playerId, true);
    } else {
      const spec = room.spectators.get(entry.playerId);
      if (spec) spec.connected = true;
    }
    this.persist(room);
    log.info(`Session resumed for ${entry.playerId} (${entry.role}) in ${room.info.code}`);
    return { room, session: { playerId: entry.playerId, token, roomCode: room.info.code, role: entry.role } };
  }

  leaveRoom(roomCode: string, participantId: string, token?: string): ActiveRoom | null {
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    const sess = token ? room.sessions.get(token) : undefined;
    if (token) {
      room.sessions.delete(token);
      this.tokenIndex.delete(token);
    }
    room.socketsByParticipant.delete(participantId);

    if (sess?.role === 'spectator' || sess?.role === 'host-moderator' || room.spectators.has(participantId)) {
      room.spectators.delete(participantId);
      if (
        room.engine.phase === 'lobby' &&
        room.engine.state.lobby.length === 0 &&
        room.spectators.size === 0 &&
        room.info.hostMode === 'player'
      ) {
        this.rooms.delete(roomCode);
        this.db.deleteRoom(roomCode);
        log.info(`Room ${roomCode} deleted (empty)`);
        return null;
      }
      this.persist(room);
      return room;
    }

    if (room.engine.phase === 'lobby') {
      try {
        room.engine.removePlayer(participantId);
      } catch {
        // ignore if already removed
      }
      if (room.info.hostMode === 'player') {
        room.hostControlId = room.engine.state.hostId;
      }
      if (room.engine.state.lobby.length === 0 && room.spectators.size === 0 && room.info.hostMode === 'player') {
        this.rooms.delete(roomCode);
        this.db.deleteRoom(roomCode);
        log.info(`Room ${roomCode} deleted (empty)`);
        return null;
      }
    } else {
      room.engine.setConnected(participantId, false);
    }
    this.persist(room);
    return room;
  }

  markDisconnected(roomCode: string, participantId: string, role: ParticipantRole): ActiveRoom | null {
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    const next = Math.max(0, (room.socketsByParticipant.get(participantId) ?? 1) - 1);
    room.socketsByParticipant.set(participantId, next);
    if (next === 0) {
      if (role === 'player') {
        room.engine.setConnected(participantId, false);
        if (room.engine.phase !== 'lobby' && room.engine.phase !== 'gameEnd') {
          log.warn(`Player ${participantId} disconnected mid-match in room ${roomCode} (Host decides Pause/Resume)`);
        }
      } else {
        const spec = room.spectators.get(participantId);
        if (spec) spec.connected = false;
      }
      this.persist(room);
    }
    return room;
  }

  assertHost(room: ActiveRoom, actorId: string): void {
    if (room.hostControlId !== actorId) {
      throw new GameError('NOT_HOST', 'Only the room host can perform this action');
    }
  }

  startMatch(roomCode: string, actorId: string): ActiveRoom {
    const room = this.getRoom(roomCode);
    this.assertHost(room, actorId);
    if (room.info.hostMode === 'dedicated') {
      room.engine.start(); // Dedicated host is outside lobby; validate 3-6 ready players inside engine
    } else {
      room.engine.start(actorId);
    }
    this.refreshTurnDeadline(room);
    this.persist(room);
    log.info(`Match started in room ${roomCode} (mode=${room.info.hostMode})`);
    return room;
  }

  addBot(roomCode: string, actorId: string, opts?: { difficulty?: BotDifficulty; character?: CharacterId }): ActiveRoom {
    const room = this.getRoom(roomCode);
    this.assertHost(room, actorId);
    const lobby = room.engine.state.lobby;
    const { name, character } = pickBotIdentity(
      lobby.map((l) => l.name),
      lobby.map((l) => l.character),
      opts?.character,
    );
    const botId = this.genId('bot');
    room.engine.addPlayer(botId, name, {
      isBot: true,
      botDifficulty: opts?.difficulty ?? 'normal',
      character,
    });
    this.persist(room);
    log.info(`Bot ${name} (${character}) added to room ${roomCode}`);
    return room;
  }

  removeBot(roomCode: string, actorId: string, botId: string): ActiveRoom {
    const room = this.getRoom(roomCode);
    this.assertHost(room, actorId);
    const lp = room.engine.state.lobby.find((l) => l.id === botId);
    if (!lp?.isBot) throw new GameError('BAD_REQUEST', 'Target is not a bot player');
    room.engine.removePlayer(botId);
    this.persist(room);
    log.info(`Bot ${lp.name} removed from room ${roomCode}`);
    return room;
  }

  updateConfig(roomCode: string, actorId: string, opts: { turnTimeoutSec?: number }): ActiveRoom {
    const room = this.getRoom(roomCode);
    this.assertHost(room, actorId);
    if (opts.turnTimeoutSec !== undefined) {
      room.info.turnTimeoutSec = Math.max(0, Math.min(120, Math.floor(opts.turnTimeoutSec)));
    }
    this.refreshTurnDeadline(room);
    this.persist(room);
    return room;
  }

  rematch(roomCode: string, actorId: string): ActiveRoom {
    const room = this.getRoom(roomCode);
    this.assertHost(room, actorId);
    room.engine.rematch(room.info.hostMode === 'dedicated' ? undefined : actorId, `${roomCode}-${Date.now()}`);
    room.resultRecorded = false;
    room.info.paused = false;
    room.info.pauseReason = null;
    room.info.turnDeadlineAt = null;
    this.persist(room);
    log.info(`Rematch initialized in room ${roomCode}`);
    return room;
  }

  refreshTurnDeadline(room: ActiveRoom): void {
    const timeoutSec = room.info.turnTimeoutSec ?? 0;
    const phase = room.engine.phase;
    if (timeoutSec <= 0 || room.info.paused || room.info.closed || (phase !== 'planning' && phase !== 'execution')) {
      room.info.turnDeadlineAt = null;
      return;
    }
    const activeId = room.engine.activePlayerId();
    const isBot = activeId ? Boolean(room.engine.state.players.find((p) => p.id === activeId)?.isBot) : false;
    room.info.turnDeadlineAt = activeId && !isBot ? Date.now() + timeoutSec * 1000 : null;
  }

  pruneIdleRooms(maxIdleMs: number, now = Date.now()): string[] {
    const removed: string[] = [];
    for (const [code, room] of this.rooms.entries()) {
      if (now - room.updatedAt < maxIdleMs) continue;
      let connectedSockets = 0;
      for (const n of room.socketsByParticipant.values()) connectedSockets += n;
      if (connectedSockets > 0) continue;
      room.info.closed = true;
      for (const token of room.sessions.keys()) this.tokenIndex.delete(token);
      this.rooms.delete(code);
      this.db.deleteRoom(code);
      removed.push(code);
      log.info(`Pruned idle room ${code}`);
    }
    return removed;
  }

  pauseMatch(roomCode: string, actorId: string, reason?: string): ActiveRoom {
    const room = this.getRoom(roomCode);
    this.assertHost(room, actorId);
    if (room.engine.phase === 'lobby' || room.engine.phase === 'gameEnd') {
      throw new GameError('INVALID_PHASE', 'Can only pause an active match');
    }
    room.info.paused = true;
    room.info.pauseReason = reason?.trim() || 'Paused by host';
    this.refreshTurnDeadline(room);
    this.persist(room);
    log.info(`Room ${roomCode} paused: ${room.info.pauseReason}`);
    return room;
  }

  resumeMatch(roomCode: string, actorId: string): ActiveRoom {
    const room = this.getRoom(roomCode);
    this.assertHost(room, actorId);
    room.info.paused = false;
    room.info.pauseReason = null;
    this.refreshTurnDeadline(room);
    this.persist(room);
    log.info(`Room ${roomCode} resumed`);
    return room;
  }

  closeRoom(roomCode: string, actorId: string): ActiveRoom {
    const room = this.getRoom(roomCode);
    this.assertHost(room, actorId);
    room.info.closed = true;
    for (const token of room.sessions.keys()) {
      this.tokenIndex.delete(token);
    }
    this.rooms.delete(roomCode);
    this.db.deleteRoom(roomCode);
    log.info(`Room ${roomCode} closed by host`);
    return room;
  }

  assertNotPaused(room: ActiveRoom): void {
    if (room.info.paused) {
      throw new GameError('ROOM_PAUSED', room.info.pauseReason ?? 'Match is paused by the host');
    }
  }

  getRoom(code: string): ActiveRoom {
    const room = this.rooms.get(code.trim().toUpperCase());
    if (!room || room.info.closed) throw new GameError('ROOM_NOT_FOUND', `Room "${code}" not found`);
    return room;
  }

  listRooms(): ActiveRoom[] {
    return [...this.rooms.values()];
  }

  persist(room: ActiveRoom): void {
    room.updatedAt = Date.now();
    room.info.spectators = [...room.spectators.values()];
    const state = room.engine.state;
    const sessionsObj: Record<string, StoredSession> = {};
    for (const [t, s] of room.sessions) sessionsObj[t] = s;
    const meta: RoomMeta = {
      hostMode: room.info.hostMode,
      passwordHash: room.passwordHash,
      hostControlId: room.hostControlId,
      paused: room.info.paused,
      pauseReason: room.info.pauseReason,
      closed: room.info.closed,
      spectators: room.info.spectators,
      turnTimeoutSec: room.info.turnTimeoutSec ?? 0,
    };
    this.db.saveRoom({
      code: room.info.code,
      name: room.info.name,
      createdAt: room.info.createdAt,
      state,
      sessions: sessionsObj,
      meta,
    });
    if (state.phase === 'gameEnd' && !room.resultRecorded && state.scores) {
      room.resultRecorded = true;
      this.db.saveResult(room.info.code, state.winnerIds, state.scores);
    }
  }

  listRoomCount(): number {
    return this.rooms.size;
  }
}
