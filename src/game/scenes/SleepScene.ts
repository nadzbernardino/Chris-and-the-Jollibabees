import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PALETTE, PALETTE_CSS, SCENES } from '../config';
import { store } from '../store/GameStore';
import { applySleep } from '../store/reducers/applySleep';

const SLEEP_HOLD_MS = 3500; // 3.5 seconds

export class SleepScene extends Phaser.Scene {
  private holdProgress = 0;
  private holding = false;
  private progressBar!: Phaser.GameObjects.Rectangle;
  private statusText!: Phaser.GameObjects.Text;
  private completed = false;

  constructor() {
    super(SCENES.SLEEP);
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x0d1b2a); // dark night
    this.cameras.main.fadeIn(400, 0x0d, 0x1b, 0x2a);
    this.holdProgress = 0;
    this.holding = false;
    this.completed = false;

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.25, 'Sacred Sleep', {
      fontSize: '36px', fontFamily: 'monospace', color: PALETTE_CSS.ivory,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.35, 'Hold to sleep... (3.5 seconds)', {
      fontSize: '18px', fontFamily: 'monospace', color: PALETTE_CSS.champagne,
    }).setOrigin(0.5);

    // Progress bar background
    const barWidth = 400;
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, barWidth, 40, PALETTE.mist);

    // Progress bar fill
    this.progressBar = this.add.rectangle(
      GAME_WIDTH / 2 - barWidth / 2, GAME_HEIGHT / 2, 0, 36, PALETTE.highlight1,
    ).setOrigin(0, 0.5);

    this.statusText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.6, 'Press and hold...', {
      fontSize: '16px', fontFamily: 'monospace', color: PALETTE_CSS.ivory,
    }).setOrigin(0.5);

    // Hold interaction — anywhere on screen
    this.input.on('pointerdown', () => {
      if (!this.completed) this.holding = true;
    });
    this.input.on('pointerup', () => {
      if (!this.completed) {
        this.holding = false;
        this.holdProgress = 0;
        this.progressBar.width = 0;
        this.statusText.setText('Press and hold...');
      }
    });
  }

  update(_time: number, delta: number): void {
    if (this.completed) return;

    if (this.holding) {
      this.holdProgress += delta;
      const ratio = Math.min(this.holdProgress / SLEEP_HOLD_MS, 1);
      this.progressBar.width = ratio * 396;
      this.statusText.setText(`Sleeping... ${((ratio) * 100).toFixed(0)}%`);

      if (this.holdProgress >= SLEEP_HOLD_MS) {
        this.completeSleep();
      }
    }
  }

  private completeSleep(): void {
    this.completed = true;
    this.holding = false;

    const newStats = applySleep(store.stats);
    store.setStats(newStats);
    store.completeSleep();

    this.statusText.setText('Rested. Energy restored!');

    this.time.delayedCall(1500, () => {
      this.cameras.main.fadeOut(400, 0x0d, 0x1b, 0x2a);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start(SCENES.WORLD_MAP, { panFromRoom: 'bedroom' });
      });
    });
  }
}
