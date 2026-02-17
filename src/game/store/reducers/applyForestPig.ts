import { GameStats, clampStats } from '../GameStore';

/**
 * Temptation Incoming Call — BLOCK result only.
 * ACCEPT / timeout → instant Game Over (handled in LevelScene).
 * BLOCK (success): Preparation +3, Diamonds +1 (no penalty).
 */
export function applyForestPig(
  stats: GameStats,
  avoided: boolean,
): { stats: GameStats; timerDelta: number } {
  if (avoided) {
    return {
      stats: clampStats({
        ...stats,
        preparation: stats.preparation + 3,
        diamonds: stats.diamonds + 1,
      }),
      timerDelta: 0,
    };
  }
  // ACCEPT/timeout should never reach here — game over is handled in LevelScene.
  // Fallback: no stat change, no timer change.
  return { stats, timerDelta: 0 };
}
