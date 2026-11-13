import type {
  ActionCard,
  BotDifficulty,
  CharacterId,
  ExecutionState,
  GameEvent,
  GamePhase,
  LobbyPlayer,
  Loot,
  PlanningState,
  PlayerCard,
  Position,
  RoundCard,
  ScoreLine,
} from './types.js';

/** Loot as seen by a given viewer: hidden purses have value null. */
export interface LootView {
  id: string;
  type: Loot['type'];
  value: number | null;
}

export interface TrainCarView {
  index: number;
  isLocomotive: boolean;
  inside: LootView[];
  roof: LootView[];
}

export interface PlayerView {
  id: string;
  name: string;
  character: CharacterId;
  seat: number;
  position: Position;
  handCount: number;
  deckCount: number;
  bulletsLeft: number;
  /** Total bullet wounds taken in hand/deck; populated only for self or at gameEnd. */
  bulletsReceived?: number;
  loot: LootView[];
  connected: boolean;
  isBot?: boolean;
  botDifficulty?: BotDifficulty;
  /** Only filled for the viewer himself. */
  hand?: PlayerCard[];
}

export interface PlayedCardView {
  playerId: string;
  faceUp: boolean;
  /** null when face-down and not yet revealed. */
  card: ActionCard | null;
}

export interface GameView {
  id: string;
  phase: GamePhase;
  lobby: LobbyPlayer[];
  hostId: string | null;
  viewerId: string | null;
  players: PlayerView[];
  train: TrainCarView[];
  marshalCar: number;
  roundIndex: number;
  totalRounds: number;
  currentRound: RoundCard | null;
  firstPlayerSeat: number;
  planning: PlanningState | null;
  actionStack: PlayedCardView[];
  execution: ExecutionState | null;
  neutralBullets: number;
  scores: ScoreLine[] | null;
  winnerIds: string[];
  log: GameEvent[];
  version: number;
}
