import type { GameEvent, GameState } from '@colt/shared';

/** Domain event types emitted by the engine. */
export type EngineEventType =
  | 'phase.changed'
  | 'lobby.playerJoined'
  | 'lobby.playerLeft'
  | 'lobby.characterSelected'
  | 'lobby.rematch'
  | 'game.setup'
  | 'round.started'
  | 'round.event'
  | 'round.ended'
  | 'planning.cardPlayed'
  | 'planning.cardsDrawn'
  | 'planning.passed'
  | 'execution.started'
  | 'execution.cardRevealed'
  | 'execution.noEffect'
  | 'execution.awaitingChoice'
  | 'action.moved'
  | 'action.changedFloor'
  | 'action.robbed'
  | 'action.shot'
  | 'action.punched'
  | 'action.marshalMoved'
  | 'marshal.hit'
  | 'ability.used'
  | 'loot.dropped'
  | 'game.ended';

export type EventHandler = (event: GameEvent) => void;

/** Minimal typed pub/sub so engine modules and hosts communicate without UI coupling. */
export class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();

  on(type: EngineEventType | '*', handler: EventHandler): () => void {
    let set = this.handlers.get(type);
    if (!set) this.handlers.set(type, (set = new Set()));
    set.add(handler);
    return () => set!.delete(handler);
  }

  emit(event: GameEvent): void {
    for (const key of [event.type, '*']) {
      const set = this.handlers.get(key);
      if (!set) continue;
      for (const h of set) {
        try {
          h(event);
        } catch {
          // Handlers must never break the engine.
        }
      }
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}

export const MAX_LOG = 500;

/** Append an event to the state log (state is the single source of truth). */
export function logEvent(
  state: GameState,
  type: EngineEventType,
  message: string,
  data?: Record<string, unknown>,
): GameEvent {
  const ev: GameEvent = { seq: ++state.eventSeq, type, round: state.roundIndex + 1, message, data };
  state.log.push(ev);
  if (state.log.length > MAX_LOG) state.log.splice(0, state.log.length - MAX_LOG);
  return ev;
}
