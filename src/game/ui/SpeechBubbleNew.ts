/**
 * SpeechBubble — Reusable parchment-style speech bubble with pixel-font text.
 * Features:
 *  - Parchment/wood frame with tail pointing to speaker
 *  - Pop-in animation (scale 0→1 with Back ease)
 *  - Auto-wrap + max width
 *  - Clamped to camera bounds so it never goes off-screen
 *  - Auto-hides after duration (unless persistent)
 */
import Phaser from 'phaser';
import { PAL, BUBBLE, TEXT, UI } from '../uiTheme';

export interface BubbleOpts {
  scene: Phaser.Scene;
  x: number;
  y: number;
  text: string;
  maxWidth?: number;
  duration?: number;     // ms, 0 = persistent
  onDone?: () => void;
}

const MARGIN = 20; // viewport margin for clamping

export class SpeechBubble {
  container: Phaser.GameObjects.Container;
  private timer?: Phaser.Time.TimerEvent;

  constructor(opts: BubbleOpts) {
    const { scene, x, y, text, maxWidth = 340, duration = 2500, onDone } = opts;

    const wrapWidth = maxWidth - UI.pad * 2;
    const txtObj = scene.add.text(0, 0, text, {
      ...TEXT.bubble,
      wordWrap: { width: wrapWidth },
    }).setOrigin(0.5);

    const pw = Math.max(txtObj.width + UI.pad * 2, 100);
    const ph = txtObj.height + UI.pad * 2;
    const halfW = pw / 2;
    const halfH = ph / 2;

    const bg = scene.add.graphics();

    // Parchment fill  
    bg.fillStyle(BUBBLE.fill, 1);
    bg.fillRoundedRect(-halfW, -halfH, pw, ph, UI.radius);

    // Wood-toned border
    bg.lineStyle(BUBBLE.strokeWidth, BUBBLE.stroke, 1);
    bg.strokeRoundedRect(-halfW, -halfH, pw, ph, UI.radius);

    // Inner highlight edge (top)
    bg.fillStyle(0xffffff, 0.15);
    bg.fillRoundedRect(-halfW + 3, -halfH + 2, pw - 6, 3, 2);

    // Tail triangle (pointing down toward speaker)
    bg.fillStyle(BUBBLE.fill, 1);
    bg.fillTriangle(-8, halfH, 8, halfH, 0, halfH + BUBBLE.tailHeight);
    bg.lineStyle(BUBBLE.strokeWidth, BUBBLE.stroke, 1);
    bg.lineBetween(-8, halfH, 0, halfH + BUBBLE.tailHeight);
    bg.lineBetween(8, halfH, 0, halfH + BUBBLE.tailHeight);

    // Position: above the speaker, offset by bubble height + tail
    const rawY = y - halfH - BUBBLE.tailHeight - 10;

    // Clamp to camera viewport bounds (works with scrolling)
    const cam = scene.cameras.main;
    const clampedX = Phaser.Math.Clamp(x, cam.scrollX + halfW + MARGIN, cam.scrollX + cam.width - halfW - MARGIN);
    const clampedY = Phaser.Math.Clamp(rawY, cam.scrollY + halfH + MARGIN, cam.scrollY + cam.height - halfH - MARGIN);

    this.container = scene.add.container(clampedX, clampedY, [bg, txtObj]);
    this.container.setDepth(500);

    // Pop-in animation
    this.container.setScale(0);
    this.container.setAlpha(0);
    scene.tweens.add({
      targets: this.container,
      scaleX: 1, scaleY: 1, alpha: 1,
      duration: 220,
      ease: 'Back.easeOut',
    });

    if (duration > 0) {
      this.timer = scene.time.delayedCall(duration, () => {
        this.destroy(scene, onDone);
      });
    }
  }

  destroy(scene: Phaser.Scene, cb?: () => void): void {
    this.timer?.remove();
    scene.tweens.add({
      targets: this.container,
      scaleX: 0.8, scaleY: 0.8, alpha: 0,
      duration: 160,
      onComplete: () => {
        this.container.destroy(true);
        cb?.();
      },
    });
  }

  /** Reposition (e.g. follow a moving sprite) */
  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y - 50);
  }
}

/** Convenience: show a bubble above x,y, returns the SpeechBubble instance */
export function showBubble(
  scene: Phaser.Scene, x: number, y: number, text: string,
  duration = 2500, onDone?: () => void,
): SpeechBubble {
  return new SpeechBubble({ scene, x, y, text, duration, onDone });
}
