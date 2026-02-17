import Phaser from 'phaser';
import { PALETTE, PALETTE_CSS, FONT_SIZES } from '../config';
import { createPixelFont } from './PixelFont';

/** Font size preset names */
export type FontSize = keyof typeof FONT_SIZES;

/**
 * Ensures pixel font is registered, then creates a BitmapText.
 * Falls back to monospace Phaser.Text if bitmap font fails.
 */
export function pxText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  size: FontSize | number = 'md',
  tint?: number,
): Phaser.GameObjects.BitmapText | Phaser.GameObjects.Text {
  const fontSize = typeof size === 'number' ? size : FONT_SIZES[size];

  try {
    createPixelFont(scene);
    const bt = scene.add.bitmapText(x, y, 'pixel', text, fontSize);
    if (tint !== undefined) bt.setTint(tint);
    return bt;
  } catch {
    // Fallback to standard text
    const color = tint !== undefined
      ? '#' + tint.toString(16).padStart(6, '0')
      : PALETTE_CSS.ivory;
    return scene.add.text(x, y, text, {
      fontSize: fontSize + 'px',
      fontFamily: 'monospace',
      color,
    });
  }
}

/**
 * Creates a Phaser.Text (not bitmap) for cases where we need
 * special characters (♥, ◆, emoji) that bitmap font doesn't cover.
 */
export function hudText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  fontSize: number = FONT_SIZES.md,
  color: string = PALETTE_CSS.ivory,
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, {
    fontSize: fontSize + 'px',
    fontFamily: 'monospace',
    color,
  });
}
