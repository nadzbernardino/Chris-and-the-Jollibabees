import { GameStats, clampStats } from '../GameStore';

/** Base rewards per level from CLAUDE.md + balanced diamond income */
const LEVEL_REWARDS: Record<number, Partial<GameStats>> = {
  1: { preparation: 5,  energy: -5,  diamonds: 3 },
  2: { preparation: 3,  diamonds: 3 },
  3: { preparation: 4,  energy: -5,  diamonds: 4 },
  4: { preparation: 3,  diamonds: 3 },
  5: { preparation: 8,  integrity: 2,  energy: -5,  diamonds: 4 },
  6: { preparation: 6,  integrity: 3,  energy: -5,  diamonds: 5 },
};

/**
 * Apply base reward for completing a level.
 * Choice-based effects (whale, darmesh, etc.) are applied separately.
 */
export function applyLevelResult(stats: GameStats, levelId: number): GameStats {
  const reward = LEVEL_REWARDS[levelId];
  if (!reward) return stats;

  return clampStats({
    ...stats,
    preparation: stats.preparation + (reward.preparation ?? 0),
    integrity: stats.integrity + (reward.integrity ?? 0),
    energy: stats.energy + (reward.energy ?? 0),
    diamonds: stats.diamonds + (reward.diamonds ?? 0),
  });
}
