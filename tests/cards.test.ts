import { describe, expect, it } from 'vitest';
import { CardManager } from '@colt/game-engine';
import { ACTION_DECK_COMPOSITION } from '@colt/game-rules';
import { byChar, round, startedEngine, startedState } from './helpers.js';

describe('cards', () => {
  it('builds a 10-card action deck with the verified composition', () => {
    const deck = CardManager.buildActionDeck('belle');
    expect(deck).toHaveLength(10);
    for (const [action, count] of ACTION_DECK_COMPOSITION) {
      expect(deck.filter((c) => c.action === action)).toHaveLength(count);
    }
    expect(new Set(deck.map((c) => c.id)).size).toBe(10);
  });

  it('builds 6 bullet cards per bandit', () => {
    const b = CardManager.buildBulletStack('tuco');
    expect(b.map((x) => x.bullets)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('dealRoundHand reshuffles everything and deals 6 (Doc 7)', () => {
    const s = startedState(3, ['doc', 'ghost', 'belle']);
    const doc = byChar(s, 'doc');
    const ghost = byChar(s, 'ghost');
    doc.deck.push(...doc.hand.splice(0));
    CardManager.dealRoundHand(s, doc);
    CardManager.dealRoundHand(s, ghost);
    expect(doc.hand).toHaveLength(7);
    expect(ghost.hand).toHaveLength(6);
    expect(doc.hand.length + doc.deck.length).toBe(10);
  });

  it('drawThree draws up to 3 and fails on empty deck', () => {
    const s = startedState(3);
    const p = s.players[0]!;
    expect(CardManager.drawThree(s, p)).toBe(3);
    expect(CardManager.drawThree(s, p)).toBe(1);
    expect(() => CardManager.drawThree(s, p)).toThrow(/empty/);
  });

  it('cannot play a bullet card or a card not in hand', () => {
    const s = startedState(3);
    const p = s.players[0]!;
    p.hand.push({ id: 'b1', kind: 'bullet', source: 'neutral', bullets: 0 });
    expect(() => CardManager.playToStack(s, p, 'b1', true)).toThrow(/Bullet/);
    expect(() => CardManager.playToStack(s, p, 'nope', true)).toThrow(/not in your hand/);
  });

  it('returnStackToOwners puts played cards back into decks', () => {
    const s = startedState(3);
    const p = s.players[0]!;
    const id = p.hand.find((c) => c.kind === 'action')!.id;
    CardManager.playToStack(s, p, id, true);
    expect(s.actionStack).toHaveLength(1);
    CardManager.returnStackToOwners(s);
    expect(s.actionStack).toHaveLength(0);
    expect(p.deck.some((c) => c.id === id)).toBe(true);
  });

  it('tunnel turns put cards face down; face-down hidden in other views', () => {
    const e = startedEngine(3, undefined, 1, { roundDeckOverride: [round(['tunnel', 'normal'])] });
    const p1 = e.state.players[0]!;
    e.playCard('p1', p1.hand.find((c) => c.kind === 'action')!.id);
    expect(e.state.actionStack[0]!.faceUp).toBe(false);
    expect(e.view('p2').actionStack[0]!.card).toBeNull();
    expect(e.view('p1').actionStack[0]!.card).not.toBeNull();
  });
});
