import { describe, expect, it } from 'vitest';
import { ActionManager } from '@colt/game-engine';
import { moveOptions, punchOptions, shootOptions } from '@colt/game-rules';
import { byChar, clearTrain, place, played, startedState } from './helpers.js';

// 4 players: django, tuco, doc, cheyenne -> train cars 0..4 (0 = locomotive)
const CH = ['django', 'tuco', 'doc', 'cheyenne'] as const;

function setup() {
  const s = startedState(4, [...CH]);
  clearTrain(s);
  s.marshalCar = 0;
  return s;
}

describe('move', () => {
  it('inside: exactly one adjacent car', () => {
    const s = setup();
    const doc = byChar(s, 'doc');
    place(doc, 2, 'inside');
    const opts = moveOptions(s, doc).map((o) => (o.type === 'move' ? o.to.car : -1));
    expect(opts.sort()).toEqual([1, 3]);
  });

  it('roof: 1 to 3 cars in a direction, bounded by the train', () => {
    const s = setup();
    const doc = byChar(s, 'doc');
    place(doc, 4, 'roof');
    const cars = moveOptions(s, doc).map((o) => (o.type === 'move' ? o.to.car : -1));
    expect(cars.sort()).toEqual([1, 2, 3]);
    place(doc, 0, 'roof');
    expect(moveOptions(s, doc).map((o) => (o.type === 'move' ? o.to.car : -1)).sort()).toEqual([1, 2, 3]);
  });

  it('rejects illegal destinations', () => {
    const s = setup();
    const doc = byChar(s, 'doc');
    place(doc, 2, 'inside');
    expect(() => ActionManager.resolveAction(s, played(doc, 'move'), { type: 'move', to: { car: 4, floor: 'inside' } })).toThrow(/Illegal/);
    expect(() => ActionManager.resolveAction(s, played(doc, 'move'), { type: 'move', to: { car: 3, floor: 'roof' } })).toThrow(/Illegal/);
  });

  it('moving inside the Marshal car: neutral bullet + flee to roof', () => {
    const s = setup();
    const doc = byChar(s, 'doc');
    place(doc, 1, 'inside');
    ActionManager.resolveAction(s, played(doc, 'move'), { type: 'move', to: { car: 0, floor: 'inside' } });
    expect(doc.position).toEqual({ car: 0, floor: 'roof' });
    expect(doc.deck.filter((c) => c.kind === 'bullet')).toHaveLength(1);
  });
});

describe('change floor', () => {
  it('climbs up and down in the same car; climbing down into Marshal car is punished', () => {
    const s = setup();
    const doc = byChar(s, 'doc');
    place(doc, 2, 'inside');
    ActionManager.resolveAction(s, played(doc, 'changeFloor'), { type: 'changeFloor', to: { car: 2, floor: 'roof' } });
    expect(doc.position).toEqual({ car: 2, floor: 'roof' });
    s.marshalCar = 2;
    ActionManager.resolveAction(s, played(doc, 'changeFloor'), { type: 'changeFloor', to: { car: 2, floor: 'inside' } });
    expect(doc.position).toEqual({ car: 2, floor: 'roof' });
    expect(doc.deck.filter((c) => c.kind === 'bullet')).toHaveLength(1);
  });
});

describe('marshal action', () => {
  it('moves the Marshal one car only', () => {
    const s = setup();
    const doc = byChar(s, 'doc');
    const opts = ActionManager.getActionOptions(s, played(doc, 'marshal'));
    expect(opts).toEqual([{ type: 'marshal', toCar: 1 }]);
    expect(() => ActionManager.resolveAction(s, played(doc, 'marshal'), { type: 'marshal', toCar: 2 })).toThrow(/Illegal/);
  });
});

describe('rob', () => {
  it('takes one loot of the chosen type at the bandit position, no options when empty', () => {
    const s = setup();
    const doc = byChar(s, 'doc');
    place(doc, 3, 'inside');
    expect(ActionManager.getActionOptions(s, played(doc, 'rob'))).toEqual([]);
    s.train[3]!.inside.push({ id: 'j', type: 'jewel', value: 500 }, { id: 'p', type: 'purse', value: 300 });
    expect(ActionManager.getActionOptions(s, played(doc, 'rob'))).toHaveLength(2);
    ActionManager.resolveAction(s, played(doc, 'rob'), { type: 'rob', lootType: 'jewel' });
    expect(doc.loot.map((l) => l.id)).toContain('j');
    expect(s.train[3]!.inside.map((l) => l.id)).toEqual(['p']);
    expect(() => ActionManager.resolveAction(s, played(doc, 'rob'), { type: 'rob', lootType: 'strongbox' })).toThrow();
  });

  it('can rob loot lying on a roof', () => {
    const s = setup();
    const doc = byChar(s, 'doc');
    place(doc, 2, 'roof');
    s.train[2]!.roof.push({ id: 'r', type: 'purse', value: 450 });
    ActionManager.resolveAction(s, played(doc, 'rob'), { type: 'rob', lootType: 'purse' });
    expect(doc.loot.some((l) => l.id === 'r')).toBe(true);
  });
});

