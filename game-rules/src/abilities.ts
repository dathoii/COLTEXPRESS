import type { CharacterId, PlayerState, TurnType } from '@colt/shared';

/**
 * Pure character-ability predicates (VERIFIED abilities, see RULES_SPEC.md §4).
 * Effects that mutate state live in game-engine/src/abilityManager.ts.
 */

/** Tuco: may shoot through the roof/floor of his own car. */
export function canShootThroughFloor(ch: CharacterId): boolean {
  return ch === 'tuco';
}

/** Django: target is pushed one car in the direction of the shot. */
export function pushesOnShoot(ch: CharacterId): boolean {
  return ch === 'django';
}

/** Cheyenne: takes the purse dropped by her punch victim. */
export function takesPunchedPurse(ch: CharacterId): boolean {
  return ch === 'cheyenne';
}

/** Ghost: may play his very first card of the round (turn 0, step 0) face down. */
export function mayPlayFaceDown(
  ch: CharacterId,
  turnIndex: number,
  turnType: TurnType,
  stepsTaken = 0,
): boolean {
  return ch === 'ghost' && turnIndex === 0 && stepsTaken === 0 && turnType !== 'tunnel';
}

/** Belle: cannot be targeted if another bandit can be targeted instead. */
export function applyBelleProtection<T extends Pick<PlayerState, 'character'>>(targets: T[]): T[] {
  if (targets.length > 1 && targets.some((t) => t.character === 'belle')) {
    return targets.filter((t) => t.character !== 'belle');
  }
  return targets;
}
