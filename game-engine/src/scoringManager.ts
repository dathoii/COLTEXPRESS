import type { GameState, ScoreLine } from '@colt/shared';
import { BULLETS_PER_BANDIT, GUNSLINGER_BONUS } from '@colt/game-rules';
import { bulletsFired, bulletsReceived, lootValue } from './playerManager.js';

/**
 * Scoring Manager:
 *  - total = value of all loot held
 *  - Gunslinger bonus $1000 ONLY to bandit(s) who fired all 6 bullets (6/6 fired / 0 bullets left)
 *  - richest wins; tie broken by fewest bullet cards received; if still tied, shared victory.
 */
export function computeScores(state: GameState): { scores: ScoreLine[]; winnerIds: string[] } {
  const fired = state.players.map((p) => bulletsFired(p, BULLETS_PER_BANDIT));
  const lines: ScoreLine[] = state.players.map((p, i) => {
    const lv = lootValue(p);
    const bonus = fired[i] === BULLETS_PER_BANDIT ? GUNSLINGER_BONUS : 0;
    return {
      playerId: p.id,
      lootValue: lv,
      gunslingerBonus: bonus,
      total: lv + bonus,
      bulletsFired: fired[i]!,
      bulletsReceived: bulletsReceived(p),
      rank: 0,
    };
  });
  lines.sort((a, b) => b.total - a.total || a.bulletsReceived - b.bulletsReceived);
  lines.forEach((l, i) => {
    const prev = lines[i - 1];
    l.rank = prev && prev.total === l.total && prev.bulletsReceived === l.bulletsReceived ? prev.rank : i + 1;
  });
  const winnerIds = lines.filter((l) => l.rank === 1).map((l) => l.playerId);
  return { scores: lines, winnerIds };
}
