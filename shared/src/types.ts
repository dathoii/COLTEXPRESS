/**
 * Core domain types shared by engine, server and client.
 * Positions: car index 0 = locomotive, car index N = caboose (last car).
 */

export type CharacterId = 'django' | 'tuco' | 'doc' | 'cheyenne' | 'ghost' | 'belle';
export type BotDifficulty = 'easy' | 'normal';
export type Floor = 'inside' | 'roof';
export type Direction = 'front' | 'back'; // front = toward locomotive (lower index)

export interface Position {
  car: number;
  floor: Floor;
}

export type ActionType = 'move' | 'changeFloor' | 'shoot' | 'punch' | 'rob' | 'marshal';

export interface ActionCard {
  id: string;
  kind: 'action';
  action: ActionType;
  owner: CharacterId;
}

export interface BulletCard {
  id: string;
  kind: 'bullet';
  /** Character who fired it, or 'neutral' for Marshal / event bullets. */
  source: CharacterId | 'neutral';
  /** Number printed on a bandit bullet card (1..6). 0 for neutral bullets. */
  bullets: number;
}

export type PlayerCard = ActionCard | BulletCard;

export type LootType = 'purse' | 'jewel' | 'strongbox';

export interface Loot {
  id: string;
  type: LootType;
  value: number;
}

export type TurnType = 'normal' | 'tunnel' | 'speedingUp' | 'switching';

export type RoundEventId =
  | 'none'
  | 'angryMarshal'
  | 'swivelArm'
  | 'braking'
  | 'takeItAll'
  | 'passengersRebellion'
  | 'pickpocketing'
  | 'marshalsRevenge'
  | 'hostageConductor';

export interface RoundCard {
  id: string;
  name: string;
  kind: 'round' | 'station';
  bracket: '2-4' | '5-6' | 'any';
  turns: TurnType[];
  event: RoundEventId;
  /** false = turn pattern not verified against the printed card. */
  patternVerified: boolean;
}

export interface TrainCar {
  index: number;
  isLocomotive: boolean;
  inside: Loot[];
  roof: Loot[];
}

export interface PlayerState {
  id: string;
  name: string;
  character: CharacterId;
  /** Seat order, 0-based, clockwise. */
  seat: number;
  position: Position;
  hand: PlayerCard[];
  deck: PlayerCard[];
  /** Bullet cards not yet fired (top of stack = last element). */
  bullets: BulletCard[];
  loot: Loot[];
  connected: boolean;
  isBot?: boolean;
  botDifficulty?: BotDifficulty;
}

export interface PlayedCard {
  card: ActionCard;
  playerId: string;
  faceUp: boolean;
}

export type GamePhase = 'lobby' | 'setup' | 'planning' | 'execution' | 'roundEnd' | 'gameEnd';

export interface PlanningState {
  turnIndex: number;
  /** Player ids in order for the current turn. */
  order: string[];
  orderIndex: number;
  /** Steps already taken by the active player in this turn (speeding-up = 2 steps). */
  stepsTaken: number;
}

export type ResolutionChoice =
  | { type: 'move'; to: Position }
  | { type: 'changeFloor'; to: Position }
  | { type: 'marshal'; toCar: number }
  | { type: 'rob'; lootType: LootType }
  | { type: 'shoot'; targetId: string }
  | { type: 'punch'; targetId: string; lootType: LootType | null; to: Position | null };

export interface PendingDecision {
  playerId: string;
  card: ActionCard;
  options: ResolutionChoice[];
}

export interface ExecutionState {
  index: number;
  pending: PendingDecision | null;
}

export interface ScoreLine {
  playerId: string;
  lootValue: number;
  gunslingerBonus: number;
  total: number;
  bulletsFired: number;
  bulletsReceived: number;
  rank: number;
}

export interface GameEvent {
  seq: number;
  type: string;
  round: number;
  message: string;
  data?: Record<string, unknown>;
}

export interface LobbyPlayer {
  id: string;
  name: string;
  character: CharacterId | null;
  ready: boolean;
  connected: boolean;
  isBot?: boolean;
  botDifficulty?: BotDifficulty;
}

export interface GameState {
  id: string;
  phase: GamePhase;
  lobby: LobbyPlayer[];
  hostId: string | null;
  players: PlayerState[];
  train: TrainCar[];
  marshalCar: number;
  roundDeck: RoundCard[];
  roundIndex: number;
  firstPlayerSeat: number;
  planning: PlanningState | null;
  actionStack: PlayedCard[];
  execution: ExecutionState | null;
  neutralBullets: number;
  reservePurses: Loot[];
  spareStrongboxes: Loot[];
  scores: ScoreLine[] | null;
  winnerIds: string[];
  log: GameEvent[];
  eventSeq: number;
  rngState: number;
  version: number;
}
