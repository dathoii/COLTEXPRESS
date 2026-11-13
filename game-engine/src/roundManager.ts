import type { GameState, LobbyPlayer, PlayerState, RoundCard, TurnType } from '@colt/shared';
import { GameError } from '@colt/shared';
import {
  CHARACTER_INFO,
  MAX_PLAYERS,
  MIN_PLAYERS,
  NEUTRAL_BULLETS,
  NORMAL_ROUND_CARDS_PER_GAME,
  ROUND_CARDS,
  STATION_CARDS,
  bracketFor,
} from '@colt/game-rules';
import { logEvent } from './events.js';
import { transition } from './stateMachine.js';
import { shuffle } from './rng.js';
import { buildTrain, createLootPools, takeStartingPurse } from './trainManager.js';
import { createPlayerState, getPlayer, hasPlayableCard, startingPosition } from './playerManager.js';
import { buildActionDeck, buildBulletStack, dealRoundHand, returnStackToOwners } from './cardManager.js';
import { getActionOptions, resolveAction } from './actionManager.js';
import { applyRoundEvent } from './roundEvents.js';
import { computeScores } from './scoringManager.js';
import type { ResolutionChoice } from '@colt/shared';

/** Round Manager: setup, planning flow, execution flow, round end, game end. */

export interface EngineOptions {
  /** Auto-resolve an action when exactly one legal option exists. */
  autoResolveSingleOption: boolean;
  /** Fixed round deck (tests / scenarios). */
  roundDeckOverride?: RoundCard[];
}

export const DEFAULT_OPTIONS: EngineOptions = { autoResolveSingleOption: true };

export function currentRound(state: GameState): RoundCard | null {
  return state.roundDeck[state.roundIndex] ?? null;
}

export function currentTurnType(state: GameState): TurnType | null {
  const r = currentRound(state);
  if (!r || !state.planning) return null;
  return r.turns[state.planning.turnIndex] ?? null;
}

export function activePlayerId(state: GameState): string | null {
  if (state.phase === 'planning' && state.planning) return state.planning.order[state.planning.orderIndex] ?? null;
  if (state.phase === 'execution' && state.execution?.pending) return state.execution.pending.playerId;
  return null;
}

/** Lobby -> Setup -> Planning(round 1). */
export function setupGame(state: GameState, lobby: LobbyPlayer[], opts: EngineOptions): void {
  if (lobby.length < MIN_PLAYERS || lobby.length > MAX_PLAYERS) {
    throw new GameError('INVALID_PLAYER_COUNT', `Colt Express needs ${MIN_PLAYERS}-${MAX_PLAYERS} players`);
  }
  const chars = lobby.map((l) => l.character);
  if (chars.some((c) => !c)) throw new GameError('NOT_READY', 'Every player must choose a character');
  if (new Set(chars).size !== chars.length) throw new GameError('CHARACTER_TAKEN', 'Characters must be unique');

  transition(state, 'setup');
  const n = lobby.length;
  const pools = createLootPools();
  const startingPurses = lobby.map(() => takeStartingPurse(pools));
  buildTrain(state, n, pools);

  state.players = lobby.map((l, seat) => {
    const p = createPlayerState(l.id, l.name, l.character!, seat, startingPosition(seat, state.train.length), {
      isBot: l.isBot,
      botDifficulty: l.botDifficulty,
    });
    p.deck = buildActionDeck(p.character);
    p.bullets = buildBulletStack(p.character);
    p.loot = [startingPurses[seat]!];
    return p;
  });
  state.neutralBullets = NEUTRAL_BULLETS;
  state.firstPlayerSeat = 0;
  state.roundIndex = 0;
  state.roundDeck = opts.roundDeckOverride ? [...opts.roundDeckOverride] : buildRoundDeck(state, n);
  logEvent(state, 'game.setup', `Game set up for ${n} players`, {
    players: state.players.map((p) => ({ id: p.id, character: CHARACTER_INFO[p.character].name })),
    rounds: state.roundDeck.map((r) => r.id),
  });
  startRound(state, opts);
}

/** VERIFIED: 4 random round cards for the player-count bracket + 1 random train station card. */
export function buildRoundDeck(state: GameState, playerCount: number): RoundCard[] {
  const bracket = bracketFor(playerCount);
  const pool = shuffle(state, ROUND_CARDS.filter((r) => r.bracket === bracket));
  const station = shuffle(state, [...STATION_CARDS])[0]!;
  return [...pool.slice(0, NORMAL_ROUND_CARDS_PER_GAME), station];
}

export function turnOrder(state: GameState, turnType: TurnType): string[] {
  const n = state.players.length;
  const seats: number[] = [];
  for (let i = 0; i < n; i++) {
    const offset = turnType === 'switching' ? -i : i;
    seats.push((((state.firstPlayerSeat + offset) % n) + n) % n);
  }
  return seats.map((s) => state.players.find((p) => p.seat === s)!.id);
}

