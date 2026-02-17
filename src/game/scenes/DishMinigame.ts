/**
 * DishMinigame — Full-screen overlay: 10 dirty plates.
 * Click each plate to flip it from 'plate' → 'plateclean'.
 * When all 10 are clean → callback via registry, return to WorldScene.
 */
import Phaser from 'phaser';
import { SCENE, DESIGN_W, DESIGN_H } from '../constants';
import { TEXT, PIXEL_FONT, PAL_CSS } from '../uiTheme';
import { AudioManager } from '../audio/AudioManager';
import { fxSparkle } from '../fx';
import { sizeH, PROP_S } from '../spriteSize';

const TOTAL_PLATES = 10;

/** Grid layout: 5 columns × 2 rows */
const COLS = 5;
const ROWS = 2;
const PAD_X = 220;     // horizontal margin
const PAD_Y = 280;     // vertical start
const GAP_X = 220;     // horizontal spacing
const GAP_Y = 260;     // vertical spacing

export class DishMinigame extends Phaser.Scene {
  constructor() { super(SCENE.DISH_MINI); }

  private plates: Phaser.GameObjects.Image[] = [];
  private cleaned = 0;
  private label!: Phaser.GameObjects.Text;
  private audio!: AudioManager;

  create(): void {
    this.cleaned = 0;
    this.plates = [];
    this.audio = new AudioManager(this);

    // Background — kitchen sink
    this.add.image(DESIGN_W / 2, DESIGN_H / 2, 'kitchen_sink_bg')
      .setDisplaySize(DESIGN_W, DESIGN_H).setDepth(0);

    // Darken overlay so plates pop
    this.add.rectangle(DESIGN_W / 2, DESIGN_H / 2, DESIGN_W, DESIGN_H, 0x000000, 0.4)
      .setDepth(1);

    // Instruction label
    this.label = this.add.text(DESIGN_W / 2, 60, `Clean the dishes: 0 / ${TOTAL_PLATES}`, {
      ...TEXT.instruction,
    }).setOrigin(0.5).setDepth(20);

    // Spawn 10 plates in a 5×2 grid
    for (let i = 0; i < TOTAL_PLATES; i++) {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x = PAD_X + col * GAP_X;
      const y = PAD_Y + row * GAP_Y;

      const plate = this.add.image(x, y, 'plate')
        .setDepth(10)
        .setInteractive({ useHandCursor: true });
      sizeH(plate, PROP_S);

      // Custom property to track state
      (plate as any)._clean = false;

      plate.on('pointerdown', () => {
        if ((plate as any)._clean) return; // already cleaned
        (plate as any)._clean = true;

        // Swap texture to clean plate
        plate.setTexture('plateclean');
        sizeH(plate, PROP_S);

        // FX
        fxSparkle(this, plate.x, plate.y, 6, 40);
        this.audio.pop();

        this.cleaned++;
        this.label.setText(`Clean the dishes: ${this.cleaned} / ${TOTAL_PLATES}`);

        if (this.cleaned >= TOTAL_PLATES) {
          this.label.setText('✅ All dishes clean!');
          this.time.delayedCall(800, () => this.exitMinigame(true));
        }
      });

      this.plates.push(plate);
    }

    // Close / cancel button
    const closeBtn = this.add.text(DESIGN_W - 60, 20, '✕', {
      fontFamily: PIXEL_FONT, fontSize: '32px', color: PAL_CSS.danger,
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5, 0).setDepth(30).setInteractive({ useHandCursor: true });

    closeBtn.on('pointerdown', () => this.exitMinigame(false));
  }

  private exitMinigame(success: boolean): void {
    const cb = this.registry.get('dishCallback') as (() => void) | undefined;
    this.registry.remove('dishCallback');
    this.scene.stop();
    this.scene.resume(SCENE.WORLD);
    if (success) cb?.();
  }
}
