import type { BotDifficulty, CharacterId, ResolutionChoice } from './types.js';
import type { GameView } from './view.js';

/** Result object returned through Socket.IO acknowledgements. */
export type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

export type HostMode = 'player' | 'dedicated';
export type ParticipantRole = 'player' | 'spectator' | 'host-moderator';

export interface SpectatorInfo {
  id: string;
  name: string;
  connected: boolean;
  joinedAt: number;
  isModerator?: boolean;
}

export interface RoomInfo {
  code: string;
  name: string;
  createdAt: number;
  hostMode: HostMode;
  hasPassword: boolean;
  inviteOnly: boolean;
  paused: boolean;
  pauseReason: string | null;
  closed: boolean;
  spectators: SpectatorInfo[];
  turnTimeoutSec?: number;
  turnDeadlineAt?: number | null;
}

export interface SessionInfo {
  playerId: string;
  token: string;
  roomCode: string;
  role: ParticipantRole;
}

export interface RoomStatePayload {
  room: RoomInfo;
  game: GameView;
  role: ParticipantRole;
}

export interface CreateRoomPayload {
  playerName: string;
  roomName?: string;
  hostMode?: HostMode;
  password?: string;
  turnTimeoutSec?: number;
}

export interface JoinRoomPayload {
  roomCode: string;
  playerName: string;
  password?: string;
  asSpectator?: boolean;
}

export interface CommandGuard {
  requestId?: string;
  expectedVersion?: number;
}

export interface ClientToServerEvents {
  'room:create': (p: CreateRoomPayload, ack: (r: Result<SessionInfo>) => void) => void;
  'room:join': (p: JoinRoomPayload, ack: (r: Result<SessionInfo>) => void) => void;
  'session:resume': (p: { token: string }, ack: (r: Result<SessionInfo>) => void) => void;
  'room:leave': (ack: (r: Result) => void) => void;
  'room:pause': (p: { reason?: string }, ack: (r: Result) => void) => void;
  'room:resume': (ack: (r: Result) => void) => void;
  'room:close': (ack: (r: Result) => void) => void;
  'lobby:selectCharacter': (p: { character: CharacterId | null } & CommandGuard, ack: (r: Result) => void) => void;
  'lobby:ready': (p: { ready: boolean } & CommandGuard, ack: (r: Result) => void) => void;
  'lobby:switchRole': (p: { asSpectator: boolean }, ack: (r: Result<{ role: ParticipantRole }>) => void) => void;
  'lobby:addBot': (p: { difficulty?: BotDifficulty; character?: CharacterId } & CommandGuard, ack: (r: Result) => void) => void;
  'lobby:removeBot': (p: { playerId: string } & CommandGuard, ack: (r: Result) => void) => void;
  'room:updateConfig': (p: { turnTimeoutSec?: number } & CommandGuard, ack: (r: Result) => void) => void;
  'game:start': (ack: (r: Result) => void) => void;
  'game:rematch': (ack: (r: Result) => void) => void;
  'game:playCard': (p: { cardId: string; faceDown?: boolean } & CommandGuard, ack: (r: Result) => void) => void;
  'game:draw': (p: CommandGuard | ((r: Result) => void), ack?: (r: Result) => void) => void;
  'game:resolve': (p: { choice: ResolutionChoice } & CommandGuard, ack: (r: Result) => void) => void;
  'system:ping': (ack: (r: Result<{ serverTime: number; version: string }>) => void) => void;
}

export interface ServerToClientEvents {
  'room:state': (p: RoomStatePayload) => void;
  'room:closed': (p: { roomCode: string; reason: string }) => void;
  'system:error': (p: { code: string; message: string }) => void;
}

export const PROTOCOL_VERSION = '0.2.0';
