import { describe, expect, it } from 'vitest';
import { GameEngine, RoundManager, applyRoundEvent } from '@colt/game-engine';
import { ROUND_CARDS, STATION_CARDS } from '@colt/game-rules';
import { byChar, cardCount, clearTrain, place, playRandomGame, round, startedEngine, startedState } from './helpers.js';

function firstAction(e: ReturnType<typeof startedEngine>, pid: string): string {
  return e.state.players.find((p) => p.id === pid)!.hand.find((c) => c.kind === 'action')!.id;
}

describe('round deck', () => {
  it.each([3, 4, 5, 6])('uses 4 bracket round cards + 1 station card (%i players)', (n) => {
    const s = startedState(n);
    expect(s.roundDeck).toHaveLength(5);
    const bracket = n <= 4 ? '2-4' : '5-6';
    expect(s.roundDeck.slice(0, 4).every((r) => r.kind === 'round' && r.bracket === bracket)).toBe(true);
    expect(new Set(s.roundDeck.slice(0, 4).map((r) => r.id)).size).toBe(4);
    expect(s.roundDeck[4]!.kind).toBe('station');
  });

  it('data sanity: 7 round cards per bracket, 3 station cards', () => {
    expect(ROUND_CARDS.filter((r) => r.bracket === '2-4')).toHaveLength(7);
    expect(ROUND_CARDS.filter((r) => r.bracket === '5-6')).toHaveLength(7);
    expect(STATION_CARDS).toHaveLength(3);
  });
});

describe('planning', () => {
  it('clockwise order from first player; switching is counter-clockwise', () => {
    const s = startedState(4);
    s.firstPlayerSeat = 1;
    expect(RoundManager.turnOrder(s, 'normal')).toEqual(['p2', 'p3', 'p4', 'p1']);
    expect(RoundManager.turnOrder(s, 'switching')).toEqual(['p2', 'p1', 'p4', 'p3']);
  });

  it('enforces turn order and progresses to execution after all turns', () => {
    const e = startedEngine(3, undefined, 3, { roundDeckOverride: [round(['normal', 'normal'])] });
    expect(e.activePlayerId()).toBe('p1');
    expect(() => e.playCard('p2', firstAction(e, 'p2'))).toThrow(/turn/);
    for (let t = 0; t < 2; t++) for (const pid of ['p1', 'p2', 'p3']) e.playCard(pid, firstAction(e, pid));
    // whole game (1 round) resolved or waiting for a choice
    expect(['execution', 'gameEnd']).toContain(e.phase);
  });

  it('drawing 3 cards consumes the turn', () => {
    const e = startedEngine(3, ['tuco', 'belle', 'cheyenne'], 3, { roundDeckOverride: [round(['normal', 'normal'])] });
    e.drawCards('p1');
    expect(e.state.players[0]!.hand).toHaveLength(9);
    expect(e.activePlayerId()).toBe('p2');
  });

  it('speeding up: each player takes two steps in a row', () => {
    const e = startedEngine(3, undefined, 3, { roundDeckOverride: [round(['speedingUp'])] });
    e.playCard('p1', firstAction(e, 'p1'));
    expect(e.activePlayerId()).toBe('p1');
    e.drawCards('p1');
    expect(e.activePlayerId()).toBe('p2');
  });

  it('player with only bullet cards and an empty deck auto-passes', () => {
    const e = startedEngine(3, undefined, 3, { roundDeckOverride: [round(['normal', 'normal'])] });
    const s = e.state;
    const p2 = s.players[1]!;
    p2.deck = [];
    p2.hand = [{ id: 'nb', kind: 'bullet', source: 'neutral', bullets: 0 }];
    const e2 = GameEngine.fromState(s);
    e2.playCard('p1', firstAction(e2, 'p1'));
    expect(e2.activePlayerId()).toBe('p3');
    expect(e2.state.log.some((l) => l.type === 'planning.passed')).toBe(true);
  });
});

