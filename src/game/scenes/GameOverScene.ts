import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PALETTE, PALETTE_CSS, SCENES } from '../config';
import { store } from '../store/GameStore';
import { resetRun } from '../store/resetRun';

export class GameOverScene extends Phaser.Scene {
  private reason = '';

  constructor() {
    super(SCENES.GAME_OVER);
  }

  init(data?: { reason?: string }): void {
    this.reason = data?.reason ?? '';
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x1a0a0a); // dark red-black
    this.cameras.main.fadeIn(400, 0x1a, 0x0a, 0x0a);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.25, 'Game Over', {
      fontSize: '42px', fontFamily: 'monospace', color: PALETTE_CSS.danger,
    }).setOrigin(0.5);

    const reasonLine = this.reason ? `${this.reason}\n` : '';
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.38,
      `${reasonLine}The forest will wait.\nTry again.`, {
      fontSize: '20px', fontFamily: 'monospace', color: PALETTE_CSS.ivory,
      align: 'center',
    }).setOrigin(0.5);

    // Stats summary
    const s = store.stats;
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.55,
      `Preparation: ${s.preparation}  Integrity: ${s.integrity}\n` +
      `Hearts: ${s.hearts}  Diamonds: ${s.diamonds}\n` +
      `Whale Wins: ${s.whaleCoinWins}  Losses: ${s.whaleCoinLosses}`, {
      fontSize: '14px', fontFamily: 'monospace', color: PALETTE_CSS.champagne,
      align: 'center',
    }).setOrigin(0.5);

    // Restart button
    const restartBtn = this.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT * 0.75, 220, 60, PALETTE.wood1,
    ).setInteractive({ useHandCursor: true }).setStrokeStyle(2, PALETTE.highlight1);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.75, 'Restart', {
      fontSize: '22px', fontFamily: 'monospace', color: PALETTE_CSS.ivory,
    }).setOrigin(0.5);

    restartBtn.on('pointerdown', () => {
      resetRun();
      this.cameras.main.fadeOut(400, 0x1a, 0x0a, 0x0a);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start(SCENES.INTRO);
      });
    });
  }
}
