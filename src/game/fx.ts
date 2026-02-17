/**
 * fx.ts — Reusable cottage-fantasy 8-bit visual FX.
 *
 * Lightweight particle / tween effects using simple primitives.
 * No textures needed — everything is tiny rectangles & circles
 * that tween and fade, keeping FPS smooth on mobile.
 *
 * Palette colours from uiTheme.ts to keep the cottage-fantasy vibe.
 */
import Phaser from 'phaser';
import { PAL } from './uiTheme';

// ─── Colour pools ──────────────────────────────────────────
const SPARKLE_COLORS = [PAL.champagne, PAL.gold, PAL.warmGold, PAL.ivory];
const SHIMMER_COLORS = [PAL.champagneGlow, PAL.gold, PAL.parchment];
const POOF_COLORS    = [PAL.mist, PAL.ivory, PAL.parchment, 0x999999];
const POP_COLORS     = [PAL.gold, PAL.champagne, PAL.mossGreen];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

// ─── FX: fxSparkle ──────────────────────────────────────────
/**
 * Burst of tiny pixel "spark" squares that fly outward and fade.
 * Good for: asset replace, task complete, heart gain.
 */
export function fxSparkle(
  scene: Phaser.Scene, x: number, y: number, count = 10, radius = 60,
): void {
  for (let i = 0; i < count; i++) {
    const size = Phaser.Math.Between(3, 6);
    const dot = scene.add.rectangle(x, y, size, size, pick(SPARKLE_COLORS))
      .setDepth(950).setAlpha(1);

    const angle = Math.random() * Math.PI * 2;
    const dist = Phaser.Math.Between(radius * 0.3, radius);
    const tx = x + Math.cos(angle) * dist;
    const ty = y + Math.sin(angle) * dist;

    scene.tweens.add({
      targets: dot,
      x: tx, y: ty, alpha: 0,
      scaleX: 0.2, scaleY: 0.2,
      duration: Phaser.Math.Between(300, 550),
      delay: Phaser.Math.Between(0, 80),
      ease: 'Cubic.easeOut',
      onComplete: () => dot.destroy(),
    });
  }
}

// ─── FX: fxShimmer ──────────────────────────────────────────
/**
 * Gentle ascending glitter (like dust motes rising).
 * Good for: asset replacement shimmer.
 */
export function fxShimmer(
  scene: Phaser.Scene, x: number, y: number, count = 8, spread = 50,
): void {
  for (let i = 0; i < count; i++) {
    const size = Phaser.Math.Between(2, 5);
    const sx = x + Phaser.Math.Between(-spread, spread);
    const sy = y + Phaser.Math.Between(-10, 10);
    const dot = scene.add.rectangle(sx, sy, size, size, pick(SHIMMER_COLORS))
      .setDepth(950).setAlpha(0);

    scene.tweens.add({
      targets: dot,
      y: sy - Phaser.Math.Between(40, 80),
      alpha: { from: 0, to: 0.9 },
      scaleX: { from: 1.2, to: 0.3 },
      scaleY: { from: 1.2, to: 0.3 },
      duration: Phaser.Math.Between(450, 700),
      delay: Phaser.Math.Between(0, 120),
      ease: 'Sine.easeInOut',
      yoyo: true,
      onComplete: () => dot.destroy(),
    });
  }
}

// ─── FX: fxPoof ─────────────────────────────────────────────
/**
 * Quick puff cloud that expands and fades (like dust).
 * Good for: trash drop, vacuum debris removal, laundry drop.
 */
export function fxPoof(
  scene: Phaser.Scene, x: number, y: number, count = 6,
): void {
  for (let i = 0; i < count; i++) {
    const size = Phaser.Math.Between(6, 12);
    const ox = Phaser.Math.Between(-15, 15);
    const oy = Phaser.Math.Between(-15, 15);
    const dot = scene.add.circle(x + ox, y + oy, size / 2, pick(POOF_COLORS))
      .setDepth(950).setAlpha(0.8);

    scene.tweens.add({
      targets: dot,
      scaleX: 2.5, scaleY: 2.5,
      alpha: 0,
      duration: Phaser.Math.Between(300, 500),
      delay: Phaser.Math.Between(0, 60),
      ease: 'Cubic.easeOut',
      onComplete: () => dot.destroy(),
    });
  }
}

