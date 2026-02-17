/**
 * BaseRoomScene — Shared logic for all room scenes:
 *  - Full-screen background at DESIGN_W × DESIGN_H
 *  - Left/Right arrow navigation (keyboard + fat mobile arrows)
 *  - FollowerSystem (Chris + jollibabees)
 *  - HUD (hearts)
 *  - ModalManager instance
 *  - Fade transitions between rooms
 *  - Smart entry speech: "This room is cleaned!" if all done, else room prompt
 *  - Task completion helpers for spawning jollibabees
 *  - Temptation Pig popup helper
 *  - Whale Coin popup helper
 */
import Phaser from 'phaser';
import {
  DESIGN_W, DESIGN_H, SCENE, ROOM_ORDER, ROOM_JOLLIBABEE_MAP, ROOM_TASKS,
} from '../constants';
import { PAL, PAL_CSS, TEXT, UI, PIXEL_FONT } from '../uiTheme';
import { store } from '../store/GameStoreNew';
import { FollowerSystem } from '../ui/FollowerSystem';
import { HUDNew } from '../ui/HUDNew';
import { ModalManager } from '../ui/ModalManager';
import { showBubble, SpeechBubble } from '../ui/SpeechBubbleNew';
import { SpeechBubbleManager } from '../ui/SpeechBubbleManager';
import { AudioManager } from '../audio/AudioManager';
import { fxSparkle, fxShimmer, fxPop, fxPoof, fxHeartFlash, fxOuchFlicker } from '../fx';

export abstract class BaseRoomScene extends Phaser.Scene {
  protected followers!: FollowerSystem;
  protected hud!: HUDNew;
  protected modal!: ModalManager;
  protected audio!: AudioManager;
  protected bubbleMgr!: SpeechBubbleManager;
  protected bg!: Phaser.GameObjects.Image;
  private navLeft!: Phaser.GameObjects.Container;
  private navRight!: Phaser.GameObjects.Container;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyBlocked = false;
  private pendingBubble?: SpeechBubble;

  constructor(key: string) {
    super(key);
  }

  /** Subclass must return the BG asset key for this room */
  abstract get bgKey(): string;

  /** Subclass may override to provide "I should…" entry prompts when tasks remain */
  get entryLines(): string[] { return []; }

  /** Scene key of THIS room (must match SCENE constant) */
  abstract get roomKey(): string;

  // ─── LIFECYCLE ─────────────────────────────────────────

  create(): void {
    // Camera fade in
    this.cameras.main.fadeIn(300, 0, 0, 0);

    // Background at design size
    this.bg = this.add.image(DESIGN_W / 2, DESIGN_H / 2, this.bgKey)
      .setDisplaySize(DESIGN_W, DESIGN_H)
      .setDepth(0);

    // HUD
    this.hud = new HUDNew(this);
    this.hud.create();

    // Followers (Chris + jollibabees)
    this.followers = new FollowerSystem();
    this.followers.create(this, 200);

    // Modal manager
    this.modal = new ModalManager(this);

    // Audio manager
    this.audio = new AudioManager(this);

    // Speech bubble manager (ambient chatter, tap responses, scenario lines)
    this.bubbleMgr = new SpeechBubbleManager();
    this.bubbleMgr.create(
      this,
      () => this.followers.chris ? { x: this.followers.chris.x, y: this.followers.chris.y } : undefined,
      (jbIdx: number) => this.followers.getFollowerPos(jbIdx),
      (jbIdx: number) => this.followers.getFollowerContainer(jbIdx),
    );

    // Delegate jollibabee taps to the bubble manager
    this.followers.onTapCallback = (jbIdx: number) => {
      this.bubbleMgr.onJollibabeeTapped(jbIdx);
    };

    // Navigation arrows
    this.createNavArrows();

    // Keyboard
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
    }

    // Smart entry speech bubble
    this.time.delayedCall(500, () => {
      const hasTasks = ROOM_TASKS[this.roomKey] && ROOM_TASKS[this.roomKey].length > 0;
      if (hasTasks && store.isRoomComplete(this.roomKey)) {
        this.showEntrySpeech('This room is cleaned!');
      } else if (this.entryLines.length > 0) {
        const line = this.entryLines[Math.floor(Math.random() * this.entryLines.length)];
        this.showEntrySpeech(line);
      }
    });

