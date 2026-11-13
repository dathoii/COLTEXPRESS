import { describe, expect, it } from 'vitest';
import { GameEngine, TRANSITIONS, canTransition, transition, createInitialState } from '@colt/game-engine';
import { lobbyEngine, startedEngine } from './helpers.js';

describe('state machine', () => {
  it('defines the expected transitions', () => {
    expect(canTransition('lobby', 'setup')).toBe(true);
    expect(canTransition('setup', 'planning')).toBe(true);
    expect(canTransition('planning', 'execution')).toBe(true);
    expect(canTransition('execution', 'roundEnd')).toBe(true);
    expect(canTransition('roundEnd', 'planning')).toBe(true);
    expect(canTransition('roundEnd', 'gameEnd')).toBe(true);
    expect(TRANSITIONS.gameEnd).toEqual([]);
  });

  it('rejects illegal transitions', () => {
    const s = createInitialState('x', 1);
    expect(() => transition(s, 'planning')).toThrow(/Illegal/);
    expect(() => transition(s, 'gameEnd')).toThrow(/Illegal/);
    expect(canTransition('planning', 'roundEnd')).toBe(false);
    expect(canTransition('execution', 'planning')).toBe(false);
  });

  it('starts in lobby and moves to planning when the game starts', () => {
    const e = lobbyEngine(3);
    expect(e.phase).toBe('lobby');
    e.start('p1');
    expect(e.phase).toBe('planning');
    const phases = e.state.log.filter((l) => l.type === 'phase.changed').map((l) => l.data!.to);
    expect(phases).toEqual(['setup', 'planning']);
  });

  it('rejects commands in the wrong phase and keeps state unchanged (atomic)', () => {
    const e = lobbyEngine(3);
    const before = e.state;
    expect(() => e.playCard('p1', 'x')).toThrow(/phase/);
    expect(() => e.resolve('p1', { type: 'marshal', toCar: 1 })).toThrow(/phase/);
    expect(e.state).toEqual(before);
    const g = startedEngine(3);
    expect(() => g.addPlayer('p9', 'Late')).toThrow(/phase/);
    expect(() => g.start('p1')).toThrow(/phase/);
  });
});

describe('lobby', () => {
  it('enforces 3-6 players', () => {
    const e = lobbyEngine(2);
    expect(() => e.start('p1')).toThrow(/3-6/);
    const full = lobbyEngine(6);
    expect(() => full.addPlayer('p7', 'Seven')).toThrow(/full/);
  });

  it('enforces unique characters, readiness and host-only start', () => {
    const e = new GameEngine('g', 1);
    e.addPlayer('a', 'A');
    e.addPlayer('b', 'B');
    e.addPlayer('c', 'C');
    e.selectCharacter('a', 'doc');
    expect(() => e.selectCharacter('b', 'doc')).toThrow(/taken/);
    expect(() => e.setReady('b', true)).toThrow(/character/);
    e.selectCharacter('b', 'belle');
    e.selectCharacter('c', 'tuco');
    e.setReady('a', true);
    e.setReady('b', true);
    expect(() => e.start('a')).toThrow(/ready/);
    e.setReady('c', true);
    expect(() => e.start('b')).toThrow(/host/);
    e.start('a');
    expect(e.phase).toBe('planning');
  });

  it('transfers host when host leaves; rejects bad names', () => {
    const e = new GameEngine('g', 1);
    expect(() => e.addPlayer('a', '   ')).toThrow(/Name/);
    e.addPlayer('a', 'A');
    e.addPlayer('b', 'B');
    expect(e.state.hostId).toBe('a');
    e.removePlayer('a');
    expect(e.state.hostId).toBe('b');
    expect(() => e.addPlayer('b', 'B')).toThrow(/already/);
  });
});
