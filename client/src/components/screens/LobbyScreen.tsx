import type { BotDifficulty, CharacterId, GameView, ParticipantRole, RoomInfo } from '@colt/shared';
import type { UI_STRINGS } from '../../i18n.js';
import { type Lang } from '../../i18n.js';
import { CharacterPortrait } from '../art/CharacterPortrait.js';
import { CHARACTER_PALETTES } from '../art/CharacterSprite.js';
import { CharacterCardTile } from '../art/PlayingCard.js';
import './LobbyScreen.css';

const CHARACTER_IDS: CharacterId[] = ['django', 'tuco', 'doc', 'cheyenne', 'ghost', 'belle'];
const TURN_TIMEOUT_OPTIONS = [0, 20, 30, 45, 60] as const;

interface Props {
  t: (typeof UI_STRINGS)[Lang];
  lang: Lang;
  game: GameView;
  room: RoomInfo;
  viewerId: string | null;
  role: ParticipantRole;
  isHost: boolean;
  isSpectator: boolean;
  busy: boolean;
  onCopyInvite: () => void;
  onCloseRoom: () => void;
  onLeaveRoom: () => void;
  onSwitchRole: (asSpectator: boolean) => void;
  onToggleReady: (ready: boolean) => void;
  onStartGame: () => void;
  onSelectCharacter: (character: CharacterId | null) => void;
  onAddBot?: (difficulty: BotDifficulty) => void;
  onRemoveBot?: (playerId: string) => void;
  onUpdateTurnTimeout?: (turnTimeoutSec: number) => void;
}

function UnpickedOutlawBadge() {
  return (
    <svg viewBox="0 0 32 32" width="22" height="22" aria-hidden="true">
      <circle cx="16" cy="18" r="8" fill="#5e4129" stroke="#d9ae67" strokeWidth="1.2" />
      <ellipse cx="16" cy="12" rx="11" ry="2.6" fill="#2c1b10" stroke="#c89a4e" strokeWidth="1.1" />
      <path d="M10,12 L12,6 L20,6 L22,12 Z" fill="#3b2516" stroke="#c89a4e" strokeWidth="1.1" />
    </svg>
  );
}