    // Room-specific setup
    this.onRoomCreate();
  }

  /** Override in subclasses for room-specific setup */
  protected onRoomCreate(): void {}

  update(time: number, delta: number): void {
    this.followers.update(delta);
    this.bubbleMgr.update();

    // Pause/resume chatter when modal opens/closes
    if (this.modal.isOpen && !this.bubbleMgr.isPaused) {
      this.bubbleMgr.pause();
    } else if (!this.modal.isOpen && this.bubbleMgr.isPaused) {
      this.bubbleMgr.resume();
    }

    // Keyboard navigation
    if (this.cursors && !this.keyBlocked && !this.modal.isOpen) {
      if (Phaser.Input.Keyboard.JustDown(this.cursors.left!)) {
        this.goLeft();
      } else if (Phaser.Input.Keyboard.JustDown(this.cursors.right!)) {
        this.goRight();
      }
    }

    this.onRoomUpdate(time, delta);
  }

  /** Override in subclasses for room-specific update */
  protected onRoomUpdate(_time: number, _delta: number): void {}

  // ─── NAVIGATION ────────────────────────────────────────

  private roomIndex(): number {
    return ROOM_ORDER.indexOf(this.roomKey);
  }

  protected goLeft(): void {
    const idx = this.roomIndex();
    if (idx <= 0) return;
    this.transitionTo(ROOM_ORDER[idx - 1]);
  }

  protected goRight(): void {
    const idx = this.roomIndex();
    if (idx >= ROOM_ORDER.length - 1) return;
    this.transitionTo(ROOM_ORDER[idx + 1]);
  }

  protected transitionTo(sceneKey: string): void {
    this.keyBlocked = true;
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.cleanup();
      this.scene.start(sceneKey);
    });
  }

  protected cleanup(): void {
    this.followers.destroy();
    this.hud.destroy();
    this.modal.destroy();
    this.bubbleMgr.destroy();
    this.pendingBubble?.destroy(this, undefined);
  }

  // ─── NAV ARROWS ────────────────────────────────────────

  private createNavArrows(): void {
    const idx = this.roomIndex();
    const arrowSize = 60;

    // Left arrow (only if not first room)
    if (idx > 0) {
      this.navLeft = this.makeArrow(50, DESIGN_H / 2, '◀', arrowSize, () => this.goLeft());
    }

    // Right arrow (only if not last room)
    if (idx < ROOM_ORDER.length - 1) {
      this.navRight = this.makeArrow(
        DESIGN_W - 50, DESIGN_H / 2, '▶', arrowSize, () => this.goRight(),
      );
    }
  }

  private makeArrow(
    x: number, y: number, symbol: string, size: number, onClick: () => void,
  ): Phaser.GameObjects.Container {
    const bg = this.add.rectangle(0, 0, size, size * 1.4, PAL.darkPine, 0.7)
      .setInteractive({ useHandCursor: true });
    bg.setStrokeStyle(2, PAL.gold);
    const txt = this.add.text(0, 0, symbol, {
      fontFamily: PIXEL_FONT,
      fontSize: '22px', color: PAL_CSS.gold,
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);

    bg.on('pointerdown', () => {
      if (!this.modal.isOpen) onClick();
    });

    const container = this.add.container(x, y, [bg, txt]).setDepth(700);
    return container;
  }

  // ─── SPEECH ────────────────────────────────────────────

  protected showEntrySpeech(text: string): void {
    const f = this.followers;
    if (f && f.chris) {
      this.pendingBubble = showBubble(this, f.chris.x, f.chris.y - 80, text, 3000);
    }
  }

  // ─── JOLLIBABEE SPAWNING ──────────────────────────────

  /** After a task is done, check if this room should spawn a jollibabee */
  protected trySpawnRoomJollibabee(): void {
    const map = ROOM_JOLLIBABEE_MAP[this.roomKey];
    if (!map) return;
    for (const jbIdx of map) {
      if (!store.foundJollibabee(jbIdx)) {
        this.followers.spawnNewJollibabee(jbIdx);
        break; // one at a time
      }
    }
  }

  /** Mark a task done, refresh HUD, and show completion bubble */
  protected markTaskDone(taskId: string): void {
    store.completeTask(this.roomKey, taskId);
    this.hud.refresh();
    this.audio.taskComplete();
  }

  /** Show "That task is done." or partial-completion hint for two-task rooms */
  protected showTaskCompleteBubble(): void {
    const tasks = ROOM_TASKS[this.roomKey];
    if (!tasks) return;

    if (store.isRoomComplete(this.roomKey)) {
      // FX: sparkle halo around Chris on task complete
      if (this.followers.chris) {
        fxSparkle(this, this.followers.chris.x, this.followers.chris.y - 40, 14, 80);
      }
      this.showEntrySpeech('That task is done.');
    } else {
      // More tasks remain
      this.showEntrySpeech('I think I need to do more cleaning.');
    }
  }

  /** Check if a task is already done */
  protected isTaskDone(taskId: string): boolean {
    return store.isTaskDone(this.roomKey, taskId);
  }

  // ─── GAME OVER ────────────────────────────────────────

  /**
   * Check if hearts have dropped to 0 → show Game Over overlay.
   * Call after any heart-loss event.
   */
  protected checkGameOver(): void {
    if (store.s.hearts > 0) return;

    // Block all input
    const blocker = this.add.rectangle(
      DESIGN_W / 2, DESIGN_H / 2, DESIGN_W, DESIGN_H, 0x000000, 0.85,
    ).setDepth(950).setInteractive().setScrollFactor(0);

    // Game over text
    this.add.text(DESIGN_W / 2, DESIGN_H / 2 - 100, 'GAME OVER', {
      fontFamily: PIXEL_FONT,
      fontSize: '36px',
      color: '#FF4444',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5).setDepth(960).setScrollFactor(0);

    this.add.text(DESIGN_W / 2, DESIGN_H / 2 - 20, 'You ran out of hearts!', {
      fontFamily: PIXEL_FONT,
      fontSize: '13px',
      color: PAL_CSS.ivory,
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(960).setScrollFactor(0);

    // Retry button
    const retryBg = this.add.rectangle(DESIGN_W / 2, DESIGN_H / 2 + 80, UI.btnW, UI.btnH, PAL.wood)
      .setStrokeStyle(3, PAL.darkWood)
      .setInteractive({ useHandCursor: true })
      .setDepth(960).setScrollFactor(0);
    this.add.text(DESIGN_W / 2, DESIGN_H / 2 + 80, '🔄 Try Again', {
      fontFamily: PIXEL_FONT,
      fontSize: '14px',
      color: PAL_CSS.gold,
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(961).setScrollFactor(0);

    retryBg.on('pointerdown', () => {
      store.reset();
      this.cleanup();
      this.scene.start(SCENE.INTRO);
    });
  }

  // ─── TEMPTATION PIG POPUP ─────────────────────────────

  /**
   * Show temptation pig modal: Accept (-1 ❤️) / Block (+1 ❤️).
   * No countdown timer. Only closes via buttons.
   * Call from room scenes on a delay after entry.
   */
  protected showTemptationPig(): void {
    if (this.modal.isOpen) return;
    this.modal.show({
      title: '🐷 Temptation Pig',
      body: 'A temptation pig appears!',
      buttons: [
        {
          label: 'Block',
          callback: () => {
            store.addHeart(1);
            this.hud.refresh();
            fxHeartFlash(this, true);
            fxSparkle(this, DESIGN_W / 2, DESIGN_H / 2 - 80, 8);
            this.audio.heartGain();
            showBubble(this, DESIGN_W / 2, DESIGN_H / 2 - 80, '🛡️ Blocked! +1 ❤️', 2500);
          },
          color: 0x336633,
        },
        {
          label: 'Accept',
          callback: () => {
            store.removeHeart(1);
            this.hud.refresh();
            fxOuchFlicker(this);
            this.audio.heartLose();
            showBubble(this, DESIGN_W / 2, DESIGN_H / 2 - 80, '😈 -1 ❤️', 2500);
            this.checkGameOver();
          },
          color: 0x993333,
        },
      ],
    });
  }

  // ─── WHALE COIN POPUP ─────────────────────────────────

  /**
   * Whale Coin invest popup: Invest (50/50) / Ignore.
   * No timer, no diamond check. Only closes via buttons.
   */
  protected showWhaleCoin(): void {
    if (this.modal.isOpen) return;
    this.modal.show({
      title: '🐋 WHALE COIN',
      body: 'Whale Coin is pumping. Invest or ignore?',
      buttons: [
        {
          label: 'Invest',
          callback: () => {
            const win = Math.random() < 0.5;
            if (win) {
              store.addHeart(1);
              this.hud.refresh();
              fxHeartFlash(this, true);
              fxSparkle(this, DESIGN_W / 2, DESIGN_H / 2, 12, 70);
              this.audio.heartGain();
              showBubble(this, DESIGN_W / 2, DESIGN_H / 2 - 80, 'Win! Easy. +1 ❤️', 2500);
            } else {
              store.removeHeart(1);
              this.hud.refresh();
              fxOuchFlicker(this);
              this.audio.heartLose();
              showBubble(this, DESIGN_W / 2, DESIGN_H / 2 - 80, 'Oof… -1 ❤️', 2500);
              this.checkGameOver();
            }
          },
          color: 0x5c3a21,
        },
        {
          label: 'Ignore',
          callback: () => {
            showBubble(this, DESIGN_W / 2, DESIGN_H / 2 - 80, 'Smart move.', 2000);
          },
          color: 0x336633,
        },
      ],
    });
  }
}