export function startRound(state: GameState, opts: EngineOptions): void {
  const round = currentRound(state);
  if (!round) throw new GameError('INTERNAL', 'No round card');
  transition(state, 'planning');
  for (const p of state.players) dealRoundHand(state, p);
  state.actionStack = [];
  state.execution = null;
  state.planning = { turnIndex: 0, order: turnOrder(state, round.turns[0]!), orderIndex: 0, stepsTaken: 0 };
  logEvent(state, 'round.started', `Round ${state.roundIndex + 1}: ${round.name}`, {
    roundCard: round.id,
    turns: round.turns,
    event: round.event,
  });
  skipStuckPlayers(state, opts);
}

export function stepsRequired(turnType: TurnType): number {
  return turnType === 'speedingUp' ? 2 : 1;
}

/** Called after a planning step (play or draw) by the active player. */
export function completePlanningStep(state: GameState, opts: EngineOptions): void {
  const pl = state.planning!;
  const round = currentRound(state)!;
  pl.stepsTaken++;
  if (pl.stepsTaken < stepsRequired(round.turns[pl.turnIndex]!)) return skipStuckPlayers(state, opts);
  pl.stepsTaken = 0;
  pl.orderIndex++;
  if (pl.orderIndex >= pl.order.length) {
    pl.turnIndex++;
    pl.orderIndex = 0;
    if (pl.turnIndex >= round.turns.length) {
      startExecution(state, opts);
      return;
    }
    pl.order = turnOrder(state, round.turns[pl.turnIndex]!);
  }
  skipStuckPlayers(state, opts);
}

/**
 * IMPLEMENTATION NOTE: a player with no action card in hand and an empty deck
 * cannot play nor draw and automatically passes this step.
 */
function skipStuckPlayers(state: GameState, opts: EngineOptions): void {
  if (state.phase !== 'planning' || !state.planning) return;
  const pid = state.planning.order[state.planning.orderIndex];
  if (!pid) return;
  const p = getPlayer(state, pid);
  if (!hasPlayableCard(p) && p.deck.length === 0) {
    logEvent(state, 'planning.passed', `${p.name} cannot play or draw and passes`, { playerId: p.id });
    completePlanningStep(state, opts);
  }
}

export function startExecution(state: GameState, opts: EngineOptions): void {
  transition(state, 'execution');
  state.planning = null;
  state.execution = { index: 0, pending: null };
  logEvent(state, 'execution.started', `Execution: ${state.actionStack.length} cards to resolve`);
  advanceExecution(state, opts);
}

/** Resolves cards in played order until a player decision is needed or the stack is done. */
export function advanceExecution(state: GameState, opts: EngineOptions): void {
  const ex = state.execution!;
  while (ex.index < state.actionStack.length && !ex.pending) {
    const played = state.actionStack[ex.index]!;
    const owner = getPlayer(state, played.playerId);
    played.faceUp = true;
    logEvent(state, 'execution.cardRevealed', `${owner.name}: ${played.card.action}`, {
      playerId: owner.id,
      action: played.card.action,
      index: ex.index,
    });
    const options = getActionOptions(state, played);
    if (options.length === 0) {
      logEvent(state, 'execution.noEffect', `${owner.name}'s ${played.card.action} has no legal effect`, {
        playerId: owner.id,
        action: played.card.action,
      });
      ex.index++;
    } else if (options.length === 1 && opts.autoResolveSingleOption) {
      resolveAction(state, played, options[0]!);
      ex.index++;
    } else {
      ex.pending = { playerId: owner.id, card: played.card, options };
      logEvent(state, 'execution.awaitingChoice', `Waiting for ${owner.name} to resolve ${played.card.action}`, {
        playerId: owner.id,
      });
    }
  }
  if (ex.index >= state.actionStack.length && !ex.pending) endRound(state, opts);
}

export function submitChoice(state: GameState, playerId: string, choice: ResolutionChoice, opts: EngineOptions): void {
  const ex = state.execution;
  if (!ex?.pending) throw new GameError('INVALID_PHASE', 'No decision pending');
  if (ex.pending.playerId !== playerId) throw new GameError('NOT_YOUR_TURN', 'Not your decision');
  const played = state.actionStack[ex.index]!;
  resolveAction(state, played, choice);
  ex.pending = null;
  ex.index++;
  advanceExecution(state, opts);
}

export function endRound(state: GameState, opts: EngineOptions): void {
  transition(state, 'roundEnd');
  const round = currentRound(state)!;
  applyRoundEvent(state, round);
  returnStackToOwners(state);
  state.execution = null;
  logEvent(state, 'round.ended', `Round ${state.roundIndex + 1} ends`);
  state.roundIndex++;
  if (state.roundIndex >= state.roundDeck.length) {
    endGame(state);
    return;
  }
  state.firstPlayerSeat = (state.firstPlayerSeat + 1) % state.players.length;
  startRound(state, opts);
}

export function endGame(state: GameState): void {
  transition(state, 'gameEnd');
  for (const p of state.players) {
    p.deck.push(...p.hand);
    p.hand = [];
  }
  const { scores, winnerIds } = computeScores(state);
  state.scores = scores;
  state.winnerIds = winnerIds;
  state.roundIndex = state.roundDeck.length - 1;
  const names = winnerIds.map((id) => getPlayer(state, id).name).join(', ');
  logEvent(state, 'game.ended', `Game over. Winner: ${names}`, { winnerIds, scores });
}

export type { PlayerState };
