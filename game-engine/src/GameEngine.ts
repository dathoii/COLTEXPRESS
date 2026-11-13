import type { BotDifficulty, CharacterId, GameEvent, GameState, GameView, ResolutionChoice } from '@colt/shared';
import { GameError } from '@colt/shared';
import { CHARACTERS, MAX_PLAYERS, mayPlayFaceDown } from '@colt/game-rules';
import { EventBus } from './events.js';
import { logEvent } from './events.js';
import { assertPhase } from './stateMachine.js';
import { seedFrom } from './rng.js';
import { getPlayer, hasPlayableCard } from './playerManager.js';
import { drawThree, playToStack } from './cardManager.js';
import {
  DEFAULT_OPTIONS,
  activePlayerId,
  completePlanningStep,
  currentRound,
  currentTurnType,
  setupGame,
  submitChoice,
  type EngineOptions,
} from './roundManager.js';
import { toView } from './view.js';

export function createInitialState(id: string, seed: string | number = Date.now()): GameState {
  return {
    id,
    phase: 'lobby',
    lobby: [],
    hostId: null,
    players: [],
    train: [],
    marshalCar: 0,
    roundDeck: [],
    roundIndex: 0,
    firstPlayerSeat: 0,
    planning: null,
    actionStack: [],
    execution: null,
    neutralBullets: 0,
    reservePurses: [],
    spareStrongboxes: [],
    scores: null,
    winnerIds: [],
    log: [],
    eventSeq: 0,
    rngState: seedFrom(seed),
    version: 0,
  };
}

/**
 * Authoritative game engine facade. Every command is atomic: it runs on a
 * clone of the state and only commits if no error is thrown. New log entries
 * are published on the EventBus after commit.
 */
export class GameEngine {
  readonly events = new EventBus();
  private _state: GameState;
  private readonly opts: EngineOptions;

  constructor(id: string, seed: string | number = Date.now(), opts: Partial<EngineOptions> = {}) {
    this._state = createInitialState(id, seed);
    this.opts = { ...DEFAULT_OPTIONS, ...opts };
  }

  static fromState(state: GameState, opts: Partial<EngineOptions> = {}): GameEngine {
    const e = new GameEngine(state.id, 0, opts);
    e._state = structuredClone(state);
    return e;
  }

  /** Read-only snapshot (deep clone) of the full authoritative state. */
  get state(): GameState {
    return structuredClone(this._state);
  }

  get phase() {
    return this._state.phase;
  }

  view(viewerId: string | null): GameView {
    return toView(this._state, viewerId);
  }

  activePlayerId(): string | null {
    return activePlayerId(this._state);
  }

  private command(fn: (s: GameState) => void): void {
    const draft = structuredClone(this._state);
    const before = draft.eventSeq;
    fn(draft);
    draft.version++;
    this._state = draft;
    const fresh: GameEvent[] = draft.log.filter((e) => e.seq > before);
    for (const ev of fresh) this.events.emit(ev);
  }

  // ---------------- Lobby ----------------

  addPlayer(id: string, name: string, opts?: { isBot?: boolean; botDifficulty?: BotDifficulty; character?: CharacterId }): void {
    this.command((s) => {
      assertPhase(s, 'lobby');
      if (s.lobby.some((p) => p.id === id)) throw new GameError('BAD_REQUEST', 'Player already in lobby');
      if (s.lobby.length >= MAX_PLAYERS) throw new GameError('ROOM_FULL', `Room is full (${MAX_PLAYERS} max)`);
      const clean = name.trim().slice(0, 24);
      if (!clean) throw new GameError('BAD_REQUEST', 'Name required');
      const char = opts?.character ?? null;
      if (char !== null && (!CHARACTERS.includes(char) || s.lobby.some((p) => p.character === char))) {
        throw new GameError('CHARACTER_TAKEN', 'Character unavailable');
      }
      s.lobby.push({
        id,
        name: clean,
        character: char,
        ready: Boolean(opts?.isBot && char),
        connected: true,
        ...(opts?.isBot ? { isBot: true, botDifficulty: opts.botDifficulty ?? 'normal' } : {}),
      });
      if (!s.hostId && !opts?.isBot) s.hostId = id;
      else if (!s.hostId) s.hostId = id;
      logEvent(s, 'lobby.playerJoined', `${clean} joined`, { playerId: id, isBot: Boolean(opts?.isBot) });
    });
  }

  removePlayer(id: string): void {
    this.command((s) => {
      assertPhase(s, 'lobby');
      const idx = s.lobby.findIndex((p) => p.id === id);
      if (idx < 0) throw new GameError('PLAYER_NOT_FOUND', 'Player not in lobby');
      const [gone] = s.lobby.splice(idx, 1);
      if (s.hostId === id) s.hostId = s.lobby[0]?.id ?? null;
      logEvent(s, 'lobby.playerLeft', `${gone!.name} left`, { playerId: id });
    });
  }

