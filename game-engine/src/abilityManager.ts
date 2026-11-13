import type { GameState, Loot, PlayerState, Position } from '@colt/shared';
import { directionBetween, isValidCar, pushesOnShoot, stepCar, takesPunchedPurse } from '@colt/game-rules';
import { logEvent } from './events.js';
import { addLoot, moveBandit } from './playerManager.js';

/**
 * Character Ability Manager: state-changing parts of character abilities.
 * Pure predicates (Tuco, Ghost, Belle, Doc hand size) live in game-rules.
 */

/** Django: after a hit, push target one car in the direction of the shot (same floor). */
export function applyShootAbility(state: GameState, shooter: PlayerState, target: PlayerState, shooterPos: Position): void {
  if (!pushesOnShoot(shooter.character)) return;
  const dir = directionBetween(shooterPos.car, target.position.car);
  if (!dir) return; // same-car shot: no direction
  const to = stepCar(target.position.car, dir);
  if (!isValidCar(state, to)) {
    logEvent(state, 'ability.used', `Django's shot cannot push ${target.name} beyond the end of the train`, {
      ability: 'django',
      targetId: target.id,
    });
    return;
  }
  const fromPos = { ...target.position };
  const toPos = { car: to, floor: target.position.floor };
  moveBandit(state, target, toPos);
  logEvent(state, 'ability.used', `Django's shot pushes ${target.name} to car ${to}`, {
    ability: 'django',
    targetId: target.id,
    from: fromPos,
    to: toPos,
    toCar: to,
  });
}

/**
 * Cheyenne: takes the purse her victim drops.
 * Returns true if the loot was taken (so it must not be dropped on the floor).
 */
export function applyPunchLootAbility(state: GameState, puncher: PlayerState, dropped: Loot): boolean {
  if (!takesPunchedPurse(puncher.character) || dropped.type !== 'purse') return false;
  addLoot(puncher, dropped);
  logEvent(state, 'ability.used', `Cheyenne takes the dropped purse`, { ability: 'cheyenne', lootId: dropped.id });
  return true;
}
