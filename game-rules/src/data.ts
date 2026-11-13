import type { ActionType, CharacterId, RoundCard, LootType } from '@colt/shared';

/** Rule constants. See documentation/RULES_SPEC.md for verification status. */
export const MIN_PLAYERS = 3; // VERIFIED project scope: 3-6 only (2-player variant excluded on purpose)
export const MAX_PLAYERS = 6;
export const TOTAL_ROUNDS = 5; // VERIFIED: 4 round cards + 1 train station card
export const NORMAL_ROUND_CARDS_PER_GAME = 4;
export const HAND_SIZE = 6; // VERIFIED
export const DOC_HAND_SIZE = 7; // VERIFIED (Doc ability)
export const DRAW_AMOUNT = 3; // VERIFIED
export const BULLETS_PER_BANDIT = 6; // VERIFIED
export const NEUTRAL_BULLETS = 13; // VERIFIED (component count)
export const STARTING_PURSE_VALUE = 250; // VERIFIED
export const JEWEL_VALUE = 500; // VERIFIED
export const STRONGBOX_VALUE = 1000; // VERIFIED
export const GUNSLINGER_BONUS = 1000; // VERIFIED
export const ROOF_MAX_MOVE = 3; // VERIFIED: 1 to 3 cars on the roof
export const HOSTAGE_RANSOM = 250; // VERIFIED (Hostage-Taking of the Conductor)

export const CHARACTERS: readonly CharacterId[] = ['django', 'tuco', 'doc', 'cheyenne', 'ghost', 'belle'];

export interface CharacterInfo {
  id: CharacterId;
  name: string;
  ability: string;
}

export const CHARACTER_INFO: Record<CharacterId, CharacterInfo> = {
  django: { id: 'django', name: 'Django', ability: 'When you shoot a bandit, he is pushed one car in the direction of the shot.' },
  tuco: { id: 'tuco', name: 'Tuco', ability: 'You may shoot a bandit on the other floor of your own car (through the roof).' },
  doc: { id: 'doc', name: 'Doc', ability: 'At the start of each round you draw 7 cards instead of 6.' },
  cheyenne: { id: 'cheyenne', name: 'Cheyenne', ability: 'When you punch a bandit, you may take the purse he drops.' },
  ghost: { id: 'ghost', name: 'Ghost', ability: 'You may play the first card of each round face down.' },
  belle: { id: 'belle', name: 'Belle', ability: 'You cannot be the target of a shot or a punch if another bandit can be targeted instead.' },
};

/** VERIFIED: each bandit deck = 10 action cards. */
export const ACTION_DECK_COMPOSITION: ReadonlyArray<[ActionType, number]> = [
  ['move', 2],
  ['changeFloor', 2],
  ['shoot', 2],
  ['rob', 2],
  ['punch', 1],
  ['marshal', 1],
];

/**
 * Purse values (18 purses). Values $250-$500 are VERIFIED; the exact
 * distribution per value is UNVERIFIED.
 */
export const PURSE_VALUES: readonly number[] = [
  250, 250, 250, 250, 250, 250, 250, 250, 300, 300, 350, 350, 400, 400, 450, 450, 500, 500,
];
export const JEWEL_COUNT = 6; // VERIFIED
export const STRONGBOX_COUNT = 2; // VERIFIED

export interface CarLayout {
  id: string;
  purses: number;
  jewels: number;
}

/**
 * UNVERIFIED: the exact loot printed on each car floor. Placeholder layout,
 * stays within the component limits (purses + starting purses <= 18, jewels <= 6).
 */
export const CAR_LAYOUTS: readonly CarLayout[] = [
  { id: 'car-a', purses: 3, jewels: 0 },
  { id: 'car-b', purses: 1, jewels: 1 },
  { id: 'car-c', purses: 2, jewels: 1 },
  { id: 'car-d', purses: 1, jewels: 2 },
  { id: 'car-e', purses: 0, jewels: 1 },
  { id: 'car-f', purses: 3, jewels: 1 },
];

/**
 * Round cards & Train Station cards (official Colt Express turn patterns + events).
 */
