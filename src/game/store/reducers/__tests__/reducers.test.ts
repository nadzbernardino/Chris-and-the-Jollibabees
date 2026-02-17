import { describe, it, expect } from 'vitest';
import { INITIAL_STATS } from '../../../config';
import { GameStats, clampStats } from '../../GameStore';
import { applyWhaleCoin } from '../applyWhaleCoin';
import { applyMarketPurchase } from '../applyMarketPurchase';
import { applyDarmeshChoice } from '../applyDarmeshChoice';
import { applySleep } from '../applySleep';
import { applyLevelResult } from '../applyLevelResult';
import { applyForestPig } from '../applyForestPig';
import { applyDoomScroll } from '../applyDoomScroll';

function fresh(): GameStats {
  return { ...INITIAL_STATS };
}

describe('clampStats', () => {
  it('clamps values to valid ranges', () => {
    const s = clampStats({ ...fresh(), preparation: 150, hearts: -1, diamonds: -5, integrity: 200 });
    expect(s.preparation).toBe(100);
    expect(s.hearts).toBe(0);
    expect(s.diamonds).toBe(0);
    expect(s.integrity).toBe(100);
  });
});

describe('applyWhaleCoin', () => {
  it('ignore gives +2 diamonds, +1 integrity', () => {
    const result = applyWhaleCoin(fresh(), 'ignore', false);
    expect(result.stats.diamonds).toBe(2);
    expect(result.stats.integrity).toBe(51);
    expect(result.won).toBeNull();
    expect(result.timerDelta).toBe(0);
  });

  it('invest win gives +15 diamonds, +5 prep, -1 integrity', () => {
    const result = applyWhaleCoin(fresh(), 'invest', true);
    expect(result.stats.diamonds).toBe(15);
    expect(result.stats.preparation).toBe(5);
    expect(result.stats.integrity).toBe(49);
    expect(result.stats.whaleCoinWins).toBe(1);
    expect(result.won).toBe(true);
  });

  it('invest lose gives -8 diamonds (min 0), -3 prep, -5 integrity, -1 heart, timer -8', () => {
    const result = applyWhaleCoin(fresh(), 'invest', false);
    expect(result.stats.diamonds).toBe(0); // was 0, clamped
    expect(result.stats.preparation).toBe(0); // was 0 - 3 = clamped to 0
    expect(result.stats.integrity).toBe(45);
    expect(result.stats.hearts).toBe(2);
    expect(result.stats.whaleCoinLosses).toBe(1);
    expect(result.timerDelta).toBe(-8);
    expect(result.won).toBe(false);
  });
});

describe('applyMarketPurchase', () => {
  it('returns null if cant afford', () => {
    expect(applyMarketPurchase(fresh(), 'coffee')).toBeNull();
  });

  it('coffee costs 5, energy +10, integrity -1', () => {
    const s = { ...fresh(), diamonds: 10 };
    const result = applyMarketPurchase(s, 'coffee')!;
    expect(result.diamonds).toBe(5);
    expect(result.energy).toBe(100); // clamped at 100
    expect(result.integrity).toBe(49);
  });

  it('ring sets hasRing', () => {
    const s = { ...fresh(), diamonds: 30 };
    const result = applyMarketPurchase(s, 'ring')!;
    expect(result.hasRing).toBe(true);
    expect(result.preparation).toBe(10);
    expect(result.integrity).toBe(60);
    expect(result.diamonds).toBe(5);
  });
});

describe('applyDarmeshChoice', () => {
  it('take call: energy -10, integrity +3, prep +3', () => {
    const result = applyDarmeshChoice(fresh(), 'take');
    expect(result.energy).toBe(90);
    expect(result.integrity).toBe(53);
    expect(result.preparation).toBe(3);
  });

  it('ignore: integrity -5', () => {
    const result = applyDarmeshChoice(fresh(), 'ignore');
    expect(result.integrity).toBe(45);
  });
});

describe('applySleep', () => {
  it('sets energy 100, prep +10, integrity +5', () => {
    const s = { ...fresh(), energy: 30, preparation: 40 };
    const result = applySleep(s);
    expect(result.energy).toBe(100);
    expect(result.preparation).toBe(50);
    expect(result.integrity).toBe(55);
  });
});

describe('applyLevelResult', () => {
  it('L1: prep +5, energy -5, diamonds +1', () => {
    const result = applyLevelResult(fresh(), 1);
    expect(result.preparation).toBe(5);
    expect(result.energy).toBe(95);
    expect(result.diamonds).toBe(1);
  });

  it('L5: prep +8, integrity +2, energy -5', () => {
    const result = applyLevelResult(fresh(), 5);
    expect(result.preparation).toBe(8);
    expect(result.integrity).toBe(52);
    expect(result.energy).toBe(95);
  });
});

describe('applyForestPig', () => {
  it('avoided: no change', () => {
    const s = fresh();
    const result = applyForestPig(s, true);
    expect(result.stats).toEqual(s);
    expect(result.timerDelta).toBe(0);
  });

  it('failed: integrity -3, timer -5', () => {
    const result = applyForestPig(fresh(), false);
    expect(result.stats.integrity).toBe(47);
    expect(result.timerDelta).toBe(-5);
  });
});

describe('applyDoomScroll', () => {
  it('scroll: integrity -5, timer -8', () => {
    const result = applyDoomScroll(fresh(), 'scroll');
    expect(result.stats.integrity).toBe(45);
    expect(result.timerDelta).toBe(-8);
  });

  it('close: integrity +1', () => {
    const result = applyDoomScroll(fresh(), 'close');
    expect(result.stats.integrity).toBe(51);
    expect(result.timerDelta).toBe(0);
  });
});
