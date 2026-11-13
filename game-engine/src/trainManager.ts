import type { GameState, Loot, LootType, Position, TrainCar } from '@colt/shared';
import { GameError } from '@colt/shared';
import {
  CAR_LAYOUTS,
  JEWEL_COUNT,
  JEWEL_VALUE,
  PURSE_VALUES,
  STARTING_PURSE_VALUE,
  STRONGBOX_COUNT,
  STRONGBOX_VALUE,
  isValidCar,
} from '@colt/game-rules';
import { randomInt, shuffle } from './rng.js';
import { logEvent } from './events.js';
import { enforceMarshal } from './marshal.js';

/** Train Manager: locomotive, cars, floors, loot placement, Marshal. */

export interface LootPools {
  purses: Loot[];
  jewels: Loot[];
  strongboxes: Loot[];
}

export function createLootPools(): LootPools {
  return {
    purses: PURSE_VALUES.map((value, i) => ({ id: `purse-${i + 1}`, type: 'purse' as const, value })),
    jewels: Array.from({ length: JEWEL_COUNT }, (_, i) => ({ id: `jewel-${i + 1}`, type: 'jewel' as const, value: JEWEL_VALUE })),
    strongboxes: Array.from({ length: STRONGBOX_COUNT }, (_, i) => ({
      id: `strongbox-${i + 1}`,
      type: 'strongbox' as const,
      value: STRONGBOX_VALUE,
    })),
  };
}

/** Removes one $250 purse from the pool for a bandit's starting loot. */
export function takeStartingPurse(pools: LootPools): Loot {
  const idx = pools.purses.findIndex((p) => p.value === STARTING_PURSE_VALUE);
  if (idx < 0) throw new GameError('INTERNAL', 'No $250 purse left for starting loot');
  return pools.purses.splice(idx, 1)[0]!;
}

/** Builds locomotive + one car per player and places loot. Marshal + strongbox start in locomotive. */
export function buildTrain(state: GameState, playerCount: number, pools: LootPools): void {
  shuffle(state, pools.purses);
  const layouts = shuffle(state, [...CAR_LAYOUTS]).slice(0, playerCount);
  const train: TrainCar[] = [{ index: 0, isLocomotive: true, inside: [pools.strongboxes.shift()!], roof: [] }];
  layouts.forEach((layout, i) => {
    const car: TrainCar = { index: i + 1, isLocomotive: false, inside: [], roof: [] };
    for (let k = 0; k < layout.purses && pools.purses.length; k++) car.inside.push(pools.purses.shift()!);
    for (let k = 0; k < layout.jewels && pools.jewels.length; k++) car.inside.push(pools.jewels.shift()!);
    train.push(car);
  });
  state.train = train;
  state.marshalCar = 0;
  state.reservePurses = pools.purses;
  state.spareStrongboxes = pools.strongboxes;
}

export function lootListAt(state: GameState, pos: Position): Loot[] {
  const car = state.train[pos.car];
  if (!car) throw new GameError('INTERNAL', `Invalid car ${pos.car}`);
  return pos.floor === 'inside' ? car.inside : car.roof;
}

/**
 * Removes one loot of the given type from a position. Purses are face down,
 * so the specific purse is picked at random among purses there.
 */
export function takeLootAt(state: GameState, pos: Position, type: LootType): Loot | null {
  const list = lootListAt(state, pos);
  const candidates = list.map((l, i) => ({ l, i })).filter((x) => x.l.type === type);
  if (candidates.length === 0) return null;
  const pick = type === 'purse' ? candidates[randomInt(state, candidates.length)]! : candidates[0]!;
  list.splice(pick.i, 1);
  return pick.l;
}

export function dropLootAt(state: GameState, pos: Position, loot: Loot): void {
  lootListAt(state, pos).push(loot);
}

export function moveMarshal(state: GameState, toCar: number): void {
  if (!isValidCar(state, toCar)) throw new GameError('INVALID_CHOICE', `Marshal cannot move to car ${toCar}`);
  const from = state.marshalCar;
  state.marshalCar = toCar;
  logEvent(state, 'action.marshalMoved', `Marshal moves from car ${from} to car ${toCar}`, { from, to: toCar });
  enforceMarshal(state);
}
