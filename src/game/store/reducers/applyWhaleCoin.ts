import { GameStats, clampStats } from '../GameStore';

export type WhaleCoinChoice = 'ignore' | 'invest';
export interface WhaleCoinResult {
  stats: GameStats;
  won: boolean | null;   // null if ignored
  timerDelta: number;     // seconds to subtract from level timer
}

/**
 * Whale Coin popup — max once per level, forced in L3.
 * Ignore: Diamonds +2, Integrity +1
 * Invest (50/50):
 *   Win:  Diamonds +15, Preparation +5, Integrity -1, WhaleCoinWins +1
 *   Lose: Diamonds -8 (min 0), Preparation -3, Integrity -5, Hearts -1,
 *         Timer -8s, WhaleCoinLosses +1
 */
export function applyWhaleCoin(
  stats: GameStats,
  choice: WhaleCoinChoice,
  roll: boolean, // true = win, false = lose (caller uses rng)
): WhaleCoinResult {
  if (choice === 'ignore') {
    return {
      stats: clampStats({
        ...stats,
        diamonds: stats.diamonds + 2,
        integrity: stats.integrity + 1,
      }),
      won: null,
      timerDelta: 0,
    };
  }

  // Invest
  if (roll) {
    // Win
    return {
      stats: clampStats({
        ...stats,
        diamonds: stats.diamonds + 15,
        preparation: stats.preparation + 5,
        integrity: stats.integrity - 1,
        whaleCoinWins: stats.whaleCoinWins + 1,
      }),
      won: true,
      timerDelta: 0,
    };
  }

  // Lose
  return {
    stats: clampStats({
      ...stats,
      diamonds: stats.diamonds - 8,
      preparation: stats.preparation - 3,
      integrity: stats.integrity - 5,
      hearts: stats.hearts - 1,
      whaleCoinLosses: stats.whaleCoinLosses + 1,
    }),
    won: false,
    timerDelta: -8,
  };
}
