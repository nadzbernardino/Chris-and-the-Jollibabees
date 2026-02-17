import { GameStats, clampStats } from '../GameStore';

export type DarmeshChoice = 'take' | 'ignore';

/**
 * Darmesh Call — Level 4 only.
 * Take call:  Energy -10, Integrity +3, Preparation +3
 * Ignore:     Integrity -5
 */
export function applyDarmeshChoice(
  stats: GameStats,
  choice: DarmeshChoice,
): GameStats {
  if (choice === 'take') {
    return clampStats({
      ...stats,
      energy: stats.energy - 10,
      integrity: stats.integrity + 3,
      preparation: stats.preparation + 3,
    });
  }

  return clampStats({
    ...stats,
    integrity: stats.integrity - 5,
  });
}
