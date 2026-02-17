/**
 * BalconyScene — Bonsai watering task.
 * Task: tap bucket, then tap bonsaiugly → swap to bonsai.
 * Entry: "Fresh air… the bonsai needs water"
 * Spawns JolliBay (index 5) after watering.
 */
import { SCENE, DESIGN_W, DESIGN_H } from '../constants';
import { store } from '../store/GameStoreNew';
import { BaseRoomScene } from './BaseRoomScene';
import { showBubble } from '../ui/SpeechBubbleNew';
import { fxShimmer, fxSparkle } from '../fx';

const TASK_WATER = 'water';

export class BalconyScene extends BaseRoomScene {
  constructor() { super(SCENE.BALCONY); }
  get bgKey() { return 'balcony_garden_bg'; }
  get roomKey() { return SCENE.BALCONY; }
  get entryLines() { return ['I should water the bonsai']; }

  private bonsaiUgly!: Phaser.GameObjects.Image;
  private bonsaiPretty!: Phaser.GameObjects.Image;
  private bucketImg!: Phaser.GameObjects.Image;
  private holdingBucket = false;
  private bucketLabel!: Phaser.GameObjects.Text;

  protected onRoomCreate(): void {
    const done = this.isTaskDone(TASK_WATER);

    // ── Bonsai (ugly → pretty) ───────────────────────────
    this.bonsaiUgly = this.add.image(DESIGN_W * 0.62, DESIGN_H * 0.50, 'bonsaiugly')
      .setScale(0.5).setDepth(10)
      .setInteractive({ useHandCursor: true })
      .setVisible(!done);

    this.bonsaiPretty = this.add.image(DESIGN_W * 0.62, DESIGN_H * 0.50, 'bonsai')
      .setScale(0.5).setDepth(10)
      .setVisible(done);

    // ── Bucket ───────────────────────────────────────────
    this.bucketImg = this.add.image(DESIGN_W * 0.25, DESIGN_H * 0.78, 'bucket')
      .setScale(0.45).setDepth(10)
      .setInteractive({ useHandCursor: true })
      .setVisible(!done);

    this.bucketLabel = this.add.text(DESIGN_W * 0.25, DESIGN_H * 0.65,
      done ? 'Bonsai watered ✓' : 'Tap bucket, then tap bonsai',
      { fontSize: '12px', fontFamily: '"Press Start 2P", "Courier New", monospace', color: '#FFE4B5', stroke: '#000', strokeThickness: 3 },
    ).setOrigin(0.5).setDepth(20);

    if (!done) {
      this.bucketImg.on('pointerdown', () => {
        this.holdingBucket = true;
        this.bucketImg.setTint(0x66aaff);
        this.bucketLabel.setText('Now tap the bonsai!');
      });

      this.bonsaiUgly.on('pointerdown', () => {
        if (!this.holdingBucket) {
          showBubble(this, this.bonsaiUgly.x, this.bonsaiUgly.y - 80, 'Grab the bucket first', 1500);
          return;
        }
        this.waterBonsai();
      });
    }

    if (done) this.trySpawnRoomJollibabee();
  }

  private waterBonsai(): void {
    this.markTaskDone(TASK_WATER);
    this.bonsaiUgly.setVisible(false);
    this.bonsaiPretty.setVisible(true);
    this.bucketImg.setVisible(false);
    this.bucketLabel.setText('Bonsai watered ✓');
    this.holdingBucket = false;

    // FX: shimmer + sparkle on bonsai replacement
    fxShimmer(this, this.bonsaiPretty.x, this.bonsaiPretty.y, 10, 60);
    fxSparkle(this, this.bonsaiPretty.x, this.bonsaiPretty.y, 8, 50);
    this.audio.waterSplash();

    // Water splash effect
    this.showTaskCompleteBubble();
    this.trySpawnRoomJollibabee(); // JolliBay
  }
}
