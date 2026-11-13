import { GameError, type GamePhase, type GameState } from '@colt/shared';
import { logEvent } from './events.js';

/** Allowed phase transitions. */
export const TRANSITIONS: Record<GamePhase, readonly GamePhase[]> = {
  lobby: ['setup'],
  setup: ['planning'],
  planning: ['execution'],
  execution: ['roundEnd'],
  roundEnd: ['planning', 'gameEnd'],
  gameEnd: [],
};

export function canTransition(from: GamePhase, to: GamePhase): boolean {
  return TRANSITIONS[from].includes(to);
}

export function transition(state: GameState, to: GamePhase): void {
  if (!canTransition(state.phase, to)) {
    throw new GameError('INVALID_PHASE', `Illegal phase transition ${state.phase} -> ${to}`);
  }
  const from = state.phase;
  state.phase = to;
  logEvent(state, 'phase.changed', `Phase: ${from} → ${to}`, { from, to });
}

export function assertPhase(state: GameState, ...phases: GamePhase[]): void {
  if (!phases.includes(state.phase)) {
    throw new GameError('INVALID_PHASE', `Action not allowed in phase "${state.phase}"`);
  }
}
