/**
 * Seedable RNG wrapper for deterministic outcomes (whale coin, etc.)
 * Uses a simple mulberry32 PRNG.
 */
export class RNG {
  private state: number;

  constructor(seed?: number) {
    this.state = seed ?? (Date.now() | 0);
  }

  /** Returns a float in [0, 1) */
  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Returns true with given probability (default 0.5) */
  chance(p = 0.5): boolean {
    return this.next() < p;
  }

  /** Returns a random integer in [min, max] inclusive */
  intBetween(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }
}

/** Global RNG instance */
export const rng = new RNG();
