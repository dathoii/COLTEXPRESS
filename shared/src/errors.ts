/** Error codes shared by engine, server and client. */
export type ErrorCode =
  | 'INVALID_PHASE'
  | 'NOT_YOUR_TURN'
  | 'INVALID_CARD'
  | 'INVALID_CHOICE'
  | 'INVALID_PLAYER_COUNT'
  | 'CHARACTER_TAKEN'
  | 'PLAYER_NOT_FOUND'
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'ROOM_PAUSED'
  | 'ROOM_CLOSED'
  | 'WRONG_PASSWORD'
  | 'FORBIDDEN'
  | 'DUPLICATE_EVENT'
  | 'NOT_HOST'
  | 'NOT_READY'
  | 'BAD_REQUEST'
  | 'INTERNAL';

export class GameError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'GameError';
  }
}

export function isGameError(e: unknown): e is GameError {
  return e instanceof GameError || (typeof e === 'object' && e !== null && (e as { name?: string }).name === 'GameError');
}
