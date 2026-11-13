import { describe, expect, it } from 'vitest';
import { PlayerManager, TrainManager, enforceMarshal } from '@colt/game-engine';
import { JEWEL_COUNT, PURSE_VALUES, STRONGBOX_COUNT, isValidCar, lastCarIndex } from '@colt/game-rules';
import { byChar, place, startedState, totalLootCount } from './helpers.js';

describe('player setup', () => {
  it.each([3, 4, 5, 6])('sets up %i players correctly', (n) => {
    const s = startedState(n);
    expect(s.players).toHaveLength(n);
    expect(s.train).toHaveLength(n + 1);
    const last = lastCarIndex(s);
    for (const p of s.players) {
      // odd players (seat 0,2,4) in caboose, even in the car before
      expect(p.position).toEqual({ car: p.seat % 2 === 0 ? last : last - 1, floor: 'inside' });
      expect(p.loot).toHaveLength(1);
      expect(p.loot[0]).toMatchObject({ type: 'purse', value: 250 });
      expect(p.bullets).toHaveLength(6);
      expect(p.hand.length + p.deck.length).toBe(10);
      expect(p.hand.length).toBe(p.character === 'doc' ? 7 : 6);
    }
  });

  it('getPlayer throws for unknown id', () => {
    const s = startedState(3);
    expect(() => PlayerManager.getPlayer(s, 'nobody')).toThrow(/not found/);
    expect(PlayerManager.findPlayer(s, 'nobody')).toBeUndefined();
  });

  it('removeLootOfType returns null when bandit lacks that loot', () => {
    const s = startedState(3);
    const p = s.players[0]!;
    expect(PlayerManager.removeLootOfType(s, p, 'jewel')).toBeNull();
    expect(PlayerManager.removeLootOfType(s, p, 'purse')?.type).toBe('purse');
    expect(p.loot).toHaveLength(0);
  });
});

describe('train', () => {
  it('locomotive holds strongbox and Marshal; second strongbox is set aside', () => {
    const s = startedState(4);
    expect(s.train[0]!.isLocomotive).toBe(true);
    expect(s.train[0]!.inside.map((l) => l.type)).toEqual(['strongbox']);
    expect(s.marshalCar).toBe(0);
    expect(s.spareStrongboxes).toHaveLength(1);
  });

  it.each([3, 4, 5, 6])('conserves all loot components (%i players)', (n) => {
    const s = startedState(n);
    expect(totalLootCount(s)).toBe(PURSE_VALUES.length + STRONGBOX_COUNT + (JEWEL_COUNT - countUnusedJewels(s)));
  });

  it('validates car indices', () => {
    const s = startedState(3);
    expect(isValidCar(s, -1)).toBe(false);
    expect(isValidCar(s, 0)).toBe(true);
    expect(isValidCar(s, 3)).toBe(true);
    expect(isValidCar(s, 4)).toBe(false);
    expect(() => TrainManager.moveMarshal(s, 9)).toThrow();
  });

  it('takeLootAt / dropLootAt move loot between floor and bandits', () => {
    const s = startedState(3);
    const purse = { id: 'tp', type: 'purse' as const, value: 400 };
    TrainManager.dropLootAt(s, { car: 2, floor: 'roof' }, purse);
    expect(TrainManager.takeLootAt(s, { car: 2, floor: 'roof' }, 'jewel')).toBeNull();
    expect(TrainManager.takeLootAt(s, { car: 2, floor: 'roof' }, 'purse')).toEqual(purse);
    expect(s.train[2]!.roof).toHaveLength(0);
  });

  it('Marshal moving into a car hits every bandit inside and sends them to the roof', () => {
    const s = startedState(4);
    const [a, b, c] = s.players;
    place(a!, 1, 'inside');
    place(b!, 1, 'inside');
    place(c!, 1, 'roof');
    TrainManager.moveMarshal(s, 1);
    expect(a!.position).toEqual({ car: 1, floor: 'roof' });
    expect(b!.position).toEqual({ car: 1, floor: 'roof' });
    expect(a!.deck.some((x) => x.kind === 'bullet' && x.source === 'neutral')).toBe(true);
    expect(c!.deck.some((x) => x.kind === 'bullet')).toBe(false);
    expect(s.neutralBullets).toBe(11);
  });

  it('bandit entering the Marshal car is hit; no neutral card once supply is empty', () => {
    const s = startedState(3);
    const d = byChar(s, 'django');
    s.neutralBullets = 0;
    PlayerManager.moveBandit(s, d, { car: 0, floor: 'inside' });
    expect(d.position).toEqual({ car: 0, floor: 'roof' });
    expect(d.deck.some((x) => x.kind === 'bullet')).toBe(false);
    enforceMarshal(s); // idempotent
    expect(d.position.floor).toBe('roof');
  });
});

function countUnusedJewels(s: ReturnType<typeof startedState>): number {
  const placed = s.train.reduce((a, c) => a + c.inside.filter((l) => l.type === 'jewel').length, 0);
  return JEWEL_COUNT - placed;
}
