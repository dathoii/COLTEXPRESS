import type { GameState, GameView, Loot, LootView, PlayerState, PlayerView } from '@colt/shared';
import { TOTAL_ROUNDS } from '@colt/game-rules';
import { bulletsReceived } from './playerManager.js';
import { currentRound } from './roundManager.js';

/**
 * Builds the redacted view sent to one client. Hidden information:
 *  - other players' hands and decks (counts only)
 *  - face-down cards on the action stack until revealed
 *  - purse values (face down) except the viewer's own purses and at game end
 */
export function toView(state: GameState, viewerId: string | null): GameView {
  const ended = state.phase === 'gameEnd';
  const hideLoot = (l: Loot): LootView => ({ id: l.id, type: l.type, value: l.type === 'purse' && !ended ? null : l.value });
  const showLoot = (l: Loot): LootView => ({ id: l.id, type: l.type, value: l.value });

  const player = (p: PlayerState): PlayerView => {
    const self = p.id === viewerId;
    return {
      id: p.id,
      name: p.name,
      character: p.character,
      seat: p.seat,
      position: { ...p.position },
      handCount: p.hand.length,
      deckCount: p.deck.length,
      bulletsLeft: p.bullets.length,
      ...(self || ended ? { bulletsReceived: bulletsReceived(p) } : {}),
      loot: p.loot.map(self || ended ? showLoot : hideLoot),
      connected: p.connected,
      ...(p.isBot ? { isBot: true, botDifficulty: p.botDifficulty ?? 'normal' } : {}),
      ...(self ? { hand: p.hand.map((c) => ({ ...c })) } : {}),
    };
  };

  const pending = state.execution?.pending;
  return {
    id: state.id,
    phase: state.phase,
    lobby: state.lobby.map((l) => ({ ...l })),
    hostId: state.hostId,
    viewerId,
    players: state.players.map(player),
    train: state.train.map((c) => ({ index: c.index, isLocomotive: c.isLocomotive, inside: c.inside.map(hideLoot), roof: c.roof.map(hideLoot) })),
    marshalCar: state.marshalCar,
    roundIndex: state.roundIndex,
    totalRounds: state.roundDeck.length || TOTAL_ROUNDS,
    currentRound: currentRound(state),
    firstPlayerSeat: state.firstPlayerSeat,
    planning: state.planning ? { ...state.planning, order: [...state.planning.order] } : null,
    actionStack: state.actionStack.map((pc) => ({
      playerId: pc.playerId,
      faceUp: pc.faceUp,
      card: pc.faceUp || pc.playerId === viewerId ? { ...pc.card } : null,
    })),
    execution: state.execution
      ? {
          index: state.execution.index,
          // Options are only meaningful to the deciding player.
          pending: pending ? { ...pending, options: pending.playerId === viewerId ? pending.options : [] } : null,
        }
      : null,
    neutralBullets: state.neutralBullets,
    scores: state.scores,
    winnerIds: [...state.winnerIds],
    log: state.log.slice(-60),
    version: state.version,
  };
}
