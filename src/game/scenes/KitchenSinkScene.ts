/**
 * KitchenSinkScene — Dirty dishes task + coffee item.
 * Task: tap dirtyplates → after N taps, swap to cleanplates.
 * Coffee: tap coffee → +1 heart (once).
 * After dishes done → spawn JolliCute + "That task is done."
 * Temptation pig triggers after a delay (2 calls per spec).
 */
import { SCENE, DESIGN_W, DESIGN_H } from '../constants';
import { store } from '../store/GameStoreNew';
import { BaseRoomScene } from './BaseRoomScene';
import { fxShimmer, fxSparkle, fxHeartFlash } from '../fx';

const TASK_DISHES = 'dishes';
const TAP_TARGET = 5; // taps to clean

export class KitchenSinkScene extends BaseRoomScene {
  constructor() { super(SCENE.KITCHEN_SINK); }
  get bgKey() { return 'kitchen_sink_bg'; }
  get roomKey() { return SCENE.KITCHEN_SINK; }
  get entryLines() { return ['I should wash the dishes']; }

  private dirtyImg!: Phaser.GameObjects.Image;
  private cleanImg!: Phaser.GameObjects.Image;
  private coffeeImg!: Phaser.GameObjects.Image;
  private tapCount = 0;
  private progressText!: Phaser.GameObjects.Text;
  private pigCount = 0;

  protected onRoomCreate(): void {
    const done = this.isTaskDone(TASK_DISHES);

    // ── Dishes ───────────────────────────────────────────
    this.dirtyImg = this.add.image(DESIGN_W * 0.42, DESIGN_H * 0.52, 'dirtyplates')
      .setScale(0.6).setDepth(10).setInteractive({ useHandCursor: true });

    this.cleanImg = this.add.image(DESIGN_W * 0.42, DESIGN_H * 0.52, 'cleanplates')
      .setScale(0.6).setDepth(10).setVisible(done);

    if (done) {
      this.dirtyImg.setVisible(false);
    } else {
      this.dirtyImg.on('pointerdown', () => this.onDishTap());
    }

    // Progress
    this.progressText = this.add.text(
      DESIGN_W * 0.42, DESIGN_H * 0.37,
      done ? 'Dishes done ✓' : `Scrub: ${this.tapCount}/${TAP_TARGET}`,
      { fontSize: '12px', fontFamily: '"Press Start 2P", "Courier New", monospace', color: '#FFE4B5', stroke: '#000', strokeThickness: 3 },
    ).setOrigin(0.5).setDepth(20);

    // ── Coffee ───────────────────────────────────────────
    this.coffeeImg = this.add.image(DESIGN_W * 0.72, DESIGN_H * 0.48, 'coffee')
      .setScale(0.5).setDepth(10)
      .setInteractive({ useHandCursor: true });

    // Dim if already used
    if (store.s.coffeeUses >= 2) this.coffeeImg.setTint(0x888888);

    this.coffeeImg.on('pointerdown', () => this.onCoffeeTap());

    // If already spawned jollibabee, ensure shown
    if (done) this.trySpawnRoomJollibabee();

    // ── Temptation pig triggers (2 calls) ────────────────
    if (!done) {
      this.time.delayedCall(8000, () => this.triggerPig());
      this.time.delayedCall(20000, () => this.triggerPig());
    }
  }

  private triggerPig(): void {
    if (this.pigCount >= 2 || this.isTaskDone(TASK_DISHES)) return;
    this.pigCount++;
    this.showTemptationPig();
  }

  private onDishTap(): void {
    if (this.isTaskDone(TASK_DISHES)) return;
    this.tapCount++;
    this.progressText.setText(`Scrub: ${this.tapCount}/${TAP_TARGET}`);

    // Scrub feedback
    this.tweens.add({
      targets: this.dirtyImg, angle: { from: -4, to: 4 },
      duration: 80, yoyo: true,
    });

    if (this.tapCount >= TAP_TARGET) {
      this.markTaskDone(TASK_DISHES);
      this.dirtyImg.setVisible(false);
      this.cleanImg.setVisible(true);
      // FX: shimmer + sparkle at replaced asset center
      fxShimmer(this, this.cleanImg.x, this.cleanImg.y, 10, 60);
      fxSparkle(this, this.cleanImg.x, this.cleanImg.y, 8, 50);
      this.progressText.setText('Dishes done ✓');
      this.showTaskCompleteBubble();
      this.trySpawnRoomJollibabee();
    }
  }

  private onCoffeeTap(): void {
    if (store.s.coffeeUses >= 2) {
      // Second click and beyond — Chris says this
      this.bubbleMgr.chrisSay('That is empty. Need to ask Babitee for coffee.', 3000);
      return;
    }
    // First click: +1 heart, Chris bubble
    store.useCoffee();
    store.addHeart(1);
    this.hud.refresh();
    fxSparkle(this, this.coffeeImg.x, this.coffeeImg.y, 8, 40);
    fxHeartFlash(this, true);
    this.audio.heartGain();
    this.bubbleMgr.chrisSay('increased productivity! I am Super Chris!', 3000);
  }
}