describe('shoot', () => {
  it('inside: targets only bandits inside adjacent cars, never same car', () => {
    const s = setup();
    const doc = byChar(s, 'doc');
    const cheyenne = byChar(s, 'cheyenne');
    const django = byChar(s, 'django');
    const tuco = byChar(s, 'tuco');
    place(doc, 2, 'inside');
    place(cheyenne, 2, 'inside');
    place(django, 3, 'inside');
    place(tuco, 1, 'roof');
    expect(shootOptions(s, doc)).toEqual([{ type: 'shoot', targetId: django.id }]);
  });

  it('roof: first bandit(s) in line of sight per direction, blocked beyond', () => {
    const s = setup();
    const doc = byChar(s, 'doc');
    const cheyenne = byChar(s, 'cheyenne');
    const django = byChar(s, 'django');
    const tuco = byChar(s, 'tuco');
    place(doc, 4, 'roof');
    place(cheyenne, 2, 'roof');
    place(django, 1, 'roof'); // hidden behind cheyenne
    place(tuco, 4, 'roof'); // same car: not a target
    expect(shootOptions(s, doc).map((o) => (o as { targetId: string }).targetId)).toEqual([cheyenne.id]);
  });

  it('gives the top bullet card into the target deck; no effect without bullets', () => {
    const s = setup();
    const doc = byChar(s, 'doc');
    const django = byChar(s, 'django');
    place(doc, 2, 'inside');
    place(django, 3, 'inside');
    ActionManager.resolveAction(s, played(doc, 'shoot'), { type: 'shoot', targetId: django.id });
    expect(doc.bullets).toHaveLength(5);
    expect(django.deck.filter((c) => c.kind === 'bullet' && c.source === 'doc')).toHaveLength(1);
    doc.bullets = [];
    expect(shootOptions(s, doc)).toEqual([]);
  });

  it('cannot target an invalid bandit', () => {
    const s = setup();
    const doc = byChar(s, 'doc');
    const django = byChar(s, 'django');
    place(doc, 2, 'inside');
    place(django, 4, 'inside');
    expect(() => ActionManager.resolveAction(s, played(doc, 'shoot'), { type: 'shoot', targetId: django.id })).toThrow(/Illegal/);
  });
});

describe('punch', () => {
  it('victim drops chosen loot on the floor and is knocked to an adjacent car on the same floor', () => {
    const s = setup();
    const doc = byChar(s, 'doc');
    const tuco = byChar(s, 'tuco');
    place(doc, 2, 'roof');
    place(tuco, 2, 'roof');
    tuco.loot.push({ id: 'jw', type: 'jewel', value: 500 });
    const opts = punchOptions(s, doc);
    // loot types {purse, jewel} x destinations {1,3}
    expect(opts).toHaveLength(4);
    ActionManager.resolveAction(s, played(doc, 'punch'), { type: 'punch', targetId: tuco.id, lootType: 'jewel', to: { car: 3, floor: 'roof' } });
    expect(tuco.position).toEqual({ car: 3, floor: 'roof' });
    expect(s.train[2]!.roof.map((l) => l.id)).toEqual(['jw']);
    expect(tuco.loot.some((l) => l.id === 'jw')).toBe(false);
  });

  it('victim without loot is still knocked away; locomotive edge only allows one direction', () => {
    const s = setup();
    const doc = byChar(s, 'doc');
    const tuco = byChar(s, 'tuco');
    tuco.loot = [];
    place(doc, 0, 'roof');
    place(tuco, 0, 'roof');
    expect(punchOptions(s, doc)).toEqual([{ type: 'punch', targetId: tuco.id, lootType: null, to: { car: 1, floor: 'roof' } }]);
  });

  it('knocked into the Marshal car interior triggers the Marshal', () => {
    const s = setup();
    const doc = byChar(s, 'doc');
    const tuco = byChar(s, 'tuco');
    s.marshalCar = 1;
    place(doc, 2, 'inside');
    place(tuco, 2, 'inside');
    ActionManager.resolveAction(s, played(doc, 'punch'), { type: 'punch', targetId: tuco.id, lootType: 'purse', to: { car: 1, floor: 'inside' } });
    expect(tuco.position).toEqual({ car: 1, floor: 'roof' });
    expect(s.train[2]!.inside.filter((l) => l.type === 'purse')).toHaveLength(1);
  });

  it('no target alone', () => {
    const s = setup();
    const doc = byChar(s, 'doc');
    place(doc, 3, 'inside');
    for (const p of s.players) if (p !== doc) place(p, 1, 'inside');
    expect(punchOptions(s, doc)).toEqual([]);
  });
});
