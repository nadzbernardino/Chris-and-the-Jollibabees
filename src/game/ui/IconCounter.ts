import Phaser from 'phaser';
import { PALETTE, PALETTE_CSS, FONT_SIZES, SPACING } from '../config';

/**
 * A pixel-art icon (drawn procedurally) + numeric counter.
 * Supports "heart" and "diamond" icon types.
 */
export class IconCounter {
  readonly container: Phaser.GameObjects.Container;
  private scene: Phaser.Scene;
  private valueText: Phaser.GameObjects.Text;
  private icons: Phaser.GameObjects.GameObject[] = [];
  private iconType: 'heart' | 'diamond';
  private maxIcons: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    type: 'heart' | 'diamond',
    opts?: { maxIcons?: number; fontSize?: number },
  ) {
    this.scene = scene;
    this.iconType = type;
    this.maxIcons = opts?.maxIcons ?? (type === 'heart' ? 3 : 0);
    const fontSize = opts?.fontSize ?? FONT_SIZES.md;

    this.container = scene.add.container(x, y);

    if (type === 'heart' && this.maxIcons > 0) {
      // Draw individual heart icons
      for (let i = 0; i < this.maxIcons; i++) {
        const hx = i * 20;
        const heart = this.drawHeart(scene, hx, 0, true);
        this.icons.push(heart);
        this.container.add(heart);
      }
      // No text counter for hearts — icons are the display
      this.valueText = scene.add.text(this.maxIcons * 20 + SPACING.xs, -2, '', {
        fontSize: fontSize + 'px', fontFamily: 'monospace', color: PALETTE_CSS.ivory,
      });
    } else {
      // Diamond icon + text counter
      const icon = this.drawDiamond(scene, 0, 0);
      this.container.add(icon);
      this.icons.push(icon);

      this.valueText = scene.add.text(18, -2, '0', {
        fontSize: fontSize + 'px', fontFamily: 'monospace', color: PALETTE_CSS.highlight1,
      });
    }

    this.container.add(this.valueText);
  }

  /** Update the displayed value */
  setValue(value: number): void {
    if (this.iconType === 'heart') {
      // Update heart fill states
      this.icons.forEach((icon, i) => {
        const heart = icon as Phaser.GameObjects.Container;
        const fill = heart.getByName('fill') as Phaser.GameObjects.Graphics | null;
        const empty = heart.getByName('empty') as Phaser.GameObjects.Graphics | null;
        if (fill) fill.setVisible(i < value);
        if (empty) empty.setVisible(i >= value);
      });
    } else {
      this.valueText.setText(String(value));
    }
  }

  setDepth(depth: number): this {
    this.container.setDepth(depth);
    return this;
  }

  setVisible(visible: boolean): this {
    this.container.setVisible(visible);
    return this;
  }

  destroy(): void {
    this.container.destroy(true);
  }

  // ─── PROCEDURAL ICONS ─────────────────────────────────

  private drawHeart(scene: Phaser.Scene, x: number, y: number, filled: boolean): Phaser.GameObjects.Container {
    const c = scene.add.container(x, y);

    // Heart shape using small rectangles (pixel art style)
    // 8x8 grid heart pattern
    const pixels = [
      [1, 0], [2, 0], [4, 0], [5, 0],           // top bumps
      [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], // second row
      [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], // third row
      [1, 3], [2, 3], [3, 3], [4, 3], [5, 3],    // taper
      [2, 4], [3, 4], [4, 4],                     // more taper
      [3, 5],                                      // bottom point
    ];

    const filledGfx = scene.add.graphics().setName('fill');
    filledGfx.fillStyle(PALETTE.danger);
    pixels.forEach(([px, py]) => filledGfx.fillRect(px * 2, py * 2, 2, 2));
    filledGfx.setVisible(filled);
    c.add(filledGfx);

    const emptyGfx = scene.add.graphics().setName('empty');
    emptyGfx.fillStyle(PALETTE.mist, 0.4);
    pixels.forEach(([px, py]) => emptyGfx.fillRect(px * 2, py * 2, 2, 2));
    emptyGfx.setVisible(!filled);
    c.add(emptyGfx);

    return c;
  }

  private drawDiamond(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Container {
    const c = scene.add.container(x, y);

    // Diamond shape — pixel art rhombus
    const pixels = [
      [3, 0],
      [2, 1], [3, 1], [4, 1],
      [1, 2], [2, 2], [3, 2], [4, 2], [5, 2],
      [0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3],
      [1, 4], [2, 4], [3, 4], [4, 4], [5, 4],
      [2, 5], [3, 5], [4, 5],
      [3, 6],
    ];

    const gfx = scene.add.graphics();
    gfx.fillStyle(PALETTE.highlight1);
    pixels.forEach(([px, py]) => gfx.fillRect(px * 2, py * 2, 2, 2));

    // Highlight sparkle on top-left facet
    gfx.fillStyle(PALETTE.highlight2);
    [[2, 2], [3, 1], [3, 2]].forEach(([px, py]) => gfx.fillRect(px * 2, py * 2, 2, 2));

    c.add(gfx);
    return c;
  }
}
