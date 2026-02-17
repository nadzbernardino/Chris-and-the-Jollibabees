/**
 * HUDNew — Cottage-fantasy HUD with full stat display.
 *
 * Top-left:  pixel hearts + stat bars (prep, integrity, energy)
 * Top-right: diamonds counter + elapsed timer
 *
 * Anchored to camera, scales on mobile, unobtrusive.
 */
import Phaser from 'phaser';
import { DESIGN_W } from '../constants';
import { PAL, PAL_CSS, TEXT, PIXEL_FONT, IS_MOBILE, fs } from '../uiTheme';
import { store } from '../store/GameStoreNew';

const HEART_SIZE = IS_MOBILE ? 40 : 28;
const HEART_GAP  = IS_MOBILE ? 8 : 6;
const HUD_X      = 24;
const HUD_Y      = 20;
const BAR_W      = IS_MOBILE ? 160 : 100;
const BAR_H      = IS_MOBILE ? 14 : 8;
const BAR_GAP    = IS_MOBILE ? 36 : 22;
const LABEL_W    = 60;

export class HUDNew {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private heartsGfx!: Phaser.GameObjects.Graphics;
  private barsGfx!: Phaser.GameObjects.Graphics;
  private timerText!: Phaser.GameObjects.Text;
  private diamondsText!: Phaser.GameObjects.Text;
  private timerEvent?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  create(): void {
    this.container = this.scene.add.container(0, 0)
      .setDepth(600)
      .setScrollFactor(0);

    // Hearts graphics object
    this.heartsGfx = this.scene.add.graphics();
    this.container.add(this.heartsGfx);

    // Stat bars graphics
    this.barsGfx = this.scene.add.graphics();
    this.container.add(this.barsGfx);

    // Diamonds counter (top-right, above timer)
    this.diamondsText = this.scene.add.text(DESIGN_W - HUD_X, HUD_Y, '💎 0', {
      fontFamily: PIXEL_FONT,
      fontSize: fs(12),
      color: '#88DDFF',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(1, 0);
    this.container.add(this.diamondsText);

    // Timer text (top-right, below diamonds)
    this.timerText = this.scene.add.text(DESIGN_W - HUD_X, HUD_Y + (IS_MOBILE ? 30 : 20), '15:00', {
      fontFamily: PIXEL_FONT,
      fontSize: fs(14),
      color: PAL_CSS.warmGold,
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(1, 0);
    this.container.add(this.timerText);

    // Tick timer every second
    this.timerEvent = this.scene.time.addEvent({
      delay: 1000, loop: true,
      callback: () => this.updateTimer(),
    });

    this.refresh();
    this.updateTimer();
  }

  refresh(): void {
    this.drawHearts();
    this.drawStatBars();
    this.updateDiamonds();
  }

  private drawHearts(): void {
    const g = this.heartsGfx;
    g.clear();

    const hearts = store.s.hearts;
    const max = Math.max(3, hearts); // show at least 3 slots

    for (let i = 0; i < max; i++) {
      const x = HUD_X + i * (HEART_SIZE + HEART_GAP);
      const y = HUD_Y;
      const filled = i < hearts;
      this.drawPixelHeart(g, x, y, HEART_SIZE, filled);
    }
  }

  private drawStatBars(): void {
    const g = this.barsGfx;
    g.clear();

    const s = store.s;
    const startY = HUD_Y + HEART_SIZE + 14;

    const bars = [
      { label: 'PREP', fullLabel: 'Preparation', value: s.preparation, max: 100, color: 0x4CAF50 },
      { label: 'CONF', fullLabel: 'Confidence',  value: s.integrity,   max: 100, color: 0x2196F3 },
      { label: 'ENRG', fullLabel: 'Energy',      value: s.energy,      max: 100, color: 0xFFEB3B },
    ];

    bars.forEach((bar, i) => {
      const y = startY + i * BAR_GAP;
      const x = HUD_X;

      // Background
      g.fillStyle(0x333333, 0.6);
      g.fillRect(x, y, BAR_W, BAR_H);

      // Fill
      const fillW = (bar.value / bar.max) * BAR_W;
      g.fillStyle(bar.color, 0.9);
      g.fillRect(x, y, fillW, BAR_H);

      // Border
      g.lineStyle(1, 0x000000, 0.5);
      g.strokeRect(x, y, BAR_W, BAR_H);
    });

    // Add labels as text objects if not already created
    if (!(this as any)._barLabels) {
      (this as any)._barLabels = bars.map((bar, i) => {
        const y = startY + i * BAR_GAP - 1;
        const label = this.scene.add.text(HUD_X + BAR_W + 6, y, '', {
          fontFamily: PIXEL_FONT,
          fontSize: fs(7),
          color: PAL_CSS.ivory,
          stroke: '#000000',
          strokeThickness: 3,
        }).setOrigin(0, 0);
        this.container.add(label);
        return label;
      });
    }

    // Add bar name labels (left of bars) if not created
    if (!(this as any)._barNameLabels) {
      (this as any)._barNameLabels = bars.map((bar, i) => {
        const y = startY + i * BAR_GAP - 2;
        const nameLabel = this.scene.add.text(HUD_X, y - 14, bar.fullLabel, {
          fontFamily: PIXEL_FONT,
          fontSize: fs(6),
          color: PAL_CSS.ivory,
          stroke: '#000000',
          strokeThickness: 3,
        }).setOrigin(0, 0);
        this.container.add(nameLabel);
        return nameLabel;
      });
    }

    // Update label values
    const labels = (this as any)._barLabels as Phaser.GameObjects.Text[];
    const s2 = store.s;
    labels[0].setText(`${s2.preparation}`);
    labels[1].setText(`${s2.integrity}`);
    labels[2].setText(`${s2.energy}`);
  }

  private updateDiamonds(): void {
    this.diamondsText.setText(`💎 ${store.s.diamonds}`);
  }

  /**
   * Draw a chunky pixel-art heart using filled rectangles.
   * 5×5 grid scaled to `size` px.
   */
  private drawPixelHeart(
    g: Phaser.GameObjects.Graphics,
    ox: number, oy: number, size: number, filled: boolean,
  ): void {
    const s = size / 5; // size of one "pixel"
    const col = filled ? PAL.heartRed : 0x444444;
    const outline = 0x000000;

    //  Pixel heart pattern (5×5 grid):
    //  .X.X.
    //  XXXXX
    //  XXXXX
    //  .XXX.
    //  ..X..
    const pixels = [
      [0,1], [1,0], [1,1], [1,2],
      [2,1],
      [3,0], [3,1], [3,2],
      [0,3], [1,3], [1,4],
      [2,3],
      [3,3], [3,4],
      // fill rows
      [0,1], [0,2], [0,3],
      [1,0], [1,1], [1,2], [1,3], [1,4],
      [2,0], [2,1], [2,2], [2,3], [2,4],
      [3,1], [3,2], [3,3],
      [4,2],
    ];

    // Unique pixel set
    const set = new Set<string>();
    pixels.forEach(([r, c]) => set.add(`${r},${c}`));

    // Outline (draw slightly larger behind)
    g.fillStyle(outline, 1);
    set.forEach(key => {
      const [r, c] = key.split(',').map(Number);
      g.fillRect(ox + c * s - 1, oy + r * s - 1, s + 2, s + 2);
    });

    // Fill
    g.fillStyle(col, 1);
    set.forEach(key => {
      const [r, c] = key.split(',').map(Number);
      g.fillRect(ox + c * s, oy + r * s, s, s);
    });

    // Inner highlight on filled hearts (top-left shine)
    if (filled) {
      g.fillStyle(0xff8888, 0.5);
      g.fillRect(ox + 1 * s, oy + 1 * s, s, s);
      g.fillRect(ox + 3 * s, oy + 1 * s, s, s);
    }
  }

  private timerShaking = false;

  private updateTimer(): void {
    const start = store.s.gameStartTime;
    if (!start) { this.timerText.setText('15:00'); return; }

    const remaining = store.remainingSeconds;
    const m = Math.floor(remaining / 60);
    const ss = remaining % 60;
    this.timerText.setText(`${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`);

    // At ≤ 5 minutes remaining: turn red and shake
    if (remaining <= 300) {
      this.timerText.setColor('#FF4444');
      this.timerText.setStroke('#660000', 4);
      if (!this.timerShaking) {
        this.timerShaking = true;
        this.scene.tweens.add({
          targets: this.timerText,
          x: this.timerText.x - 3,
          duration: 80,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    } else {
      this.timerText.setColor(PAL_CSS.warmGold);
      this.timerText.setStroke('#000000', 4);
      if (this.timerShaking) {
        this.timerShaking = false;
        this.scene.tweens.killTweensOf(this.timerText);
        this.timerText.setX(DESIGN_W - HUD_X);
      }
    }
  }

  destroy(): void {
    this.timerEvent?.remove();
    this.container?.destroy(true);
  }
}
