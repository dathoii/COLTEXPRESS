import type { BotDifficulty, CharacterId, GameState, Loot, LootType, PlayerState, Position } from '@colt/shared';
import { GameError } from '@colt/shared';
import { isValidCar } from '@colt/game-rules';
import { randomInt } from './rng.js';
import { enforceMarshal } from './marshal.js';

/** Player Manager: players, characters, positions, loot, bullets, status. */

export function getPlayer(state: GameState, playerId: string): PlayerState {
  const p = state.players.find((x) => x.id === playerId);
  if (!p) throw new GameError('PLAYER_NOT_FOUND', `Player ${playerId} not found`);
  return p;
}

export function findPlayer(state: GameState, playerId: string): PlayerState | undefined {
  return state.players.find((x) => x.id === playerId);
}

export function playerBySeat(state: GameState, seat: number): PlayerState {
  const p = state.players.find((x) => x.seat === seat);
  if (!p) throw new GameError('PLAYER_NOT_FOUND', `No player at seat ${seat}`);
  return p;
}

export function createPlayerState(
  id: string,
  name: string,
  character: CharacterId,
  seat: number,
  start: Position,
  botOpts?: { isBot?: boolean; botDifficulty?: BotDifficulty },
): PlayerState {
  return {
    id,
    name,
    character,
    seat,
    position: start,
    hand: [],
    deck: [],
    bullets: [],
    loot: [],
    connected: true,
    ...(botOpts?.isBot ? { isBot: true, botDifficulty: botOpts.botDifficulty ?? 'normal' } : {}),
  };
}

/**
 * VERIFIED setup: 1st, 3rd, 5th player start inside the last car (caboose),
 * 2nd, 4th, 6th inside the car before it.
 */
export function startingPosition(seat: number, carCount: number): Position {
  const last = carCount - 1;
  return { car: seat % 2 === 0 ? last : last - 1, floor: 'inside' };
}

/** Moves a bandit and applies the Marshal rule. */
export function moveBandit(state: GameState, p: PlayerState, to: Position): void {
  if (!isValidCar(state, to.car)) throw new GameError('INVALID_CHOICE', `Invalid car ${to.car}`);
  p.position = { car: to.car, floor: to.floor };
  enforceMarshal(state);
}

export function addLoot(p: PlayerState, loot: Loot): void {
  p.loot.push(loot);
}

/** Removes a loot of a given type from a bandit (purse picked at random: face down). */
export function removeLootOfType(state: GameState, p: PlayerState, type: LootType): Loot | null {
  const idx = p.loot.map((l, i) => ({ l, i })).filter((x) => x.l.type === type);
  if (idx.length === 0) return null;
  const pick = type === 'purse' ? idx[randomInt(state, idx.length)]! : idx[0]!;
  p.loot.splice(pick.i, 1);
  return pick.l;
}

export function lootValue(p: PlayerState): number {
  return p.loot.reduce((s, l) => s + l.value, 0);
}

export function bulletsFired(p: PlayerState, bulletsPerBandit: number): number {
  return bulletsPerBandit - p.bullets.length;
}

/** Bullet cards (bandit + neutral) held in hand or deck. The action stack never holds bullets. */
export function bulletsReceived(p: PlayerState): number {
  return [...p.hand, ...p.deck].filter((c) => c.kind === 'bullet').length;
}

export function hasPlayableCard(p: PlayerState): boolean {
  return p.hand.some((c) => c.kind === 'action');
}
