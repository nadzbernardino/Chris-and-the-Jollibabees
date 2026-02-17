import { INITIAL_STATS } from '../config';

export interface GameStats {
  preparation: number;
  integrity: number;
  energy: number;
  hearts: number;
  diamonds: number;
  whaleCoinWins: number;
  whaleCoinLosses: number;
  hasRing: boolean;
  hasCoffee: boolean;
  hasGadget: boolean;
  hasFlowers: boolean;
}

/**
 * Jollibabee unlock order: one unlocked after each level.
 * Index = levelId - 1.
 */
export const JOLLIBABEE_UNLOCK_ORDER = [
  'JolliCute',    // after L1 — leader
  'JolliBart',    // after L2 — dreamer (BART lines)
  'JolliBay',     // after L3 — bullied
  'JolliLite',    // after L4 — pusher
  'JolliBig',     // after L5 — big
  'JolliBurrito', // after L6 — fly
] as const;

export interface Progression {
  completedLevels: Set<number>;  // 1-6
  unlockedLevel: number;         // highest unlocked (starts 1)
  sleepCompleted: boolean;
  marketAvailableAfterLevel: number | null; // 2 or 5 when pending
  unlockedJollibabees: number;   // 0-6, how many have been found
}

export interface UIState {
  modalOpen: boolean;
}

export interface GameState {
  stats: GameStats;
  progression: Progression;
  ui: UIState;
}

/** Clamp a number between min and max */
export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/** Clamp all stats to their valid ranges */
export function clampStats(stats: GameStats): GameStats {
  return {
    ...stats,
    preparation: clamp(stats.preparation, 0, 100),
    integrity: clamp(stats.integrity, 0, 100),
    energy: clamp(stats.energy, 0, 100),
    hearts: clamp(stats.hearts, 0, 3),
    diamonds: Math.max(0, stats.diamonds),
    whaleCoinWins: Math.max(0, stats.whaleCoinWins),
    whaleCoinLosses: Math.max(0, stats.whaleCoinLosses),
    hasRing: stats.hasRing,
    hasCoffee: stats.hasCoffee,
    hasGadget: stats.hasGadget,
    hasFlowers: stats.hasFlowers,
  };
}

function createInitialState(): GameState {
  return {
    stats: { ...INITIAL_STATS },
    progression: {
      completedLevels: new Set(),
      unlockedLevel: 1,
      sleepCompleted: false,
      marketAvailableAfterLevel: null,
      unlockedJollibabees: 0,
    },
    ui: {
      modalOpen: false,
    },
  };
}

/**
 * Singleton game store — single source of truth.
 * All mutations go through reducers that return new stats objects.
 */
class GameStore {
  private state: GameState;

  constructor() {
    this.state = createInitialState();
  }

  get stats(): GameStats { return this.state.stats; }
  get progression(): Progression { return this.state.progression; }
  get ui(): UIState { return this.state.ui; }

  /** Replace stats (after reducer + clamp) */
  setStats(stats: GameStats): void {
    this.state.stats = clampStats(stats);
  }

  /** Update a single stat field */
  updateStats(partial: Partial<GameStats>): void {
    this.setStats({ ...this.state.stats, ...partial });
  }

  /** Mark a level as completed, unlock next level, and unlock a jollibabee */
  completeLevel(levelId: number): void {
    this.state.progression.completedLevels.add(levelId);
    const next = levelId + 1;
    if (next <= 6 && next > this.state.progression.unlockedLevel) {
      this.state.progression.unlockedLevel = next;
    }
    // Market gates
    if (levelId === 2 || levelId === 5) {
      this.state.progression.marketAvailableAfterLevel = levelId;
    }
    // Unlock a jollibabee (one per level, capped at 6)
    if (this.state.progression.unlockedJollibabees < 6) {
      this.state.progression.unlockedJollibabees++;
    }
  }

  /** How many jollibabees are currently unlocked */
  get jollibabeeCount(): number {
    return this.state.progression.unlockedJollibabees;
  }

  /** Get the name of the most recently unlocked jollibabee (or null) */
  getLastUnlockedJollibabeeName(): string | null {
    const count = this.state.progression.unlockedJollibabees;
    if (count <= 0) return null;
    return JOLLIBABEE_UNLOCK_ORDER[count - 1];
  }

  /** Clear pending market flag */
  clearMarketAvailable(): void {
    this.state.progression.marketAvailableAfterLevel = null;
  }

  /** Mark sleep as completed */
  completeSleep(): void {
    this.state.progression.sleepCompleted = true;
  }

  /** Check if all 6 levels are completed */
  allLevelsComplete(): boolean {
    for (let i = 1; i <= 6; i++) {
      if (!this.state.progression.completedLevels.has(i)) return false;
    }
    return true;
  }

  /** Set modal state */
  setModalOpen(open: boolean): void {
    this.state.ui.modalOpen = open;
  }

  /** Full reset for new run */
  reset(): void {
    this.state = createInitialState();
  }
}

/** Global store singleton */
export const store = new GameStore();
