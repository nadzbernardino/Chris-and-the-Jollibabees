/**
 * OfficeScene — Work task (progress bar) + Darmesh call.
 * Task: tap computer 6 times to fill work progress bar.
 * Mid-way: Darmesh call modal → jollibabees say "Hi Darmesh!"
 * 1 temptation pig trigger.
 * Spawns JolliBurrito (index 3) after work done.
 */
import { SCENE, DESIGN_W, DESIGN_H } from '../constants';
import { store } from '../store/GameStoreNew';
import { BaseRoomScene } from './BaseRoomScene';
import { fxSparkle } from '../fx';

const TASK_WORK = 'work';
const WORK_TAPS = 6;

export class OfficeScene extends BaseRoomScene {
  constructor() { super(SCENE.OFFICE); }
  get bgKey() { return 'workstation_bg'; }
  get roomKey() { return SCENE.OFFICE; }
  get entryLines() { return ['I should get to work']; }

  private tapCount = 0;
  private progressBar!: Phaser.GameObjects.Rectangle;
  private progressBg!: Phaser.GameObjects.Rectangle;
  private progressLabel!: Phaser.GameObjects.Text;
  private darmeshTriggered = false;
  private pigTriggered = false;

  protected onRoomCreate(): void {
    const done = this.isTaskDone(TASK_WORK);

    // ── Computer / desk area (tap target) ────────────────
    const deskZone = this.add.rectangle(DESIGN_W * 0.48, DESIGN_H * 0.52, 420, 320, 0x000000, 0)
      .setInteractive({ useHandCursor: true }).setDepth(5);

    if (!done) {
      deskZone.on('pointerdown', () => this.onWorkTap());
    }

    // ── Progress bar ─────────────────────────────────────
    const barX = DESIGN_W * 0.35;
    const barY = DESIGN_H * 0.18;
    const barW = 300;
    const barH = 30;

    this.progressBg = this.add.rectangle(barX + barW / 2, barY, barW, barH, 0x333333)
      .setDepth(20);
    this.progressBar = this.add.rectangle(barX, barY, 0, barH - 4, 0x4CAF50)
      .setOrigin(0, 0.5).setDepth(21);

    this.progressLabel = this.add.text(DESIGN_W * 0.48, barY - 30,
      done ? 'Work complete ✓' : `Work: ${this.tapCount}/${WORK_TAPS}`,
      { fontSize: '12px', fontFamily: '"Press Start 2P", "Courier New", monospace', color: '#FFE4B5', stroke: '#000', strokeThickness: 3 },
    ).setOrigin(0.5).setDepth(22);

    if (done) {
      this.progressBar.width = 296;
      this.trySpawnRoomJollibabee();
    }

    // ── Temptation pig (1 call) ──────────────────────────
    if (!done) {
      this.time.delayedCall(12000, () => {
        if (!this.pigTriggered && !this.isTaskDone(TASK_WORK)) {
          this.pigTriggered = true;
          this.showTemptationPig();
        }
      });
    }
  }

  private onWorkTap(): void {
    if (this.isTaskDone(TASK_WORK)) return;
    this.tapCount++;
    this.progressBar.width = (296 * this.tapCount) / WORK_TAPS;
    this.progressLabel.setText(`Work: ${this.tapCount}/${WORK_TAPS}`);

    // Darmesh call halfway through
    if (this.tapCount === Math.floor(WORK_TAPS / 2) && !this.darmeshTriggered) {
      this.darmeshTriggered = true;
      this.showDarmeshCall();
      return;
    }

    if (this.tapCount >= WORK_TAPS) {
      this.markTaskDone(TASK_WORK);
      this.progressLabel.setText('Work complete ✓');
      // FX: sparkle around the progress bar
      fxSparkle(this, DESIGN_W * 0.48, DESIGN_H * 0.18, 12, 80);
      this.showTaskCompleteBubble();
      this.trySpawnRoomJollibabee(); // JolliBurrito
    }
  }

  private showDarmeshCall(): void {
    // Jollibabees say "Hi, Darmesh!" via scenario-locked line
    this.bubbleMgr.onDarmeshCallStart();

    this.modal.show({
      title: '📞 Incoming Call: Darmesh',
      body: 'Darmesh is calling! Take the call?',
      buttons: [
        {
          label: 'Take call',
          callback: () => {
            this.bubbleMgr.chrisSay('Good chat with Darmesh', 2000);
            // After closing: jollibabees say "Goodbye, Darmesh!"
            this.time.delayedCall(2200, () => {
              this.bubbleMgr.onDarmeshCallEnd();
            });
          },
          color: 0x336633,
        },
        {
          label: 'Ignore call',
          callback: () => {
            this.bubbleMgr.chrisSay('Maybe later…', 1500);
          },
          color: 0x993333,
        },
      ],
    });
  }
}