// ─── FX: fxPop ──────────────────────────────────────────────
/**
 * Single expanding ring + small sparks — satisfying "pop" feedback.
 * Good for: folding snap, modal open/close, button confirm.
 */
export function fxPop(
  scene: Phaser.Scene, x: number, y: number, scale = 1,
): void {
  // Expanding ring
  const ring = scene.add.circle(x, y, 10 * scale, undefined)
    .setDepth(950).setAlpha(0.7);
  ring.setStrokeStyle(3, pick(POP_COLORS));

  scene.tweens.add({
    targets: ring,
    scaleX: 3 * scale, scaleY: 3 * scale,
    alpha: 0,
    duration: 350,
    ease: 'Cubic.easeOut',
    onComplete: () => ring.destroy(),
  });

  // 4 tiny sparks
  for (let i = 0; i < 4; i++) {
    const angle = (Math.PI / 2) * i + Math.random() * 0.4;
    const dist = 25 * scale;
    const spark = scene.add.rectangle(x, y, 4, 4, pick(SPARKLE_COLORS))
      .setDepth(950);
    scene.tweens.add({
      targets: spark,
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist,
      alpha: 0,
      duration: 300,
      delay: 40,
      ease: 'Cubic.easeOut',
      onComplete: () => spark.destroy(),
    });
  }
}

// ─── FX: fxScreenShake ──────────────────────────────────────
/**
 * Very subtle camera shake.
 */
export function fxScreenShake(
  scene: Phaser.Scene, intensity = 0.003, duration = 120,
): void {
  scene.cameras.main.shake(duration, intensity);
}

// ─── FX: fxHeartFlash ───────────────────────────────────────
/**
 * Brief red / green flash over HUD heart area for gain/loss feedback.
 */
export function fxHeartFlash(
  scene: Phaser.Scene, gained: boolean,
): void {
  const color = gained ? PAL.heartRed : 0xff2222;
  const alpha = gained ? 0.5 : 0.6;
  // Flash near top-left where hearts are drawn
  const flash = scene.add.rectangle(70, 34, 120, 40, color, alpha)
    .setDepth(960).setScrollFactor(0);

  scene.tweens.add({
    targets: flash,
    alpha: 0,
    duration: gained ? 350 : 250,
    ease: 'Cubic.easeOut',
    onComplete: () => flash.destroy(),
  });
}

// ─── FX: fxShrinkAway ──────────────────────────────────────
/**
 * Shrink + fade a game object (useful for items disappearing into a bin).
 * Returns a promise that resolves when done.
 */
export function fxShrinkAway(
  scene: Phaser.Scene, target: Phaser.GameObjects.GameObject & { x: number; y: number },
): Promise<void> {
  return new Promise(resolve => {
    scene.tweens.add({
      targets: target,
      scaleX: 0, scaleY: 0, alpha: 0,
      duration: 250,
      ease: 'Back.easeIn',
      onComplete: () => {
        target.destroy();
        resolve();
      },
    });
  });
}

// ─── FX: fxOuchFlicker ─────────────────────────────────────
/**
 * Brief red tint flicker on heart-loss moments.
 * Different from fxHeartFlash — this pulses twice.
 */
export function fxOuchFlicker(scene: Phaser.Scene): void {
  const flash = scene.add.rectangle(70, 34, 120, 40, 0xff0000, 0)
    .setDepth(960).setScrollFactor(0);

  scene.tweens.add({
    targets: flash,
    alpha: { from: 0, to: 0.55 },
    duration: 100,
    yoyo: true,
    repeat: 1,
    ease: 'Sine.easeInOut',
    onComplete: () => flash.destroy(),
  });
}
