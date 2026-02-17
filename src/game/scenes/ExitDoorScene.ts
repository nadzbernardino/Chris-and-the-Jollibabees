/**
 * ExitDoorScene — Final room after Balcony.
 *
 * Door is clickable only when allQuestsComplete().
 * If quests incomplete → "I can't leave yet."
 * If complete → Mamibee appears → backward room tour → together ending.
 */
import Phaser from 'phaser';
import {
  SCENE, DESIGN_W, DESIGN_H, ROOM_ORDER, SCENE_TO_BG,
} from '../constants';
import { PAL, PAL_CSS, TEXT, UI, PIXEL_FONT, drawPlaque } from '../uiTheme';
import { store } from '../store/GameStoreNew';
import { FollowerSystem } from '../ui/FollowerSystem';
import { HUDNew } from '../ui/HUDNew';
import { ModalManager } from '../ui/ModalManager';
import { showBubble } from '../ui/SpeechBubbleNew';
import { AudioManager } from '../audio/AudioManager';
import { fxSparkle, fxShimmer, fxPop } from '../fx';

/** Room backgrounds to tour in reverse (skip EXIT_DOOR and INTRO) */
const TOUR_ROOMS = ROOM_ORDER
  .filter(k => k !== SCENE.EXIT_DOOR && k !== SCENE.INTRO)
  .reverse();

export class ExitDoorScene extends Phaser.Scene {
  private followers!: FollowerSystem;
  private hud!: HUDNew;
  private modal!: ModalManager;
  private audio!: AudioManager;
  private bg!: Phaser.GameObjects.Image;
  private doorZone!: Phaser.GameObjects.Rectangle;
  private doorLabel!: Phaser.GameObjects.Text;

  constructor() {
    super(SCENE.EXIT_DOOR);
  }

