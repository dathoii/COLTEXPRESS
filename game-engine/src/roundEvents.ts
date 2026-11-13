import type { GameState, PlayerState, RoundCard } from '@colt/shared';
import { HOSTAGE_RANSOM, banditsAt, lastCarIndex } from '@colt/game-rules';
import { logEvent } from './events.js';
import { giveNeutralBullet } from './marshal.js';
import { addLoot } from './playerManager.js';
import { dropLootAt, moveMarshal, takeLootAt } from './trainManager.js';

/** Round-card and station-card events, resolved at the end of the round (VERIFIED). */
export function applyRoundEvent(state: GameState, card: RoundCard): void {
  const roofOf = (car: number) => state.players.filter((p) => p.position.floor === 'roof' && p.position.car === car);
  const onRoof = () => state.players.filter((p) => p.position.floor === 'roof');
  const log = (msg: string, data?: Record<string, unknown>) => logEvent(state, 'round.event', msg, { event: card.event, ...data });

  switch (card.event) {
    case 'none':
      return;
    case 'angryMarshal': {
      const fromCar = state.marshalCar;
      const roofTargets = roofOf(fromCar);
      for (const p of roofTargets) giveNeutralBullet(state, p, 'Angry Marshal');
      log('Angry Marshal: shoots bandits on his roof', {
        car: fromCar,
        shots: roofTargets.map((p) => p.id),
      });
      if (state.marshalCar < lastCarIndex(state)) moveMarshal(state, state.marshalCar + 1);
      return;
    }
    case 'swivelArm': {
      const last = lastCarIndex(state);
      const moves: Array<{ playerId: string; from: { car: number; floor: 'roof' }; to: { car: number; floor: 'roof' } }> = [];
      for (const p of onRoof()) {
        const from = { car: p.position.car, floor: 'roof' as const };
        const to = { car: last, floor: 'roof' as const };
        p.position = to;
        moves.push({ playerId: p.id, from, to });
      }
      log('Swivel Arm: all roof bandits are swept to the caboose roof', { moves, targetCar: last });
      return;
    }
    case 'braking': {
      const moves: Array<{ playerId: string; from: { car: number; floor: 'roof' }; to: { car: number; floor: 'roof' } }> = [];
      for (const p of onRoof()) {
        if (p.position.car > 0) {
          const from = { car: p.position.car, floor: 'roof' as const };
          const to = { car: p.position.car - 1, floor: 'roof' as const };
          p.position = to;
          moves.push({ playerId: p.id, from, to });
        }
      }
      log('Braking: roof bandits move one car toward the locomotive', { moves });
      return;
    }
    case 'takeItAll': {
      const box = state.spareStrongboxes.shift();
      const targetCar = state.marshalCar;
      if (box) dropLootAt(state, { car: targetCar, floor: 'inside' }, box);
      log(`Take It All!: second strongbox placed in car ${targetCar}`, { placed: !!box, car: targetCar });
      return;
    }
    case 'passengersRebellion': {
      const affected = state.players.filter((x) => x.position.floor === 'inside');
      for (const p of affected) giveNeutralBullet(state, p, "Passengers' Rebellion");
      log("Passengers' Rebellion: every bandit inside receives a neutral bullet", {
        affectedIds: affected.map((p) => p.id),
        positions: affected.map((p) => ({ playerId: p.id, pos: { ...p.position } })),
      });
      return;
    }
    case 'pickpocketing': {
      const gains: Array<{ playerId: string; pos: { car: number; floor: 'inside' | 'roof' } }> = [];
      for (const p of state.players) {
        if (banditsAt(state, p.position, p.id).length > 0) continue;
        const purse = takeLootAt(state, p.position, 'purse');
        if (purse) {
          const pos = { ...p.position };
          addLoot(p, purse);
          gains.push({ playerId: p.id, pos });
          log(`Pickpocketing: ${p.name} takes a purse`, { playerId: p.id, pos });
        }
      }
      if (gains.length === 0) log('Pickpocketing: no lone bandit could grab a purse', { gains: [] });
      return;
    }
    case 'marshalsRevenge': {
      const targetCar = state.marshalCar;
      const drops: Array<{ playerId: string; pos: { car: number; floor: 'roof' } }> = [];
      for (const p of roofOf(targetCar)) {
        const hadPurse = p.loot.some((l) => l.type === 'purse');
        dropLeastValuablePurse(state, p);
        if (hadPurse) drops.push({ playerId: p.id, pos: { car: targetCar, floor: 'roof' } });
      }
      log("Marshal's Revenge: bandits on the Marshal's roof drop their least valuable purse", { car: targetCar, drops });
      return;
    }
    case 'hostageConductor': {
      const gains: Array<{ playerId: string; pos: { car: number; floor: 'inside' | 'roof' } }> = [];
      for (const p of state.players.filter((x) => x.position.car === 0)) {
        const pos = { ...p.position };
        addLoot(p, takeRansomPurse(state));
        gains.push({ playerId: p.id, pos });
        log(`Hostage-Taking: ${p.name} collects a $${HOSTAGE_RANSOM} ransom`, { playerId: p.id, pos });
      }
      if (gains.length === 0) log('Hostage-Taking: no bandit in the locomotive', { gains: [] });
      return;
    }
  }
}

function dropLeastValuablePurse(state: GameState, p: PlayerState): void {
  const purses = p.loot.filter((l) => l.type === 'purse');
  if (purses.length === 0) return;
  const least = purses.reduce((a, b) => (b.value < a.value ? b : a));
  p.loot.splice(p.loot.indexOf(least), 1);
  dropLootAt(state, p.position, least);
}

/**
 * IMPLEMENTATION NOTE: ransom uses a $250 purse from the reserve; if none remains,
 * a virtual $250 purse token is created (physical-supply limit UNVERIFIED).
 */
function takeRansomPurse(state: GameState) {
  const idx = state.reservePurses.findIndex((x) => x.value === HOSTAGE_RANSOM);
  if (idx >= 0) return state.reservePurses.splice(idx, 1)[0]!;
  return { id: `ransom-${state.eventSeq}`, type: 'purse' as const, value: HOSTAGE_RANSOM };
}
