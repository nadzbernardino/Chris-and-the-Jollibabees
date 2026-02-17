import { describe, it, expect } from 'vitest';
import {
  GAME_WIDTH, GAME_HEIGHT, UI_SCALE,
  PALETTE, PALETTE_CSS, PALETTE_ENTRIES, PALETTE_CSS_ENTRIES,
  FONT_SIZES, SPACING, MIN_TAP_TARGET,
  INITIAL_STATS, SCENES,
} from '../config';

describe('Game dimensions', () => {
  it('internal resolution is 1280x720', () => {
    expect(GAME_WIDTH).toBe(1280);
    expect(GAME_HEIGHT).toBe(720);
  });

  it('aspect ratio is 16:9', () => {
    expect(GAME_WIDTH / GAME_HEIGHT).toBeCloseTo(16 / 9, 2);
  });
});

describe('UI_SCALE', () => {
  it('defaults to 1', () => {
    expect(UI_SCALE).toBe(1);
  });
});

describe('FONT_SIZES', () => {
  it('has all expected size tiers', () => {
    expect(FONT_SIZES.xs).toBe(8);
    expect(FONT_SIZES.sm).toBe(12);
    expect(FONT_SIZES.md).toBe(16);
    expect(FONT_SIZES.lg).toBe(24);
    expect(FONT_SIZES.xl).toBe(32);
    expect(FONT_SIZES.xxl).toBe(48);
  });

  it('all sizes are positive multiples of 4', () => {
    Object.values(FONT_SIZES).forEach(s => {
      expect(s).toBeGreaterThan(0);
      expect(s % 4).toBe(0);
    });
  });
});

describe('SPACING', () => {
  it('has all expected tiers', () => {
    expect(SPACING.xs).toBe(4);
    expect(SPACING.sm).toBe(8);
    expect(SPACING.md).toBe(16);
    expect(SPACING.lg).toBe(24);
    expect(SPACING.xl).toBe(32);
  });
});

describe('MIN_TAP_TARGET', () => {
  it('is at least 44px (Apple HIG)', () => {
    expect(MIN_TAP_TARGET).toBeGreaterThanOrEqual(44);
  });
});

describe('PALETTE', () => {
  const expectedKeys = [
    'forest1', 'forest2', 'forest3',
    'wood1', 'wood2',
    'highlight1', 'highlight2',
    'mist', 'ivory', 'champagne', 'danger',
    'chrisRed', 'jollibeeRed',
  ];

  it('contains all required color keys', () => {
    expectedKeys.forEach(key => {
      expect(PALETTE).toHaveProperty(key);
    });
  });

  it('all values are valid hex numbers in 0x000000..0xFFFFFF range', () => {
    Object.values(PALETTE).forEach(v => {
      expect(typeof v).toBe('number');
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(0xffffff);
    });
  });

  it('forest colors match CLAUDE.md spec', () => {
    expect(PALETTE.forest1).toBe(0x1f3b2c);
    expect(PALETTE.forest2).toBe(0x2f4f3e);
    expect(PALETTE.forest3).toBe(0x3f6b4f);
  });

  it('wood colors match CLAUDE.md spec', () => {
    expect(PALETTE.wood1).toBe(0x5c3a21);
    expect(PALETTE.wood2).toBe(0x7a4e2d);
  });

  it('highlights match CLAUDE.md spec', () => {
    expect(PALETTE.highlight1).toBe(0xe8b45e);
    expect(PALETTE.highlight2).toBe(0xf4c76a);
  });

  it('character colors are correct', () => {
    expect(PALETTE.chrisRed).toBe(0xb03a2e);
    expect(PALETTE.jollibeeRed).toBe(0xd72631);
  });
});

describe('PALETTE_CSS', () => {
  it('has the same keys as PALETTE', () => {
    const paletteKeys = Object.keys(PALETTE).sort();
    const cssKeys = Object.keys(PALETTE_CSS).sort();
    expect(cssKeys).toEqual(paletteKeys);
  });

  it('all values are valid CSS hex color strings', () => {
    Object.values(PALETTE_CSS).forEach(v => {
      expect(v).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  it('CSS values correspond to numeric PALETTE values', () => {
    Object.keys(PALETTE).forEach(key => {
      const k = key as keyof typeof PALETTE;
      const num = PALETTE[k];
      const css = PALETTE_CSS[k];
      const parsed = parseInt(css.slice(1), 16);
      expect(parsed).toBe(num);
    });
  });
});

describe('PALETTE_ENTRIES / PALETTE_CSS_ENTRIES', () => {
  it('PALETTE_ENTRIES length matches PALETTE keys', () => {
    expect(PALETTE_ENTRIES.length).toBe(Object.keys(PALETTE).length);
  });

  it('PALETTE_CSS_ENTRIES length matches PALETTE_CSS keys', () => {
    expect(PALETTE_CSS_ENTRIES.length).toBe(Object.keys(PALETTE_CSS).length);
  });
});

describe('INITIAL_STATS', () => {
  it('matches CLAUDE.md defaults', () => {
    expect(INITIAL_STATS.preparation).toBe(0);
    expect(INITIAL_STATS.integrity).toBe(50);
    expect(INITIAL_STATS.energy).toBe(100);
    expect(INITIAL_STATS.hearts).toBe(3);
    expect(INITIAL_STATS.diamonds).toBe(0);
    expect(INITIAL_STATS.whaleCoinWins).toBe(0);
    expect(INITIAL_STATS.whaleCoinLosses).toBe(0);
    expect(INITIAL_STATS.hasRing).toBe(false);
  });
});

describe('SCENES', () => {
  it('contains all 9 scene keys', () => {
    const keys = Object.keys(SCENES);
    expect(keys.length).toBe(9);
  });

  it('all scene values are unique strings', () => {
    const values = Object.values(SCENES);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(values.length);
    values.forEach(v => expect(typeof v).toBe('string'));
  });

  it('includes required scenes from CLAUDE.md', () => {
    expect(SCENES.INTRO).toBeDefined();
    expect(SCENES.WORLD_MAP).toBeDefined();
    expect(SCENES.LEVEL).toBeDefined();
    expect(SCENES.MARKET).toBeDefined();
    expect(SCENES.SLEEP).toBeDefined();
    expect(SCENES.FINAL_PICKUP).toBeDefined();
    expect(SCENES.ENDING).toBeDefined();
    expect(SCENES.GAME_OVER).toBeDefined();
    expect(SCENES.PALETTE_DEMO).toBeDefined();
  });
});
