import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PALETTE, PALETTE_CSS, SCENES } from '../config';
import { store } from '../store/GameStore';
import { resetRun } from '../store/resetRun';

export class EndingScene extends Phaser.Scene {
  constructor() {
    super(SCENES.ENDING);
  }

  create(): void {
      // Play ending background music
      if (!this.audio) this.audio = new (require('../audio/AudioManager').AudioManager)(this);
      this.audio.playEndingMusic();
    this.cameras.main.setBackgroundColor(PALETTE.forest1);
    this.cameras.main.fadeIn(600, 0x1f, 0x3b, 0x2c);

    const s = store.stats;

    // Determine ending
    let endingText: string;
    let endingColor: string;

    if (s.integrity > 70 && s.hasRing) {
      endingText = "You didn't just prepare.\nYou chose us.";
      endingColor = PALETTE_CSS.highlight1;
    } else if (s.integrity >= 40) {
      endingText = "You're growing.";
      endingColor = PALETTE_CSS.champagne;
    } else {
      endingText = 'The forest needs\nsteadier roots.';
      endingColor = PALETTE_CSS.mist;
    }

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.2, endingText, {
      fontSize: '32px', fontFamily: 'monospace', color: endingColor,
      align: 'center', lineSpacing: 8,
    }).setOrigin(0.5);

    // Final stats
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.45,
      `Preparation: ${s.preparation}\n` +
      `Integrity: ${s.integrity}\n` +
      `Energy: ${s.energy}\n` +
      `Hearts: ${s.hearts}\n` +
      `Diamonds: ${s.diamonds}\n` +
      `Has Ring: ${s.hasRing ? 'Yes' : 'No'}\n` +
      `\nWhale Coin Wins: ${s.whaleCoinWins}\n` +
      `Whale Coin Losses: ${s.whaleCoinLosses}`, {
      fontSize: '16px', fontFamily: 'monospace', color: PALETTE_CSS.ivory,
      align: 'center', lineSpacing: 4,
    }).setOrigin(0.5);

    // Restart button
    const restartBtn = this.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT * 0.85, 220, 60, PALETTE.wood1,
    ).setInteractive({ useHandCursor: true }).setStrokeStyle(2, PALETTE.highlight1);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.85, 'Play Again', {
      fontSize: '22px', fontFamily: 'monospace', color: PALETTE_CSS.ivory,
    }).setOrigin(0.5);

    restartBtn.on('pointerdown', () => {
      resetRun();
      this.cameras.main.fadeOut(400, 0x1f, 0x3b, 0x2c);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start(SCENES.INTRO);
      });
    });
  }
}
