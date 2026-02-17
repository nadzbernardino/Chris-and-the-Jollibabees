import { GameStats, clampStats } from '../GameStore';

export type DoomScrollChoice = 'scroll' | 'close';

/**
 * Doom Scroll temptation.
 * "Scroll more": Integrity -5, Timer -8s
 * "Close":       Integrity +1, Preparation +2, Diamonds +1
 */
export function applyDoomScroll(
  stats: GameStats,
  choice: DoomScrollChoice,
): { stats: GameStats; timerDelta: number } {
  if (choice === 'scroll') {
    return {
      stats: clampStats({
        ...stats,
        integrity: stats.integrity - 5,
      }),
      timerDelta: -8,
    };
  }
  return {
    stats: clampStats({
      ...stats,
      integrity: stats.integrity + 1,
      preparation: stats.preparation + 2,
      diamonds: stats.diamonds + 1,
    }),
    timerDelta: 0,
  };
}