/** Screen 2 (Phòng Chờ): Saloon interior with leather roster panels & 6 painted cowboy portrait cards. */
export function LobbyScreen({
  t,
  lang,
  game,
  room,
  viewerId,
  role,
  isHost,
  isSpectator,
  busy,
  onCopyInvite,
  onCloseRoom,
  onLeaveRoom,
  onSwitchRole,
  onToggleReady,
  onStartGame,
  onSelectCharacter,
  onAddBot,
  onRemoveBot,
  onUpdateTurnTimeout,
}: Props) {
  const me = game.lobby.find((l) => l.id === viewerId);
  const turnTimeoutSec = room.turnTimeoutSec ?? 0;

  return (
    <section className="card lobby-card screen-lobby" data-testid="lobby-card">
      <div className="lobby-saloon-bg" aria-hidden="true" />
      <div className="lobby-saloon-vignette" aria-hidden="true" />

      <div className="lobby-content-layer">
        <div className="lobby-header-plaque">
          <h2>
            {t.lobbyTitle} — {room.name} ({t.roomLabel}: {room.code})
          </h2>
          <div className="lobby-header-actions">
            <button type="button" className="secondary" onClick={onCopyInvite}>
              {t.copyInvite}
            </button>
            {isHost && (
              <button type="button" className="danger" onClick={onCloseRoom}>
                {t.closeRoom}
              </button>
            )}
            <button type="button" className="secondary" onClick={onLeaveRoom}>
              {t.leaveRoom}
            </button>
          </div>
        </div>

        <div className="lobby-rules-ribbon">
          <span className="lobby-rules-diamond" aria-hidden="true">◆</span>
          <p>
            {t.hostMode}: <strong>{room.hostMode === 'dedicated' ? t.dedicatedHost : t.hostPlayer}</strong> |{' '}
            {room.hasPassword ? t.passwordProtected : t.inviteCodeOnly} | {t.requiresPlayers} |{' '}
            {t.turnTimerLabel}:{' '}
            {isHost && onUpdateTurnTimeout ? (
              <select
                className="lobby-timer-select"
                aria-label={t.turnTimerLabel}
                value={turnTimeoutSec}
                disabled={busy}
                onChange={(e) => onUpdateTurnTimeout(Number(e.target.value))}
              >
                {TURN_TIMEOUT_OPTIONS.map((sec) => (
                  <option key={sec} value={sec}>
                    {sec === 0 ? t.turnTimerNone : `${sec} ${t.turnTimerSecLabel}`}
                  </option>
                ))}
              </select>
            ) : (
              <strong>{turnTimeoutSec === 0 ? t.turnTimerNone : `${turnTimeoutSec} ${t.turnTimerSecLabel}`}</strong>
            )}
          </p>
          <span className="lobby-rules-diamond" aria-hidden="true">◆</span>
        </div>

        <div className="lobby-two-cols">
          <div className="lobby-panel">
            <h3>
              {t.playersCount} ({game.lobby.length}/6)
            </h3>
            <ul className="lobby-player-list">
              {game.lobby.map((p) => {
                const charLabel = p.character ? CHARACTER_PALETTES[p.character]?.label ?? p.character : t.noChar;
                return (
                  <li key={p.id} className="lobby-player-pill">
                    <span className="lobby-pill-avatar">
                      {p.character ? (
                        <CharacterPortrait character={p.character} size={32} variant="avatar" />
                      ) : (
                        <UnpickedOutlawBadge />
                      )}
                    </span>
                    <span className="lobby-pill-info">
                      <strong>{p.name}</strong> {p.id === game.hostId ? t.hostTag : ''}
                      {p.isBot && (
                        <span className="bot-chip">
                          {t.botBadge} ({p.botDifficulty ?? 'normal'})
                        </span>
                      )}{' '}
                      — {charLabel} —{' '}
                      <span style={{ color: p.ready ? '#62df7d' : '#ceb385' }}>
                        {p.ready ? t.ready : t.notReady}
                      </span>{' '}
                      <span style={{ color: p.connected ? '#75e48d' : '#ff8c7a' }}>
                        [{p.connected ? t.online : t.offline}]
                      </span>
                    </span>
                    {isHost && p.isBot && onRemoveBot && (
                      <button
                        type="button"
                        className="danger lobby-remove-bot-btn"
                        disabled={busy}
                        title={t.removeBot}
                        aria-label={`${t.removeBot} ${p.name}`}
                        onClick={() => onRemoveBot(p.id)}
                      >
                        ×
                      </button>
                    )}
                    <span className="lobby-pill-dots" aria-hidden="true">
                      <span className={`lobby-dot ${p.connected ? 'is-on' : 'is-off'}`} />
                      <span className={`lobby-dot ${p.ready ? 'is-ready' : 'is-off'}`} />
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="lobby-panel">
            <h3>
              {t.spectatorsCount} ({room.spectators.length})
            </h3>
            {room.spectators.length === 0 ? (
              <p className="lobby-spec-empty">{t.noSpectators}</p>
            ) : (
              <ul className="lobby-spec-list">
                {room.spectators.map((s) => (
                  <li key={s.id} className="lobby-player-pill">
                    <span className="lobby-pill-avatar">
                      <UnpickedOutlawBadge />
                    </span>
                    <span className="lobby-pill-info">
                      <strong>{s.name}</strong> {s.isModerator ? `(${t.dedicatedHost})` : `(${t.spectatorBadge})`} [
                      {s.connected ? t.online : t.offline}]
                    </span>
                    <span className="lobby-pill-dots" aria-hidden="true">
                      <span className={`lobby-dot ${s.connected ? 'is-on' : 'is-off'}`} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {role !== 'host-moderator' && (
              <button
                type="button"
                className="secondary lobby-spec-btn"
                disabled={busy}
                onClick={() => onSwitchRole(role === 'player')}
              >
                {role === 'player' ? t.stepBackSpectator : t.takeSeat}
              </button>
            )}
          </div>
        </div>

        <div className="lobby-bandit-header">
          <h3>{!isSpectator ? t.selectBandit : t.playersCount}</h3>
          <div className="lobby-ready-actions">
            {isHost && onAddBot && game.lobby.length < 6 && (
              <div className="lobby-bot-controls">
                <button
                  type="button"
                  data-testid="lobby-add-bot-easy-btn"
                  className="secondary lobby-bot-btn"
                  disabled={busy}
                  onClick={() => onAddBot('easy')}
                >
                  {t.addBotEasy}
                </button>
                <button
                  type="button"
                  data-testid="lobby-add-bot-normal-btn"
                  className="secondary lobby-bot-btn"
                  disabled={busy}
                  onClick={() => onAddBot('normal')}
                >
                  {t.addBotNormal}
                </button>
              </div>
            )}
            {!isSpectator && (
              <button
                type="button"
                data-testid="lobby-ready-btn"
                className={me?.ready ? 'success' : ''}
                onClick={() => onToggleReady(!me?.ready)}
                disabled={busy || !me?.character}
              >
                {me?.ready ? t.unready : t.markReady}
              </button>
            )}
            {isHost && (
              <button
                type="button"
                data-testid="lobby-start-btn"
                className="primary-cta"
                onClick={onStartGame}
                disabled={busy || game.lobby.length < 3 || game.lobby.some((l) => !l.ready)}
              >
                {t.startHeist} ({game.lobby.length}/6)
              </button>
            )}
          </div>
        </div>

        {!isSpectator && (
          <div className="char-grid">
            {CHARACTER_IDS.map((ch) => {
              const takenBy = game.lobby.find((l) => l.character === ch);
              const isMine = takenBy?.id === viewerId;
              return (
                <CharacterCardTile
                  key={ch}
                  character={ch}
                  selected={isMine}
                  takenBy={takenBy && !isMine ? takenBy.name : undefined}
                  disabled={busy || Boolean(takenBy && !isMine)}
                  lang={lang}
                  variant="portrait"
                  onSelect={() => onSelectCharacter(isMine ? null : ch)}
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
