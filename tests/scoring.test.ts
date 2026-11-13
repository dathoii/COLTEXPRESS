import { describe, expect, it } from 'vitest';
import { ScoringManager, toView } from '@colt/game-engine';
import { byChar, startedState } from './helpers.js';

function scoreState() {
  const s = startedState(4, ['django', 'tuco', 'doc', 'belle']);
  for (const p of s.players) {
    p.deck.push(...p.hand);
    p.hand = [];
  }
  return s;
}

describe('scoring', () => {
  it('sums loot values', () => {
    const s = scoreState();
    const doc = byChar(s, 'doc');
    doc.loot.push({ id: 'j', type: 'jewel', value: 500 }, { id: 'sb', type: 'strongbox', value: 1000 });
    const { scores, winnerIds } = ScoringManager.computeScores(s);
    const line = scores.find((l) => l.playerId === doc.id)!;
    expect(line.lootValue).toBe(1750);
    expect(line.gunslingerBonus).toBe(0); // nobody fired
    expect(winnerIds).toEqual([doc.id]);
  });

  it('Gunslinger bonus $1000 ONLY when firing all 6/6 bullets; shared if multiple finish 6/6', () => {
    const s = scoreState();
    const dj = byChar(s, 'django');
    const tuco = byChar(s, 'tuco');
    // Firing 3/6 or 5/6 does NOT award the Gunslinger bonus even if highest
    dj.bullets.splice(0, 5);
    tuco.bullets.splice(0, 2);
    let r = ScoringManager.computeScores(s);
    expect(r.scores.find((l) => l.playerId === dj.id)!.gunslingerBonus).toBe(0);
    expect(r.scores.find((l) => l.playerId === tuco.id)!.gunslingerBonus).toBe(0);
    // Firing all 6/6 bullets (0 remaining) awards $1,000
    dj.bullets.splice(0, 1);
    r = ScoringManager.computeScores(s);
    expect(r.scores.find((l) => l.playerId === dj.id)!.gunslingerBonus).toBe(1000);
    expect(r.winnerIds).toEqual([dj.id]);
    // Another player also firing all 6/6 also earns $1,000
    tuco.bullets.splice(0, 4);
    r = ScoringManager.computeScores(s);
    expect(r.scores.filter((l) => l.gunslingerBonus === 1000).map((l) => l.playerId).sort()).toEqual([dj.id, tuco.id].sort());
  });

  it('tie on money: fewest bullet cards received wins', () => {
    const s = scoreState();
    const doc = byChar(s, 'doc');
    const belle = byChar(s, 'belle');
    doc.loot.push({ id: 'a', type: 'jewel', value: 500 });
    belle.loot.push({ id: 'b', type: 'jewel', value: 500 });
    doc.deck.push({ id: 'nb', kind: 'bullet', source: 'neutral', bullets: 0 });
    const r = ScoringManager.computeScores(s);
    expect(r.winnerIds).toEqual([belle.id]);
    expect(r.scores[0]!.rank).toBe(1);
    expect(r.scores[1]!.rank).toBe(2);
  });

  it('complete tie: shared victory with equal rank', () => {
    const s = scoreState();
    const r = ScoringManager.computeScores(s);
    expect(r.winnerIds).toHaveLength(4);
    expect(r.scores.every((l) => l.rank === 1)).toBe(true);
  });
});

describe('view redaction', () => {
  it('hides other hands and purse values; shows own', () => {
    const s = startedState(3);
    const v = toView(s, 'p1');
    expect(v.players[0]!.hand).toBeDefined();
    expect(v.players[1]!.hand).toBeUndefined();
    expect(v.players[1]!.handCount).toBe(6);
    expect(v.players[0]!.loot[0]!.value).toBe(250);
    expect(v.players[1]!.loot[0]!.value).toBeNull();
    const pursesOnTrain = v.train.flatMap((c) => c.inside).filter((l) => l.type === 'purse');
    expect(pursesOnTrain.every((l) => l.value === null)).toBe(true);
    expect(JSON.stringify(v)).not.toContain('rngState');
  });
});
