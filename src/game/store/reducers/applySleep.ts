import { GameStats, clampStats } from '../GameStore';

/**
 * Sacred Sleep — required before Level 6.
 * Energy = 100, Preparation +10, Integrity +5
 */
export function applySleep(stats: GameStats): GameStats {
  return clampStats({
    ...stats,
    energy: 100,
    preparation: stats.preparation + 10,
    integrity: stats.integrity + 5,
  });
}