describe('execution', () => {
  it('resolves cards in played order and waits for decisions', () => {
    const e = startedEngine(3, ['doc', 'tuco', 'belle'], 5, { roundDeckOverride: [round(['normal'])] });
    const s = e.state;
    // Force known hands
    for (const p of s.players) {
      p.deck.push(...p.hand);
      p.hand = p.deck.filter((c) => c.kind === 'action' && (c.action === 'move' || c.action === 'changeFloor'));
      p.deck = p.deck.filter((c) => !p.hand.includes(c));
    }
    const e2 = GameEngine.fromState(s);
    const moveOf = (pid: string) => e2.state.players.find((p) => p.id === pid)!.hand.find((c) => c.kind === 'action' && c.action === 'move')!.id;
    const climbOf = (pid: string) => e2.state.players.find((p) => p.id === pid)!.hand.find((c) => c.kind === 'action' && c.action === 'changeFloor')!.id;
    e2.playCard('p1', climbOf('p1')); // single option -> auto-resolved
    e2.playCard('p2', moveOf('p2')); // inside car 2 -> options car 1 or 3
    e2.playCard('p3', climbOf('p3'));
    expect(e2.phase).toBe('execution');
    const st = e2.state;
    expect(st.players[0]!.position.floor).toBe('roof');
    expect(st.execution!.pending!.playerId).toBe('p2');
    expect(() => e2.resolve('p1', { type: 'move', to: { car: 1, floor: 'inside' } })).toThrow(/Not your decision/);
    expect(() => e2.resolve('p2', { type: 'move', to: { car: 0, floor: 'inside' } })).toThrow(/Illegal/);
    e2.resolve('p2', { type: 'move', to: { car: 1, floor: 'inside' } });
    // p3 auto-resolves, round ends, game (1 round) ends
    expect(e2.phase).toBe('gameEnd');
    expect(e2.state.players[1]!.position).toEqual({ car: 1, floor: 'inside' });
  });
});

describe('round end & events', () => {
  it('cards return to decks and first player rotates', () => {
    const e = startedEngine(3, undefined, 11, { roundDeckOverride: [round(['normal']), round(['normal'])] });
    let guard = 0;
    while (e.state.roundIndex === 0 && guard++ < 50) {
      const a = e.activePlayerId()!;
      if (e.phase === 'planning') e.playCard(a, firstAction(e, a));
      else e.resolve(a, e.pendingOptions(a)[0]!);
    }
    const s = e.state;
    expect(s.phase).toBe('planning');
    expect(s.firstPlayerSeat).toBe(1);
    expect(e.activePlayerId()).toBe('p2');
    for (const p of s.players) expect(cardCount(p, s)).toBe(10 + p.deck.concat(p.hand).filter((c) => c.kind === 'bullet').length);
  });

  it('Angry Marshal: shoots roof bandits of his car then moves toward caboose', () => {
    const s = startedState(4);
    const [a, b, c] = s.players;
    place(a!, 0, 'roof');
    place(b!, 1, 'inside');
    place(c!, 2, 'roof');
    applyRoundEvent(s, round(['normal'], 'angryMarshal'));
    expect(a!.deck.filter((x) => x.kind === 'bullet')).toHaveLength(1);
    expect(s.marshalCar).toBe(1);
    expect(b!.position).toEqual({ car: 1, floor: 'roof' }); // marshal entered b's car
    expect(c!.deck.filter((x) => x.kind === 'bullet')).toHaveLength(0);
  });

  it('Swivel Arm and Braking move roof bandits', () => {
    const s = startedState(4);
    const [a, b, c] = s.players;
    place(a!, 1, 'roof');
    place(b!, 2, 'inside');
    place(c!, 0, 'roof');
    applyRoundEvent(s, round(['normal'], 'braking'));
    expect(a!.position.car).toBe(0);
    expect(c!.position.car).toBe(0);
    expect(b!.position.car).toBe(2);
    applyRoundEvent(s, round(['normal'], 'swivelArm'));
    expect(a!.position).toEqual({ car: 4, floor: 'roof' });
    expect(c!.position).toEqual({ car: 4, floor: 'roof' });
    expect(b!.position).toEqual({ car: 2, floor: 'inside' });
  });

  it("Take It All and Passengers' Rebellion", () => {
    const s = startedState(3);
    s.marshalCar = 2;
    for (const p of s.players) place(p, 1, 'inside');
    applyRoundEvent(s, round(['normal'], 'takeItAll'));
    expect(s.train[2]!.inside.some((l) => l.type === 'strongbox')).toBe(true);
    expect(s.spareStrongboxes).toHaveLength(0);
    applyRoundEvent(s, round(['normal'], 'passengersRebellion'));
    for (const p of s.players) expect(p.deck.filter((x) => x.kind === 'bullet')).toHaveLength(1);
    expect(s.neutralBullets).toBe(10);
  });

  it('Pickpocketing: only bandits alone on their space take a purse', () => {
    const s = startedState(3);
    clearTrain(s);
    const [a, b, c] = s.players;
    place(a!, 1, 'inside');
    place(b!, 2, 'inside');
    place(c!, 2, 'inside');
    s.train[1]!.inside.push({ id: 'x1', type: 'purse', value: 300 });
    s.train[2]!.inside.push({ id: 'x2', type: 'purse', value: 300 });
    applyRoundEvent(s, round(['normal'], 'pickpocketing'));
    expect(a!.loot.some((l) => l.id === 'x1')).toBe(true);
    expect(s.train[2]!.inside).toHaveLength(1);
  });

  it("Marshal's Revenge: roof bandits of Marshal car drop least valuable purse", () => {
    const s = startedState(3);
    clearTrain(s);
    const [a, b] = s.players;
    s.marshalCar = 1;
    place(a!, 1, 'roof');
    place(b!, 2, 'roof');
    a!.loot.push({ id: 'big', type: 'purse', value: 500 });
    applyRoundEvent(s, round(['normal'], 'marshalsRevenge'));
    expect(a!.loot.map((l) => l.id)).toEqual(['big']);
    expect(s.train[1]!.roof[0]!.value).toBe(250);
    expect(b!.loot).toHaveLength(1);
  });

  it('Hostage-Taking: each bandit in or on the locomotive gets $250', () => {
    const s = startedState(3);
    const [a, b, c] = s.players;
    place(a!, 0, 'roof');
    place(b!, 0, 'inside');
    place(c!, 1, 'roof');
    const reserve = s.reservePurses.length;
    applyRoundEvent(s, round(['normal'], 'hostageConductor'));
    expect(a!.loot).toHaveLength(2);
    expect(b!.loot).toHaveLength(2);
    expect(c!.loot).toHaveLength(1);
    expect(a!.loot[1]!.value).toBe(250);
    expect(s.reservePurses.length).toBeLessThan(reserve + 1);
  });
});

