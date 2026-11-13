import type { GameView } from '@colt/shared';
import type { UI_STRINGS, Lang } from '../../i18n.js';
import { CharacterPortrait } from '../art/CharacterPortrait.js';
import { BulletToken, LootToken } from '../art/LootToken.js';

interface Props {
  t: (typeof UI_STRINGS)[Lang];
  game: GameView;
  isHost: boolean;
  busy: boolean;
  onRematch: () => void;
  onLeave: () => void;
}

/**
 * Remastered 1899 Western Heist Podium Scoreboard matching the celebratory final results view:
 * highlights top finishers with portraits, revealed loot stashes, Gunslinger +$1,000 bonus,
 * and Host Rematch control.
 */
export function ScoreboardScreen({ t, game, isHost, busy, onRematch, onLeave }: Props) {
  const scores = game.scores ?? [];
  const top3 = scores.slice(0, 3);
  const rest = scores.slice(3);
  // Display top 3 in classic podium visual order: #2 Left, #1 Center Elevated, #3 Right
  const podiumOrder = top3.length >= 2 ? [top3[1]!, top3[0]!, ...(top3[2] ? [top3[2]] : [])] : top3;

  return (
    <div className="scoreboard-podium-overlay" data-testid="scoreboard-podium">
      <div className="scoreboard-ribbon-head">
        <h2>🏆 {t.podiumTitle}</h2>
        <p className="scoreboard-winners-line">
          {t.winners}:{' '}
          <strong>
            {game.winnerIds.map((id) => game.players.find((p) => p.id === id)?.name).join(', ')}
          </strong>
        </p>
      </div>

      <div className="podium-stage">
        {podiumOrder.map((s) => {
          const p = game.players.find((x) => x.id === s.playerId);
          if (!p) return null;
          const isWinner = game.winnerIds.includes(s.playerId);
          return (
            <div
              key={s.playerId}
              className={`podium-column rank-${s.rank} ${isWinner ? 'is-winner' : ''}`}
            >
              <div className="podium-medal">{s.rank === 1 ? '👑 #1' : `#${s.rank}`}</div>
              <div className="podium-avatar-wrap">
                <CharacterPortrait
                  character={p.character}
                  size={s.rank === 1 ? 74 : 58}
                  variant="avatar"
                  pose={s.rank === 1 ? 'rob' : 'idle'}
                />
                {s.gunslingerBonus > 0 && (
                  <span className="podium-gunslinger-badge" title={`${t.gunslingerBonus}: +$${s.gunslingerBonus}`}>
                    <BulletToken size={22} number={6} />
                    <span>+$1K</span>
                  </span>
                )}
              </div>
              <div className="podium-name">
                {p.name}
                {p.isBot ? <span className="bot-chip">🤖</span> : null}
              </div>
              <div className="podium-total">${s.total.toLocaleString()}</div>
              <div className="podium-loot-row">
                {p.loot.map((l) => (
                  <LootToken key={l.id} type={l.type} value={l.value} size={22} />
                ))}
              </div>
              <div className="podium-stats">
                <span>🎯 {s.bulletsFired}/6</span>
                <span>💢 {s.bulletsReceived}</span>
              </div>
            </div>
          );
        })}
      </div>

      {rest.length > 0 && (
        <div className="podium-runners-up">
          {rest.map((s) => {
            const p = game.players.find((x) => x.id === s.playerId);
            if (!p) return null;
            return (
              <div key={s.playerId} className="runner-row">
                <span className="runner-rank">#{s.rank}</span>
                <CharacterPortrait character={p.character} size={28} variant="avatar" />
                <strong>{p.name}</strong>
                {s.gunslingerBonus > 0 && <span className="runner-gun">🎯 +$1K</span>}
                <span className="runner-stats">
                  {t.bulletsFired}: {s.bulletsFired} | {t.bulletsTaken}: {s.bulletsReceived}
                </span>
                <strong className="runner-total">${s.total.toLocaleString()}</strong>
              </div>
            );
          })}
        </div>
      )}

      <div className="scoreboard-actions">
        {isHost && (
          <button
            type="button"
            className="primary-cta"
            data-testid="rematch-btn"
            disabled={busy}
            onClick={onRematch}
          >
            🔁 {t.rematchBtn}
          </button>
        )}
        <button type="button" className="secondary" onClick={onLeave} disabled={busy}>
          {t.leaveMenuBtn}
        </button>
      </div>
    </div>
  );
}
