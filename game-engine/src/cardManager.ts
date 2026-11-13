import type { ActionCard, BulletCard, CharacterId, GameState, PlayedCard, PlayerState } from '@colt/shared';
import { GameError } from '@colt/shared';
import { ACTION_DECK_COMPOSITION, BULLETS_PER_BANDIT, DRAW_AMOUNT, handSizeFor } from '@colt/game-rules';
import { shuffle } from './rng.js';
import { logEvent } from './events.js';

/** Card Manager: decks, draw, play, action stack, face-up/face-down, shuffle, deal. */

export function buildActionDeck(owner: CharacterId): ActionCard[] {
  const cards: ActionCard[] = [];
  for (const [action, count] of ACTION_DECK_COMPOSITION) {
    for (let i = 1; i <= count; i++) cards.push({ id: `${owner}-${action}-${i}`, kind: 'action', action, owner });
  }
  return cards;
}

/** Bullet stack: the top card (last element) is given first. */
export function buildBulletStack(owner: CharacterId): BulletCard[] {
  return Array.from({ length: BULLETS_PER_BANDIT }, (_, i) => ({
    id: `${owner}-bullet-${i + 1}`,
    kind: 'bullet' as const,
    source: owner,
    bullets: i + 1,
  }));
}

/** Gathers hand + deck into deck, shuffles, then deals the hand (6, or 7 for Doc). */
export function dealRoundHand(state: GameState, p: PlayerState): void {
  p.deck.push(...p.hand);
  p.hand = [];
  shuffle(state, p.deck);
  drawInto(p, handSizeFor(p.character));
}

export function drawInto(p: PlayerState, n: number): number {
  const drawn = p.deck.splice(0, Math.min(n, p.deck.length));
  p.hand.push(...drawn);
  return drawn.length;
}

export function drawThree(state: GameState, p: PlayerState): number {
  if (p.deck.length === 0) throw new GameError('INVALID_CARD', 'Your deck is empty');
  const n = drawInto(p, DRAW_AMOUNT);
  logEvent(state, 'planning.cardsDrawn', `${p.name} draws ${n} card(s)`, { playerId: p.id, count: n });
  return n;
}

export function playToStack(state: GameState, p: PlayerState, cardId: string, faceUp: boolean): PlayedCard {
  const idx = p.hand.findIndex((c) => c.id === cardId);
  if (idx < 0) throw new GameError('INVALID_CARD', 'Card is not in your hand');
  const card = p.hand[idx]!;
  if (card.kind !== 'action') throw new GameError('INVALID_CARD', 'Bullet cards cannot be played');
  p.hand.splice(idx, 1);
  const played: PlayedCard = { card, playerId: p.id, faceUp };
  state.actionStack.push(played);
  logEvent(
    state,
    'planning.cardPlayed',
    faceUp ? `${p.name} plays ${card.action}` : `${p.name} plays a card face down`,
    faceUp ? { playerId: p.id, action: card.action } : { playerId: p.id },
  );
  return played;
}

/** Shooter gives his top bullet card; it goes into the victim's deck. */
export function transferBullet(shooter: PlayerState, target: PlayerState): BulletCard | null {
  const b = shooter.bullets.pop();
  if (!b) return null;
  target.deck.push(b);
  return b;
}

/** End of round: played cards return to their owner's deck. */
export function returnStackToOwners(state: GameState): void {
  for (const pc of state.actionStack) {
    const owner = state.players.find((p) => p.id === pc.playerId);
    owner?.deck.push(pc.card);
  }
  state.actionStack = [];
}
