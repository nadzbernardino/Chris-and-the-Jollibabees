/**
 * LivingRoomScene — Two tasks:
 *   1) Trash cleanup: drag 3 trash items to trashbin
 *   2) Vacuum trigger: tap vacuum → launches VacuumMinigame
 *
 * Doom scroll phone: tap phone → modal (buttons only, no click-outside close)
 * Whale coin popup triggers once mid-room.
 * Temptation pig triggers 2× on timers.
 * Spawns JolliBart (index 1) after vacuum, JolliLite (index 2) after trash.
 *
 * Entry prompt: random ONE of "I should throw the trash" / "I should vacuum the carpet"
 */
import Phaser from 'phaser';
import { SCENE, DESIGN_W, DESIGN_H } from '../constants';
import { store } from '../store/GameStoreNew';
import { BaseRoomScene } from './BaseRoomScene';
import { showBubble } from '../ui/SpeechBubbleNew';
import { fxPoof, fxSparkle, fxHeartFlash, fxOuchFlicker } from '../fx';

const TASK_TRASH = 'trash';
const TASK_VACUUM = 'vacuum';
const TRASH_ITEMS = ['bottle', 'can', 'paperbag', 'tissue', 'cup', 'plasticbag', 'box', 'hair'];
const TRASH_NEEDED = 8;

export class LivingRoomScene extends BaseRoomScene {
  constructor() { super(SCENE.LIVING_ROOM); }
  get bgKey() { return 'living_room_bg'; }
  get roomKey() { return SCENE.LIVING_ROOM; }
  get entryLines() { return ['I should throw the trash', 'I should vacuum the carpet']; }

  private trashBin!: Phaser.GameObjects.Image;
  private trashSprites: Phaser.GameObjects.Image[] = [];
  private trashDone = 0;
  private trashLabel!: Phaser.GameObjects.Text;
  private vacuumImg!: Phaser.GameObjects.Image;
  private phoneImg!: Phaser.GameObjects.Image;
  private pigCount = 0;
  private whaleTriggered = false;

  protected onRoomCreate(): void {
    const trashComplete = this.isTaskDone(TASK_TRASH);
    const vacuumComplete = this.isTaskDone(TASK_VACUUM);

    // ── Trash bin (drop target) ──────────────────────────
    this.trashBin = this.add.image(DESIGN_W * 0.85, DESIGN_H * 0.78, 'trashbin')
      .setScale(0.5).setDepth(10);

    // ── Trash items (draggable) ──────────────────────────
    if (!trashComplete) {
      const positions = [
        { x: DESIGN_W * 0.22, y: DESIGN_H * 0.55 },
        { x: DESIGN_W * 0.38, y: DESIGN_H * 0.65 },
        { x: DESIGN_W * 0.52, y: DESIGN_H * 0.50 },
        { x: DESIGN_W * 0.30, y: DESIGN_H * 0.72 },
        { x: DESIGN_W * 0.45, y: DESIGN_H * 0.58 },
        { x: DESIGN_W * 0.68, y: DESIGN_H * 0.77 }, // plasticbag
        { x: DESIGN_W * 0.60, y: DESIGN_H * 0.60 }, // box
        { x: DESIGN_W * 0.55, y: DESIGN_H * 0.72 }  // hair
      ];

      TRASH_ITEMS.forEach((key, i) => {
        let pos, scale;
        if (key === 'plasticbag') {
          pos = positions[5];
          scale = 0.48;
        } else if (key === 'box') {
          pos = positions[6];
          scale = 0.44;
        } else if (key === 'hair') {
          pos = positions[7];
          scale = 0.38;
        } else {
          pos = positions[i % 5];
          scale = 0.4;
        }
        const s = this.add.image(pos.x, pos.y, key)
          .setScale(scale).setDepth(15)
          .setInteractive({ useHandCursor: true, draggable: true });

        this.input.setDraggable(s);
        this.trashSprites.push(s);
      });

      // Drag events
      this.input.on('drag', (_p: any, obj: Phaser.GameObjects.Image, dragX: number, dragY: number) => {
        obj.setPosition(dragX, dragY);
      });

      this.input.on('dragend', (_p: any, obj: Phaser.GameObjects.Image) => {
        this.checkTrashDrop(obj);
      });
    }

    this.trashLabel = this.add.text(
      DESIGN_W * 0.85,
      DESIGN_H * 0.68,
      trashComplete
        ? 'Trash done ✓'
        : `Trash: 0/${TRASH_NEEDED}`,
      {
        fontSize: '12px',
        fontFamily: '"Press Start 2P", "Courier New", monospace',
        color: '#FFE4B5',
        stroke: '#000',
        strokeThickness: 3,
      },
    ).setOrigin(0.5).setDepth(20);

    // ── Vacuum (tap to launch minigame) ──────────────────
    this.vacuumImg = this.add.image(DESIGN_W * 0.65, DESIGN_H * 0.82, 'vacuum')
      .setScale(0.45).setDepth(10)
      .setInteractive({ useHandCursor: true });

    if (vacuumComplete) {
      this.vacuumImg.setTint(0x888888);
    } else {
      this.vacuumImg.on('pointerdown', () => this.onVacuumTap());
    }

    // ── Phone (doom scroll — button-only modal) ──────────
    this.phoneImg = this.add.image(DESIGN_W * 0.15, DESIGN_H * 0.82, 'phone')
      .setScale(0.4).setDepth(10)
      .setInteractive({ useHandCursor: true });
    this.phoneImg.on('pointerdown', () => this.showDoomScroll());

    // Jollibabee spawns for completed tasks
    if (trashComplete) this.maybeSpawnJB(2); // JolliLite
    if (vacuumComplete) this.maybeSpawnJB(1); // JolliBart

    // ── Temptation pig triggers (2 calls) ────────────────
    if (!trashComplete || !vacuumComplete) {
      this.time.delayedCall(10000, () => this.triggerPig());
      this.time.delayedCall(25000, () => this.triggerPig());
    }

    // ── Whale coin trigger (always once in living room) ──
    if (!trashComplete || !vacuumComplete) {
      this.time.delayedCall(15000, () => {
        if (!this.whaleTriggered) {
          this.whaleTriggered = true;
          this.showWhaleCoin();
        }
      });
    }
  }

