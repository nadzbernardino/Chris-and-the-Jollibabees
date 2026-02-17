import Phaser from 'phaser';
import { PALETTE } from '../config';

export interface HUDPanelConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Fill color (default wood1) */
  fill?: number;
  /** Fill alpha (default 0.92) */
  alpha?: number;
  /** Outer border color (default wood2) */
  border?: number;
  /** Inner accent border color (default highlight1) */
  accent?: number;
  /** Border thickness (default 2) */
  borderWidth?: number;
}

/**
 * Procedural 9-slice–style wood plaque panel.
 * Draws outer border, inner carved accent, and optional corner nubs.
 * All drawing is procedural — no sprite sheet needed.
 */
export class HUDPanel {
  readonly container: Phaser.GameObjects.Container;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, cfg: HUDPanelConfig) {
    this.scene = scene;

    const fill = cfg.fill ?? PALETTE.wood1;
    const alpha = cfg.alpha ?? 0.92;
    const border = cfg.border ?? PALETTE.wood2;
    const accent = cfg.accent ?? PALETTE.highlight1;
    const bw = cfg.borderWidth ?? 2;
    const inset = bw + 3;
    const hw = cfg.width / 2;
    const hh = cfg.height / 2;

    // ── 1px dark outline (outermost, pixel crispness) ───
    const outline = scene.add.rectangle(0, 0, cfg.width + 2, cfg.height + 2, 0x000000, 0)
      .setStrokeStyle(1, 0x000000, 0.5);

    // ── Main plank fill ─────────────────────────────────
    const bg = scene.add.rectangle(0, 0, cfg.width, cfg.height, fill, alpha);

    // ── Wood grain (subtle horizontal lines) ────────────
    const grain = scene.add.graphics();
    grain.lineStyle(1, PALETTE.wood2, 0.15);
    for (let gy = -hh + 5; gy < hh - 3; gy += 6) {
      grain.beginPath();
      grain.moveTo(-hw + 4, gy);
      grain.lineTo(hw - 4, gy);
      grain.strokePath();
    }

    // ── Inner shadow (bottom + right edges for depth) ───
    const innerShadow = scene.add.graphics();
    innerShadow.fillStyle(0x000000, 0.18);
    innerShadow.fillRect(-hw + bw + 1, hh - bw - 3, cfg.width - (bw + 1) * 2, 3);
    innerShadow.fillRect(hw - bw - 3, -hh + bw + 1, 3, cfg.height - (bw + 1) * 2);

    // ── Inner highlight (top + left edges for bevel) ────
    const innerHighlight = scene.add.graphics();
    innerHighlight.fillStyle(PALETTE.highlight1, 0.12);
    innerHighlight.fillRect(-hw + bw + 1, -hh + bw + 1, cfg.width - (bw + 1) * 2, 2);
    innerHighlight.fillRect(-hw + bw + 1, -hh + bw + 1, 2, cfg.height - (bw + 1) * 2);

    // ── Outer border ────────────────────────────────────
    const outerBorder = scene.add.rectangle(0, 0, cfg.width, cfg.height, 0x000000, 0)
      .setStrokeStyle(bw, border);

    // ── Inner carved accent line ────────────────────────
    const innerBorder = scene.add.rectangle(
      0, 0, cfg.width - inset * 2, cfg.height - inset * 2, 0x000000, 0,
    ).setStrokeStyle(1, accent);

    // ── Corner nubs (8-bit charm) ───────────────────────
    const nubSize = 4;
    const nx = hw - bw;
    const ny = hh - bw;
    const nubs = [
      scene.add.rectangle(-nx, -ny, nubSize, nubSize, accent),
      scene.add.rectangle(nx, -ny, nubSize, nubSize, accent),
      scene.add.rectangle(-nx, ny, nubSize, nubSize, accent),
      scene.add.rectangle(nx, ny, nubSize, nubSize, accent),
    ];

    // ── Drop shadow beneath panel ───────────────────────
    const dropShadow = scene.add.rectangle(
      0, hh + 2, cfg.width - 4, 3, 0x000000, 0.15,
    );

    this.container = scene.add.container(cfg.x, cfg.y, [
      dropShadow, outline, bg, grain, innerShadow, innerHighlight,
      outerBorder, innerBorder, ...nubs,
    ]);
  }

  setDepth(depth: number): this {
    this.container.setDepth(depth);
    return this;
  }

  setScrollFactor(x: number, y?: number): this {
    this.container.setScrollFactor(x, y ?? x);
    return this;
  }

  setVisible(visible: boolean): this {
    this.container.setVisible(visible);
    return this;
  }

  setPosition(x: number, y: number): this {
    this.container.setPosition(x, y);
    return this;
  }

  destroy(): void {
    this.container.destroy(true);
  }
}
