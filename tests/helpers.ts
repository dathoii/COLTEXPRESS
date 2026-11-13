import type { CharacterId, GameState, PlayedCard, PlayerState, Position, ResolutionChoice, RoundCard } from '@colt/shared';
import { GameEngine, RoundManager } from '@colt/game-engine';
import { CHARACTERS } from '@colt/game-rules';

export const ALL: CharacterId[] = [...CHARACTERS];

export function lobbyEngine(n: number, chars: CharacterId[] = ALL.slice(0, n), seed = 42, opts: Partial<RoundManager.EngineOptions> = {}): GameEngine {
  const e = new GameEngine('g1', seed, opts);
  for (let i = 0; i < n; i++) {
    e.addPlayer(`p${i + 1}`, `Player${i + 1}`);
    e.selectCharacter(`p${i + 1}`, chars[i]!);
    e.setReady(`p${i + 1}`, true);
  }
  return e;
}

export function startedEngine(n: number, chars?: CharacterId[], seed = 42, opts: Partial<RoundManager.EngineOptions> = {}): GameEngine {
  const e = lobbyEngine(n, chars, seed, opts);
  e.start('p1');
  return e;
}

/** A started game state, for direct manager-level tests. */
export function startedState(n: number, chars?: CharacterId[], seed = 42): GameState {
  return startedEngine(n, chars, seed).state;
}

export function byChar(s: GameState, c: CharacterId): PlayerState {
  const p = s.players.find((x) => x.character === c);
  if (!p) throw new Error(`no ${c}`);
  return p;
}

export function place(p: PlayerState, car: number, floor: Position['floor']): void {
  p.position = { car, floor };
}

/** Clears all loot from the train (for deterministic loot tests). */
export function clearTrain(s: GameState): void {
  for (const c of s.train) {
    c.inside = [];
    c.roof = [];
  }
}

export function played(p: PlayerState, action: PlayedCard['card']['action']): PlayedCard {
  return { playerId: p.id, faceUp: true, card: { id: `${p.character}-${action}-x`, kind: 'action', action, owner: p.character } };
}

export function round(turns: RoundCard['turns'], event: RoundCard['event'] = 'none', id = 'test'): RoundCard {
  return { id, name: id, kind: 'round', bracket: 'any', turns, event, patternVerified: true };
}

export function deterministicChoice(options: ResolutionChoice[], rnd: () => number): ResolutionChoice {
  return options[Math.floor(rnd() * options.length)]!;
}

export function totalLootCount(s: GameState): number {
  return (
    s.train.reduce((a, c) => a + c.inside.length + c.roof.length, 0) +
    s.players.reduce((a, p) => a + p.loot.length, 0) +
    s.reservePurses.length +
    s.spareStrongboxes.length
  );
}

export function cardCount(p: PlayerState, s: GameState): number {
  return p.hand.length + p.deck.length + s.actionStack.filter((x) => x.playerId === p.id).length;
}

/** Plays a whole game with seeded pseudo-random but legal decisions. */
export function playRandomGame(e: GameEngine, seed: number, maxSteps = 5000): number {
  let x = seed >>> 0 || 1;
  const rnd = () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
  let steps = 0;
  while (e.phase !== 'gameEnd') {
    if (++steps > maxSteps) throw new Error('game did not finish');
    const s = e.state;
    const active = e.activePlayerId();
    if (!active) throw new Error(`no active player in phase ${s.phase}`);
    if (s.phase === 'planning') {
      const p = s.players.find((q) => q.id === active)!;
      const actions = p.hand.filter((c) => c.kind === 'action');
      if (actions.length && (p.deck.length === 0 || rnd() < 0.8)) {
        e.playCard(active, actions[Math.floor(rnd() * actions.length)]!.id);
      } else {
        e.drawCards(active);
      }
    } else if (s.phase === 'execution') {
      e.resolve(active, deterministicChoice(e.pendingOptions(active), rnd));
    }
  }
  return steps;
}
