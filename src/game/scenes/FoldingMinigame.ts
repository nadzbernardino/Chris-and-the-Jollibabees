/**
 * FoldingMinigame — Wood floor background.
 * Drag clothing items to snap zones to "fold" them.
 * When all folded → callback from registry, return to BathroomScene.
 */
import Phaser from 'phaser';
import { SCENE, DESIGN_W, DESIGN_H } from '../constants';
import { TEXT, PIXEL_FONT, PAL_CSS } from '../uiTheme';
import { AudioManager } from '../audio/AudioManager';
import { fxPop, fxSparkle } from '../fx';
import { sizeH, MINI_CLOTHES_H } from '../spriteSize';

interface FoldSlot {
  key: string;
  startX: number; startY: number;
  targetX: number; targetY: number;
}

const FOLD_SLOTS: FoldSlot[] = [
  { key: 'dress',   startX: 200, startY: 700, targetX: 400,  targetY: 300 },
  { key: 'pants',   startX: 500, startY: 750, targetX: 700,  targetY: 300 },
  { key: 'jacket',  startX: 800, startY: 680, targetX: 1000, targetY: 300 },
  { key: 'shorts',  startX: 1100,startY: 720, targetX: 400,  targetY: 550 },
];

const SNAP_DIST = 80;

export class FoldingMinigame extends Phaser.Scene {
  constructor() { super(SCENE.FOLDING_MINI); }

  private folded = 0;
  private total = FOLD_SLOTS.length;
  private label!: Phaser.GameObjects.Text;
  private audio!: AudioManager;

  create(): void {
    // Reset state for re-entry (Phaser reuses scene instances)
    this.folded = 0;
    this.audio = new AudioManager(this);

    // Background
    this.add.image(DESIGN_W / 2, DESIGN_H / 2, 'wood_floor')
      .setDisplaySize(DESIGN_W, DESIGN_H).setDepth(0);

    // Instruction
    this.label = this.add.text(DESIGN_W / 2, 40, `Fold clothes: ${this.folded}/${this.total}`, {
      ...TEXT.instruction,
    }).setOrigin(0.5).setDepth(20);

    // Target zones (dashed outlines)
    FOLD_SLOTS.forEach(slot => {
      const g = this.add.graphics().setDepth(2);
      g.lineStyle(2, 0xf4c76a, 0.5);
      g.strokeRect(slot.targetX - 50, slot.targetY - 50, 100, 100);
      // Mini label
      this.add.text(slot.targetX, slot.targetY + 60, slot.key, {
        ...TEXT.small, color: PAL_CSS.gold,
      }).setOrigin(0.5).setDepth(3).setAlpha(0.6);
    });

    // Clothing sprites (draggable)
    FOLD_SLOTS.forEach(slot => {
      const s = this.add.image(slot.startX, slot.startY, slot.key)
        .setDepth(10)
        .setInteractive({ useHandCursor: true, draggable: true });
      sizeH(s, MINI_CLOTHES_H);
      this.input.setDraggable(s);

      // Attach target data
      (s as any)._targetX = slot.targetX;
      (s as any)._targetY = slot.targetY;
      (s as any)._folded = false;
    });

    this.input.on('drag', (_p: any, obj: Phaser.GameObjects.Image, dx: number, dy: number) => {
      if (!(obj as any)._folded) obj.setPosition(dx, dy);
    });

    this.input.on('dragend', (_p: any, obj: Phaser.GameObjects.Image) => {
      this.checkSnap(obj);
    });

    // Close button
    const closeBtn = this.add.text(DESIGN_W - 60, 20, '✕', {
      fontFamily: PIXEL_FONT, fontSize: '20px', color: PAL_CSS.danger,
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5, 0).setDepth(30).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.exitMinigame(false));
  }

  private checkSnap(obj: Phaser.GameObjects.Image): void {
    if ((obj as any)._folded) return;
    const tx = (obj as any)._targetX as number;
    const ty = (obj as any)._targetY as number;
    const dist = Phaser.Math.Distance.Between(obj.x, obj.y, tx, ty);

    if (dist < SNAP_DIST) {
      (obj as any)._folded = true;
      obj.setPosition(tx, ty);
      obj.disableInteractive();
      obj.setTint(0xaaddaa);
      // FX: pop + sparkle on correct snap
      fxPop(this, tx, ty);
      fxSparkle(this, tx, ty, 6, 40);
      this.audio.pop();
      this.folded++;
      this.label.setText(`Fold clothes: ${this.folded}/${this.total}`);

      if (this.folded >= this.total) {
        this.time.delayedCall(500, () => this.exitMinigame(true));
      }
    }
  }

  private exitMinigame(success: boolean): void {
    if (success) {
      const cb = this.registry.get('foldingCallback') as (() => void) | undefined;
      this.registry.remove('foldingCallback');
      this.scene.stop();
      this.scene.resume(SCENE.WORLD);
      cb?.();
    } else {
      this.registry.remove('foldingCallback');
      this.scene.stop();
      this.scene.resume(SCENE.WORLD);
    }
  }
}
