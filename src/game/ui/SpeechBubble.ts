import Phaser from 'phaser';
import { PALETTE, PALETTE_CSS, FONT_SIZES, SPACING } from '../config';
import { fs } from '../uiTheme';

export interface SpeechBubbleConfig {
  x: number;
  y: number;
  text: string;
  /** Max width before wrapping */
  maxWidth?: number;
  /** Tail direction */
  tailDir?: 'down' | 'up' | 'left' | 'right';
  /** Speaker name (shown in small text above) */
  speaker?: string;
  /** Auto-destroy after ms (0 = manual) */
  duration?: number;
}

/**
 * Parchment-style speech bubble with pixel-art border and tail.
 * Looks like aged paper with a subtle torn-edge feel.
 */
export class SpeechBubble {
  readonly container: Phaser.GameObjects.Container;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, cfg: SpeechBubbleConfig) {
    this.scene = scene;
    const maxWidth = cfg.maxWidth ?? 200;
    const tailDir = cfg.tailDir ?? 'down';

    this.container = scene.add.container(cfg.x, cfg.y);

    // Speaker name above bubble
    let speakerHeight = 0;
    if (cfg.speaker) {
      const nameText = scene.add.text(0, 0, cfg.speaker, {
        fontSize: fs(8),
        fontFamily: 'monospace',
        color: PALETTE_CSS.wood2,
      });
      speakerHeight = nameText.height + 2;
      this.container.add(nameText);
    }

    // Message text (measure first for sizing)
    const msgText = scene.add.text(SPACING.sm, speakerHeight + SPACING.sm, cfg.text, {
      fontSize: FONT_SIZES.sm + 'px',
      fontFamily: 'monospace',
      color: PALETTE_CSS.wood1,
      wordWrap: { width: maxWidth - SPACING.md },
      lineSpacing: 2,
    });

    const bw = Math.max(msgText.width + SPACING.md, 60);
    const bh = msgText.height + SPACING.md + speakerHeight;

    // Parchment background (ivory with slight texture via layering)
    const parchment = scene.add.rectangle(bw / 2, speakerHeight + bh / 2, bw, bh, PALETTE.ivory)
      .setStrokeStyle(2, PALETTE.wood2);

    // Inner aged-paper accent (slightly darker inner border)
    const innerAccent = scene.add.rectangle(bw / 2, speakerHeight + bh / 2, bw - 6, bh - 6, 0x000000, 0)
      .setStrokeStyle(1, PALETTE.champagne);

    // Decorative corner dots (torn-paper pixel look)
    const corners = [
      scene.add.rectangle(2, speakerHeight + 2, 3, 3, PALETTE.champagne),
      scene.add.rectangle(bw - 2, speakerHeight + 2, 3, 3, PALETTE.champagne),
      scene.add.rectangle(2, speakerHeight + bh - 2, 3, 3, PALETTE.champagne),
      scene.add.rectangle(bw - 2, speakerHeight + bh - 2, 3, 3, PALETTE.champagne),
    ];

    // Tail
    const tail = this.drawTail(scene, bw, bh, speakerHeight, tailDir);

    this.container.add([parchment, innerAccent, ...corners, tail, msgText]);

    // Auto-destroy
    if (cfg.duration && cfg.duration > 0) {
      scene.tweens.add({
        targets: this.container,
        alpha: 0,
        duration: 300,
        delay: cfg.duration,
        onComplete: () => this.destroy(),
      });
    }
  }

  private drawTail(
    scene: Phaser.Scene,
    bw: number,
    bh: number,
    speakerH: number,
    dir: 'down' | 'up' | 'left' | 'right',
  ): Phaser.GameObjects.Triangle {
    const s = 10; // tail size
    switch (dir) {
      case 'down':
        return scene.add.triangle(bw / 2, speakerH + bh + s / 2, -s, 0, s, 0, 0, s, PALETTE.ivory)
          .setStrokeStyle(1, PALETTE.wood2);
      case 'up':
        return scene.add.triangle(bw / 2, speakerH - s / 2, -s, s, s, s, 0, 0, PALETTE.ivory)
          .setStrokeStyle(1, PALETTE.wood2);
      case 'left':
        return scene.add.triangle(-s / 2, speakerH + bh / 2, s, -s, s, s, 0, 0, PALETTE.ivory)
          .setStrokeStyle(1, PALETTE.wood2);
      case 'right':
        return scene.add.triangle(bw + s / 2, speakerH + bh / 2, 0, -s, 0, s, s, 0, PALETTE.ivory)
          .setStrokeStyle(1, PALETTE.wood2);
    }
  }

  show(): this {
    this.container.setVisible(true);
    this.container.setAlpha(0);
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: 200,
    });
    return this;
  }

  hide(): this {
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: 200,
      onComplete: () => this.container.setVisible(false),
    });
    return this;
  }

  setDepth(depth: number): this {
    this.container.setDepth(depth);
    return this;
  }

  destroy(): void {
    this.container.destroy(true);
  }
}