  selectCharacter(id: string, character: CharacterId | null): void {
    this.command((s) => {
      assertPhase(s, 'lobby');
      const lp = s.lobby.find((p) => p.id === id);
      if (!lp) throw new GameError('PLAYER_NOT_FOUND', 'Player not in lobby');
      if (character !== null && !CHARACTERS.includes(character)) throw new GameError('BAD_REQUEST', 'Unknown character');
      if (character && s.lobby.some((p) => p.id !== id && p.character === character)) {
        throw new GameError('CHARACTER_TAKEN', 'Character already taken');
      }
      lp.character = character;
      lp.ready = false;
      logEvent(s, 'lobby.characterSelected', `${lp.name} selects ${character ?? 'nobody'}`, { playerId: id, character });
    });
  }

  setReady(id: string, ready: boolean): void {
    this.command((s) => {
      assertPhase(s, 'lobby');
      const lp = s.lobby.find((p) => p.id === id);
      if (!lp) throw new GameError('PLAYER_NOT_FOUND', 'Player not in lobby');
      if (ready && !lp.character) throw new GameError('NOT_READY', 'Choose a character first');
      lp.ready = ready;
    });
  }

  setConnected(id: string, connected: boolean): void {
    this.command((s) => {
      const lp = s.lobby.find((p) => p.id === id);
      if (lp) lp.connected = connected;
      const p = s.players.find((x) => x.id === id);
      if (p) p.connected = connected;
    });
  }

  /** Lobby -> Setup -> Planning. */
  start(byPlayerId?: string): void {
    this.command((s) => {
      assertPhase(s, 'lobby');
      if (byPlayerId !== undefined && byPlayerId !== s.hostId) throw new GameError('NOT_HOST', 'Only the host can start');
      if (s.lobby.some((p) => !p.ready)) throw new GameError('NOT_READY', 'All players must be ready');
      setupGame(s, s.lobby, this.opts);
    });
  }

  /** Resets a completed match back into the lobby for a clean rematch. */
  rematch(byPlayerId?: string, nextSeed: string | number = Date.now()): void {
    this.command((s) => {
      assertPhase(s, 'gameEnd');
      if (byPlayerId !== undefined && byPlayerId !== s.hostId) throw new GameError('NOT_HOST', 'Only the host can start rematch');
      const keptLobby = s.lobby.map((lp) => ({
        ...lp,
        ready: Boolean(lp.isBot && lp.character),
      }));
      const fresh = createInitialState(s.id, nextSeed);
      fresh.lobby = keptLobby;
      fresh.hostId = s.hostId;
      fresh.eventSeq = s.eventSeq;
      fresh.version = s.version;
      Object.assign(s, fresh);
      logEvent(s, 'lobby.rematch', 'Room reset for rematch', { hostId: s.hostId });
    });
  }

  // ---------------- Planning ----------------

  playCard(playerId: string, cardId: string, faceDown = false): void {
    this.command((s) => {
      assertPhase(s, 'planning');
      this.assertActive(s, playerId);
      const p = getPlayer(s, playerId);
      const turnType = currentTurnType(s)!;
      let faceUp = turnType !== 'tunnel';
      if (faceDown && faceUp) {
        if (!mayPlayFaceDown(p.character, s.planning!.turnIndex, turnType, s.planning!.stepsTaken)) {
          throw new GameError('INVALID_CARD', 'You cannot play this card face down');
        }
        faceUp = false;
        logEvent(s, 'ability.used', `Ghost plays his card face down`, { ability: 'ghost', playerId });
      }
      playToStack(s, p, cardId, faceUp);
      completePlanningStep(s, this.opts);
    });
  }

  drawCards(playerId: string): void {
    this.command((s) => {
      assertPhase(s, 'planning');
      this.assertActive(s, playerId);
      drawThree(s, getPlayer(s, playerId));
      completePlanningStep(s, this.opts);
    });
  }

  // ---------------- Execution ----------------

  resolve(playerId: string, choice: ResolutionChoice): void {
    this.command((s) => {
      assertPhase(s, 'execution');
      submitChoice(s, playerId, choice, this.opts);
    });
  }

  /** Legal options for the pending decision (empty if none / not this player). */
  pendingOptions(playerId: string): ResolutionChoice[] {
    const p = this._state.execution?.pending;
    return p && p.playerId === playerId ? structuredClone(p.options) : [];
  }

  canPlay(playerId: string): boolean {
    const s = this._state;
    if (s.phase !== 'planning' || activePlayerId(s) !== playerId) return false;
    return hasPlayableCard(getPlayer(s, playerId));
  }

  currentRound() {
    return currentRound(this._state);
  }

  private assertActive(s: GameState, playerId: string): void {
    getPlayer(s, playerId);
    if (activePlayerId(s) !== playerId) throw new GameError('NOT_YOUR_TURN', 'It is not your turn');
  }
}
