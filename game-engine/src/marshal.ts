import type { GameState, PlayerState } from '@colt/shared';
import { logEvent } from './events.js';

/**
 * Marshal presence rule (VERIFIED): a bandit inside the Marshal's car receives a
 * neutral bullet card and immediately flees to the roof of that car.
 * Called after every bandit movement and every Marshal movement.
 */
export function enforceMarshal(state: GameState): void {
  for (const p of state.players) {
    if (p.position.floor === 'inside' && p.position.car === state.marshalCar) {
      giveNeutralBullet(state, p, 'marshal');
      p.position = { car: p.position.car, floor: 'roof' };
      logEvent(state, 'marshal.hit', `${p.name} is shot by the Marshal and flees to the roof`, {
        playerId: p.id,
        car: p.position.car,
        flee: true,
      });
    }
  }
}

/**
 * Gives a neutral bullet card. IMPLEMENTATION NOTE (UNVERIFIED): if the 13 neutral
 * bullets are exhausted no card is given, but the movement effects still apply.
 */
export function giveNeutralBullet(state: GameState, p: PlayerState, reason: string): boolean {
  if (state.neutralBullets <= 0) return false;
  state.neutralBullets--;
  p.deck.push({ id: `neutral-${13 - state.neutralBullets}`, kind: 'bullet', source: 'neutral', bullets: 0 });
  logEvent(state, 'marshal.hit', `${p.name} receives a neutral bullet (${reason})`, {
    playerId: p.id,
    reason,
    car: state.marshalCar,
    bulletOnly: true,
  });
  return true;
}