  create(): void {
    this.cameras.main.fadeIn(300, 0, 0, 0);

    // BG
    this.bg = this.add.image(DESIGN_W / 2, DESIGN_H / 2, 'exit_door_room_bg')
      .setDisplaySize(DESIGN_W, DESIGN_H)
      .setDepth(0);

    // HUD
    this.hud = new HUDNew(this);
    this.hud.create();

    // Followers
    this.followers = new FollowerSystem();
    this.followers.create(this, 200);

    // Modal manager
    this.modal = new ModalManager(this);

    // Audio manager
    this.audio = new AudioManager(this);

    // Entry bubble
    this.time.delayedCall(500, () => {
      if (store.allQuestsComplete()) {
        showBubble(this, this.followers.chris?.x ?? DESIGN_W / 2,
          (this.followers.chris?.y ?? DESIGN_H / 2) - 80,
          'Everything is ready. Let\'s go!', 3000);
      } else {
        showBubble(this, this.followers.chris?.x ?? DESIGN_W / 2,
          (this.followers.chris?.y ?? DESIGN_H / 2) - 80,
          'I should clean up first…', 3000);
      }
    });

    // ── Door tap zone ────────────────────────────────────
    this.doorZone = this.add.rectangle(DESIGN_W / 2, DESIGN_H / 2 - 60, 250, 360, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(5);
    this.doorZone.setStrokeStyle(3, PAL.gold, 0.5);

    this.doorLabel = this.add.text(DESIGN_W / 2, DESIGN_H / 2 + 150, '🚪 Exit Door', {
      ...TEXT.heading,
    }).setOrigin(0.5).setDepth(10);

    this.doorZone.on('pointerdown', () => this.onDoorTap());

    // Navigation back arrow (left only)
    this.createBackArrow();
  }

  update(_time: number, delta: number): void {
    this.followers.update(delta);
  }

  // ─── DOOR LOGIC ────────────────────────────────────────

  private onDoorTap(): void {
    if (this.modal.isOpen) return;

    if (!store.allQuestsComplete()) {
      showBubble(this, DESIGN_W / 2, DESIGN_H / 2 - 180, 'I can\'t leave yet.', 2500);
      return;
    }

    // Disable further taps
    this.doorZone.disableInteractive();
    this.startEndingSequence();
  }

  // ─── ENDING SEQUENCE ──────────────────────────────────

  private async startEndingSequence(): Promise<void> {
    // Hide followers & HUD
    this.followers.hide();
    this.doorLabel.setVisible(false);
    this.doorZone.setVisible(false);

    // Fade out, then start tour
    this.cameras.main.fadeOut(400, 0, 0, 0);
    await this.waitForEvent('camerafadeoutcomplete');

    // ── Mamibee appears ────────────────────────────────
    this.destroyAll();
    this.bg = this.add.image(DESIGN_W / 2, DESIGN_H / 2, 'exit_door_room_bg')
      .setDisplaySize(DESIGN_W, DESIGN_H).setDepth(0);

    const mamibee = this.add.image(DESIGN_W / 2, DESIGN_H / 2, 'mamibee_left_shock')
      .setScale(0.6).setDepth(10);

    this.cameras.main.fadeIn(400, 0, 0, 0);
    await this.delay(600);

    // FX: sparkle burst when mamibee appears
    fxSparkle(this, mamibee.x, mamibee.y, 16, 90);
    this.audio.endingChime();

    // Jollibabees react
    showBubble(this, mamibee.x - 160, mamibee.y + 40, 'Mamibee!', 2500);
    await this.delay(2800);

    showBubble(this, mamibee.x, mamibee.y - 120, 'Wow! Thank you so much!', 3000);
    await this.delay(3500);

    // ── Room tour (backward) ───────────────────────────
    for (let i = 0; i < TOUR_ROOMS.length; i++) {
      const roomKey = TOUR_ROOMS[i];
      const bgKey = SCENE_TO_BG[roomKey] ?? 'exit_door_room_bg';

      this.cameras.main.fadeOut(300, 0, 0, 0);
      await this.waitForEvent('camerafadeoutcomplete');

      this.destroyAll();
      this.bg = this.add.image(DESIGN_W / 2, DESIGN_H / 2, bgKey)
        .setDisplaySize(DESIGN_W, DESIGN_H).setDepth(0);

      // Chris sprite in the room
      const chris = this.add.image(DESIGN_W / 2 - 80, DESIGN_H / 2 + 80, 'chris_right')
        .setScale(0.5).setDepth(10);

      // Mamibee following
      const mami = this.add.image(DESIGN_W / 2 + 120, DESIGN_H / 2 + 80, 'mamibee_left')
        .setScale(0.5).setDepth(10);

      this.cameras.main.fadeIn(300, 0, 0, 0);
      await this.delay(500);

      // FX: shimmer in each clean room
      fxShimmer(this, DESIGN_W / 2, DESIGN_H / 2, 10, 100);

      showBubble(this, chris.x, chris.y - 100, 'This room is clean!', 2500);
      await this.delay(3000);

      // On the LAST room (first in the original order), show together ending
      if (i === TOUR_ROOMS.length - 1) {
        this.cameras.main.fadeOut(300, 0, 0, 0);
        await this.waitForEvent('camerafadeoutcomplete');

        this.destroyAll();
        this.showFinalScene(bgKey);
        return; // Exit the loop, final scene handles everything
      }
    }
  }

  private showFinalScene(lastBgKey: string): void {
    // Together image centered
    this.bg = this.add.image(DESIGN_W / 2, DESIGN_H / 2, lastBgKey)
      .setDisplaySize(DESIGN_W, DESIGN_H).setDepth(0);

    const together = this.add.image(DESIGN_W / 2, DESIGN_H / 2 - 40, 'together')
      .setScale(0.65).setDepth(10);

    this.cameras.main.fadeIn(400, 0, 0, 0);

    this.time.delayedCall(800, () => {
      showBubble(this, together.x + 80, together.y - 140,
        'Thank you, Babitee!\nI love you! Let\'s eat!', 4000);
    });

    // Food bag appears after a moment
    this.time.delayedCall(3500, () => {
      const food = this.add.image(DESIGN_W / 2, DESIGN_H - 180, 'food_bag')
        .setScale(0.5).setDepth(15).setAlpha(0);
      this.tweens.add({ targets: food, alpha: 1, duration: 600 });
    });

    // End screen overlay
    this.time.delayedCall(6000, () => this.showEndScreen());
  }

  private showEndScreen(): void {
    // Dark overlay
    this.add.rectangle(DESIGN_W / 2, DESIGN_H / 2, DESIGN_W, DESIGN_H, 0x000000, 0.7)
      .setDepth(800);

    // Thank you text
    this.add.text(DESIGN_W / 2, DESIGN_H / 2 - 100,
      '❤️  Thank you for playing  ❤️', {
        ...TEXT.title,
      }).setOrigin(0.5).setDepth(810);

    // Stats
    const s = store.s;
    this.add.text(DESIGN_W / 2, DESIGN_H / 2,
      `Hearts: ${s.hearts}/3\nJollibabees: ${s.jollibabeesFound.length}/6`, {
        ...TEXT.body,
        align: 'center',
      }).setOrigin(0.5).setDepth(810);

    // Restart button
    const rbW = UI.btnW;
    const rbH = UI.btnH;
    const rby = DESIGN_H / 2 + 140;
    const rbGfx = this.add.graphics().setDepth(810);
    drawPlaque(rbGfx, DESIGN_W / 2 - rbW / 2, rby - rbH / 2, rbW, rbH);
    const btnBg = this.add.rectangle(DESIGN_W / 2, rby, rbW, rbH, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(810);
    this.add.text(DESIGN_W / 2, rby, '🔄 Play Again', {
      ...TEXT.button,
      color: PAL_CSS.gold,
    }).setOrigin(0.5).setDepth(811);

    btnBg.on('pointerdown', () => {
      store.reset();
      this.scene.start(SCENE.INTRO);
    });
  }

  // ─── HELPERS ───────────────────────────────────────────

  private createBackArrow(): void {
    const idx = ROOM_ORDER.indexOf(SCENE.EXIT_DOOR);
    if (idx <= 0) return;
    const prevRoom = ROOM_ORDER[idx - 1];

    const bg = this.add.rectangle(0, 0, 60, 84, PAL.darkPine, 0.7)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, PAL.gold);
    const txt = this.add.text(0, 0, '◀', {
      fontFamily: PIXEL_FONT, fontSize: '22px', color: PAL_CSS.gold,
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);

    bg.on('pointerdown', () => {
      this.cameras.main.fadeOut(250, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.cleanup();
        this.scene.start(prevRoom);
      });
    });

    this.add.container(50, DESIGN_H / 2, [bg, txt]).setDepth(700);
  }

  /** Promise wrapper for camera events */
  private waitForEvent(event: string): Promise<void> {
    return new Promise(resolve => {
      this.cameras.main.once(event, () => resolve());
    });
  }

  /** Promise wrapper for time delay */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => {
      this.time.delayedCall(ms, () => resolve());
    });
  }

  /** Destroy all game objects to prepare for next tour step */
  private destroyAll(): void {
    this.children.removeAll(true);
  }

  private cleanup(): void {
    try { this.followers?.destroy(); } catch { /* noop */ }
    try { this.hud?.destroy(); } catch { /* noop */ }
    try { this.modal?.destroy(); } catch { /* noop */ }
  }
}
