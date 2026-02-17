import Phaser from 'phaser';
import { PALETTE, PALETTE_CSS, FONT_SIZES, MIN_TAP_TARGET } from '../config';

export interface WoodButtonConfig {
  x: number;
  y: number;
  text: string;
  width?: number;
  height?: number;
  fontSize?: number;
  onClick?: () => void;
}

/**
 * Wooden plank button with pixel text.
 * Pressed state shifts down 2px + darkens for tactile feel.
 * Minimum tap target enforced for mobile.
 */
export class WoodButton {
  readonly container: Phaser.GameObjects.Container;
  private scene: Phaser.Scene;
  private bg: Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text;
  private enabled = true;

  constructor(scene: Phaser.Scene, cfg: WoodButtonConfig) {
    this.scene = scene;
    const w = Math.max(cfg.width ?? 200, MIN_TAP_TARGET);
    const h = Math.max(cfg.height ?? 48, MIN_TAP_TARGET);
    const fontSize = cfg.fontSize ?? FONT_SIZES.md;

    this.container = scene.add.container(cfg.x, cfg.y);

    // Shadow underneath (visible when not pressed)
    const shadow = scene.add.rectangle(0, 3, w, h, 0x000000, 0.25);
    this.container.add(shadow);

    // Outer plank
    this.bg = scene.add.rectangle(0, 0, w, h, PALETTE.wood1)
      .setStrokeStyle(2, PALETTE.wood2)
      .setInteractive({ useHandCursor: true });
    this.container.add(this.bg);

    // Inner carved border
    const inner = scene.add.rectangle(0, 0, w - 8, h - 8, 0x000000, 0)
      .setStrokeStyle(1, PALETTE.highlight1);
    this.container.add(inner);

    // Corner nubs
    const hw = w / 2 - 4;
    const hh = h / 2 - 4;
    [[-hw, -hh], [hw, -hh], [-hw, hh], [hw, hh]].forEach(([nx, ny]) => {
      this.container.add(scene.add.rectangle(nx, ny, 3, 3, PALETTE.highlight1));
    });

    // Pixel text label
    this.label = scene.add.text(0, 0, cfg.text, {
      fontSize: fontSize + 'px',
      fontFamily: 'monospace',
      color: PALETTE_CSS.ivory,
    }).setOrigin(0.5);
    this.container.add(this.label);

    // ─── INTERACTION ─────────────────────────────────────

    this.bg.on('pointerover', () => {
      if (!this.enabled) return;
      this.bg.setFillStyle(PALETTE.wood2);
    });

    this.bg.on('pointerout', () => {
      if (!this.enabled) return;
      this.bg.setFillStyle(PALETTE.wood1);
      this.container.y = cfg.y; // snap back
    });

    this.bg.on('pointerdown', () => {
      if (!this.enabled) return;
      this.container.y = cfg.y + 2; // press down effect
      this.bg.setFillStyle(0x4a2e18); // darker wood
      cfg.onClick?.();
    });

    this.bg.on('pointerup', () => {
      if (!this.enabled) return;
      this.container.y = cfg.y;
      this.bg.setFillStyle(PALETTE.wood1);
    });
  }

  setEnabled(enabled: boolean): this {
    this.enabled = enabled;
    this.bg.setAlpha(enabled ? 1 : 0.5);
    this.label.setAlpha(enabled ? 1 : 0.4);
    if (enabled) {
      this.bg.setInteractive({ useHandCursor: true });
    } else {
      this.bg.removeInteractive();
    }
    return this;
  }

  setText(text: string): this {
    this.label.setText(text);
    return this;
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
