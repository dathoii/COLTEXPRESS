import type { GameState } from '@colt/shared';

/** Deterministic seeded RNG (mulberry32). State lives in GameState for replays. */
export function nextRandom(state: Pick<GameState, 'rngState'>): number {
  let t = (state.rngState = (state.rngState + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randomInt(state: Pick<GameState, 'rngState'>, maxExclusive: number): number {
  return Math.floor(nextRandom(state) * maxExclusive);
}

/** Fisher-Yates shuffle in place. */
export function shuffle<T>(state: Pick<GameState, 'rngState'>, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(state, i + 1);
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

export function seedFrom(input: string | number): number {
  if (typeof input === 'number') return input | 0;
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h | 0;
}
