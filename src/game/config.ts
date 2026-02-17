/** Game configuration constants */

import Phaser from 'phaser';

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

/** Global UI scale — all font sizes and spacing multiply by this */
export const UI_SCALE = 1;

/** Phaser scale-mode config — responsive letterbox, centred */
export const SCALE_CONFIG: Phaser.Types.Core.ScaleConfig = {
  mode: Phaser.Scale.FIT,
  autoCenter: Phaser.Scale.CENTER_BOTH,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
} as const;

/** Pixel-crisp render settings — nearest-neighbor, no smoothing */
export const RENDER_CONFIG: Phaser.Types.Core.RenderConfig = {
  pixelArt: true,
  antialias: false,
} as const;

/** Base font sizes (multiply by UI_SCALE for actual use) */
export const FONT_SIZES = {
  xs: 8 * UI_SCALE,
  sm: 12 * UI_SCALE,
  md: 16 * UI_SCALE,
  lg: 24 * UI_SCALE,
  xl: 32 * UI_SCALE,
  xxl: 48 * UI_SCALE,
} as const;

/** Spacing constants */
export const SPACING = {
  xs: 4 * UI_SCALE,
  sm: 8 * UI_SCALE,
  md: 16 * UI_SCALE,
  lg: 24 * UI_SCALE,
  xl: 32 * UI_SCALE,
} as const;

/** Minimum tap target size for mobile (px at internal resolution) */
export const MIN_TAP_TARGET = 44;

/** Woodland palette from CLAUDE.md — numeric for Phaser fill/tint */
export const PALETTE = {
  forest1: 0x1f3b2c,
  forest2: 0x2f4f3e,
  forest3: 0x3f6b4f,
  wood1: 0x5c3a21,
  wood2: 0x7a4e2d,
  highlight1: 0xe8b45e,
  highlight2: 0xf4c76a,
  mist: 0x6d8c8a,
  ivory: 0xf5f2ea,
  champagne: 0xe6c98b,
  danger: 0xcc3333,
  chrisRed: 0xb03a2e,
  jollibeeRed: 0xd72631,
} as const;

/** CSS hex strings for Phaser text styles */
export const PALETTE_CSS = {
  forest1: '#1F3B2C',
  forest2: '#2F4F3E',
  forest3: '#3F6B4F',
  wood1: '#5C3A21',
  wood2: '#7A4E2D',
  highlight1: '#E8B45E',
  highlight2: '#F4C76A',
  mist: '#6D8C8A',
  ivory: '#F5F2EA',
  champagne: '#E6C98B',
  danger: '#CC3333',
  chrisRed: '#B03A2E',
  jollibeeRed: '#D72631',
} as const;

/** All palette entries as an array for iteration (swatches, demos) */
export const PALETTE_ENTRIES = Object.entries(PALETTE) as [keyof typeof PALETTE, number][];
export const PALETTE_CSS_ENTRIES = Object.entries(PALETTE_CSS) as [keyof typeof PALETTE_CSS, string][];

/** Default stat values for a new run */
export const INITIAL_STATS = {
  preparation: 0,
  integrity: 50,
  energy: 100,
  hearts: 3,
  diamonds: 0,
  whaleCoinWins: 0,
  whaleCoinLosses: 0,
  hasRing: false,
  hasCoffee: false,
  hasGadget: false,
  hasFlowers: false,
} as const;

/** Scene keys — single source of truth for scene names */
export const SCENES = {
  INTRO: 'IntroScene',
  WORLD_MAP: 'WorldMapScene',
  LEVEL: 'LevelScene',
  MARKET: 'MarketScene',
  SLEEP: 'SleepScene',
  FINAL_PICKUP: 'FinalPickupScene',
  ENDING: 'EndingScene',
  GAME_OVER: 'GameOverScene',
  PALETTE_DEMO: 'PaletteDemoScene',
  DEV_UI: 'DevUIScene',
} as const;