describe('full game simulation', () => {
  it.each([3, 4, 5, 6])('plays complete random games to the end with invariants (%i players)', (n) => {
    for (let seed = 1; seed <= 15; seed++) {
      const e = startedEngine(n, undefined, seed * 101 + n);
      playRandomGame(e, seed * 7 + n);
      const s = e.state;
      expect(s.phase).toBe('gameEnd');
      expect(s.scores).toHaveLength(n);
      expect(s.winnerIds.length).toBeGreaterThan(0);
      // card conservation: 10 action cards each, bullets fired = bullets received (+ neutrals)
      const neutralGiven = 13 - s.neutralBullets;
      const bulletCards = s.players.reduce((a, p) => a + p.deck.filter((c) => c.kind === 'bullet').length, 0);
      const fired = s.players.reduce((a, p) => a + (6 - p.bullets.length), 0);
      expect(bulletCards).toBe(fired + neutralGiven);
      for (const p of s.players) expect(p.deck.filter((c) => c.kind === 'action')).toHaveLength(10);
      // nobody ends inside the Marshal's car
      expect(s.players.some((p) => p.position.floor === 'inside' && p.position.car === s.marshalCar)).toBe(false);
    }
  });

  it('is deterministic for the same seed', () => {
    const a = startedEngine(5, undefined, 999);
    const b = startedEngine(5, undefined, 999);
    playRandomGame(a, 5);
    playRandomGame(b, 5);
    expect(a.state.scores).toEqual(b.state.scores);
  });
});

describe('purse placement', () => {
  it('cars receive purses + jewels per layout', () => {
    const s = startedState(6);
    const onTrain = s.train.slice(1).reduce((a, c) => a + c.inside.length, 0);
    expect(onTrain).toBeGreaterThan(0);
    expect(byChar(s, 'django').loot[0]!.value).toBe(250);
  });
});

