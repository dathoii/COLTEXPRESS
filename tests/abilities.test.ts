import { describe, expect, it } from 'vitest';
import { ActionManager } from '@colt/game-engine';
import { punchOptions, shootOptions } from '@colt/game-rules';
import { byChar, clearTrain, place, played, round, startedEngine, startedState } from './helpers.js';

const ALL6 = ['django', 'tuco', 'doc', 'cheyenne', 'ghost', 'belle'] as const;
function setup() {
  const s = startedState(6, [...ALL6]);
  clearTrain(s);
  s.marshalCar = 0;
  for (const p of s.players) place(p, 6, 'inside'); // park everyone in caboose
  return s;
}

describe('Django', () => {
  it('pushes the target one car in the direction of the shot', () => {
    const s = setup();
    const dj = byChar(s, 'django');
    const doc = byChar(s, 'doc');
    for (const p of s.players) if (p !== dj && p !== doc) place(p, 6, 'roof');
    place(dj, 2, 'inside');
    place(doc, 3, 'inside');
    ActionManager.resolveAction(s, played(dj, 'shoot'), { type: 'shoot', targetId: doc.id });
    expect(doc.position).toEqual({ car: 4, floor: 'inside' });
  });

  it('cannot push beyond the end of the train', () => {
    const s = setup();
    const dj = byChar(s, 'django');
    const doc = byChar(s, 'doc');
    for (const p of s.players) if (p !== dj && p !== doc) place(p, 3, 'roof');
    place(dj, 5, 'inside');
    place(doc, 6, 'inside');
    ActionManager.resolveAction(s, played(dj, 'shoot'), { type: 'shoot', targetId: doc.id });
    expect(doc.position).toEqual({ car: 6, floor: 'inside' });
  });

  it('push into the Marshal car triggers the Marshal', () => {
    const s = setup();
    const dj = byChar(s, 'django');
    const doc = byChar(s, 'doc');
    place(dj, 2, 'inside');
    place(doc, 1, 'inside');
    ActionManager.resolveAction(s, played(dj, 'shoot'), { type: 'shoot', targetId: doc.id });
    expect(doc.position).toEqual({ car: 0, floor: 'roof' });
    expect(doc.deck.filter((c) => c.kind === 'bullet')).toHaveLength(2); // django + neutral
  });

  it('a non-Django shooter does not push', () => {
    const s = setup();
    const doc = byChar(s, 'doc');
    const dj = byChar(s, 'django');
    place(doc, 2, 'inside');
    place(dj, 3, 'inside');
    ActionManager.resolveAction(s, played(doc, 'shoot'), { type: 'shoot', targetId: dj.id });
    expect(dj.position).toEqual({ car: 3, floor: 'inside' });
  });
});

describe('Tuco', () => {
  it('can shoot through the roof/floor of his own car; others cannot', () => {
    const s = setup();
    const tuco = byChar(s, 'tuco');
    const doc = byChar(s, 'doc');
    place(tuco, 3, 'inside');
    place(doc, 3, 'roof');
    expect(shootOptions(s, tuco)).toEqual([{ type: 'shoot', targetId: doc.id }]);
    place(tuco, 3, 'roof');
    place(doc, 3, 'inside');
    expect(shootOptions(s, tuco)).toEqual([{ type: 'shoot', targetId: doc.id }]);
    expect(shootOptions(s, doc)).toEqual([]); // Doc cannot shoot through the roof
  });
});

describe('Doc', () => {
  it('draws 7 cards each round', () => {
    const e = startedEngine(3, ['doc', 'tuco', 'belle']);
    const s = e.state;
    expect(byChar(s, 'doc').hand).toHaveLength(7);
    expect(byChar(s, 'tuco').hand).toHaveLength(6);
  });
});