  private triggerPig(): void {
    if (this.pigCount >= 2) return;
    this.pigCount++;
    this.showTemptationPig();
  }

  // ── Trash ──────────────────────────────────────────────

  private checkTrashDrop(obj: Phaser.GameObjects.Image): void {
    if (this.isTaskDone(TASK_TRASH)) return;
    const dist = Phaser.Math.Distance.Between(obj.x, obj.y, this.trashBin.x, this.trashBin.y);
    if (dist < 100) {
      // FX: poof at trash position + thunk sound
      fxPoof(this, obj.x, obj.y, 5);
      this.audio.thunk();
      obj.destroy();
      this.trashDone++;
      this.trashLabel.setText(`Trash: ${this.trashDone}/${TRASH_NEEDED}`);

      if (this.trashDone >= TRASH_NEEDED) {
        this.markTaskDone(TASK_TRASH);
        this.trashLabel.setText('Trash done ✓');
        // Remove remaining sprites
        this.trashSprites.forEach(s => s.destroy());
        this.trashSprites = [];
        this.showTaskCompleteBubble();
        this.maybeSpawnJB(2); // JolliLite
      }
    }
  }

  // ── Vacuum ─────────────────────────────────────────────

  private onVacuumTap(): void {
    if (this.isTaskDone(TASK_VACUUM)) return;
    // Launch vacuum minigame, pass callback via registry
    this.registry.set('vacuumCallback', () => {
      this.markTaskDone(TASK_VACUUM);
      this.vacuumImg.setTint(0x888888);
      this.showTaskCompleteBubble();
      this.maybeSpawnJB(1); // JolliBart
      // Scenario-locked: JolliBart reacts to bugs
      this.bubbleMgr.onBugSeen();
    });
    this.scene.launch(SCENE.VACUUM_MINI);
    this.scene.pause();
  }

  // ── Doom scroll (phone-click only, button-only modal) ──

  private showDoomScroll(): void {
    if (this.modal.isOpen) return;
    this.modal.show({
      title: '📱 Doom Scroll',
      body: 'You found your phone...\nKeep scrolling or close it?',
      buttons: [
        {
          label: 'Close app',
          callback: () => {
            showBubble(this, this.phoneImg.x, this.phoneImg.y - 60, 'Good choice!', 1500);
          },
          color: 0x336633,
        },
        {
          label: 'Keep scrolling',
          callback: () => {
            store.removeHeart(1);
            this.hud.refresh();
            fxOuchFlicker(this);
            this.audio.heartLose();
            showBubble(this, this.phoneImg.x, this.phoneImg.y - 60, '📱 -1 ❤️', 2000);
            this.checkGameOver();
          },
          color: 0x993333,
        },
      ],
    });
  }

  // ── Helper ─────────────────────────────────────────────

  private maybeSpawnJB(jbIdx: number): void {
    if (!store.foundJollibabee(jbIdx)) {
      this.followers.spawnNewJollibabee(jbIdx);
    }
  }
}
