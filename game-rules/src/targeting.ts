import type { CharacterId, Direction, GameState, LootType, PlayerState, Position, ResolutionChoice } from '@colt/shared';
import { ROOF_MAX_MOVE } from './data.js';
import { applyBelleProtection, canShootThroughFloor } from './abilities.js';

/** Pure rule queries: who can do what. No state mutation here. */

export function samePosition(a: Position, b: Position): boolean {
  return a.car === b.car && a.floor === b.floor;
}

export function lastCarIndex(state: Pick<GameState, 'train'>): number {
  return state.train.length - 1;
}

export function isValidCar(state: Pick<GameState, 'train'>, car: number): boolean {
  return Number.isInteger(car) && car >= 0 && car <= lastCarIndex(state);
}

export function banditsAt(state: GameState, pos: Position, excludeId?: string): PlayerState[] {
  return state.players.filter((p) => p.id !== excludeId && samePosition(p.position, pos));
}

export function directionBetween(fromCar: number, toCar: number): Direction | null {
  if (toCar < fromCar) return 'front';
  if (toCar > fromCar) return 'back';
  return null;
}

export function stepCar(car: number, dir: Direction): number {
  return dir === 'front' ? car - 1 : car + 1;
}

export function lootTypesAt(state: GameState, pos: Position): LootType[] {
  const car = state.train[pos.car];
  if (!car) return [];
  const list = pos.floor === 'inside' ? car.inside : car.roof;
  return unique(list.map((l) => l.type));
}

export function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

/** Move: inside = 1 adjacent car; roof = 1..3 cars in one direction. */
export function moveOptions(state: GameState, player: PlayerState): ResolutionChoice[] {
  const { car, floor } = player.position;
  const max = floor === 'roof' ? ROOF_MAX_MOVE : 1;
  const out: ResolutionChoice[] = [];
  for (const dir of ['front', 'back'] as Direction[]) {
    let c = car;
    for (let i = 1; i <= max; i++) {
      c = stepCar(c, dir);
      if (!isValidCar(state, c)) break;
      out.push({ type: 'move', to: { car: c, floor } });
    }
  }
  return out;
}

export function changeFloorOptions(_state: GameState, player: PlayerState): ResolutionChoice[] {
  const { car, floor } = player.position;
  return [{ type: 'changeFloor', to: { car, floor: floor === 'inside' ? 'roof' : 'inside' } }];
}

export function marshalOptions(state: GameState): ResolutionChoice[] {
  const out: ResolutionChoice[] = [];
  for (const c of [state.marshalCar - 1, state.marshalCar + 1]) {
    if (isValidCar(state, c)) out.push({ type: 'marshal', toCar: c });
  }
  return out;
}

export function robOptions(state: GameState, player: PlayerState): ResolutionChoice[] {
  return lootTypesAt(state, player.position).map((lootType) => ({ type: 'rob', lootType }));
}

/** Raw shooting targets before Belle protection. */
export function rawShootTargets(state: GameState, shooter: PlayerState): PlayerState[] {
  const { car, floor } = shooter.position;
  const targets: PlayerState[] = [];
  if (floor === 'inside') {
    for (const c of [car - 1, car + 1]) {
      if (isValidCar(state, c)) targets.push(...banditsAt(state, { car: c, floor: 'inside' }, shooter.id));
    }
  } else {
    // Roof: line of sight, first car in each direction that holds at least one bandit.
    for (const dir of ['front', 'back'] as Direction[]) {
      let c = stepCar(car, dir);
      while (isValidCar(state, c)) {
        const found = banditsAt(state, { car: c, floor: 'roof' }, shooter.id);
        if (found.length > 0) {
          targets.push(...found);
          break;
        }
        c = stepCar(c, dir);
      }
    }
  }
  if (canShootThroughFloor(shooter.character)) {
    const other: Position = { car, floor: floor === 'inside' ? 'roof' : 'inside' };
    targets.push(...banditsAt(state, other, shooter.id));
  }
  return targets;
}

export function shootOptions(state: GameState, shooter: PlayerState): ResolutionChoice[] {
  if (shooter.bullets.length === 0) return [];
  const targets = applyBelleProtection(rawShootTargets(state, shooter));
  return targets.map((t) => ({ type: 'shoot', targetId: t.id }));
}

export function punchTargets(state: GameState, puncher: PlayerState): PlayerState[] {
  return applyBelleProtection(banditsAt(state, puncher.position, puncher.id));
}

/** Punch: choose target, the loot type he drops (if any) and the car he is knocked to. */
export function punchOptions(state: GameState, puncher: PlayerState): ResolutionChoice[] {
  const out: ResolutionChoice[] = [];
  for (const target of punchTargets(state, puncher)) {
    const lootChoices: (LootType | null)[] = target.loot.length ? unique(target.loot.map((l) => l.type)) : [null];
    const dests: (Position | null)[] = [];
    for (const c of [target.position.car - 1, target.position.car + 1]) {
      if (isValidCar(state, c)) dests.push({ car: c, floor: target.position.floor });
    }
    if (dests.length === 0) dests.push(null);
    for (const lootType of lootChoices) {
      for (const to of dests) out.push({ type: 'punch', targetId: target.id, lootType, to });
    }
  }
  return out;
}

export function playerByCharacter(state: GameState, ch: CharacterId): PlayerState | undefined {
  return state.players.find((p) => p.character === ch);
}

export function choiceEquals(a: ResolutionChoice, b: ResolutionChoice): boolean {
  return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));
}

function normalize(c: ResolutionChoice): unknown {
  switch (c.type) {
    case 'move':
    case 'changeFloor':
      return [c.type, c.to.car, c.to.floor];
    case 'marshal':
      return [c.type, c.toCar];
    case 'rob':
      return [c.type, c.lootType];
    case 'shoot':
      return [c.type, c.targetId];
    case 'punch':
      return [c.type, c.targetId, c.lootType ?? null, c.to ? [c.to.car, c.to.floor] : null];
  }
}
