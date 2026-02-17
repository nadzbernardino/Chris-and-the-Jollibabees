import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PALETTE, PALETTE_CSS, SCENES } from '../config';
import { store } from '../store/GameStore';

export class FinalPickupScene extends Phaser.Scene {
  constructor() {
    super(SCENES.FINAL_PICKUP);
  }

  create(): void {
    this.cameras.main.setBackgroundColor(PALETTE.forest1);
    this.cameras.main.fadeIn(400, 0x1f, 0x3b, 0x2c);

    const s = store.stats;

    // Readiness check
    const ready =
      s.preparation >= 90 &&
      s.energy >= 50 &&
      s.diamonds >= 10 &&
      s.hearts >= 1;

    if (!ready) {
      this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.35,
        'Not ready to pick up\nBabitee yet.', {
        fontSize: '28px', fontFamily: 'monospace', color: PALETTE_CSS.danger,
        align: 'center',
      }).setOrigin(0.5);

      // Show what's missing
      const missing: string[] = [];
      if (s.preparation < 90) missing.push(`Prep: ${s.preparation}/90`);
      if (s.energy < 50) missing.push(`Energy: ${s.energy}/50`);
      if (s.diamonds < 10) missing.push(`Diamonds: ${s.diamonds}/10`);
      if (s.hearts < 1) missing.push(`Hearts: ${s.hearts}/1`);

      this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.5,
        missing.join('\n'), {
        fontSize: '18px', fontFamily: 'monospace', color: PALETTE_CSS.champagne,
        align: 'center',
      }).setOrigin(0.5);

      const backBtn = this.add.rectangle(
        GAME_WIDTH / 2, GAME_HEIGHT * 0.7, 220, 60, PALETTE.wood1,
      ).setInteractive({ useHandCursor: true }).setStrokeStyle(2, PALETTE.highlight1);

      this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.7, 'Back to Map', {
        fontSize: '20px', fontFamily: 'monospace', color: PALETTE_CSS.ivory,
      }).setOrigin(0.5);

      backBtn.on('pointerdown', () => {
        this.cameras.main.fadeOut(400, 0x1f, 0x3b, 0x2c);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start(SCENES.WORLD_MAP, { panFromRoom: 'frontdoor' });
        });
      });
      return;
    }

    // Ready — show pickup moment
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.3,
      'Chris picks up Babitee.', {
      fontSize: '28px', fontFamily: 'monospace', color: PALETTE_CSS.highlight1,
      align: 'center',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.45,
      'The preparation paid off.', {
      fontSize: '18px', fontFamily: 'monospace', color: PALETTE_CSS.champagne,
    }).setOrigin(0.5);

    this.time.delayedCall(3000, () => {
      this.cameras.main.fadeOut(600, 0x1f, 0x3b, 0x2c);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start(SCENES.ENDING);
      });
    });
  }
}