export const ROUND_CARDS: readonly RoundCard[] = [
  // 2-4 players bracket (used for 3-4 players)
  { id: 'r24-angry', name: 'Angry Marshal', kind: 'round', bracket: '2-4', turns: ['normal', 'normal', 'tunnel', 'switching'], event: 'angryMarshal', patternVerified: true },
  { id: 'r24-swivel', name: 'Swivel Arm', kind: 'round', bracket: '2-4', turns: ['normal', 'tunnel', 'normal', 'normal'], event: 'swivelArm', patternVerified: true },
  { id: 'r24-braking', name: 'Braking', kind: 'round', bracket: '2-4', turns: ['normal', 'switching', 'normal', 'normal'], event: 'braking', patternVerified: true },
  { id: 'r24-takeall', name: 'Take It All!', kind: 'round', bracket: '2-4', turns: ['normal', 'tunnel', 'speedingUp', 'normal'], event: 'takeItAll', patternVerified: true },
  { id: 'r24-rebellion', name: "Passengers' Rebellion", kind: 'round', bracket: '2-4', turns: ['normal', 'normal', 'tunnel', 'normal', 'normal'], event: 'passengersRebellion', patternVerified: true },
  { id: 'r24-plain1', name: 'Round (no event) I', kind: 'round', bracket: '2-4', turns: ['normal', 'tunnel', 'switching', 'tunnel', 'normal'], event: 'none', patternVerified: true },
  { id: 'r24-plain2', name: 'Round (no event) II', kind: 'round', bracket: '2-4', turns: ['normal', 'speedingUp', 'normal'], event: 'none', patternVerified: true },
  // 5-6 players bracket
  { id: 'r56-angry', name: 'Angry Marshal', kind: 'round', bracket: '5-6', turns: ['normal', 'normal', 'tunnel', 'switching'], event: 'angryMarshal', patternVerified: true },
  { id: 'r56-swivel', name: 'Swivel Arm', kind: 'round', bracket: '5-6', turns: ['normal', 'tunnel', 'normal'], event: 'swivelArm', patternVerified: true },
  { id: 'r56-braking', name: 'Braking', kind: 'round', bracket: '5-6', turns: ['normal', 'tunnel', 'normal', 'normal'], event: 'braking', patternVerified: true },
  { id: 'r56-takeall', name: 'Take It All!', kind: 'round', bracket: '5-6', turns: ['normal', 'speedingUp', 'switching'], event: 'takeItAll', patternVerified: true },
  { id: 'r56-rebellion', name: "Passengers' Rebellion", kind: 'round', bracket: '5-6', turns: ['normal', 'normal', 'tunnel', 'normal'], event: 'passengersRebellion', patternVerified: true },
  { id: 'r56-plain1', name: 'Round (no event) I', kind: 'round', bracket: '5-6', turns: ['normal', 'tunnel', 'switching', 'normal'], event: 'none', patternVerified: true },
  { id: 'r56-plain2', name: 'Round (no event) II', kind: 'round', bracket: '5-6', turns: ['normal', 'speedingUp', 'normal'], event: 'none', patternVerified: true },
];

/** Train station cards: distinct turn sequences + official end-of-round events. */
export const STATION_CARDS: readonly RoundCard[] = [
  { id: 'st-pickpocket', name: 'Pickpocketing', kind: 'station', bracket: 'any', turns: ['normal', 'tunnel', 'normal', 'switching'], event: 'pickpocketing', patternVerified: true },
  { id: 'st-revenge', name: "Marshal's Revenge", kind: 'station', bracket: 'any', turns: ['normal', 'speedingUp', 'tunnel', 'normal'], event: 'marshalsRevenge', patternVerified: true },
  { id: 'st-hostage', name: 'Hostage-Taking of the Conductor', kind: 'station', bracket: 'any', turns: ['normal', 'tunnel', 'speedingUp', 'normal'], event: 'hostageConductor', patternVerified: true },
];

export const LOOT_TYPES: readonly LootType[] = ['purse', 'jewel', 'strongbox'];

export function bracketFor(playerCount: number): '2-4' | '5-6' {
  return playerCount <= 4 ? '2-4' : '5-6';
}

export function handSizeFor(character: CharacterId): number {
  return character === 'doc' ? DOC_HAND_SIZE : HAND_SIZE;
}
