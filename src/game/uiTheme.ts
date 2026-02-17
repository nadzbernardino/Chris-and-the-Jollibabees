/**
 * uiTheme.ts — Cottage-fantasy 8-bit UI style guide.
 *
 * Single source of truth for every visual constant:
 * palette, typography, spacing, button states, overlay opacity.
 *
 * Import `UI` anywhere you need a value; never hard-code magic numbers.
 */

// ─── PALETTE ──────────────────────────────────────────────
export const PAL = {
  // Forest / woodland
  darkPine:     0x1f3b2c,
  forestGreen:  0x2f4f3e,
  mossGreen:    0x3f6b4f,

  // Wood / warm
  darkWood:     0x3f2a14,
  wood:         0x5c3a21,
  lightWood:    0x7a4e2d,
  warmBrown:    0x8b5e34,

  // Highlights
  champagne:    0xe8b45e,
  gold:         0xf4c76a,
  warmGold:     0xffe4b5,

  // Text / paper
  ivory:        0xf5f2ea,
  parchment:    0xeee4c8,
  darkText:     0x3a2a14,

  // Mist / accent
  mist:         0x6d8c8a,
  champagneGlow:0xe6c98b,

  // Feedback
  heartRed:     0xe84040,
  danger:       0xff6666,
  success:      0x6ab04c,
  overlay:      0x000000,
} as const;

/** CSS hex versions (for Phaser text style objects) */
export const PAL_CSS = {
  darkPine:     '#1F3B2C',
  forestGreen:  '#2F4F3E',
  mossGreen:    '#3F6B4F',
  darkWood:     '#3F2A14',
  wood:         '#5C3A21',
  lightWood:    '#7A4E2D',
  champagne:    '#E8B45E',
  gold:         '#F4C76A',
  warmGold:     '#FFE4B5',
  ivory:        '#F5F2EA',
  parchment:    '#EEE4C8',
  darkText:     '#3A2A14',
  mist:         '#6D8C8A',
  heartRed:     '#E84040',
  danger:       '#FF6666',
  success:      '#6AB04C',
} as const;

// ─── TYPOGRAPHY ───────────────────────────────────────────
// "Press Start 2P" — loaded via Google Fonts <link> in index.html.
// Fallback chain keeps the game playable before the font loads.
export const PIXEL_FONT = '"Press Start 2P", "Courier New", monospace';

export const TEXT = {
  /** Big title (intro screen, end screen) */
  title: {
    fontFamily: PIXEL_FONT,
    fontSize: '64px',
    color: PAL_CSS.gold,
    stroke: PAL_CSS.darkWood,
    strokeThickness: 8,
  } as Phaser.Types.GameObjects.Text.TextStyle,

  /** Section / modal title */
  heading: {
    fontFamily: PIXEL_FONT,
    fontSize: '32px',
    color: PAL_CSS.gold,
    stroke: '#000000',
    strokeThickness: 5,
  } as Phaser.Types.GameObjects.Text.TextStyle,

  /** Normal body text */
  body: {
    fontFamily: PIXEL_FONT,
    fontSize: '22px',
    color: PAL_CSS.ivory,
    stroke: '#000000',
    strokeThickness: 4,
    lineSpacing: 12,
  } as Phaser.Types.GameObjects.Text.TextStyle,

  /** Speech bubble text */
  bubble: {
    fontFamily: PIXEL_FONT,
    fontSize: '20px',
    color: PAL_CSS.darkText,
    lineSpacing: 8,
    wordWrap: { width: 500 },
    align: 'center' as const,
  } as Phaser.Types.GameObjects.Text.TextStyle,

  /** Button label */
  button: {
    fontFamily: PIXEL_FONT,
    fontSize: '22px',
    color: PAL_CSS.ivory,
    stroke: '#000000',
    strokeThickness: 4,
  } as Phaser.Types.GameObjects.Text.TextStyle,

  /** Small label (follower name, progress counter) */
  small: {
    fontFamily: PIXEL_FONT,
    fontSize: '16px',
    color: PAL_CSS.warmGold,
    stroke: '#000000',
    strokeThickness: 3,
  } as Phaser.Types.GameObjects.Text.TextStyle,

  /** HUD text (hearts, timer) */
  hud: {
    fontFamily: PIXEL_FONT,
    fontSize: '28px',
    color: PAL_CSS.heartRed,
    stroke: '#000000',
    strokeThickness: 5,
  } as Phaser.Types.GameObjects.Text.TextStyle,

  /** Minigame instruction header */
  instruction: {
    fontFamily: PIXEL_FONT,
    fontSize: '24px',
    color: PAL_CSS.warmGold,
    stroke: '#000000',
    strokeThickness: 5,
  } as Phaser.Types.GameObjects.Text.TextStyle,
} as const;

// ─── SPACING / SIZING ─────────────────────────────────────
export const UI = {
  /** Pixel-rounded corner radius (keep small for 8-bit feel) */
  radius: 12,
  /** Inner padding inside panels/bubbles */
  pad: 24,
  /** Minimum mobile tap target (design-space px; at 1536 wide ≈ 44 CSS px) */
  tapMin: 80,
  /** Button dimensions */
  btnW: 420,
  btnH: 80,
  /** Modal overlay alpha */
  overlayAlpha: 0.6,
  /** Nav arrow size */
  arrowW: 90,
  arrowH: 120,
} as const;

// ─── BUTTON HELPERS ───────────────────────────────────────

export const BTN = {
  idle: {
    fill: PAL.wood,
    border: PAL.darkWood,
    highlight: PAL.lightWood,  // 1px inner top edge
  },
  hover: {
    fill: PAL.lightWood,
    border: PAL.champagne,
    highlight: PAL.warmBrown,
  },
  pressed: {
    fill: PAL.darkWood,
    border: PAL.wood,
    highlight: PAL.wood,
  },
  success: {
    fill: PAL.mossGreen,
    border: PAL.forestGreen,
    highlight: PAL.success,
  },
  danger: {
    fill: 0x993333,
    border: 0x662222,
    highlight: 0xbb4444,
  },
} as const;

// ─── SPEECH BUBBLE PALETTE ────────────────────────────────

export const BUBBLE = {
  fill: PAL.parchment,
  stroke: PAL.lightWood,
  strokeWidth: 3,
  tailHeight: 14,
} as const;

// ─── MODAL PALETTE ────────────────────────────────────────

export const MODAL = {
  panelFill: PAL.forestGreen,
  panelStroke: PAL.lightWood,
  panelStrokeW: 5,
  innerFill: PAL.darkPine,      // optional inner inset
  overlayAlpha: 0.6,
  width: 900,
  height: 560,
} as const;

/**
 * Draw a "wood plaque" rounded rect with border + inner highlight edge.
 * Re-usable for modals, panels, buttons.
 */
export function drawPlaque(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, w: number, h: number,
  fill: number = PAL.wood, border: number = PAL.darkWood, radius: number = UI.radius,
): void {
  // Outer border
  g.fillStyle(border, 1);
  g.fillRoundedRect(x - 2, y - 2, w + 4, h + 4, radius + 2);
  // Main fill
  g.fillStyle(fill, 1);
  g.fillRoundedRect(x, y, w, h, radius);
  // Inner highlight (top 2px lighter)
  g.fillStyle(PAL.lightWood, 0.25);
  g.fillRoundedRect(x + 2, y + 2, w - 4, 4, 2);
}
