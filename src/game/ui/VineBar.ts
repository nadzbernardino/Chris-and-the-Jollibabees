import Phaser from 'phaser';
import { PALETTE, PALETTE_CSS, FONT_SIZES, SPACING } from '../config';

export interface VineBarConfig {
  x: number;
  y: number;
  width: number;
  height?: number;
  /** Label text shown to the left of the bar */
  label: string;
  /** Bar fill color */
  fillColor?: number;
  /** Bar background color */
  bgColor?: number;
  /** Border color */
  borderColor?: number;
  /** Label color (CSS) */
  labelColor?: string;
  /** Initial value 0..1 */
  value?: number;
}

/**
 * Vine-wrapped progress bar with pixel-art leaf accents.
 * Used for Preparation, Energy, Integrity.
 */
export class VineBar {
  readonly container: Phaser.GameObjects.Container;
  private scene: Phaser.Scene;
  private fillBar: Phaser.GameObjects.Rectangle;
  private fillHighlight: Phaser.GameObjects.Rectangle;
  private fillWidth: number;
  private valueText: Phaser.GameObjects.Text;
  private currentValue = 0;

  constructor(scene: Phaser.Scene, cfg: VineBarConfig) {
    this.scene = scene;
    const height = cfg.height ?? 14;
    const fillColor = cfg.fillColor ?? PALETTE.forest3;
    const bgColor = cfg.bgColor ?? PALETTE.forest1;
    const borderColor = cfg.borderColor ?? PALETTE.forest3;
    const labelColor = cfg.labelColor ?? PALETTE_CSS.ivory;
    const barWidth = cfg.width;
    this.fillWidth = barWidth - 4;

    this.container = scene.add.container(cfg.x, cfg.y);

    // Label
    const label = scene.add.text(0, -1, cfg.label, {
      fontSize: FONT_SIZES.xs + 'px',
      fontFamily: 'monospace',
      color: labelColor,
    });
    this.container.add(label);

    const barX = label.width + SPACING.sm;

    // Wood frame (slightly wider/taller for carved look)
    const frame = scene.add.rectangle(barX + barWidth / 2, height / 2, barWidth + 4, height + 4, PALETTE.wood2, 0.5)
      .setStrokeStyle(1, 0x000000, 0.3);
    this.container.add(frame);

    // Bar background
    const bg = scene.add.rectangle(barX + barWidth / 2, height / 2, barWidth, height, bgColor)
      .setStrokeStyle(1, borderColor);
    this.container.add(bg);

    // Fill bar
    this.fillBar = scene.add.rectangle(barX + 2, 2, 0, height - 4, fillColor)
      .setOrigin(0, 0);
    this.container.add(this.fillBar);

    // Fill highlight (1px lighter line at top of fill for bevel depth)
    this.fillHighlight = scene.add.rectangle(barX + 2, 2, 0, 1, 0xffffff, 0.15)
      .setOrigin(0, 0);
    this.container.add(this.fillHighlight);

    // Vine leaf accents (small pixel triangles at ends of the bar frame)
    const leafColor = PALETTE.forest3;
    const leafLeft = scene.add.triangle(barX - 3, height / 2, 0, 4, 6, 0, 6, 8, leafColor)
      .setOrigin(0.5);
    const leafRight = scene.add.triangle(barX + barWidth + 3, height / 2, 0, 0, 0, 8, 6, 4, leafColor)
      .setOrigin(0.5);
    this.container.add([leafLeft, leafRight]);

    // Value text (right-aligned inside bar)
    this.valueText = scene.add.text(barX + barWidth - 4, 0, '', {
      fontSize: '9px',
      fontFamily: 'monospace',
      color: PALETTE_CSS.ivory,
    }).setOrigin(1, 0).setAlpha(0.8);
    this.container.add(this.valueText);

    // Set initial value
    this.setValue(cfg.value ?? 0);
  }

  /** Set bar value (0..100 or 0..1 depending on usage) */
  setValue(value: number, max = 100): void {
    const ratio = Math.max(0, Math.min(1, value / max));
    this.currentValue = value;
    const w = ratio * this.fillWidth;
    this.fillBar.width = w;
    this.fillHighlight.width = w;
    this.valueText.setText(Math.round(value) + '');
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
}
