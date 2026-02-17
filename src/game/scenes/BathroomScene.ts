/**
 * BathroomScene — Two tasks with gating:
 *   1) Laundry: drag dirty clothes to laundry basket
 *   2) Folding: launches FoldingMinigame (after laundry is done)
 *
 * 2 temptation pig triggers.
 * Only one category active until finished. After both → room complete.
 */
import { SCENE, DESIGN_W, DESIGN_H } from '../constants';
import { store } from '../store/GameStoreNew';
import { BaseRoomScene } from './BaseRoomScene';
import { showBubble } from '../ui/SpeechBubbleNew';
import { fxPoof } from '../fx';

const TASK_LAUNDRY = 'laundry';
const TASK_FOLDING = 'folding';
const LAUNDRY_ITEMS = ['socks', 'underwear', 'towel', 'hoodie'];
const LAUNDRY_NEEDED = 3;

export class BathroomScene extends BaseRoomScene {
  constructor() { super(SCENE.BATHROOM); }
  get bgKey() { return 'bathroom_bg'; }
  get roomKey() { return SCENE.BATHROOM; }
  get entryLines() {
    if (this.isTaskDone(TASK_LAUNDRY) && !this.isTaskDone(TASK_FOLDING)) {
      return ['I need to fold the clothes'];
    }
    if (!this.isTaskDone(TASK_LAUNDRY)) {
      return ['I need to do laundry'];
    }
    return [];
  }

  private basket!: Phaser.GameObjects.Image;
  private laundrySprites: Phaser.GameObjects.Image[] = [];
  private laundryDone = 0;
  private statusText!: Phaser.GameObjects.Text;
  private foldBtn!: Phaser.GameObjects.Container;
  private pigCount = 0;

  protected onRoomCreate(): void {
    const laundryComplete = this.isTaskDone(TASK_LAUNDRY);
    const foldingComplete = this.isTaskDone(TASK_FOLDING);

    // ── Laundry basket (drop target) ─────────────────────
    this.basket = this.add.image(DESIGN_W * 0.82, DESIGN_H * 0.75, 'laundrybasket')
      .setScale(0.5).setDepth(10);

    // ── Dirty clothes (draggable) ────────────────────────
    if (!laundryComplete) {
      const positions = [
        { x: DESIGN_W * 0.18, y: DESIGN_H * 0.58 },
        { x: DESIGN_W * 0.32, y: DESIGN_H * 0.68 },
        { x: DESIGN_W * 0.42, y: DESIGN_H * 0.52 },
        { x: DESIGN_W * 0.25, y: DESIGN_H * 0.75 },
      ];

      LAUNDRY_ITEMS.forEach((key, i) => {
        const pos = positions[i % positions.length];
        const s = this.add.image(pos.x, pos.y, key)
          .setScale(0.35).setDepth(15)
          .setInteractive({ useHandCursor: true, draggable: true });
        this.input.setDraggable(s);
        this.laundrySprites.push(s);
      });

      this.input.on('drag', (_p: any, obj: Phaser.GameObjects.Image, dx: number, dy: number) => {
        obj.setPosition(dx, dy);
      });
      this.input.on('dragend', (_p: any, obj: Phaser.GameObjects.Image) => {
        this.checkLaundryDrop(obj);
      });
    }

    // ── Status text ──────────────────────────────────────
    this.statusText = this.add.text(DESIGN_W / 2, 80, this.getStatusStr(), {
      fontSize: '12px', fontFamily: '"Press Start 2P", "Courier New", monospace', color: '#FFE4B5',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20);

    // ── Fold button (only after laundry done) ────────────
    if (laundryComplete && !foldingComplete) {
      this.createFoldButton();
    }

    // ── Temptation pig triggers (2 calls) ────────────────
    if (!laundryComplete || !foldingComplete) {
      this.time.delayedCall(9000, () => this.triggerPig());
      this.time.delayedCall(22000, () => this.triggerPig());
    }
  }

  private triggerPig(): void {
    if (this.pigCount >= 2) return;
    this.pigCount++;
    this.showTemptationPig();
  }

  private getStatusStr(): string {
    if (this.isTaskDone(TASK_FOLDING)) return 'Bathroom complete ✓';
    if (this.isTaskDone(TASK_LAUNDRY)) return 'Laundry done — tap to fold clothes';
    return `Laundry: ${this.laundryDone}/${LAUNDRY_NEEDED}`;
  }

  private checkLaundryDrop(obj: Phaser.GameObjects.Image): void {
    if (this.isTaskDone(TASK_LAUNDRY)) return;
    const dist = Phaser.Math.Distance.Between(obj.x, obj.y, this.basket.x, this.basket.y);
    if (dist < 110) {
      // FX: poof at laundry drop + whoosh sound
      fxPoof(this, obj.x, obj.y, 5);
      this.audio.whoosh();
      obj.destroy();
      this.laundryDone++;
      this.statusText.setText(`Laundry: ${this.laundryDone}/${LAUNDRY_NEEDED}`);

      if (this.laundryDone >= LAUNDRY_NEEDED) {
        this.markTaskDone(TASK_LAUNDRY);
        this.laundrySprites.forEach(s => s.destroy());
        this.laundrySprites = [];
        this.statusText.setText(this.getStatusStr());
        this.showTaskCompleteBubble();

        // Show fold button
        this.time.delayedCall(1000, () => {
          this.createFoldButton();
        });
      }
    }
  }

  private createFoldButton(): void {
    const btnW = 200;
    const btnH = 52;
    const bg = this.add.rectangle(0, 0, btnW, btnH, 0x5c3a21)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0xf4c76a);
    const lbl = this.add.text(0, 0, '👕 Fold Clothes', {
      fontSize: '13px', fontFamily: '"Press Start 2P", "Courier New", monospace', color: '#F4C76A',
    }).setOrigin(0.5);

    this.foldBtn = this.add.container(DESIGN_W / 2, DESIGN_H / 2 + 200, [bg, lbl]).setDepth(20);

    bg.on('pointerdown', () => {
      this.registry.set('foldingCallback', () => {
        this.markTaskDone(TASK_FOLDING);
        this.statusText.setText(this.getStatusStr());
        this.foldBtn?.destroy(true);
        this.showTaskCompleteBubble();
      });
      this.scene.launch(SCENE.FOLDING_MINI);
      this.scene.pause();
    });
  }
}