describe('Cheyenne', () => {
  it('takes the purse dropped by her punch victim', () => {
    const s = setup();
    const ch = byChar(s, 'cheyenne');
    const doc = byChar(s, 'doc');
    place(ch, 3, 'inside');
    place(doc, 3, 'inside');
    const before = ch.loot.length;
    ActionManager.resolveAction(s, played(ch, 'punch'), { type: 'punch', targetId: doc.id, lootType: 'purse', to: { car: 4, floor: 'inside' } });
    expect(ch.loot).toHaveLength(before + 1);
    expect(s.train[3]!.inside).toHaveLength(0);
  });

  it('a jewel dropped by her victim falls on the floor', () => {
    const s = setup();
    const ch = byChar(s, 'cheyenne');
    const doc = byChar(s, 'doc');
    place(ch, 3, 'inside');
    place(doc, 3, 'inside');
    doc.loot.push({ id: 'jj', type: 'jewel', value: 500 });
    ActionManager.resolveAction(s, played(ch, 'punch'), { type: 'punch', targetId: doc.id, lootType: 'jewel', to: { car: 4, floor: 'inside' } });
    expect(s.train[3]!.inside.map((l) => l.id)).toEqual(['jj']);
  });
});

describe('Belle', () => {
  it('cannot be shot or punched if another target is available', () => {
    const s = setup();
    const belle = byChar(s, 'belle');
    const doc = byChar(s, 'doc');
    const tuco = byChar(s, 'tuco');
    place(doc, 2, 'inside');
    place(belle, 3, 'inside');
    place(tuco, 1, 'inside');
    expect(shootOptions(s, doc).map((o) => (o as { targetId: string }).targetId)).toEqual([tuco.id]);
    place(belle, 2, 'inside');
    place(tuco, 2, 'inside');
    expect(new Set(punchOptions(s, doc).map((o) => (o as { targetId: string }).targetId))).toEqual(new Set([tuco.id]));
  });

  it('can be targeted when she is the only option', () => {
    const s = setup();
    const belle = byChar(s, 'belle');
    const doc = byChar(s, 'doc');
    place(doc, 2, 'inside');
    place(belle, 3, 'inside');
    expect(shootOptions(s, doc)).toEqual([{ type: 'shoot', targetId: belle.id }]);
    expect(() => ActionManager.resolveAction(s, played(doc, 'shoot'), { type: 'shoot', targetId: belle.id })).not.toThrow();
  });
});

describe('Ghost', () => {
  it('may play face down during the first turn only; others never', () => {
    const e = startedEngine(3, ['ghost', 'doc', 'belle'], 7, { roundDeckOverride: [round(['normal', 'normal'])] });
    const s0 = e.state;
    const ghostCard = byChar(s0, 'ghost').hand.find((c) => c.kind === 'action')!;
    e.playCard('p1', ghostCard.id, true);
    expect(e.state.actionStack[0]!.faceUp).toBe(false);
    const docCard = byChar(e.state, 'doc').hand.find((c) => c.kind === 'action')!;
    expect(() => e.playCard('p2', docCard.id, true)).toThrow(/face down/);
    e.playCard('p2', docCard.id);
    e.playCard('p3', byChar(e.state, 'belle').hand.find((c) => c.kind === 'action')!.id);
    // turn 2: Ghost can no longer play face down
    const g2 = byChar(e.state, 'ghost').hand.find((c) => c.kind === 'action')!;
    expect(() => e.playCard('p1', g2.id, true)).toThrow(/face down/);
  });

  it('allows Ghost face-down only on step 0 (even within a speedingUp double turn)', () => {
    const e = startedEngine(3, ['ghost', 'doc', 'belle'], 11, { roundDeckOverride: [round(['speedingUp', 'normal'])] });
    const first = byChar(e.state, 'ghost').hand.find((c) => c.kind === 'action')!;
    e.playCard('p1', first.id, true);
    expect(e.state.actionStack[0]!.faceUp).toBe(false);
    // In speedingUp turn 0, Ghost immediately plays a 2nd card at step 1 -> must be face up
    const second = byChar(e.state, 'ghost').hand.find((c) => c.kind === 'action')!;
    expect(() => e.playCard('p1', second.id, true)).toThrow(/face down/);
    e.playCard('p1', second.id, false);
    expect(e.state.actionStack[1]!.faceUp).toBe(true);
  });
});
