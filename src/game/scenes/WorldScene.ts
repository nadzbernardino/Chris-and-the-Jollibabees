/**
 * WorldScene — Single continuous side-scrolling world.
 *
 * All 8 rooms placed side-by-side. Chris walks left/right with arrow keys,
 * A/D, or on-screen mobile buttons. Camera follows Chris.
 *
 * Room detection by X position. Props only interactive in current room.
 * All existing mechanics (tasks, jollibabees, speech, modals, FX, audio)
 * are preserved.
 */
import Phaser from 'phaser';
import {
  DESIGN_W, DESIGN_H, SCENE, ROOM_ORDER, ROOM_JOLLIBABEE_MAP,
  ROOM_TASKS, SCENE_TO_BG, JOLLIBABEES,
} from '../constants';
import { PAL, PAL_CSS, TEXT, UI, PIXEL_FONT, drawPlaque } from '../uiTheme';
import { store } from '../store/GameStoreNew';
import { FollowerSystem } from '../ui/FollowerSystem';
import { HUDNew } from '../ui/HUDNew';
import { ModalManager } from '../ui/ModalManager';
import { canShowPopup, markPopupShown } from '../ui/ModalManager';
import { showBubble } from '../ui/SpeechBubbleNew';
import { SpeechBubbleManager } from '../ui/SpeechBubbleManager';
import { AudioManager } from '../audio/AudioManager';
import {
  fxSparkle, fxShimmer, fxPop, fxPoof, fxHeartFlash, fxOuchFlicker,
} from '../fx';
import { ROOM_DEFS, NUM_ROOMS, WORLD_WIDTH, ROOM_WIDTH } from '../world/RoomDefs';
import {
  sizeH, CHRIS_H, MAMIBEE_H,
  PROP_L, PROP_M, PROP_S, PROP_FOOD, TOGETHER_H,
  CAM_ZOOM, FLOOR_Y, COUNTER_Y, TABLE_Y, WALL_Y, CHAR_Y,
  drawShadow,
} from '../spriteSize';

// ═══════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════

const CHRIS_SPEED = 400;
const CHRIS_Y = CHAR_Y;

/** Ending room tour order (reversed, excluding exit door) */
const TOUR_ROOMS = [...ROOM_ORDER].reverse().filter(k => k !== SCENE.EXIT_DOOR);

// ═══════════════════════════════════════════════════════════
//  WORLD SCENE
// ═══════════════════════════════════════════════════════════

export class WorldScene extends Phaser.Scene {
    // ── Overall game timer ──────────────────────────────
    private overallGameTimer?: Phaser.Time.TimerEvent;
  // Track last time the dishes block bubble was shown
  private _dishesBlockBubbleShown: number = 0;

  // ── Core systems ─────────────────────────────────────
  private chris!: Phaser.GameObjects.Image;
  private followers!: FollowerSystem;
  private hud!: HUDNew;
  private modal!: ModalManager;
  private audio!: AudioManager;
  private bubbleMgr!: SpeechBubbleManager;

  // ── Input ────────────────────────────────────────────
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private mobileLeft = false;
  private mobileRight = false;

  // ── Room tracking ────────────────────────────────────
  private currentRoom = 0;
  private roomsEntered = new Set<number>();
  private roomTimers: Phaser.Time.TimerEvent[] = [];
  private roomOvertimeTimer?: Phaser.Time.TimerEvent;
  private heartDrainTimer?: Phaser.Time.TimerEvent;
  private roomNameText!: Phaser.GameObjects.Text;

  // ── Room 0: Kitchen Sink ─────────────────────────────
  private dishesCount = 0;
  private r0_dirtyPlates!: Phaser.GameObjects.Image;
  private r0_cleanPlates!: Phaser.GameObjects.Image;
  private r0_progressText!: Phaser.GameObjects.Text;
  private r0_coffee!: Phaser.GameObjects.Image;

  // ── Room 1: Kitchen Stove ────────────────────────────
  private r1_whey!: Phaser.GameObjects.Image;
  private r1_water!: Phaser.GameObjects.Image;
  private r1_energyDrink!: Phaser.GameObjects.Image;
  private r1_shop!: Phaser.GameObjects.Container;

  // ── Room 2: Living Room ──────────────────────────────
  private trashCount = 0;
  private r2_trashBin!: Phaser.GameObjects.Image;
  private r2_trashItems: Phaser.GameObjects.Image[] = [];
  private r2_trashLabel!: Phaser.GameObjects.Text;
  private r2_vacuum!: Phaser.GameObjects.Image;
  private r2_phone!: Phaser.GameObjects.Image;
  private r3_phone!: Phaser.GameObjects.Image;

  // ── Room 3: Office ───────────────────────────────────
  private workCount = 0;
  private r3_deskZone!: Phaser.GameObjects.Rectangle;
  private r3_progressBar!: Phaser.GameObjects.Graphics;
  private r3_progressText!: Phaser.GameObjects.Text;
  private r3_darmeshTriggered = false;
  private r3_darmeshAnswered = false;
  private r3_darmeshIgnoreCount = 0;
  private r3_whaleCoinTimer?: Phaser.Time.TimerEvent;
  private r3_doomScrollCount = 0;
  private darmeshWorkCycles = 0;
  private darmeshRecallTimer?: Phaser.Time.TimerEvent;

  // ── Room 1: Exercise ─────────────────────────────────
  private r1_barbell!: Phaser.GameObjects.Image;
  private r1_exercising = false;
  private r1_exerciseCount = 0;  // max 2 before game over on 3rd

  // ── Drink cooldowns ─────────────────────────────────
  private lastDrinkTime = 0;  // timestamp of last drink (coffee or whey)

  // ── Room 4: Bedroom ──────────────────────────────────
  private r4_bed!: Phaser.GameObjects.Image;
  private r4_bedChris!: Phaser.GameObjects.Image;
  private r4_mirror!: Phaser.GameObjects.Image;

  // ── Room 5: Bathroom ─────────────────────────────────
  private laundryCount = 0;
  private r5_basket!: Phaser.GameObjects.Image;
  private r5_clothesItems: Phaser.GameObjects.Image[] = [];

  // ── Room 6: Balcony ──────────────────────────────────
  private r6_bonsaiUgly!: Phaser.GameObjects.Image;
  private r6_bonsaiPretty!: Phaser.GameObjects.Image;
  private r6_bucket!: Phaser.GameObjects.Image;
  private r6_bucketTaken = false;
  private r6_waterCount = 0;

  // ── Room 7: Exit Door ────────────────────────────────
  private r7_doorZone!: Phaser.GameObjects.Rectangle;
  private r7_doorLabel!: Phaser.GameObjects.Text;

  // ── Confidence tracking ─────────────────────────────
  private lastIntegrityThreshold = 2;  // starts at 50 → threshold index 2 (0/20/40/60/80)
  private totalTasksCompleted = 0;     // for fatigue penalty

  // ── Wine tracking ──────────────────────────────────
  private wineClickCount = 0;

  // ── Ending state ─────────────────────────────────────
  private endingActive = false;
  private gameOverTriggered = false;
  private temptationCallCount = 0;  // max 2 per game

  // ── Idle hint system ─────────────────────────────────
  private lastInteractionTime = 0;
  private lastIdleHintTime = 0;

  constructor() {
    super(SCENE.WORLD);
  }

  // ═══════════════════════════════════════════════════════
  //  CREATE
  // ═══════════════════════════════════════════════════════

  create(): void {
        // Start overall game timer (15 minutes)
        this.overallGameTimer = this.time.delayedCall(900000, () => {
          if (!this.endingActive && !this.gameOverTriggered && !store.allQuestsComplete()) {
            this.triggerTimeWastedGameOver('Time is up! You didn\'t finish everything in 15 minutes.');
          }
        });
    // Stop intro music if still playing (uses shared Phaser sound manager)
    const audioMgr = new AudioManager(this);
    audioMgr.stopIntroMusic();
    audioMgr.playGameplayMusic();

    // ── Reset runtime state ─────────────────────────────
    this.currentRoom = 0;
    this.roomsEntered.clear();
    this.roomTimers = [];
    this.endingActive = false;
    this.gameOverTriggered = false;
    this.temptationCallCount = 0;
    this.dishesCount = 0;
    this.trashCount = 0;
    this.workCount = 0;
    this.laundryCount = 0;
    this.r6_bucketTaken = false;
    this.r6_waterCount = 0;
    this.r3_darmeshTriggered = false;
    this.r3_darmeshAnswered = false;
    this.r3_darmeshIgnoreCount = 0;
    this.r3_doomScrollCount = 0;
    this.darmeshWorkCycles = 0;
    if (this.r3_whaleCoinTimer) { this.r3_whaleCoinTimer.destroy(); this.r3_whaleCoinTimer = undefined; }
    if (this.darmeshRecallTimer) { this.darmeshRecallTimer.destroy(); this.darmeshRecallTimer = undefined; }
    this.r1_exercising = false;
    this.r1_exerciseCount = 0;
    this.lastDrinkTime = 0;
    this.lastIntegrityThreshold = 2;  // integrity starts at 50 → threshold 2
    this.totalTasksCompleted = 0;
    this.wineClickCount = 0;
    this.isConsuming = false;
    this.mobileLeft = false;
    this.mobileRight = false;
    this.r2_trashItems = [];
    this.r5_clothesItems = [];

    // ── Physics world ────────────────────────────────────
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, DESIGN_H);

    // ── Camera ───────────────────────────────────────────
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, DESIGN_H);
    this.cameras.main.setZoom(CAM_ZOOM);
    this.cameras.main.fadeIn(300, 0, 0, 0);

    // ── Backgrounds ──────────────────────────────────────
    for (const room of ROOM_DEFS) {
      this.add.image(room.xStart + ROOM_WIDTH / 2, DESIGN_H / 2, room.bgKey)
        .setDisplaySize(ROOM_WIDTH, DESIGN_H)
        .setDepth(0);
    }

    // ── Room dividers (subtle vertical lines) ────────────
    for (let i = 1; i < NUM_ROOMS; i++) {
      const x = i * ROOM_WIDTH;
      const line = this.add.graphics().setDepth(1);
      line.lineStyle(2, PAL.darkWood, 0.3);
      line.lineBetween(x, 0, x, DESIGN_H);
    }

    // ── Follower system (Chris + jollibabees) ────────────
    this.followers = new FollowerSystem();
    this.followers.create(this, ROOM_WIDTH / 2);

    // Add physics body to Chris
    this.chris = this.followers.chris;
    this.physics.add.existing(this.chris);
    const body = this.chris.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setAllowGravity(false);
    // Match physics body to the scaled visual size
    body.setSize(
      this.chris.displayWidth * 0.35,
      this.chris.displayHeight * 0.85,
      true,
    );

    // Camera follow
    this.cameras.main.startFollow(this.chris, true, 0.08, 0);

    // ── HUD (fixed to camera) ────────────────────────────
    this.hud = new HUDNew(this);
    this.hud.create();

    // Room name indicator
    this.roomNameText = this.add.text(DESIGN_W / 2, 20, ROOM_DEFS[0].name, {
      ...TEXT.small,
      fontSize: '20px',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(601);

    // ── Modal ────────────────────────────────────────────
    this.modal = new ModalManager(this);

    // ── Audio ────────────────────────────────────────────
    this.audio = new AudioManager(this);
    // Start cute background music loop
    //this.time.delayedCall(500, () => this.audio.startAmbient());

    // ── Speech Bubble Manager ────────────────────────────
    this.bubbleMgr = new SpeechBubbleManager();
    this.bubbleMgr.create(
      this,
      () => (this.chris ? { x: this.chris.x, y: this.chris.y - CHRIS_H } : undefined),
      (jbIdx: number) => this.followers.getFollowerPos(jbIdx),
      (jbIdx: number) => this.followers.getFollowerContainer(jbIdx),
    );
    this.followers.onTapCallback = (jbIdx: number) => {
      this.bubbleMgr.onJollibabeeTapped(jbIdx);
    };

    // ── Input ────────────────────────────────────────────
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
      this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    }

    // ── Mobile Controls ──────────────────────────────────
    this.createMobileControls();

    // ── Room Interactables ───────────────────────────────
    this.setupRoom0_KitchenSink();
    this.setupRoom1_KitchenStove();
    this.setupRoom2_LivingRoom();
    this.setupRoom3_Office();
    this.setupRoom4_Bedroom();
    this.setupRoom5_Bathroom();
    this.setupRoom6_Balcony();
    this.setupRoom7_ExitDoor();

    // ── Shared drag handler ──────────────────────────────
    this.setupDragHandlers();

    // ── Initial room entry ───────────────────────────────
    this.roomsEntered.add(0);
    this.onRoomFirstEnter(0);

    // Track interactions for idle hint system
    this.lastInteractionTime = Date.now();
    this.lastIdleHintTime = 0;
    this.input.on('pointerdown', () => { this.lastInteractionTime = Date.now(); });

    this.time.delayedCall(3500, () => {
      this.showChrisBubble('Babitee is coming soon... I need to get ready!');
    });

    // ── Heart drain timer (fatigue) ──────────────────────
    // Every 45s, lose 1 heart if Chris hasn't slept yet.
    // Sleeping stops the drain permanently.
    this.startHeartDrainTimer();

    // ── Early fatigue warning at 4min (before first drain at 5min) ──
    this.time.delayedCall(240000, () => {
      if (!store.s.hasSlept && !this.endingActive) {
        this.audio.thunk();
        this.showChrisBubble('I\'m getting tired... I should find a bed.');
      }
    });

  }

  /** Fatigue: lose 1 heart every 90s until Chris sleeps. */
  private startHeartDrainTimer(): void {
    if (this.heartDrainTimer) { this.heartDrainTimer.destroy(); }
    this.heartDrainTimer = this.time.addEvent({
      delay: 300000,
      loop: true,
      callback: () => {
        if (store.s.hasSlept || this.endingActive) return; // sleeping stops drain
        store.removeHeart(1);
        this.hud.refresh();
        fxOuchFlicker(this);
        this.checkLowHeart();
        // Game over check
        if (store.s.hearts <= 0) {
          this.checkGameOver();
        }
      },
    });
  }

  // ═══════════════════════════════════════════════════════
  //  UPDATE
  // ═══════════════════════════════════════════════════════

  update(_time: number, delta: number): void {
    if (this.endingActive) return;

    // Movement
    if (this.modal.isOpen) {
      const body = this.chris.body as Phaser.Physics.Arcade.Body;
      body?.setVelocityX(0);
    } else {
      this.handleMovement();
    }

    // Keep Chris at fixed Y (no vertical drift)
    this.chris.y = CHRIS_Y;

    // Sync follower system
    this.followers.chrisX = this.chris.x;
    this.followers.update(delta);

    // Speech bubbles
    this.bubbleMgr.update();

    // Modal pause / resume chatter
    if (this.modal.isOpen && !this.bubbleMgr.isPaused) {
      this.bubbleMgr.pause();
    } else if (!this.modal.isOpen && this.bubbleMgr.isPaused) {
      this.bubbleMgr.resume();
    }

    // Room detection
    this.detectRoom();

    // Idle hint: if no interaction for 12s, show contextual clue
    this.tickIdleHints();

    // Low energy penalty: slow Chris when energy < 30
    this.applyEnergyPenalty();

    // Confidence chunk loss: if integrity drops a 20-point bracket → lose heart
    this.checkIntegrityChunkLoss();
  }

  // ═══════════════════════════════════════════════════════
  //  MOVEMENT
  // ═══════════════════════════════════════════════════════

  private handleMovement(): void {
    const body = this.chris.body as Phaser.Physics.Arcade.Body;
    if (!body) return;

    const left = this.cursors?.left?.isDown || this.keyA?.isDown || this.mobileLeft;
    const right = this.cursors?.right?.isDown || this.keyD?.isDown || this.mobileRight;

    // Block Chris from passing dirty plates in room 0 until dishes are clean
    const inRoom0 = this.currentRoom === 0;
    const platesBlockX = this.rx(0, ROOM_WIDTH * 0.82) - 40; // 40px before plates
    const dishesNotDone = !store.isTaskDone(SCENE.KITCHEN_SINK, 'dishes');

    if (inRoom0 && dishesNotDone && right && this.chris.x >= platesBlockX) {

      // Stop Chris at the block point
      body.setVelocityX(0);
      this.chris.x = platesBlockX;
      // Show speech bubble prompt if not already shown recently
      if (!this._dishesBlockBubbleShown || this.time.now - this._dishesBlockBubbleShown > 2000) {
        this.showChrisBubble('I think I need to do the dishes first before exploring');
        this._dishesBlockBubbleShown = this.time.now;
      }
      return;
    }

    if (left && !right) {
      body.setVelocityX(-CHRIS_SPEED);
    } else if (right && !left) {
      body.setVelocityX(CHRIS_SPEED);
    } else {
      body.setVelocityX(0);
    }
  }

  // ═══════════════════════════════════════════════════════
  //  MOBILE CONTROLS
  // ═══════════════════════════════════════════════════════

  private createMobileControls(): void {
    const size = 80;
    const pad = 30;
    const y = DESIGN_H - pad - size / 2;

    // Left arrow
    const lBg = this.add.rectangle(pad + size / 2, y, size, size, PAL.darkPine, 0.5)
      .setStrokeStyle(2, PAL.gold, 0.6)
      .setScrollFactor(0).setDepth(700).setInteractive();
    this.add.text(pad + size / 2, y, '◀', {
      fontFamily: PIXEL_FONT, fontSize: '36px', color: PAL_CSS.gold,
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(701);

    lBg.on('pointerdown', () => { this.mobileLeft = true; });
    lBg.on('pointerup', () => { this.mobileLeft = false; });
    lBg.on('pointerout', () => { this.mobileLeft = false; });

    // Right arrow
    const rBg = this.add.rectangle(DESIGN_W - pad - size / 2, y, size, size, PAL.darkPine, 0.5)
      .setStrokeStyle(2, PAL.gold, 0.6)
      .setScrollFactor(0).setDepth(700).setInteractive();
    this.add.text(DESIGN_W - pad - size / 2, y, '▶', {
      fontFamily: PIXEL_FONT, fontSize: '36px', color: PAL_CSS.gold,
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(701);

    rBg.on('pointerdown', () => { this.mobileRight = true; });
    rBg.on('pointerup', () => { this.mobileRight = false; });
    rBg.on('pointerout', () => { this.mobileRight = false; });
  }

  // ═══════════════════════════════════════════════════════
  //  ROOM DETECTION
  // ═══════════════════════════════════════════════════════

  private detectRoom(): void {
    const newRoom = Phaser.Math.Clamp(
      Math.floor(this.chris.x / ROOM_WIDTH), 0, NUM_ROOMS - 1,
    );
    if (newRoom !== this.currentRoom) {
      this.currentRoom = newRoom;
      this.roomNameText.setText(ROOM_DEFS[newRoom].name);
      this.showRoomNameFlash();

      // Reset 1-minute overtime timer
      this.startRoomOvertimeTimer();

      const roomKey = ROOM_DEFS[newRoom].sceneKey;
      const hasTasks = ROOM_TASKS[roomKey]?.length > 0;
      // Show 'task is done here' bubble if room is complete (on every entry, including first)
      if (hasTasks && store.isRoomComplete(roomKey)) {
        this.time.delayedCall(300, () => this.showChrisBubble(this.getTaskDoneMessage(roomKey)));
      }

      if (!this.roomsEntered.has(newRoom)) {
        this.roomsEntered.add(newRoom);
        this.onRoomFirstEnter(newRoom);
      }
    }
  }

  private showRoomNameFlash(): void {
    this.tweens.add({
      targets: this.roomNameText,
      alpha: { from: 1, to: 0.3 },
      scaleX: { from: 1.2, to: 1 },
      scaleY: { from: 1.2, to: 1 },
      duration: 600,
      ease: 'Cubic.easeOut',
    });
  }

  private onRoomFirstEnter(room: number): void {
    const roomKey = ROOM_DEFS[room].sceneKey;
    const hasTasks = ROOM_TASKS[roomKey]?.length > 0;

    if (hasTasks && store.isRoomComplete(roomKey)) {
      this.time.delayedCall(300, () => this.showChrisBubble(this.getTaskDoneMessage(roomKey)));
    } else {
      const lines = this.getEntryLines(room);
      if (lines.length > 0) {
        const line = lines[Math.floor(Math.random() * lines.length)];
        this.time.delayedCall(300, () => this.showChrisBubble(line));
      }
    }

    // Start room timed events (pig, whale, doom scroll)
    this.startRoomTimers(room);
  }

  private getEntryLines(room: number): string[] {
    switch (room) {
      case 0: return [
        'Dirty dishes... I should tap them to clean up.',
        'Babitee can\'t come home to this. Let me wash the plates.',
      ];
      case 1: return [
        'The store counter. I can buy coffee, flowers, or a ring here.',
        'I wonder if I have enough diamonds for something nice...',
      ];
      case 2: return [
        'Trash everywhere! I need to drag it to the bin.',
        'This living room is a mess. Clean up, then vacuum!',
      ];
      case 3: return [
        'Time to do some work at the desk. Watch out for distractions!',
        'Focus, Chris. Don\'t answer suspicious calls.',
      ];
      case 4: return [
        'I\'m getting tired... Sleeping will stop the fatigue drain.',
        'That bed looks inviting. Rest will restore my energy.',
      ];
      case 5: return [
        'Dirty laundry everywhere! Drag clothes to the basket, then fold.',
        'This laundry won\'t do itself. Pick up and sort!',
      ];
      case 6: return [
        'The bonsai looks thirsty. Grab the bucket and water it!',
        'Fresh air and gardening. Good for the soul.',
      ];
      case 7: return store.allQuestsComplete()
        ? ['Everything is ready. Babitee, here I come!']
        : ['I\'m not ready yet. Need to finish all the rooms first.'];
      default: return [];
    }
  }

  // ═══════════════════════════════════════════════════════
  //  ROOM TIMERS (pig, whale, doom scroll)
  // ═══════════════════════════════════════════════════════

  private addRoomTimer(delay: number, cb: () => void): void {
    this.roomTimers.push(this.time.delayedCall(delay, cb));
  }

  private startRoomTimers(room: number): void {
    const roomKey = ROOM_DEFS[room].sceneKey;
    if (store.isRoomComplete(roomKey)) return;

    switch (room) {
      case 0: // Kitchen Sink: L1 — 2 temptation calls (per CLAUDE.md)
        this.addRoomTimer(25000, () => {
          if (this.currentRoom === 0) this.showTemptationPig();
        });
        this.addRoomTimer(45000, () => {
          if (this.currentRoom === 0) this.showTemptationPig();
        });
        break;
      case 2: // Living Room: L3 — 2 pigs (doom scroll is player-initiated via phone)
        this.addRoomTimer(18000, () => {
          if (this.currentRoom === 2) this.showTemptationPig();
        });
        this.addRoomTimer(35000, () => {
          if (this.currentRoom === 2) this.showTemptationPig();
        });
        break;
      case 3: // Office: L4 — 1 pig + recurring whale coin + Darmesh call
        this.addRoomTimer(18000, () => {
          if (this.currentRoom === 3) this.showTemptationPig();
        });
        // Darmesh calls 8s after first entering the office (fires in any room)
        this.addRoomTimer(8000, () => {
          if (!this.r3_darmeshTriggered) {
            this.r3_darmeshTriggered = true;
            this.showDarmeshCall();
          }
        });
        // Start whale coin loop: first attempt after 15s, then every 25s
        this.startWhaleCoinLoop();
        break;
      case 5: // Bathroom: L6 — 2 pigs
        this.addRoomTimer(18000, () => {
          if (this.currentRoom === 5) this.showTemptationPig();
        });
        this.addRoomTimer(35000, () => {
          if (this.currentRoom === 5) this.showTemptationPig();
        });
        break;
    }
  }

  /** Start (or restart) a 120-second overtime timer for the current room. Lose 1 heart when it fires. */
  private startRoomOvertimeTimer(): void {
    if (this.roomOvertimeTimer) {
      this.roomOvertimeTimer.destroy();
      this.roomOvertimeTimer = undefined;
    }
    this.roomOvertimeTimer = this.time.delayedCall(240000, () => {
      if (this.endingActive) return;
      store.removeHeart(1);
      store.addEnergy(-10);
      this.hud.refresh();
      fxOuchFlicker(this);
      this.audio.heartLose();
      this.bubbleMgr.chrisSay('Too long in this room! -1 ❤️ -10 ⚡', 3000);
      this.checkLowHeart();
      this.checkGameOver();
      // Restart — keeps penalising every 60s
      this.startRoomOvertimeTimer();
    });
  }

  /** Speed up overtime timer by removing seconds from remaining delay (doom scroll / whale coin loss). */
  private speedUpOvertimeTimer(seconds: number): void {
    if (!this.roomOvertimeTimer) return;
    const remaining = this.roomOvertimeTimer.getRemaining();
    const newRemaining = remaining - seconds * 1000;
    if (newRemaining <= 0) {
      // Force-fire the overtime penalty now
      this.roomOvertimeTimer.destroy();
      this.roomOvertimeTimer = undefined;
      store.removeHeart(1);
      store.addEnergy(-10);
      this.hud.refresh();
      fxOuchFlicker(this);
      this.audio.heartLose();
      this.bubbleMgr.chrisSay('Time ran out! -1 ❤️', 2500);
      this.checkLowHeart();
      this.checkGameOver();
      this.startRoomOvertimeTimer();
    } else {
      // Restart timer with reduced remaining time
      this.roomOvertimeTimer.destroy();
      this.roomOvertimeTimer = this.time.delayedCall(newRemaining, () => {
        if (this.endingActive) return;
        store.removeHeart(1);
        store.addEnergy(-10);
        this.hud.refresh();
        fxOuchFlicker(this);
        this.audio.heartLose();
        this.bubbleMgr.chrisSay('Too long in this room! -1 ❤️ -10 ⚡', 3000);
        this.checkLowHeart();
        this.checkGameOver();
        this.startRoomOvertimeTimer();
      });
    }
  }

  /** Add bonus time to the overall 15-minute game timer */
  private addBonusTime(seconds: number): void {
    if (!this.overallGameTimer) return;
    const remaining = this.overallGameTimer.getRemaining();
    this.overallGameTimer.destroy();
    this.overallGameTimer = this.time.delayedCall(remaining + seconds * 1000, () => {
      if (!this.endingActive && !this.gameOverTriggered && !store.allQuestsComplete()) {
        this.triggerTimeWastedGameOver('Time is up! You didn\'t finish everything in 15 minutes.');
      }
    });
  }

  // ═══════════════════════════════════════════════════════
  //  IDLE HINTS — contextual clues when player does nothing
  // ═══════════════════════════════════════════════════════

  private tickIdleHints(): void {
    if (this.modal.isOpen || this.endingActive) return;
    const now = Date.now();
    const idleTime = now - this.lastInteractionTime;
    // Only fire if idle 12s+ and no hint in last 20s
    if (idleTime < 12000 || now - this.lastIdleHintTime < 20000) return;

    const roomKey = ROOM_DEFS[this.currentRoom]?.sceneKey;
    if (!roomKey) return;
    // Don't hint for completed rooms
    if (store.isRoomComplete(roomKey)) return;

    const hint = this.getIdleHint(this.currentRoom);
    if (hint) {
      this.lastIdleHintTime = now;
      this.showChrisBubble(hint);
    }
  }

  private getIdleHint(room: number): string | null {
    // Low heart warning takes priority
    if (store.s.hearts <= 1 && store.s.hearts > 0) {
      const heartWarnings = [
        'My heart is running low... I need to be careful.',
        'One heart left. No room for mistakes!',
        'I should avoid temptation. One more hit and it\'s over.',
      ];
      if (Math.random() < 0.4) {
        return heartWarnings[Math.floor(Math.random() * heartWarnings.length)];
      }
    }
    // Low energy warning
    if (store.s.energy < 30 && !store.s.hasSlept) {
      if (Math.random() < 0.3) return 'So tired... I really need to find the bed.';
    }

    switch (room) {
      case 0:
        if (!store.isTaskDone(SCENE.KITCHEN_SINK, 'dishes')) {
          const hints = [
            'Those dirty plates... I should tap them to clean.',
            'Babitee\'s coming. Can\'t leave dirty dishes!',
            'Tap the plates to wash them. Come on, Chris.',
          ];
          return hints[Math.floor(Math.random() * hints.length)];
        }
        return null;
      case 1:
        return 'I can grab coffee or whey here for energy.';
      case 2:
        if (!store.isTaskDone(SCENE.LIVING_ROOM, 'trash')) {
          const hints = [
            'There\'s trash everywhere. I should drag it to the bin.',
            'Pick up the trash and toss it. Drag items to the bin!',
          ];
          return hints[Math.floor(Math.random() * hints.length)];
        }
        if (!store.isTaskDone(SCENE.LIVING_ROOM, 'vacuum'))
          return 'The floor still looks dusty... where\'s the vacuum?';
        return null;
      case 3:
        if (!store.isTaskDone(SCENE.OFFICE, 'work')) {
          const hints = [
            'I should sit at the desk and get some work done.',
            'Tap the desk to start working. Focus!',
            'Watch out for distractions in here... phone calls, meme coins.',
          ];
          return hints[Math.floor(Math.random() * hints.length)];
        }
        return null;
      case 4:
        if (!store.isTaskDone(SCENE.BEDROOM, 'sleep')) {
          const hints = [
            'That bed looks comfortable... I need rest.',
            'Sleeping will restore my energy. Tap the bed!',
            'I\'m losing hearts from fatigue. Sleep will stop that.',
          ];
          return hints[Math.floor(Math.random() * hints.length)];
        }
        return null;
      case 5:
        if (!store.isTaskDone(SCENE.BATHROOM, 'laundry')) {
          return 'Clothes everywhere... I should drag them to the basket.';
        }
        if (!store.isTaskDone(SCENE.BATHROOM, 'folding'))
          return 'Now I need to fold the clean clothes on the hangers.';
        return null;
      case 6:
        if (!store.isTaskDone(SCENE.BALCONY, 'water'))
          return 'That bonsai needs water. Grab the bucket and pour!';
        return null;
      case 7:
        if (!store.allQuestsComplete())
          return 'I\'m not done yet. Better go back and finish everything.';
        return 'Everything is ready. Time to pick up Babitee!';
      default:
        return null;
    }
  }

  // ═══════════════════════════════════════════════════════
  //  LOW ENERGY PENALTY
  // ═══════════════════════════════════════════════════════

  private applyEnergyPenalty(): void {
    const energy = store.s.energy;
    if (energy < 30) {
      // Visual: dim Chris slightly when low energy
      const tintVal = 0xbb + Math.floor((energy / 30) * 0x44);
      const tint = (tintVal << 16) | (tintVal << 8) | tintVal;
      this.chris.setTint(tint);
    } else {
      this.chris.clearTint();
    }
  }

  // ═══════════════════════════════════════════════════════
  //  ROOM COORDINATE HELPER
  // ═══════════════════════════════════════════════════════

  /** Convert room-relative X to world X */
  private rx(roomIdx: number, relX: number): number {
    return roomIdx * ROOM_WIDTH + relX;
  }

  // ═══════════════════════════════════════════════════════
  //  ROOM 0: KITCHEN SINK
  // ═══════════════════════════════════════════════════════

  private setupRoom0_KitchenSink(): void {
    const room = 0;
    const roomKey = SCENE.KITCHEN_SINK;
    const done = store.isTaskDone(roomKey, 'dishes');

    // Dirty plates
    // Dirty plates — right of coffee, launches DishMinigame on click
    const PLATES_Y = COUNTER_Y - 120;
    this.r0_dirtyPlates = this.add.image(
      this.rx(room, ROOM_WIDTH * 0.82), PLATES_Y, 'dirtyplates',
    ).setDepth(10).setInteractive({ useHandCursor: true })
      .setVisible(!done);
    sizeH(this.r0_dirtyPlates, PROP_M);
    drawShadow(this, this.r0_dirtyPlates.x, PLATES_Y + PROP_M / 2, PROP_M * 0.8);

    // Clean plates (shown after task)
    this.r0_cleanPlates = this.add.image(
      this.rx(room, ROOM_WIDTH * 0.82), PLATES_Y, 'cleanplates',
    ).setDepth(10).setVisible(done);
    sizeH(this.r0_cleanPlates, PROP_M);


    // Instruction/progress label above dirty plates
    this.r0_progressText = this.add.text(
      this.rx(room, ROOM_WIDTH * 0.82), PLATES_Y - 100,
      done ? '✅ Done' : 'clean the dishes',
      { ...TEXT.small, fontSize: '22px', color: PAL_CSS.ivory, fontStyle: 'bold' },
    ).setOrigin(0.5).setDepth(15);

    // Hide label if plates are clean, show if dirty
    this.r0_progressText.setVisible(!done || (done && this.r0_dirtyPlates.visible));

    this.r0_dirtyPlates.on('pointerdown', () => {
      if (this.currentRoom !== room || this.modal.isOpen) return;
      if (store.isTaskDone(roomKey, 'dishes')) return;
      this.audio.taskStart();

      // Set callback in registry, pause world, launch minigame
      this.registry.set('dishCallback', () => {
        this.markTaskDone(roomKey, 'dishes');
        // L1 reward: Prep +10, Energy -5, Diamonds +2
        store.addPrep(10);
        store.addEnergy(-5);
        store.addDiamonds(2);
        this.r0_dirtyPlates.setVisible(false);
        this.r0_cleanPlates.setVisible(true);
        this.r0_progressText.setText('✅ Done');
        this.r0_progressText.setVisible(true);
        fxSparkle(this, this.r0_cleanPlates.x, this.r0_cleanPlates.y, 12, 60);
        this.trySpawnJollibabee(roomKey);
        this.showTaskComplete(roomKey);
      });
      this.scene.pause();
      this.scene.launch(SCENE.DISH_MINI);
    });

    // Coffee consumable — far left of kitchen (smaller, raised)
    const COFFEE_H = 140;
    const COFFEE_Y = COUNTER_Y + 10;
    this.r0_coffee = this.add.image(
      this.rx(room, ROOM_WIDTH * 0.12), COFFEE_Y, 'coffee',
    ).setDepth(10).setInteractive({ useHandCursor: true });
    sizeH(this.r0_coffee, COFFEE_H);
    drawShadow(this, this.r0_coffee.x, COFFEE_Y + COFFEE_H / 2, COFFEE_H * 0.7);

    if (store.s.coffeeUses >= 2) this.r0_coffee.setTint(0x666666);

    this.r0_coffee.on('pointerdown', () => {
      if (this.currentRoom !== room || this.modal.isOpen || this.isConsuming) return;
      if (!this.canConsume()) return;
      if (store.useCoffee()) {
        this.lastDrinkTime = Date.now();
        this.playConsumeAnimation('chris_coffee');
        // Coffee: +1 Heart, +10 Energy
        store.addHeart(1);
        store.addEnergy(10);
        this.hud.refresh();
        fxHeartFlash(this, true);
        this.audio.bloop();
        fxSparkle(this, this.r0_coffee.x, this.r0_coffee.y, 8, 40);
        if (store.s.coffeeUses === 1) {
          this.bubbleMgr.chrisSay('☕ +1 ❤️ +10 ⚡', 2500);
          this.r0_coffee.setAlpha(0.7);
        } else {
          this.bubbleMgr.chrisSay('☕ Last cup! +1 ❤️ +10 ⚡', 2500);
          this.r0_coffee.setTint(0x666666);
        }
      } else {
        this.bubbleMgr.chrisSay('No more coffee left.', 2000);
      }
    });

    // Money pickup — on the floor, optional
    if (!store.hasPickedUp('money')) {
      const PICKUP_H = 182;
      const moneyImg = this.add.image(
        this.rx(room, ROOM_WIDTH * 0.40), FLOOR_Y - PICKUP_H / 2, 'money',
      ).setDepth(10).setInteractive({ useHandCursor: true });
      sizeH(moneyImg, PICKUP_H);

      moneyImg.on('pointerdown', () => {
        if (this.currentRoom !== room || this.modal.isOpen) return;
        store.pickUp('money');
        store.addDiamonds(5);
        this.hud.refresh();
        fxPop(this, moneyImg.x, moneyImg.y);
        fxSparkle(this, moneyImg.x, moneyImg.y, 10, 50);
        this.audio.pop();
        this.bubbleMgr.chrisSay('Found some cash! +5 💎', 2500);
        moneyImg.destroy();
      });
    }
  }

  // ═══════════════════════════════════════════════════════
  //  ROOM 1: KITCHEN STOVE
  // ═══════════════════════════════════════════════════════

  private setupRoom1_KitchenStove(): void {
    const room = 1;
    const WHEY_H = 140;
    const WHEY_Y = COUNTER_Y - 30;

    this.r1_whey = this.add.image(
      this.rx(room, ROOM_WIDTH * 0.85), WHEY_Y, 'whey',
    ).setDepth(10).setInteractive({ useHandCursor: true });
    sizeH(this.r1_whey, WHEY_H);
    drawShadow(this, this.r1_whey.x, WHEY_Y + WHEY_H / 2, WHEY_H * 0.7);

    if (store.s.wheyUses >= 2) this.r1_whey.setTint(0x666666);

    this.r1_whey.on('pointerdown', () => {
      if (this.currentRoom !== room || this.modal.isOpen || this.isConsuming) return;
      if (!this.canConsume()) return;
      if (store.useWhey()) {
        this.lastDrinkTime = Date.now();
        this.playConsumeAnimation('chris_whey');
        // Whey: +1 Heart, +15 Energy
        store.addHeart(1);
        store.addEnergy(15);
        this.hud.refresh();
        fxHeartFlash(this, true);
        this.audio.bloop();
        fxSparkle(this, this.r1_whey.x, this.r1_whey.y, 8, 40);
        if (store.s.wheyUses === 1) {
          this.bubbleMgr.chrisSay('💪 +1 ❤️ +15 ⚡', 2500);
          this.r1_whey.setAlpha(0.7);
        } else {
          this.bubbleMgr.chrisSay('💪 Double scoop! +1 ❤️ +15 ⚡', 2500);
          this.r1_whey.setTint(0x666666);
        }
      } else {
        this.bubbleMgr.chrisSay('No more whey left.', 2000);
      }
    });

    // Water consumable — beside whey (same height & Y)
    const DRINK_H = WHEY_H;   // same as coffee/whey
    const DRINK_Y = WHEY_Y;

    this.r1_water = this.add.image(
      this.rx(room, ROOM_WIDTH * 0.73), DRINK_Y, 'water',
    ).setDepth(10).setInteractive({ useHandCursor: true });
    sizeH(this.r1_water, DRINK_H);
    drawShadow(this, this.r1_water.x, DRINK_Y + DRINK_H / 2, DRINK_H * 0.7);

    this.r1_water.on('pointerdown', () => {
      if (this.currentRoom !== room || this.modal.isOpen || this.isConsuming) return;
      // Water can be drunk anytime — no canConsume() gating
      this.lastDrinkTime = Date.now();
      this.playConsumeAnimation('chris_water');
      store.addHeart(1);
      store.addEnergy(8);
      this.hud.refresh();
      fxHeartFlash(this, true);
      this.audio.bloop();
      fxSparkle(this, this.r1_water.x, this.r1_water.y, 8, 40);
      this.bubbleMgr.chrisSay('💧 Stay hydrated! +1 ❤️ +8 ⚡', 2500);
    });

    // Energy drink consumable — beside water
    this.r1_energyDrink = this.add.image(
      this.rx(room, ROOM_WIDTH * 0.61), DRINK_Y, 'energydrink',
    ).setDepth(10).setInteractive({ useHandCursor: true });
    sizeH(this.r1_energyDrink, DRINK_H);
    drawShadow(this, this.r1_energyDrink.x, DRINK_Y + DRINK_H / 2, DRINK_H * 0.7);

    if (store.s.energyDrinkUses >= 2) this.r1_energyDrink.setTint(0x666666);

    this.r1_energyDrink.on('pointerdown', () => {
      if (this.currentRoom !== room || this.modal.isOpen || this.isConsuming) return;
      if (!this.canConsume()) return;
      if (store.useEnergyDrink()) {
        this.lastDrinkTime = Date.now();
        this.playConsumeAnimation('chris_water');
        // Energy drink: +1 Heart, +20 Energy
        store.addHeart(1);
        store.addEnergy(20);
        this.hud.refresh();
        fxHeartFlash(this, true);
        this.audio.bloop();
        fxSparkle(this, this.r1_energyDrink.x, this.r1_energyDrink.y, 8, 40);
        if (store.s.energyDrinkUses === 1) {
          this.bubbleMgr.chrisSay('⚡ +1 ❤️ +20 ⚡', 2500);
          this.r1_energyDrink.setAlpha(0.7);
        } else {
          this.bubbleMgr.chrisSay('⚡ WIRED! +1 ❤️ +20 ⚡', 2500);
          this.r1_energyDrink.setTint(0x666666);
        }
      } else {
        this.bubbleMgr.chrisSay('No more energy drinks.', 2000);
      }
    });

    // Money pickup — on the floor of second kitchen too
    if (!store.hasPickedUp('money')) {
      const PICKUP_H = 182;
      // Move money further left (from 0.40 to 0.25)
      const moneyImg2 = this.add.image(
        this.rx(room, ROOM_WIDTH * 0.25), FLOOR_Y - PICKUP_H / 2, 'money',
      ).setDepth(10).setInteractive({ useHandCursor: true });
      sizeH(moneyImg2, PICKUP_H);

      moneyImg2.on('pointerdown', () => {
        if (this.currentRoom !== room) {
          this.bubbleMgr.chrisSay('Get closer to pick up!', 1800);
          return;
        }
        if (this.modal.isOpen) {
          this.bubbleMgr.chrisSay('Close the popup first!', 1800);
          return;
        }
        store.pickUp('money');
        store.addDiamonds(5);
        this.hud.refresh();
        fxPop(this, moneyImg2.x, moneyImg2.y);
        fxSparkle(this, moneyImg2.x, moneyImg2.y, 10, 50);
        this.audio.pop();
        this.bubbleMgr.chrisSay('Found some cash! +5 💎', 2500);
        moneyImg2.destroy();
      });
    }


    // Wine — stays visible, each click loses 1 heart, 3 clicks = game over
    {
      const wineImg = this.add.image(
        this.rx(room, ROOM_WIDTH * 0.93), DRINK_Y, 'wine',
      ).setDepth(10).setInteractive({ useHandCursor: true });
      sizeH(wineImg, DRINK_H);
      drawShadow(this, wineImg.x, DRINK_Y + DRINK_H / 2, DRINK_H * 0.7);

      wineImg.on('pointerdown', () => {
        if (this.currentRoom !== room || this.modal.isOpen || this.isConsuming) return;
        this.wineClickCount++;
        store.removeHeart(1);
        store.addIntegrity(-3);
        this.hud.refresh();
        fxOuchFlicker(this);
        this.audio.heartLose();

        if (this.wineClickCount >= 4) {
          // Fatal 4th drink — show chris_dizzy directly (skip playConsumeAnimation
          // so its 3.5s revert timer doesn't overwrite the dizzy texture)
          if (this.chris) {
            this.chris.setTexture('chris_dizzy');
            sizeH(this.chris, CHRIS_H);
            this.chris.setDepth(970); // above game over overlay (depth 950)
          }
          this.isConsuming = true; // block further consume clicks
          this.gameOverTriggered = true; // block other game overs
          this.audio.heartLose();
          this.bubbleMgr.chrisSay('🍷🥴 Too much wine... feeling dizzy...', 3000);
          // Delay 3s so players can see chris_dizzy before game over overlay
          this.time.delayedCall(3000, () => {
            this.gameOverTriggered = false;
            this.triggerTimeWastedGameOver('Drank too much wine and got dizzy... 🍷🥴');
          });
          return;
        }
        // Non-fatal wine drink — play consume animation normally
        this.playConsumeAnimation('chris_wine');
        this.bubbleMgr.chrisSay(`🍷 Ugh... that was a mistake. -1 ❤️ (${this.wineClickCount}/4)`, 3000);
        this.checkLowHeart();
        this.checkGameOver();
      });
    }

    // Burger — beside whey (same height/row)
    const burgerImg = this.add.image(
      this.rx(room, ROOM_WIDTH * 0.78), DRINK_Y, 'burger',
    ).setDepth(10).setInteractive({ useHandCursor: true });
    sizeH(burgerImg, DRINK_H);
    drawShadow(this, burgerImg.x, DRINK_Y + DRINK_H / 2, DRINK_H * 0.7);

    burgerImg.on('pointerdown', () => {
      if (this.currentRoom !== room || this.modal.isOpen || this.isConsuming) return;
      if (!this.canConsume()) return;
      // Only allow if hearts < 3
      if (store.s.hearts < 3) {
        this.lastDrinkTime = Date.now();
        this.playConsumeAnimation('chris_burger');
        store.addHeart(1);
        this.hud.refresh();
        fxHeartFlash(this, true);
        this.audio.heartGain();
        this.bubbleMgr.chrisSay('🍔 That hit the spot! +1 ❤️', 2500);
        burgerImg.setVisible(false);
      } else {
        this.showChrisBubble('I feel fine right now. Save it for when I\'m low.');
      }
    });

    // ── Shop stall (spend diamonds) ──────────────────────
    const SHOP_X = this.rx(room, ROOM_WIDTH * 0.15);
    const SHOP_Y = FLOOR_Y - PROP_M / 2;
    const shopBg = this.add.rectangle(0, 0, 180, 120, PAL.wood)
      .setStrokeStyle(3, PAL.darkWood);
    const shopLabel = this.add.text(0, -14, '🛒 Shop', {
      fontFamily: PIXEL_FONT, fontSize: '20px', color: PAL_CSS.gold,
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5);
    const shopDiamond = this.add.text(0, 22, '💎', {
      fontSize: '28px',
    }).setOrigin(0.5);
    this.r1_shop = this.add.container(SHOP_X, SHOP_Y, [shopBg, shopLabel, shopDiamond])
      .setDepth(10).setSize(120, 80).setInteractive({ useHandCursor: true });
    drawShadow(this, SHOP_X, FLOOR_Y, 80);

    this.r1_shop.on('pointerdown', () => {
      if (this.currentRoom !== room || this.modal.isOpen) return;
      this.audio.btnClick();
      this.showMarketModal();
    });

    // ── Barbell (exercise for +1 heart) ─────────────────
    const BARBELL_H = Math.round(PROP_L / 3 * 1.56);  // 56% larger than trashbin (30% + 20% more)
    const BARBELL_X = this.rx(room, ROOM_WIDTH * 0.50);
    const BARBELL_Y = FLOOR_Y - BARBELL_H / 2;
    this.r1_barbell = this.add.image(BARBELL_X, BARBELL_Y, 'barbel')
      .setDepth(10).setInteractive({ useHandCursor: true });
    sizeH(this.r1_barbell, BARBELL_H);
    drawShadow(this, BARBELL_X, FLOOR_Y, BARBELL_H * 0.5);

    // Label
    const barbellLabel = this.add.text(BARBELL_X, BARBELL_Y - BARBELL_H / 2 - 20, '🏋️ Exercise', {
      fontFamily: PIXEL_FONT, fontSize: '18px', color: PAL_CSS.gold,
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(15);

    this.r1_barbell.on('pointerdown', () => {
      if (this.currentRoom !== room || this.modal.isOpen) return;
      if (this.r1_exercising) return;
      if (this.r1_exerciseCount >= 3) {
        this.showChrisBubble('No more exercise... too much time wasted!');
        return;
      }
      // Need at least 20 energy to exercise
      if (store.s.energy < 20) {
        this.showChrisBubble('Too tired to exercise...');
        return;
      }
      // Hide barbell during exercise
      this.r1_barbell.setVisible(false);
      this.startExerciseSequence(barbellLabel);
    });
  }

  /** Market modal — spend diamonds on items */
  private showMarketModal(): void {
    const items: { label: string; cost: number; canBuy: () => boolean; action: () => void }[] = [
      {
        label: `☕ Coffee (5💎) – Energy +10`,
        cost: 5,
        canBuy: () => store.s.diamonds >= 5,
        action: () => {
          store.addDiamonds(-5);
          store.addEnergy(10);
          store.addIntegrity(-1);
          this.hud.refresh();
          this.showChrisBubble('Fresh cup! ☕');
        },
      },
      {
        label: `🛍️ Grocery (8💎) – Prep +8, Energy +5`,
        cost: 8,
        canBuy: () => store.s.diamonds >= 8,
        action: () => {
          store.addDiamonds(-8);
          store.addPrep(8);
          store.addEnergy(5);
          this.hud.refresh();
          this.showChrisBubble('Got the groceries! 🛍️');
        },
      },
      {
        label: `💐 Flowers (10💎) – Prep +5, Integrity +5`,
        cost: 10,
        canBuy: () => store.s.diamonds >= 10 && !store.s.hasFlowers,
        action: () => {
          store.addDiamonds(-10);
          store.addPrep(5);
          store.addIntegrity(5);
          store.s.hasFlowers = true;
          this.hud.refresh();
          this.showChrisBubble('She\'ll love these 💐');
        },
      },
      {
        label: `💍 Ring (25💎) – Prep +10, Integrity +10`,
        cost: 25,
        canBuy: () => store.s.diamonds >= 25 && !store.s.hasRing,
        action: () => {
          store.addDiamonds(-25);
          store.addPrep(10);
          store.addIntegrity(10);
          store.buyRing();
          this.hud.refresh();
          fxSparkle(this, this.chris.x, this.chris.y - 100, 12, 60);
          this.showChrisBubble('This is the one. 💍');
        },
      },
      {
        label: `🚚 Rush Delivery (6💎) – Bonus Time +60s`,
        cost: 6,
        canBuy: () => store.s.diamonds >= 6,
        action: () => {
          store.addDiamonds(-6);
          this.addBonusTime(60);
          this.hud.refresh();
          this.showChrisBubble('Delivery coming! +60s bonus time! 🚚');
        },
      },
    ];

    // Build button array — check canBuy() dynamically in callback
    const buttons = items.map(item => ({
      label: item.label,
      callback: () => {
        if (item.canBuy()) {
          this.audio.marketPurchase();
          item.action();
        } else {
          this.audio.thunk();
          this.showChrisBubble(`Not enough diamonds... need ${item.cost}💎`);
        }
      },
    }));
    buttons.push({
      label: '❌ Leave',
      callback: () => { /* just close */ },
    });

    this.modal.show({
      title: '🛒 Forest Market',
      body: `You have ${store.s.diamonds} 💎`,
      buttons,
    });
  }

  // ═══════════════════════════════════════════════════════
  //  EXERCISE SEQUENCE
  // ═══════════════════════════════════════════════════════

  /**
   * Exercise: 10s barbell animation. Chris sprite hidden, barbel_down/barbel_up alternate.
   * Reward: +1 Heart, +2 Integrity. Cost: -15 Energy, 10s of time.
   * Cooldown: 60s between exercises.
   */
  private startExerciseSequence(barbellLabel: Phaser.GameObjects.Text): void {
    this.r1_exercising = true;
    this.audio.taskStart();

    // Hide Chris, show barbell animation at Chris's position
    const exerciseX = this.chris.x;
    const exerciseY = CHRIS_Y;  // same as Chris — bottom-anchored
    this.chris.setVisible(false);
    this.followers.hide();

    const barbDown = this.add.image(exerciseX, exerciseY, 'barbel_down')
      .setOrigin(0.5, 1).setDepth(50);
    sizeH(barbDown, CHRIS_H);
    const barbUp = this.add.image(exerciseX, exerciseY, 'barbel_up')
      .setOrigin(0.5, 1).setDepth(50).setVisible(false);
    sizeH(barbUp, CHRIS_H);

    // Rep counter overlay
    let reps = 0;
    const repText = this.add.text(DESIGN_W / 2, 120, '🏋️ Exercising... 0 reps', {
      fontFamily: PIXEL_FONT, fontSize: '22px', color: PAL_CSS.gold,
      stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(600).setScrollFactor(0);

    // Progress bar
    const barX = DESIGN_W / 2 - 80;
    const barY = 155;
    const barW = 160;
    const barH = 8;
    const barGfx = this.add.graphics().setDepth(600).setScrollFactor(0);

    // Fast alternating barbel_down / barbel_up — 500ms each, 20 reps in 10s
    const TOTAL_REPS = 20;
    const REP_DELAY = 500;
    const repTimer = this.time.addEvent({
      delay: REP_DELAY,
      repeat: TOTAL_REPS - 1,
      callback: () => {
        reps++;
        const isUp = reps % 2 === 1;
        barbDown.setVisible(!isUp);
        barbUp.setVisible(isUp);

        // Quick bounce on each rep
        const active = isUp ? barbUp : barbDown;
        this.tweens.add({
          targets: active,
          scaleX: active.scaleX * 1.06,
          scaleY: active.scaleY * 1.06,
          duration: 100, yoyo: true, ease: 'Quad.easeOut',
        });

        // Play pop SFX every other rep to avoid sound spam
        if (reps % 2 === 0) this.audio.pop();
        repText.setText(`🏋️ Exercising... ${reps} reps`);

        // Update progress bar
        barGfx.clear();
        barGfx.fillStyle(0x333333, 0.6);
        barGfx.fillRect(barX, barY, barW, barH);
        barGfx.fillStyle(0xf4c76a, 0.9);
        barGfx.fillRect(barX, barY, (reps / TOTAL_REPS) * barW, barH);
      },
    });

    // After 10s, finish exercise
    this.time.delayedCall(10000, () => {
      repTimer.destroy();
      barbDown.destroy();
      barbUp.destroy();
      repText.destroy();
      barGfx.destroy();

      // Restore Chris
      this.chris.setVisible(true);
      this.followers.show();
      this.r1_exercising = false;
      this.r1_exerciseCount++;
      // Show barbell again
      if (this.r1_barbell) this.r1_barbell.setVisible(true);

      // Rewards
      store.addHeart(1);
      store.addIntegrity(2);
      store.addEnergy(-15);
      this.hud.refresh();

      // Exercise costs time — speed up overtime by 15s
      this.speedUpOvertimeTimer(15);

      fxHeartFlash(this, true);
      fxSparkle(this, this.chris.x, this.chris.y - 40, 10, 60);
      this.audio.taskComplete();
      this.showChrisBubble('💪 +1 ❤️ +2 Integrity! Feeling strong!');

      // Time warning from jollibabees
      this.time.delayedCall(2500, () => {
        this.bubbleMgr.jbSayRandom('Oops, not enough time to clean the house!', 3000);
      });

      // Check if exercised too much — 3rd time = game over
      if (this.r1_exerciseCount >= 3) {
        this.r1_barbell.setTint(0x666666);
        barbellLabel.setText('🏋️ Done');
        barbellLabel.setColor('#888888');
        this.time.delayedCall(3000, () => {
          this.triggerTimeWastedGameOver('You exercised too much and ran out of time to do all the chores!');
        });
        return;
      }

      // Show exercise count on label
      barbellLabel.setText(`🏋️ ${this.r1_exerciseCount}/2`);
      if (this.r1_exerciseCount >= 2) {
        barbellLabel.setColor('#FF8888');
      }

      // Jollibabee reactions — specific characters
      this.time.delayedCall(800, () => {
        // JolliBig (index 4): "I want to be like you, Dadibee"
        if (store.foundJollibabee(4)) {
          this.bubbleMgr.jbSay(4, 'I want to be like you, Dadibee', 3000);
        }
        // JolliCute (index 0): "Dadibee, be careful" — slight delay so both show
        this.time.delayedCall(1500, () => {
          if (store.foundJollibabee(0)) {
            this.bubbleMgr.jbSay(0, 'Dadibee, be careful', 3000);
          }
        });
      });
    });
  }

  // ═══════════════════════════════════════════════════════
  //  ROOM 2: LIVING ROOM
  // ═══════════════════════════════════════════════════════

  private setupRoom2_LivingRoom(): void {
    const room = 2;
    const roomKey = SCENE.LIVING_ROOM;
    const trashDone = store.isTaskDone(roomKey, 'trash');
    const vacuumDone = store.isTaskDone(roomKey, 'vacuum');

    // ── Sizes ────────────────────────────────────────────
    const TRASH_ITEM_H = 140;     // same as coffee
    const TRASHBIN_H = Math.round(PROP_L / 3); // 1/3 of vacuum

    // Trash bin — far right, separated from vacuum
    this.r2_trashBin = this.add.image(
      this.rx(room, ROOM_WIDTH * 0.92), FLOOR_Y - TRASHBIN_H / 2, 'trashbin',
    ).setDepth(10);
    sizeH(this.r2_trashBin, TRASHBIN_H);
    drawShadow(this, this.r2_trashBin.x, FLOOR_Y, TRASHBIN_H * 0.5);

    // Trash label — hidden until first item dragged
    this.r2_trashLabel = this.add.text(
      this.rx(room, ROOM_WIDTH * 0.92), FLOOR_Y - TRASHBIN_H - 20,
      trashDone ? '✅' : '',
      { ...TEXT.small },
    ).setOrigin(0.5).setDepth(15);

    // Trash items (draggable) — scattered on the floor, raised higher
    if (!trashDone) {
      const trashPositions = [
        { key: 'can',      x: 0.12, y: FLOOR_Y - 120 },
        { key: 'bottle',   x: 0.28, y: FLOOR_Y - 90 },
        { key: 'box',      x: 0.42, y: FLOOR_Y - 140 },
        { key: 'cup',      x: 0.20, y: FLOOR_Y - 240 },
        { key: 'hair',     x: 0.50, y: FLOOR_Y - 100 },
        { key: 'tissue',   x: 0.35, y: FLOOR_Y - 130 },
        { key: 'paperbag',    x: 0.62, y: FLOOR_Y - 110 },
        { key: 'plasticbag', x: 0.82, y: FLOOR_Y - 120 },
      ];
      trashPositions.forEach(t => {
        const item = this.add.image(
          this.rx(room, ROOM_WIDTH * t.x), t.y, t.key,
        ).setDepth(15)
          .setInteractive({ useHandCursor: true, draggable: true });
        sizeH(item, TRASH_ITEM_H);
        drawShadow(this, item.x, t.y + TRASH_ITEM_H / 2, TRASH_ITEM_H * 0.6);
        this.input.setDraggable(item);
        (item as any)._trashItem = true;
        (item as any)._disposed = false;
        this.r2_trashItems.push(item);
      });
    }

    // Vacuum — well left of trashbin to avoid overlap (20% smaller)
    const VACUUM_H = Math.round(PROP_L * 0.8);
    this.r2_vacuum = this.add.image(
      this.rx(room, ROOM_WIDTH * 0.58), FLOOR_Y - VACUUM_H / 2, 'vacuum',
    ).setDepth(10).setInteractive({ useHandCursor: true });
    sizeH(this.r2_vacuum, VACUUM_H);
    drawShadow(this, this.r2_vacuum.x, FLOOR_Y, VACUUM_H * 0.4);

    if (vacuumDone) this.r2_vacuum.setTint(0x666666);

    this.r2_vacuum.on('pointerdown', () => {
      if (this.currentRoom !== room || this.modal.isOpen) return;
      if (store.isTaskDone(roomKey, 'vacuum')) {
        this.showChrisBubble('Vacuum is done.');
        return;
      }
      // Launch vacuum minigame
      this.audio.taskStart();
      this.registry.set('vacuumCallback', () => {
        this.markTaskDone(roomKey, 'vacuum');
        // Vacuum reward: Prep +5, Energy -5
        store.addPrep(5);
        store.addEnergy(-5);
        this.r2_vacuum.setTint(0x666666);
        fxSparkle(this, this.r2_vacuum.x, this.r2_vacuum.y, 10, 50);
        this.trySpawnJollibabee(roomKey);
        this.showTaskComplete(roomKey);
        this.bubbleMgr.onBugSeen();
      });
      this.scene.pause();
      this.scene.launch(SCENE.VACUUM_MINI);
    });

    // Phone on the couch — doom scroll temptation (player-initiated)
    const PHONE_H = 98;
    this.r2_phone = this.add.image(
      this.rx(room, ROOM_WIDTH * 0.38), TABLE_Y - 40, 'phone',
    ).setDepth(10).setInteractive({ useHandCursor: true });
    sizeH(this.r2_phone, PHONE_H);

    this.r2_phone.on('pointerdown', () => {
      if (this.currentRoom !== room || this.modal.isOpen) return;
      this.showDoomScroll();
    });

    // Phone "rings" periodically — pulse + notification to tempt player
    this.startPhoneRing(this.r2_phone);
  }

  /** Make a phone pulse and show a notification badge periodically to tempt the player */
  private startPhoneRing(phone: Phaser.GameObjects.Image): void {
    // Notification badge
    const badge = this.add.text(phone.x + 20, phone.y - 40, '🔴', {
      fontSize: '26px',
    }).setDepth(11).setAlpha(0);

    // Ring cycle: every 12-20s, phone buzzes for attention
    const ringLoop = () => {
      const delay = Phaser.Math.Between(12000, 20000);
      this.time.delayedCall(delay, () => {
        if (this.endingActive || this.gameOverTriggered) return;
        // Buzz vibration
        this.tweens.add({
          targets: phone,
          x: phone.x + 3, duration: 50, yoyo: true, repeat: 5,
          ease: 'Sine.easeInOut',
        });
        // Flash notification badge
        badge.setAlpha(1);
        this.tweens.add({
          targets: badge,
          alpha: { from: 1, to: 0 },
          duration: 3000, ease: 'Sine.easeIn',
        });
        // SFX
        this.audio.bloop();
        ringLoop();
      });
    };
    // First ring after 8-15s
    this.time.delayedCall(Phaser.Math.Between(8000, 15000), ringLoop);
  }

  // ═══════════════════════════════════════════════════════
  //  ROOM 3: OFFICE
  // ═══════════════════════════════════════════════════════

  private setupRoom3_Office(): void {
    const room = 3;
    const roomKey = SCENE.OFFICE;
    const workDone = store.isTaskDone(roomKey, 'work');
    this.darmeshWorkCycles = 0;

    // Phone → Doom Scroll trigger (on table, 30% smaller)
    const PHONE_H = 98;
    this.r3_phone = this.add.image(
      this.rx(room, ROOM_WIDTH * 0.25), TABLE_Y - 60, 'phone',
    ).setDepth(10).setInteractive({ useHandCursor: true });
    sizeH(this.r3_phone, PHONE_H);

    this.r3_phone.on('pointerdown', () => {
      if (this.currentRoom !== room || this.modal.isOpen) return;
      this.showDoomScroll();
    });

    // Phone rings to tempt player
    this.startPhoneRing(this.r3_phone);

    // Coffee on the desk — same effect as kitchen coffee
    const OFFICE_COFFEE_H = 140;
    const officeCoffee = this.add.image(
      this.rx(room, ROOM_WIDTH * 0.75), TABLE_Y - 90, 'coffee',
    ).setDepth(10).setInteractive({ useHandCursor: true });
    sizeH(officeCoffee, OFFICE_COFFEE_H);

    if (store.s.coffeeUses >= 2) officeCoffee.setTint(0x666666);

    officeCoffee.on('pointerdown', () => {
      if (this.currentRoom !== room || this.modal.isOpen) return;
      if (Date.now() - this.lastDrinkTime < 20000) {
        this.showChrisBubble('Easy... let that one settle first.');
        return;
      }
      if (store.s.energy >= 100 && store.s.hearts >= 3) {
        this.showChrisBubble('I\'m full on energy and hearts right now.');
        return;
      }
      if (store.useCoffee()) {
        this.lastDrinkTime = Date.now();
        store.addHeart(1);
        store.addEnergy(10);
        this.hud.refresh();
        fxHeartFlash(this, true);
        this.audio.bloop();
        fxSparkle(this, officeCoffee.x, officeCoffee.y, 8, 40);
        if (store.s.coffeeUses === 1) {
          this.bubbleMgr.chrisSay('☕ +1 ❤️ +10 ⚡', 2500);
          officeCoffee.setAlpha(0.7);
          if (this.r0_coffee) this.r0_coffee.setAlpha(0.7);
        } else {
          this.bubbleMgr.chrisSay('☕ Last cup! +1 ❤️ +10 ⚡', 2500);
          officeCoffee.setTint(0x666666);
          if (this.r0_coffee) this.r0_coffee.setTint(0x666666);
        }
      } else {
        this.bubbleMgr.chrisSay('No more coffee left.', 2000);
      }
    });

    // Desk zone
    this.r3_deskZone = this.add.rectangle(
      this.rx(room, ROOM_WIDTH * 0.48), TABLE_Y,
      200, 150, 0x000000, 0,
    ).setInteractive({ useHandCursor: true }).setDepth(5);
    if (!workDone) this.r3_deskZone.setStrokeStyle(2, PAL.gold, 0.3);

    // Progress text — hidden until first click
    this.r3_progressText = this.add.text(
      this.rx(room, ROOM_WIDTH * 0.48), TABLE_Y - 100,
      workDone ? '✅' : '',
      { ...TEXT.small },
    ).setOrigin(0.5).setDepth(15);

    // Progress bar
    this.r3_progressBar = this.add.graphics().setDepth(12);
    this.updateWorkProgressBar();

    this.r3_deskZone.on('pointerdown', () => {
      if (this.currentRoom !== room || this.modal.isOpen) return;
      if (store.isTaskDone(roomKey, 'work')) return;
      if (this.darmeshWorkCycles >= 5) {
        this.showChrisBubble('Darmesh is satisfied. No more work calls!');
        return;
      }

      this.workCount++;
      this.r3_progressText.setText(`${this.workCount}/6`);
      this.updateWorkProgressBar();
      fxPop(this, this.r3_deskZone.x, this.r3_deskZone.y, 0.5);
      this.audio.pop();

      // (Darmesh call now triggers on room entry timer, not work progress)

      if (this.workCount >= 6) {
        this.markTaskDone(roomKey, 'work');
        this.r3_progressText.setText('✅');
        this.r3_deskZone.setStrokeStyle(2, PAL.gold, 0);
        fxSparkle(this, this.r3_deskZone.x, this.r3_deskZone.y, 12, 60);
        // Reward: Prep +12, Energy -5, Diamonds +3
        store.addPrep(12);
        store.addEnergy(-5);
        store.addDiamonds(3);
        this.trySpawnJollibabee(roomKey);
        this.showTaskComplete(roomKey);
        this.darmeshWorkCycles = (this.darmeshWorkCycles || 0) + 1;
        if (this.darmeshWorkCycles < 5) {
          this.scheduleDarmeshWorkReset();
        } else {
          this.showChrisBubble('Darmesh is satisfied. No more work calls!');
        }
      }
    });

    // Keys pickup — on the floor, required for exit
    if (!store.hasPickedUp('keys')) {
      const PICKUP_H = 182;
      const keysImg = this.add.image(
        this.rx(room, ROOM_WIDTH * 0.15), FLOOR_Y - PICKUP_H / 2, 'keys',
      ).setDepth(10).setInteractive({ useHandCursor: true });
      sizeH(keysImg, PICKUP_H);

      keysImg.on('pointerdown', () => {
        if (this.currentRoom !== room || this.modal.isOpen) return;
        store.pickUp('keys');
        fxPop(this, keysImg.x, keysImg.y);
        fxSparkle(this, keysImg.x, keysImg.y, 10, 50);
        this.audio.pop();
        this.bubbleMgr.chrisSay('Found the car keys! 🔑', 2500);
        keysImg.destroy();
      });
    }
  }

  private updateWorkProgressBar(): void {
    const g = this.r3_progressBar;
    g.clear();
    const barX = this.rx(3, ROOM_WIDTH * 0.48) - 60;
    const barY = TABLE_Y - 60;
    const barW = 120;
    const barH = 10;
    g.fillStyle(0x333333, 0.6);
    g.fillRect(barX, barY, barW, barH);
    const fill = (this.workCount / 6) * barW;
    g.fillStyle(PAL.gold, 0.9);
    g.fillRect(barX, barY, fill, barH);
  }

  /** Recurring whale coin: first attempt after 12s, then every 20s. 50/50 chance each cycle. */
  private startWhaleCoinLoop(): void {
    this.stopWhaleCoinLoop();
    // First whale coin is GUARANTEED after 10s in the office
    this.r3_whaleCoinTimer = this.time.addEvent({
      delay: 10000,
      callback: () => {
        this.stopWhaleCoinLoop();
        if (this.currentRoom === 3 && !this.modal.isOpen && !this.endingActive) {
          this.showWhaleCoin();
        }
        // Then try again every 25s with 70% chance
        this.r3_whaleCoinTimer = this.time.addEvent({
          delay: 25000,
          loop: true,
          callback: () => {
            if (this.currentRoom !== 3 || this.modal.isOpen || this.endingActive) return;
            if (Math.random() < 0.7) {
              this.showWhaleCoin();
            }
          },
        });
      },
    });
  }

  private stopWhaleCoinLoop(): void {
    if (this.r3_whaleCoinTimer) {
      this.r3_whaleCoinTimer.destroy();
      this.r3_whaleCoinTimer = undefined;
    }
  }



  // ═══════════════════════════════════════════════════════
  //  ROOM 4: BEDROOM
  // ═══════════════════════════════════════════════════════

  private setupRoom4_Bedroom(): void {
    const room = 4;
    const roomKey = SCENE.BEDROOM;
    const sleepDone = store.isTaskDone(roomKey, 'sleep');

    // Bed — 50% larger than PROP_L, raised higher
    const BED_H = Math.round(PROP_L * 1.5);
    this.r4_bed = this.add.image(
      this.rx(room, ROOM_WIDTH * 0.60), FLOOR_Y - BED_H / 2 - 150, 'bed',
    ).setDepth(10).setInteractive({ useHandCursor: true });
    sizeH(this.r4_bed, BED_H);
    drawShadow(this, this.r4_bed.x, FLOOR_Y, BED_H * 0.7);

    // Bed with Chris (hidden)
    this.r4_bedChris = this.add.image(
      this.rx(room, ROOM_WIDTH * 0.60), FLOOR_Y - BED_H / 2 - 150, 'bed_with_chris',
    ).setDepth(10).setVisible(false);
    sizeH(this.r4_bedChris, BED_H);

    if (store.s.sleepUses >= 3) this.r4_bed.setTint(0x666666);
    else if (sleepDone) this.r4_bed.setAlpha(0.8);

    this.r4_bed.on('pointerdown', () => {
      if (this.currentRoom !== room || this.modal.isOpen) return;
      if (store.s.sleepUses >= 3) {
        this.showChrisBubble('Can\'t sleep anymore. Too much to do!');
        return;
      }
      if (store.s.diamonds < 3) {
        this.showChrisBubble('I need at least 3 💎 to afford a proper rest...');
        return;
      }
      this.startSleepSequence(roomKey);
    });

    // Remote pickup on bedroom floor
    this.setupBedroomPickups(room);

    // Mirror — near the floor, far right
    this.r4_mirror = this.add.image(
      this.rx(room, ROOM_WIDTH * 0.90), FLOOR_Y - PROP_M / 2, 'mirror',
    ).setDepth(10).setInteractive({ useHandCursor: true });
    sizeH(this.r4_mirror, PROP_M);

    this.r4_mirror.on('pointerdown', () => {
      if (this.currentRoom !== room || this.modal.isOpen) return;
      this.showMirrorModal();
    });
  }

  private startSleepSequence(roomKey: string): void {
    this.audio.playSfx('bloop');
    // Dim overlay (camera-fixed)
    const overlay = this.add.rectangle(
      DESIGN_W / 2, DESIGN_H / 2, DESIGN_W, DESIGN_H, 0x000000, 0,
    ).setDepth(400).setScrollFactor(0);

    // Show bed_with_chris
    this.r4_bed.setVisible(false);
    this.r4_bedChris.setVisible(true);
    this.followers.hide();

    this.tweens.add({ targets: overlay, alpha: 0.6, duration: 1000 });
    const zzz = this.add.text(DESIGN_W / 2, DESIGN_H / 2 - 60, '💤 Sleeping...', {
      ...TEXT.heading,
    }).setOrigin(0.5).setDepth(450).setScrollFactor(0);

    // Wake after 3s
    this.time.delayedCall(3000, () => {
      overlay.destroy();
      zzz.destroy();
      this.r4_bed.setVisible(true);
      this.r4_bedChris.setVisible(false);
      this.r4_bed.setTint(0x888888);
      this.followers.show();

      store.s.sleepUses++;
      store.addDiamonds(-3);    // Costs 3 diamonds each time

      // Sleep costs time — speed up overtime by 20s
      this.speedUpOvertimeTimer(20);

      if (store.s.sleepUses === 1) {
        // First nap: full restore
        store.s.energy = 100;     // Energy = 100 (full restore)
        store.addPrep(15);        // Preparation +15
        store.addIntegrity(5);    // Integrity +5
        store.addHeart(1);        // +1 heart from rest
        store.s.hasSlept = true;  // Stops heart drain
        this.showChrisBubble('Zzz... that was nice! ⚡100 💎-3');
      } else if (store.s.sleepUses >= 3) {
        // Third nap — too much sleeping, game over
        store.s.energy = Math.min(100, store.s.energy + 30);
        this.hud.refresh();
        this.showChrisBubble('Zzz... just five more minutes...');
        this.r4_bed.setTint(0x666666);
        this.time.delayedCall(2000, () => {
          this.triggerTimeWastedGameOver('You slept too much and ran out of time to do all the chores!');
        });
        return;
      } else {
        // Second nap: reduced rewards
        store.s.energy = Math.min(100, store.s.energy + 50);
        store.addPrep(5);
        store.addHeart(1);
        this.showChrisBubble('A quick power nap. ⚡+50 💎-3');
      }

      this.hud.refresh();
      fxHeartFlash(this, true);

      // Time warning from jollibabees
      this.time.delayedCall(2500, () => {
        this.bubbleMgr.jbSayRandom('Oops, not enough time to clean the house!', 3000);
      });

      // Only mark task done on first sleep (for jollibabee unlock + room complete)
      if (store.s.sleepUses === 1) {
        this.markTaskDone(roomKey, 'sleep');
        this.trySpawnJollibabee(roomKey);
        this.showTaskComplete(roomKey);
      } else {
        this.r4_bed.setAlpha(1); // restore alpha before tinting
        this.audio.sleepComplete();
      }
      this.audio.sleepComplete();
    });
  }

  private mirrorIndex = 0;

  /** Mirror prompts — ego, relationship, confidence, love. Impacts confidence (integrity) + heart. */
  private readonly mirrorPrompts: Array<{
    question: string;
    optA: { label: string; chris: string; stat: () => void };
    optB: { label: string; chris: string; stat: () => void };
    jbLine?: { idx: number; text: string };
  }> = [
    // EGO
    {
      question: 'Am I the best Dadibee?',
      optA: { label: '👑 Obviously', chris: 'No contest.', stat: () => { store.addIntegrity(3); store.addHeart(1); } },
      optB: { label: '😅 Probably not', chris: 'But I\'m trying...', stat: () => { store.addIntegrity(1); } },
      jbLine: { idx: 0, text: 'You\'re the best Dadibee!' },
    },
    {
      question: 'Do I look good today?',
      optA: { label: '🔥 Obviously', chris: 'Looking sharp, Chris!', stat: () => { store.addIntegrity(3); store.addHeart(1); } },
      optB: { label: '😬 Meh...', chris: 'Could be worse...', stat: () => { store.addIntegrity(-1); } },
      jbLine: { idx: 4, text: 'Dadibee, I\'m growing too!' },
    },
    {
      question: 'Mirror mirror on the wall...',
      optA: { label: '👑 I\'m the man', chris: 'This Dadibee right here!', stat: () => { store.addIntegrity(3); store.addHeart(1); } },
      optB: { label: '🤡 I\'m a mess', chris: '...but a lovable mess.', stat: () => { store.addIntegrity(-2); } },
      jbLine: { idx: 3, text: 'Yeah, that\'s right!' },
    },
    // CONFIDENCE
    {
      question: 'Am I strong enough for this?',
      optA: { label: '💪 Always', chris: 'Stronger every day!', stat: () => { store.addIntegrity(3); store.addHeart(1); } },
      optB: { label: '🥺 I doubt it', chris: 'Maybe not...', stat: () => { store.addIntegrity(-2); } },
      jbLine: { idx: 3, text: 'Dadibee is the strongest!' },
    },
    {
      question: 'Can I really do all of this?',
      optA: { label: '✅ I got this', chris: 'One room at a time.', stat: () => { store.addIntegrity(2); store.addHeart(1); } },
      optB: { label: '😰 Too much...', chris: 'It\'s overwhelming...', stat: () => { store.addIntegrity(-2); } },
      jbLine: { idx: 0, text: 'Dadibee, focus!' },
    },
    {
      question: 'What if I fail at the pickup?',
      optA: { label: '😂 I won\'t', chris: 'I\'ll be smooth.', stat: () => { store.addIntegrity(2); store.addHeart(1); } },
      optB: { label: '😨 What if...', chris: 'Don\'t think about it...', stat: () => { store.addIntegrity(-1); } },
      jbLine: { idx: 1, text: 'IYKYK' },
    },
    // RELATIONSHIP
    {
      question: 'Does Mamibee still love me?',
      optA: { label: '❤️ Of course!', chris: 'She chose us. I choose her.', stat: () => { store.addIntegrity(4); store.addHeart(1); } },
      optB: { label: '😢 I hope so...', chris: 'I should do more...', stat: () => { store.addIntegrity(-1); } },
      jbLine: { idx: 2, text: 'Where IS Mamibee?' },
    },
    {
      question: 'Am I a good partner?',
      optA: { label: '💛 I try my best', chris: 'Every day, for her.', stat: () => { store.addIntegrity(3); store.addHeart(1); } },
      optB: { label: '😓 Not enough', chris: 'I could do better...', stat: () => { store.addIntegrity(-2); } },
      jbLine: { idx: 5, text: 'Dadibee loves Mamibee!' },
    },
    // LOVE
    {
      question: 'Why am I doing all this?',
      optA: { label: '❤️ For my family', chris: 'For Mamibee and the Jollibabees.', stat: () => { store.addIntegrity(4); store.addHeart(1); } },
      optB: { label: '🤷 I dunno...', chris: 'Good question...', stat: () => { store.addIntegrity(-2); } },
      jbLine: { idx: 0, text: 'Because you love us, Dadibee!' },
    },
    {
      question: 'The Jollibabees are growing fast...',
      optA: { label: '🥲 I\'m so proud', chris: 'They make it all worth it.', stat: () => { store.addIntegrity(3); store.addHeart(1); } },
      optB: { label: '😤 Too fast!', chris: 'Slow down, babies!', stat: () => { store.addIntegrity(1); } },
      jbLine: { idx: 4, text: 'No, I\'m just plump!' },
    },
    {
      question: 'Would Mamibee be proud of me right now?',
      optA: { label: '🥰 Yes!', chris: 'She\'d smile at this.', stat: () => { store.addIntegrity(3); store.addHeart(1); } },
      optB: { label: '😳 She\'d laugh', chris: 'She\'d say I missed a spot...', stat: () => { store.addIntegrity(-1); } },
      jbLine: { idx: 2, text: 'Mamibee would be proud!' },
    },
    {
      question: 'Am I enough?',
      optA: { label: '💯 More than enough', chris: 'I am. And that\'s enough.', stat: () => { store.addIntegrity(4); store.addHeart(1); } },
      optB: { label: '😔 Never...', chris: 'Maybe not...', stat: () => { store.addIntegrity(-3); store.removeHeart(1); } },
      jbLine: { idx: 0, text: 'You ARE enough, Dadibee!' },
    },
  ];

  private showMirrorModal(): void {
    this.audio.popupOpen();

    const prompt = this.mirrorPrompts[this.mirrorIndex % this.mirrorPrompts.length];
    this.mirrorIndex++;

    const afterChoice = () => {
      this.hud.refresh();
      fxSparkle(this, this.r4_mirror.x, this.r4_mirror.y, 6, 40);
      // Jollibabee reacts if found
      if (prompt.jbLine && store.foundJollibabee(prompt.jbLine.idx)) {
        this.time.delayedCall(800, () => {
          this.bubbleMgr.jbSay(prompt.jbLine!.idx, prompt.jbLine!.text, 3000);
        });
      }
      // Short 8s cooldown — can check again soon
      this.r4_mirror.disableInteractive();
      this.r4_mirror.setTint(0x888888);
      this.time.delayedCall(8000, () => {
        if (this.r4_mirror) {
          this.r4_mirror.setInteractive({ useHandCursor: true });
          this.r4_mirror.clearTint();
        }
      });
    };

    this.modal.show({
      title: '🪞 Mirror',
      body: prompt.question,
      buttons: [
        {
          label: prompt.optA.label,
          callback: () => {
            prompt.optA.stat();
            this.showChrisBubble(prompt.optA.chris);
            afterChoice();
          },
          color: 0x336633,
        },
        {
          label: prompt.optB.label,
          callback: () => {
            prompt.optB.stat();
            this.showChrisBubble(prompt.optB.chris);
            afterChoice();
          },
          color: 0x336633,
        },
        { label: '🫣 Walk away', callback: () => {} },
      ],
    });
  }

  // ── Remote pickup (bedroom floor, optional) ───────────
  private setupBedroomPickups(room: number): void {
    if (!store.hasPickedUp('remote')) {
      const PICKUP_H = 308;
      const remoteImg = this.add.image(
        this.rx(room, ROOM_WIDTH * 0.20), FLOOR_Y - PICKUP_H / 2 - 80, 'remote',
      ).setDepth(10).setInteractive({ useHandCursor: true });
      sizeH(remoteImg, PICKUP_H);

      remoteImg.on('pointerdown', () => {
        if (this.currentRoom !== room || this.modal.isOpen) return;
        store.pickUp('remote');
        fxPop(this, remoteImg.x, remoteImg.y);
        fxSparkle(this, remoteImg.x, remoteImg.y, 10, 50);
        this.audio.pop();
        this.bubbleMgr.chrisSay('Picked up the remote! 📺', 2500);
        remoteImg.destroy();
      });
    }
  }

  // ═══════════════════════════════════════════════════════
  //  ROOM 5: BATHROOM
  // ═══════════════════════════════════════════════════════

  private setupRoom5_Bathroom(): void {
    const room = 5;
    const roomKey = SCENE.BATHROOM;
    const laundryDone = store.isTaskDone(roomKey, 'laundry');
    const foldDone = store.isTaskDone(roomKey, 'folding');

    // Laundry basket — same size as trashbin
    const BASKET_H = Math.round(PROP_L / 3);
    this.r5_basket = this.add.image(
      this.rx(room, ROOM_WIDTH * 0.82), FLOOR_Y - BASKET_H / 2, 'laundrybasket',
    ).setDepth(10);
    sizeH(this.r5_basket, BASKET_H);
    drawShadow(this, this.r5_basket.x, FLOOR_Y, BASKET_H * 0.5);

    // Clothes items (draggable)
    if (!laundryDone) {
      const clothesPositions = [
        { key: 'dirtyclothes', x: 0.08, y: FLOOR_Y - 400 },
        { key: 'dress_1',      x: 0.18, y: FLOOR_Y - 80 },
        { key: 'dress',        x: 0.28, y: FLOOR_Y - 120 },
        { key: 'hoodie',       x: 0.38, y: FLOOR_Y - 90 },
        { key: 'jacket',       x: 0.48, y: FLOOR_Y - 140 },
        { key: 'pants',        x: 0.55, y: FLOOR_Y - 70 },
        { key: 'shorts',       x: 0.35, y: FLOOR_Y - 160 },
        { key: 'socks',        x: 0.65, y: FLOOR_Y - 110 },
        { key: 'underwear',    x: 0.15, y: FLOOR_Y - 130 },
        { key: 'towel',        x: 0.72, y: FLOOR_Y - 95 },
      ];
      clothesPositions.forEach(c => {
        const item = this.add.image(
          this.rx(room, ROOM_WIDTH * c.x), c.y, c.key,
        ).setDepth(15)
          .setInteractive({ useHandCursor: true, draggable: true });
        sizeH(item, PROP_S);
        drawShadow(this, item.x, c.y + PROP_S / 2, PROP_S * 0.6);
        this.input.setDraggable(item);
        (item as any)._clothesItem = true;
        (item as any)._disposed = false;
        this.r5_clothesItems.push(item);
      });
    }

    // Clothes + Hanger props (visible after laundry done, trigger folding task)
    const r5_clothes = this.add.image(
      this.rx(room, ROOM_WIDTH * 0.08), FLOOR_Y - 400, 'clothes',
    ).setDepth(10).setInteractive({ useHandCursor: true });
    sizeH(r5_clothes, PROP_S);

    const r5_hangers = this.add.image(
      this.rx(room, ROOM_WIDTH * 0.50), WALL_Y, 'hangers',
    ).setDepth(10).setInteractive({ useHandCursor: true });
    sizeH(r5_hangers, PROP_M);

    // Only show after laundry is done, hide after folding is done
    r5_clothes.setVisible(laundryDone && !foldDone);
    r5_hangers.setVisible(laundryDone && !foldDone);

    const launchFolding = () => {
      if (this.currentRoom !== room || this.modal.isOpen) return;
      if (store.isTaskDone(roomKey, 'folding')) return;

      this.audio.btnClick();
      this.bubbleMgr.chrisSay('There\'s more to be done...', 2000);
      this.time.delayedCall(2200, () => {
        if (store.isTaskDone(roomKey, 'folding')) return;
        this.audio.taskStart();
        // Launch folding minigame
        this.registry.set('foldingCallback', () => {
          this.markTaskDone(roomKey, 'folding');
          // Folding reward: Prep +10, Integrity +3
          store.addPrep(10);
          store.addIntegrity(3);
          r5_clothes.setVisible(false);
          r5_hangers.setVisible(false);
          fxSparkle(this, this.r5_basket.x, this.r5_basket.y, 12, 60);
          this.showTaskComplete(roomKey);
        });
        this.scene.pause();
        this.scene.launch(SCENE.FOLDING_MINI);
      });
    };

    r5_clothes.on('pointerdown', launchFolding);
    r5_hangers.on('pointerdown', launchFolding);

    // Show clothes/hangers when laundry completes (store ref for drag handler)
    (this as any)._r5_foldProps = { clothes: r5_clothes, hangers: r5_hangers };
  }

  // ═══════════════════════════════════════════════════════
  //  ROOM 6: BALCONY
  // ═══════════════════════════════════════════════════════

  private setupRoom6_Balcony(): void {
    const room = 6;
    const roomKey = SCENE.BALCONY;
    const waterDone = store.isTaskDone(roomKey, 'water');

    // Bonsai ugly
    this.r6_bonsaiUgly = this.add.image(
      this.rx(room, ROOM_WIDTH * 0.62), FLOOR_Y - PROP_L / 2, 'bonsaiugly',
    ).setDepth(10).setVisible(!waterDone)
      .setInteractive({ useHandCursor: true });
    sizeH(this.r6_bonsaiUgly, PROP_L);
    drawShadow(this, this.r6_bonsaiUgly.x, FLOOR_Y, PROP_L * 0.4);

    // Bonsai pretty (after watering)
    this.r6_bonsaiPretty = this.add.image(
      this.rx(room, ROOM_WIDTH * 0.62), FLOOR_Y - PROP_L / 2, 'bonsai',
    ).setDepth(10).setVisible(waterDone);
    sizeH(this.r6_bonsaiPretty, PROP_L);

    // Bucket — always visible (doesn't disappear after watering)
    this.r6_bucket = this.add.image(
      this.rx(room, ROOM_WIDTH * 0.25), FLOOR_Y - PROP_M / 2, 'bucket',
    ).setDepth(10)
      .setInteractive({ useHandCursor: true });
    sizeH(this.r6_bucket, PROP_M);
    drawShadow(this, this.r6_bucket.x, FLOOR_Y, PROP_M * 0.5);

    // Step 1: tap bucket to pick it up
    this.r6_bucket.on('pointerdown', () => {
      if (this.currentRoom !== room || this.modal.isOpen) return;
      if (this.r6_bucketTaken) {
        this.showChrisBubble('Already holding the bucket! Tap the bonsai.');
        return;
      }
      this.r6_bucketTaken = true;
      fxPop(this, this.r6_bucket.x, this.r6_bucket.y);
      this.audio.pop();
      this.r6_bucket.setTint(0xaaffaa);
      this.showChrisBubble('Got the bucket! Now water the bonsai.');
    });

    // Step 2: tap bonsai to water (needs 2 waterings to complete)
    this.r6_bonsaiUgly.on('pointerdown', () => {
      if (this.currentRoom !== room || this.modal.isOpen) return;
      if (!this.r6_bucketTaken) {
        this.showChrisBubble('I need the bucket first.');
        return;
      }
      if (store.isTaskDone(roomKey, 'water')) return;

      // Disable interaction during animation
      this.r6_bonsaiUgly.disableInteractive();
      this.r6_bucket.disableInteractive();

      // Save bucket original position
      const bucketOrigX = this.r6_bucket.x;
      const bucketOrigY = this.r6_bucket.y;
      const bonsaiX = this.r6_bonsaiUgly.x;
      const bonsaiTopY = this.r6_bonsaiUgly.y - PROP_L / 2;

      // Animate bucket moving above bonsai
      this.tweens.add({
        targets: this.r6_bucket,
        x: bonsaiX,
        y: bonsaiTopY - 40,
        duration: 500,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          // Tilt bucket (pour)
          this.tweens.add({
            targets: this.r6_bucket,
            angle: -45,
            duration: 300,
            ease: 'Sine.easeIn',
            onComplete: () => {
              // Spawn water droplets falling onto bonsai
              this.audio.waterSplash();
              const dropCount = 12;
              for (let d = 0; d < dropCount; d++) {
                const dropX = bonsaiX + Phaser.Math.Between(-30, 30);
                const dropStartY = bonsaiTopY - 30;
                const drop = this.add.circle(dropX, dropStartY, Phaser.Math.Between(2, 4), 0x44AAFF, 0.8)
                  .setDepth(950);
                this.tweens.add({
                  targets: drop,
                  y: bonsaiTopY + Phaser.Math.Between(40, 120),
                  alpha: 0,
                  duration: Phaser.Math.Between(400, 700),
                  delay: Phaser.Math.Between(0, 300),
                  ease: 'Quad.easeIn',
                  onComplete: () => drop.destroy(),
                });
              }

              // Shimmer on bonsai as water hits
              fxShimmer(this, bonsaiX, bonsaiTopY + 60, 8, 40);

              // After pouring, tilt bucket back and return it
              this.time.delayedCall(600, () => {
                this.tweens.add({
                  targets: this.r6_bucket,
                  angle: 0,
                  duration: 200,
                  ease: 'Sine.easeOut',
                  onComplete: () => {
                    // Return bucket to original position
                    this.tweens.add({
                      targets: this.r6_bucket,
                      x: bucketOrigX,
                      y: bucketOrigY,
                      duration: 400,
                      ease: 'Sine.easeInOut',
                      onComplete: () => {
                        // Reset bucket state
                        this.r6_bucketTaken = false;
                        this.r6_bucket.clearTint();
                        this.r6_bucket.setInteractive({ useHandCursor: true });

                        this.r6_waterCount++;

                        if (this.r6_waterCount < 2) {
                          // First watering — transform to pretty, then revert later
                          store.addPrep(4);
                          store.addIntegrity(1);
                          this.hud.refresh();

                          // Transform bonsaiugly → bonsai with FX
                          this.r6_bonsaiUgly.setVisible(false);
                          this.r6_bonsaiPretty.setVisible(true);
                          this.r6_bonsaiPretty.setScale(this.r6_bonsaiPretty.scaleX * 0.5, this.r6_bonsaiPretty.scaleY * 0.5);
                          this.r6_bonsaiPretty.setAlpha(0);
                          const targetSX = this.r6_bonsaiUgly.scaleX;
                          const targetSY = this.r6_bonsaiUgly.scaleY;
                          this.tweens.add({
                            targets: this.r6_bonsaiPretty,
                            scaleX: targetSX,
                            scaleY: targetSY,
                            alpha: 1,
                            duration: 600,
                            ease: 'Back.easeOut',
                            onComplete: () => {
                              fxSparkle(this, bonsaiX, bonsaiTopY + 60, 12, 60);
                              this.showChrisBubble('Looking better! But it still needs more water... 💧');

                              // After a delay, revert bonsai back to ugly
                              this.time.delayedCall(8000, () => {
                                if (store.isTaskDone(roomKey, 'water')) return;
                                // Poof out: bonsai disappears with poof, ugly appears with poof
                                fxPoof(this, bonsaiX, bonsaiTopY + 60, 8);
                                this.audio.pop();
                                this.time.delayedCall(300, () => {
                                  this.r6_bonsaiPretty.setVisible(false);
                                  this.r6_bonsaiPretty.setScale(targetSX, targetSY);
                                  this.r6_bonsaiPretty.setAlpha(1);
                                  // Ugly pops back in with poof
                                  this.r6_bonsaiUgly.setVisible(true);
                                  this.r6_bonsaiUgly.setAlpha(0);
                                  this.r6_bonsaiUgly.setScale(targetSX * 0.3, targetSY * 0.3);
                                  fxPoof(this, bonsaiX, bonsaiTopY + 60, 6);
                                  this.tweens.add({
                                    targets: this.r6_bonsaiUgly,
                                    scaleX: targetSX,
                                    scaleY: targetSY,
                                    alpha: 1,
                                    duration: 400,
                                    ease: 'Back.easeOut',
                                    onComplete: () => {
                                      this.r6_bonsaiUgly.setInteractive({ useHandCursor: true });
                                      this.showChrisBubble('Oh no, it wilted again! Need more water! 🥀');
                                    },
                                  });
                                });
                              });
                            },
                          });
                        } else {
                          // Second watering — complete! Final transformation
                          this.r6_bonsaiUgly.setVisible(false);
                          this.r6_bonsaiPretty.setVisible(true);
                          this.r6_bonsaiPretty.setScale(this.r6_bonsaiPretty.scaleX * 0.3, this.r6_bonsaiPretty.scaleY * 0.3);
                          this.r6_bonsaiPretty.setAlpha(0);
                          const finalSX = this.r6_bonsaiUgly.scaleX;
                          const finalSY = this.r6_bonsaiUgly.scaleY;
                          this.tweens.add({
                            targets: this.r6_bonsaiPretty,
                            scaleX: finalSX,
                            scaleY: finalSY,
                            alpha: 1,
                            duration: 800,
                            ease: 'Back.easeOut',
                            onComplete: () => {
                              // Big sparkle burst for final transformation
                              fxSparkle(this, bonsaiX, bonsaiTopY + 30, 16, 80);
                              fxSparkle(this, bonsaiX - 30, bonsaiTopY + 60, 8, 40);
                              fxSparkle(this, bonsaiX + 30, bonsaiTopY + 60, 8, 40);
                              // Green glow pulse
                              const glow = this.add.circle(bonsaiX, bonsaiTopY + 60, 60, 0x4CAF50, 0.4)
                                .setDepth(9);
                              this.tweens.add({
                                targets: glow,
                                scaleX: 2, scaleY: 2, alpha: 0,
                                duration: 600,
                                ease: 'Cubic.easeOut',
                                onComplete: () => glow.destroy(),
                              });
                            },
                          });
                          // Garden reward: Prep +4, Integrity +1, Energy -5
                          store.addPrep(4);
                          store.addIntegrity(1);
                          store.addEnergy(-5);
                          this.markTaskDone(roomKey, 'water');
                          this.trySpawnJollibabee(roomKey);
                          this.showTaskComplete(roomKey);
                        }
                      },
                    });
                  },
                });
              });
            },
          });
        },
      });
    });

    // Wallet pickup — on the floor, optional, gives diamonds
    if (!store.hasPickedUp('wallet')) {
      const PICKUP_H = 220;
      const walletImg = this.add.image(
        this.rx(room, ROOM_WIDTH * 0.85), FLOOR_Y - PICKUP_H / 2, 'wallet',
      ).setDepth(10).setInteractive({ useHandCursor: true });
      sizeH(walletImg, PICKUP_H);

      walletImg.on('pointerdown', () => {
        if (this.currentRoom !== room || this.modal.isOpen) return;
        store.pickUp('wallet');
        store.addDiamonds(8);
        this.hud.refresh();
        fxPop(this, walletImg.x, walletImg.y);
        fxSparkle(this, walletImg.x, walletImg.y, 10, 50);
        this.audio.pop();
        this.bubbleMgr.chrisSay('Found my wallet! +8 💎', 2500);
        walletImg.destroy();
      });
    }
  }

  // ═══════════════════════════════════════════════════════
  //  ROOM 7: EXIT DOOR
  // ═══════════════════════════════════════════════════════

  private setupRoom7_ExitDoor(): void {
    const room = 7;

    this.r7_doorZone = this.add.rectangle(
      this.rx(room, ROOM_WIDTH / 2), DESIGN_H / 2 - 60,
      250, 360, 0x000000, 0,
    ).setInteractive({ useHandCursor: true }).setDepth(5);
    this.r7_doorZone.setStrokeStyle(3, PAL.gold, 0.5);

    this.r7_doorLabel = this.add.text(
      this.rx(room, ROOM_WIDTH / 2), DESIGN_H / 2 + 150,
      '🚪 Exit Door', { ...TEXT.heading },
    ).setOrigin(0.5).setDepth(10);

    this.r7_doorZone.on('pointerdown', () => {
      if (this.currentRoom !== room || this.modal.isOpen) return;
      this.onDoorTap();
    });
  }

  private onDoorTap(): void {
    if (!store.allQuestsComplete()) {
      showBubble(this, this.r7_doorZone.x, this.r7_doorZone.y - 180,
        'I can\'t leave yet. There\'s still work to do.', 2500);
      return;
    }

    // If all quests done but keys not found, show specific speech
    if (!store.hasPickedUp('keys')) {
      showBubble(this, this.r7_doorZone.x, this.r7_doorZone.y - 180,
        'i think i need to find the keys first', 3000);
      return;
    }

    // Stat gate check per CLAUDE.md
    const s = store.s;
    const missing: string[] = [];
    if (s.preparation < 70) missing.push(`Prep ${s.preparation}/70`);
    if (s.energy < 40)      missing.push(`Energy ${s.energy}/40`);
    if (s.diamonds < 5)     missing.push(`Diamonds ${s.diamonds}/5`);
    if (s.hearts < 1)       missing.push('No hearts!');

    if (missing.length > 0) {
      showBubble(this, this.r7_doorZone.x, this.r7_doorZone.y - 180,
        `Not ready yet.\n${missing.join(' | ')}`, 3500);
      return;
    }

    this.r7_doorZone.disableInteractive();
    this.audio.doorOpen();
    this.startEndingSequence();
  }

  // ═══════════════════════════════════════════════════════
  //  DRAG HANDLERS (shared)
  // ═══════════════════════════════════════════════════════

  private setupDragHandlers(): void {
    this.input.on('drag', (_p: any, obj: any, dragX: number, dragY: number) => {
      if (obj._trashItem && this.currentRoom === 2 && !obj._disposed) {
        obj.setPosition(dragX, dragY);
      }
      if (obj._clothesItem && this.currentRoom === 5 && !obj._disposed) {
        obj.setPosition(dragX, dragY);
      }
    });

    this.input.on('dragend', (_p: any, obj: any) => {
      // Trash → bin
      if (obj._trashItem && !obj._disposed && this.currentRoom === 2) {
        const dist = Phaser.Math.Distance.Between(
          obj.x, obj.y, this.r2_trashBin.x, this.r2_trashBin.y,
        );
        if (dist < 120) {
          obj._disposed = true;
          fxPoof(this, obj.x, obj.y, 4);
          this.audio.poof();
          this.audio.whoosh();
          obj.disableInteractive();
          this.tweens.add({
            targets: obj, alpha: 0, scaleX: 0, scaleY: 0,
            duration: 250, onComplete: () => obj.destroy(),
          });
          this.trashCount++;
          this.r2_trashLabel.setText(`${this.trashCount}/8`);

          if (this.trashCount >= 8) {
            const roomKey = SCENE.LIVING_ROOM;
            this.markTaskDone(roomKey, 'trash');
            // Trash reward: Prep +8, Diamonds +2
            store.addPrep(8);
            store.addDiamonds(2);
            this.r2_trashLabel.setText('✅');
            fxSparkle(this, this.r2_trashBin.x, this.r2_trashBin.y, 10, 50);
            this.trySpawnJollibabee(roomKey);
            this.showTaskComplete(roomKey);
          }
        }
      }

      // Clothes → basket
      if (obj._clothesItem && !obj._disposed && this.currentRoom === 5) {
        const dist = Phaser.Math.Distance.Between(
          obj.x, obj.y, this.r5_basket.x, this.r5_basket.y,
        );
        if (dist < 120) {
          obj._disposed = true;
          fxPoof(this, obj.x, obj.y, 4);
          this.audio.poof();
          this.audio.whoosh();
          obj.disableInteractive();
          this.tweens.add({
            targets: obj, alpha: 0, scaleX: 0, scaleY: 0,
            duration: 250, onComplete: () => obj.destroy(),
          });
          this.laundryCount++;

          if (this.laundryCount >= 10) {
            const roomKey = SCENE.BATHROOM;
            this.markTaskDone(roomKey, 'laundry');
            // Laundry reward: Prep +8, Energy -5
            store.addPrep(8);
            store.addEnergy(-5);
            fxSparkle(this, this.r5_basket.x, this.r5_basket.y, 10, 50);
            this.showChrisBubble('Laundry in the basket! But there\'s more to do...');
            // Show clothes + hangers props for folding task
            const foldProps = (this as any)._r5_foldProps;
            if (foldProps) {
              foldProps.clothes.setVisible(true);
              foldProps.hangers.setVisible(true);
            }
          }
        }
      }
    });
  }

  // ═══════════════════════════════════════════════════════
  //  SHARED POPUPS
  // ═══════════════════════════════════════════════════════

  private showTemptationPig(): void {
    if (this.modal.isOpen || this.endingActive) return;
    if (this.temptationCallCount >= 2) return;  // max 2 per game
    if (!canShowPopup('temptation')) return;
    markPopupShown('temptation');
    this.temptationCallCount++;
    this.audio.pigAlert();

    // Incoming Call modal with 15s countdown — plenty of time to think
    // BLOCK = +1 heart (reward for resisting)
    // IGNORE = -1 heart (penalty but not fatal)
    // ACCEPT = instant game over
    // Timeout = auto-ignore (loses a heart, not game over)
    let countdownActive = true;
    let countdownTimer: Phaser.Time.TimerEvent | undefined;
    let countdownText: Phaser.GameObjects.Text | undefined;
    let remaining = 20;

    const doIgnore = () => {
      if (!countdownActive) return;
      countdownActive = false;
      if (countdownTimer) countdownTimer.destroy();
      if (countdownText) countdownText.destroy();
      this.modal.close();
      store.removeHeart(1);
      store.addIntegrity(-3);
      this.hud.refresh();
      fxOuchFlicker(this);
      this.audio.thunk();
      this.showChrisBubble('Ignored the call... but it lingers. -1 ❤️');
      this.checkGameOver();
    };

    this.modal.show({
      title: '📞 Incoming Call',
      body: 'Forest Girl 💋 is calling...\nWhat will you do?',
      imageKey: 'temptation_pig',
      imageHeight: 140,
      height: 620,
      buttons: [
        {
          label: '🛡️ BLOCK',
          callback: () => {
            countdownActive = false;
            if (countdownTimer) countdownTimer.destroy();
            if (countdownText) countdownText.destroy();
            // Block: +1 Heart, Integrity +3, Prep +3, Diamonds +1
            store.addHeart(1);
            store.addIntegrity(3);
            store.addPrep(3);
            store.addDiamonds(1);
            this.hud.refresh();
            fxSparkle(this, this.chris.x, this.chris.y - 40, 8);
            this.showChrisBubble('🛡️ Blocked! +1 ❤️ +3 Prep, +1 💎');
            this.jbReactToEvent('block');
          },
          color: 0x336633,
        },
        {
          label: '🙈 IGNORE',
          callback: () => {
            doIgnore();
          },
          color: 0x666633,
        },
        {
          label: '😈 ACCEPT',
          callback: () => {
            countdownActive = false;
            if (countdownTimer) countdownTimer.destroy();
            if (countdownText) countdownText.destroy();
            // Accept: instant GAME OVER
            store.s.hearts = 0;
            this.hud.refresh();
            fxOuchFlicker(this);
            this.audio.heartLose();
            this.showChrisBubble('😈 You gave in...');
            this.checkGameOver();
          },
          color: 0x993333,
        },
      ],
    });

    // Countdown text overlay (updates every second)
    countdownText = this.add.text(DESIGN_W / 2, 100, `⏱️ ${remaining}s`, {
      fontFamily: PIXEL_FONT, fontSize: '26px', color: '#FF6666',
      stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(1100).setScrollFactor(0);

    // Tick every second
    countdownTimer = this.time.addEvent({
      delay: 1000,
      repeat: 19,
      callback: () => {
        if (!countdownActive) return;
        remaining--;
        if (countdownText) countdownText.setText(`⏱️ ${remaining}s`);
        if (remaining <= 0) {
          // Timeout = auto-ignore (not game over)
          doIgnore();
        }
      },
    });
  }

  private showWhaleCoin(): void {
    if (this.modal.isOpen || this.endingActive) return;
    if (this.currentRoom !== 3) return;  // Office only — crypto bro territory
    this.audio.whaleCoin();

    // Pre-roll the 50/50 result so we can reveal it on ignore too
    const wouldWin = Math.random() < 0.5;

    this.modal.show({
      title: '🐋 WHALE COIN',
      body: `WHALE COIN 🐋 To the moon?\nTrust the forest bro. 50/50!\n\nYou have ${store.s.diamonds} 💎. Invest or walk away?`,
      buttons: [
        {
          label: '💰 Invest',
          callback: () => {
            // Need at least 1 diamond to invest
            if (store.s.diamonds <= 0) {
              this.showChrisBubble('I\'m broke! No 💎 to invest...');
              this.audio.popupClose();
              return;
            }
            if (wouldWin) {
              // Win: Diamonds +15
              store.addDiamonds(15);
              store.recordWhaleCoinWin();
              this.hud.refresh();
              fxSparkle(this, this.chris.x, this.chris.y, 12, 70);
              this.audio.heartGain();
              this.showChrisBubble('🚀 TO THE MOON! +15 💎!');
              this.jbReactToEvent('whale_win');
            } else {
              // Lose: Diamonds -8 (but never below 0)
              store.addDiamonds(-8);
              store.recordWhaleCoinLoss();
              this.hud.refresh();
              fxOuchFlicker(this);
              this.audio.heartLose();
              this.showChrisBubble('📉 It crashed... -8 💎');
              this.jbReactToEvent('whale_lose');
            }
          },
          color: 0x5c3a21,
        },
        {
          label: '❌ Ignore',
          callback: () => {
            // Nothing changes — but Chris sees what would have happened
            this.audio.popupClose();
            if (wouldWin) {
              this.showChrisBubble('You ignored it... it went to the moon. 🚀');
              this.time.delayedCall(2500, () => {
                this.showChrisBubble('Would have been +15 💎... oh well.');
              });
            } else {
              this.showChrisBubble('You ignored it... it crashed. 📉');
              this.time.delayedCall(2500, () => {
                this.showChrisBubble('Dodged a bullet! Smart move. 🧠');
              });
            }
          },
          color: 0x336633,
        },
      ],
    });
  }

  private showDoomScroll(): void {
    if (this.modal.isOpen || this.endingActive) return;
    this.audio.doomScrollOpen();
    this.r3_doomScrollCount++;

    // Too many phone opens = game over (5 total)
    if (this.r3_doomScrollCount >= 5) {
      this.triggerTimeWastedGameOver('Too much doom scrolling! You wasted all your time on the phone.');
      return;
    }

    // Pick a random phone screenshot (13-28)
    const photoNum = Phaser.Math.Between(13, 28);
    const photoKey = `doomscroll_${photoNum}`;
    const currentRoomWhenOpened = this.currentRoom;

    this.modal.show({
      title: '📱 Doom Scroll',
      body: 'You found a trending video...',
      imageKey: photoKey,
      imageHeight: 180,
      height: 580,
      buttons: [
        {
          label: '📱 Scroll More',
          callback: () => {
            // Scroll: Integrity -5, Timer -20s (heavy penalty)
            store.addIntegrity(-5);
            this.speedUpOvertimeTimer(20);
            // Check if timer is out after losing time
            if (this.roomOvertimeTimer && this.roomOvertimeTimer.getRemaining() <= 0) {
              this.triggerTimeWastedGameOver('Oops, not enough time to clean the house!');
              return;
            }
            this.hud.refresh();
            fxOuchFlicker(this);
            this.audio.heartLose();
            this.showChrisBubble('Can\'t stop scrolling... -5 Integrity 🕐-20s');
            this.time.delayedCall(2500, () => {
              this.bubbleMgr.jbSayRandom('Oops, not enough time to clean the house!', 3000);
            });
            this.jbReactToEvent('scroll');
            // Immediately show another doom scroll with a different photo
            this.time.delayedCall(500, () => {
              if (!this.endingActive && this.currentRoom === currentRoomWhenOpened) {
                this.showDoomScroll();
              }
            });
          },
          color: 0x993333,
        },
        {
          label: '✖ Close Phone',
          callback: () => {
            // Close: Integrity +1 but still loses time 🕐-10s
            store.addIntegrity(1);
            this.speedUpOvertimeTimer(10);
            // Check if timer is out after losing time
            if (this.roomOvertimeTimer && this.roomOvertimeTimer.getRemaining() <= 0) {
              this.triggerTimeWastedGameOver('Oops, not enough time to clean the house!');
              return;
            }
            this.hud.refresh();
            this.audio.popupClose();
            this.showChrisBubble('Put it down... but lost time. +1 Integrity, 🕐-10s');
            this.jbReactToEvent('close_phone');
          },
          color: 0x336633,
        },
      ],
    });
  }

  private showDarmeshCall(): void {
    if (this.endingActive || this.gameOverTriggered) return;
    // If a modal is already open, retry in a few seconds
    if (this.modal.isOpen) {
      this.time.delayedCall(3000, () => this.showDarmeshCall());
      return;
    }
    this.bubbleMgr.onDarmeshCallStart();
    this.audio.popupOpen();

    const darmeshLines = [
      'Darmesh: "Bro, you still working? Get back to it!"',
      'Darmesh: "Focus bro! Babitee is counting on you."',
      'Darmesh: "Stop messing around, finish the house!"',
      'Darmesh: "You got this bro. Now go clean something."',
      'Darmesh: "Real men do dishes. Get to work."',
    ];
    const line = darmeshLines[Phaser.Math.Between(0, darmeshLines.length - 1)];

    this.modal.show({
      title: '📞 Darmesh Calling',
      body: `It's Darmesh! Take the call?\n\n${this.r3_darmeshAnswered ? '"Bro, I called you already..."' : ''}`,
      buttons: [
        {
          label: '📞 Take Call',
          callback: () => {
            this.r3_darmeshAnswered = true;
            this.bubbleMgr.onDarmeshCallEnd();
            // Take: Energy -10, Integrity +3, Preparation +3
            store.addEnergy(-10);
            store.addIntegrity(3);
            store.addPrep(3);
            this.hud.refresh();
            this.showChrisBubble(line);
            // Darmesh motivates — small energy boost after chat
            this.time.delayedCall(2000, () => {
              this.showChrisBubble('Alright Darmesh, back to work! 💪');
            });
            // Clear any pending recall timer
            if (this.darmeshRecallTimer) {
              this.darmeshRecallTimer.destroy();
              this.darmeshRecallTimer = undefined;
            }
          },
          color: 0x336633,
        },
        {
          label: '🙅 Ignore',
          callback: () => {
            this.r3_darmeshIgnoreCount++;
            // Ignore: Integrity -5
            store.addIntegrity(-5);
            this.hud.refresh();
            this.showChrisBubble('Sorry Darmesh...');
            // Darmesh calls back once if ignored the first time, then gives up
            if (this.r3_darmeshIgnoreCount < 2) {
              if (this.darmeshRecallTimer) this.darmeshRecallTimer.destroy();
              this.darmeshRecallTimer = this.time.delayedCall(
                Phaser.Math.Between(18000, 30000),
                () => {
                  if (!this.endingActive && !this.gameOverTriggered) {
                    this.showDarmeshCall();
                  }
                },
              );
            } else {
              // Darmesh gives up
              this.r3_darmeshAnswered = true;
              this.time.delayedCall(1500, () => {
                this.showChrisBubble('Darmesh stopped calling...');
              });
            }
          },
          color: 0x993333,
        },
      ],
    });
  }

  // ─── DARMESH WORK RESET ────────────────────────────────

  /** After work is done, Darmesh calls back in 10-18s to assign more work.
   *  Keeps retrying every 8s until the modal actually shows. */
  private scheduleDarmeshWorkReset(): void {
    if (this.darmeshRecallTimer) this.darmeshRecallTimer.destroy();
    this.darmeshRecallTimer = this.time.delayedCall(
      Phaser.Math.Between(10000, 18000),
      () => {
        if (this.endingActive || this.gameOverTriggered) return;
        this.showDarmeshWorkReset();
      },
    );
  }

  private showDarmeshWorkReset(): void {
    if (this.endingActive || this.gameOverTriggered) return;
    // If a modal is already open, retry in a few seconds
    if (this.modal.isOpen) {
      this.time.delayedCall(3000, () => this.showDarmeshWorkReset());
      return;
    }
    this.audio.popupOpen();

    const roomKey = SCENE.OFFICE;
    this.modal.show({
      title: '📞 Darmesh Calling',
      body: 'Darmesh: "Great job bro! But there\'s more work. Back to the desk!"',
      buttons: [
        {
          label: '💪 On it!',
          callback: () => {
            // Reset the work quest
            store.resetTask(roomKey, 'work');
            this.workCount = 0;
            this.r3_progressText.setText('0/6');
            this.r3_deskZone.setStrokeStyle(2, PAL.gold, 0.3);
            this.updateWorkProgressBar();
            this.hud.refresh();
            this.showChrisBubble('More work from Darmesh... here we go again! 💼');
            // Stat boost for accepting
            store.addIntegrity(2);
            store.addPrep(2);
            this.hud.refresh();
          },
          color: 0x336633,
        },
        {
          label: '😴 Later...',
          callback: () => {
            // Still resets, but with a penalty
            store.resetTask(roomKey, 'work');
            this.workCount = 0;
            this.r3_progressText.setText('0/6');
            this.r3_deskZone.setStrokeStyle(2, PAL.gold, 0.3);
            this.updateWorkProgressBar();
            this.hud.refresh();
            store.addIntegrity(-3);
            this.hud.refresh();
            this.showChrisBubble('I\'ll get to it eventually...');
          },
          color: 0x993333,
        },
      ],
    });
  }

  // ═══════════════════════════════════════════════════════
  //  TASK HELPERS
  // ═══════════════════════════════════════════════════════

  private markTaskDone(roomKey: string, taskId: string): void {
    store.completeTask(roomKey, taskId);
    // Completing any task boosts confidence
    store.addIntegrity(3);
    this.hud.refresh();
    this.audio.taskComplete();

    // Fatigue: every 3 tasks completed = lose 1 heart
    this.totalTasksCompleted++;
    if (this.totalTasksCompleted % 3 === 0) {
      store.removeHeart(1);
      this.hud.refresh();
      fxOuchFlicker(this);
      this.audio.heartLose();
      this.bubbleMgr.chrisSay('Getting tired... -1 ❤️', 2500);
      this.time.delayedCall(800, () => {
        this.bubbleMgr.jbSayRandom('Dadibee, are you okay?', 2500);
      });
      this.checkLowHeart();
      this.checkGameOver();
    }
  }

  /** Check if integrity dropped below a 20-point threshold → lose a heart */
  private checkIntegrityChunkLoss(): void {
    const threshold = Math.floor(store.s.integrity / 20);  // 0..5
    if (threshold < this.lastIntegrityThreshold) {
      // Dropped a chunk — lose 1 heart
      store.removeHeart(1);
      this.hud.refresh();
      fxOuchFlicker(this);
      this.audio.heartLose();
      this.bubbleMgr.chrisSay('Confidence dropping... -1 ❤️', 2500);
      this.checkLowHeart();
      this.checkGameOver();
    }
    this.lastIntegrityThreshold = threshold;
  }

  private trySpawnJollibabee(roomKey: string): void {
    const map = ROOM_JOLLIBABEE_MAP[roomKey];
    if (!map) return;
    for (const jbIdx of map) {
      if (!store.foundJollibabee(jbIdx)) {
        this.followers.spawnNewJollibabee(jbIdx);
        this.audio.jollibabeeFound();
        this.showJollibabeeFoundPopup(jbIdx);
        break; // one at a time
      }
    }
  }

  /** Show a popup announcing a newly found jollibabee */
  private showJollibabeeFoundPopup(jbIdx: number): void {
    const def = JOLLIBABEES[jbIdx];
    if (!def) return;

    // Pick the correct image per user spec:
    // JolliBig → jollibig_sit, JolliBurrito → jolliburrito_front, others → jollibig_stand
    let imageKey = 'jollibig_stand';
    if (def.name === 'JolliBig') imageKey = 'jollibig_sit';
    else if (def.name === 'JolliBurrito') imageKey = 'jolliburrito_front';

    this.modal.show({
      title: 'A Jollibabee was found!',
      body: def.name,
      imageKey,
      imageHeight: 200,
      buttons: [
        { label: 'Yay! 🎉', callback: () => {}, style: 'success' },
      ],
    });
  }

  /** Room-specific task completion messages */
  private getTaskDoneMessage(roomKey: string): string {
    const messages: Record<string, string[]> = {
      [SCENE.KITCHEN_SINK]: ['Kitchen is spotless! ✨', 'Dishes done! Babitee will be happy.'],
      [SCENE.LIVING_ROOM]:  ['Living room looks great!', 'No more mess in here! 🧹'],
      [SCENE.OFFICE]:       ['Work is done! Time to move on.', 'Desk cleared! 💼'],
      [SCENE.BEDROOM]:      ['Feeling rested! 💤', 'Energy restored. Let\'s go!'],
      [SCENE.BATHROOM]:     ['Laundry done! Fresh and clean! 🧺', 'Bathroom is tidy!'],
      [SCENE.BALCONY]:      ['Bonsai looks beautiful! 🌱', 'Garden is watered! 💧'],
    };
    const lines = messages[roomKey] ?? ['Done here!'];
    return lines[Math.floor(Math.random() * lines.length)];
  }

  private showTaskComplete(roomKey: string): void {
    this.showChrisBubble(this.getTaskDoneMessage(roomKey));
    this.jbReactToEvent('task_done');
    if (store.isRoomComplete(roomKey)) {
      // Room completion bonus: +2 diamonds
      store.addDiamonds(2);
      this.hud.refresh();
      if (this.followers.chris) {
        fxSparkle(this, this.followers.chris.x, this.followers.chris.y - 40, 14, 80);
      }
      // Stop overtime timer — room is complete, no more penalties
      if (this.roomOvertimeTimer) {
        this.roomOvertimeTimer.destroy();
        this.roomOvertimeTimer = undefined;
      }
    }
  }

  private showChrisBubble(text: string): void {
    if (this.chris) {
      this.bubbleMgr.chrisSay(text, 3000);
    }
  }

  /** Shared gating for consumables: allow when heart or energy is low, block + cooldown when both full.
   *  Override: if hearts < 3, always allow (skip cooldown) so player can heal. */
  private canConsume(): boolean {
    // If hearts are low, override cooldown — let the player heal
    if (store.s.hearts < 3) return true;
    // 20s cooldown between any drinks
    if (Date.now() - this.lastDrinkTime < 20000) {
      this.showChrisBubble('Easy... let that one settle first.');
      return false;
    }
    // Block only when BOTH hearts AND energy are full
    if (store.s.energy >= 100 && store.s.hearts >= 3) {
      this.showChrisBubble('I\'m full on energy and hearts right now.');
      return false;
    }
    return true;
  }

  /** Swap Chris's texture to a consume animation for 3.5s, then revert.
   *  Uses sizeH to keep same proportional height as default Chris. */
  private isConsuming = false;
  private playConsumeAnimation(textureKey: string): void {
    if (this.isConsuming || !this.chris) return;
    this.isConsuming = true;
    const originalTexture = this.chris.texture.key;
    this.chris.setTexture(textureKey);
    sizeH(this.chris, CHRIS_H);
    this.time.delayedCall(3500, () => {
      if (this.chris && !this.gameOverTriggered) {
        this.chris.setTexture(originalTexture);
        sizeH(this.chris, CHRIS_H);
      }
      this.isConsuming = false;
    });
  }

  /** Check hearts and show warning if low */
  private checkLowHeart(): void {
    if (store.s.hearts <= 1 && store.s.hearts > 0 && !this.endingActive) {
      // Visual warning: red flash on HUD
      fxOuchFlicker(this);
      // Jollibabee warns Chris
      const warnings = [
        'Dadibee, be careful!',
        'Dadibee, you\'re hurt!',
        'Don\'t give up, Dadibee!',
        'Dadibee, focus! ❤️',
      ];
      this.time.delayedCall(500, () => {
        this.bubbleMgr.jbSayRandom(
          warnings[Math.floor(Math.random() * warnings.length)], 3000,
        );
      });
    }
  }

  /** Jollibabee reacts contextually after events */
  private jbReactToEvent(event: 'block' | 'scroll' | 'close_phone' | 'whale_win' | 'whale_lose' | 'task_done'): void {
    if (store.s.jollibabeesFound.length === 0) return;
    const reactions: Record<string, string[]> = {
      block: ['That\'s right, Dadibee!', 'Good job blocking!', 'Dadibee, focus!'],
      scroll: ['Dadibee, stop scrolling!', 'Put the phone down!', 'IYKYK...'],
      close_phone: ['Good choice!', 'That\'s right!', 'Yeah, that\'s right!'],
      whale_win: ['To the moon!', 'Dadibee is rich!', 'Oooh what\'s that?'],
      whale_lose: ['Oh no...', 'It\'s not that haard', 'I mean..'],
      task_done: ['Yay Dadibee!', 'That\'s right!', 'Dadibee we want honey!'],
    };
    const lines = reactions[event];
    if (!lines) return;
    this.time.delayedCall(800, () => {
      this.bubbleMgr.jbSayRandom(
        lines[Math.floor(Math.random() * lines.length)], 2500,
      );
    });
  }

  // ═══════════════════════════════════════════════════════
  //  GAME OVER
  // ═══════════════════════════════════════════════════════

  private checkGameOver(): void {
    if (store.s.hearts > 0 || this.gameOverTriggered) return;
    this.gameOverTriggered = true;
    this.audio.gameOver();
    this.audio.heartLose();
    this.audio.stopAmbient();

    const blocker = this.add.rectangle(
      DESIGN_W / 2, DESIGN_H / 2, DESIGN_W, DESIGN_H, 0x000000, 0.85,
    ).setDepth(950).setInteractive().setScrollFactor(0);

    this.add.text(DESIGN_W / 2, DESIGN_H / 2 - 100, 'GAME OVER', {
      fontFamily: PIXEL_FONT, fontSize: '56px', color: '#FF4444',
      stroke: '#000000', strokeThickness: 8,
    }).setOrigin(0.5).setDepth(960).setScrollFactor(0);

    this.add.text(DESIGN_W / 2, DESIGN_H / 2 - 10, 'You ran out of hearts!', {
      fontFamily: PIXEL_FONT, fontSize: '22px', color: PAL_CSS.ivory,
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(960).setScrollFactor(0);

    const retryBg = this.add.rectangle(
      DESIGN_W / 2, DESIGN_H / 2 + 100, UI.btnW, UI.btnH, PAL.wood,
    ).setStrokeStyle(3, PAL.darkWood)
      .setInteractive({ useHandCursor: true })
      .setDepth(960).setScrollFactor(0);

    this.add.text(DESIGN_W / 2, DESIGN_H / 2 + 100, '🔄 Try Again', {
      fontFamily: PIXEL_FONT, fontSize: '24px', color: PAL_CSS.gold,
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(961).setScrollFactor(0);

    retryBg.on('pointerdown', () => {
      store.reset();
      this.scene.start(SCENE.INTRO);
    });
  }

  /** Game over triggered by wasting too much time (sleep 3x or exercise 3x) */
  private triggerTimeWastedGameOver(reason: string): void {
    if (this.gameOverTriggered) return;
    this.gameOverTriggered = true;
    this.audio.gameOver();
    this.audio.stopAmbient();
    this.audio.stopGameplayMusic();

    const blocker = this.add.rectangle(
      DESIGN_W / 2, DESIGN_H / 2, DESIGN_W, DESIGN_H, 0x000000, 0.85,
    ).setDepth(950).setInteractive().setScrollFactor(0);

    this.add.text(DESIGN_W / 2, DESIGN_H / 2 - 100, 'GAME OVER', {
      fontFamily: PIXEL_FONT, fontSize: '56px', color: '#FF4444',
      stroke: '#000000', strokeThickness: 8,
    }).setOrigin(0.5).setDepth(960).setScrollFactor(0);

    this.add.text(DESIGN_W / 2, DESIGN_H / 2 - 10, reason, {
      fontFamily: PIXEL_FONT, fontSize: '20px', color: PAL_CSS.ivory,
      stroke: '#000000', strokeThickness: 4,
      wordWrap: { width: 700 },
      align: 'center',
    }).setOrigin(0.5).setDepth(960).setScrollFactor(0);

    const retryBg = this.add.rectangle(
      DESIGN_W / 2, DESIGN_H / 2 + 100, UI.btnW, UI.btnH, PAL.wood,
    ).setStrokeStyle(3, PAL.darkWood)
      .setInteractive({ useHandCursor: true })
      .setDepth(960).setScrollFactor(0);

    this.add.text(DESIGN_W / 2, DESIGN_H / 2 + 100, '🔄 Try Again', {
      fontFamily: PIXEL_FONT, fontSize: '24px', color: PAL_CSS.gold,
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(961).setScrollFactor(0);

    retryBg.on('pointerdown', () => {
      store.reset();
      this.scene.start(SCENE.INTRO);
    });
  }

  // ═══════════════════════════════════════════════════════
  //  ENDING SEQUENCE
  // ═══════════════════════════════════════════════════════

  private async startEndingSequence(): Promise<void> {
    this.endingActive = true;
    this.audio.stopAmbient();
    this.audio.stopGameplayMusic();
    this.audio.playEndingMusic();

    // Stop movement
    const body = this.chris.body as Phaser.Physics.Arcade.Body;
    body?.setVelocityX(0);

    // Hide UI elements
    this.followers.hide();
    this.r7_doorLabel.setVisible(false);
    this.r7_doorZone.setVisible(false);

    // Reset camera for ending cutscene
    this.cameras.main.stopFollow();
    this.cameras.main.fadeOut(400, 0, 0, 0);
    await this.waitForEvent('camerafadeoutcomplete');

    // Clear everything
    this.children.removeAll(true);

    // Reset camera to single screen (remove zoom for ending cinematic)
    this.cameras.main.setBounds(0, 0, DESIGN_W, DESIGN_H);
    this.cameras.main.setScroll(0, 0);
    this.cameras.main.setZoom(1);
    this.cameras.main.stopFollow();

    // ── Mamibee appears ──────────────────────────────────
    this.add.image(DESIGN_W / 2, DESIGN_H / 2, 'exit_door_room_bg')
      .setDisplaySize(DESIGN_W, DESIGN_H).setDepth(0);

    // "1 inch above the floor" — lift characters ~40px from absolute bottom
    const ENDING_FLOOR = FLOOR_Y - 40;
    const mamibee = this.add.image(DESIGN_W / 2, ENDING_FLOOR, 'mamibee_left_shock')
      .setOrigin(0.5, 1).setDepth(10);
    sizeH(mamibee, MAMIBEE_H);

    // Spawn jollibabees in this scene
    this.spawnEndingJollibabees(ENDING_FLOOR);

    this.cameras.main.fadeIn(400, 0, 0, 0);
    await this.delay(600);

    fxSparkle(this, mamibee.x, mamibee.y - MAMIBEE_H / 2, 16, 90);
    this.audio.endingChime();

    showBubble(this, mamibee.x - 160, mamibee.y - MAMIBEE_H - 20, 'Mamibee!', 2500);
    await this.delay(2800);

    showBubble(this, mamibee.x, mamibee.y - MAMIBEE_H - 60, 'Wow! Thank you so much!', 3000);
    await this.delay(3500);

    // ── Room tour (backward) ─────────────────────────────
    for (let i = 0; i < TOUR_ROOMS.length; i++) {
      const roomKey = TOUR_ROOMS[i];
      // Use original bedroom bg for ending tour
      const bgKey = roomKey === SCENE.BEDROOM ? 'bedroom_bg_original' : (SCENE_TO_BG[roomKey] ?? 'exit_door_room_bg');

      this.cameras.main.fadeOut(300, 0, 0, 0);
      await this.waitForEvent('camerafadeoutcomplete');

      this.children.removeAll(true);
      this.add.image(DESIGN_W / 2, DESIGN_H / 2, bgKey)
        .setDisplaySize(DESIGN_W, DESIGN_H).setDepth(0);

      const TOUR_FLOOR = FLOOR_Y - 40;
      const chrisImg = this.add.image(DESIGN_W / 2 - 80, TOUR_FLOOR, 'chris_right')
        .setOrigin(0.5, 1).setDepth(10);
      sizeH(chrisImg, CHRIS_H);
      const mamiTour = this.add.image(DESIGN_W / 2 + 120, TOUR_FLOOR, 'mamibee_left')
        .setOrigin(0.5, 1).setDepth(10);
      sizeH(mamiTour, MAMIBEE_H);

      // Jollibabees trailing behind Chris during tour
      this.spawnEndingJollibabees(TOUR_FLOOR, chrisImg.x);

      this.cameras.main.fadeIn(300, 0, 0, 0);
      await this.delay(500);

      fxShimmer(this, DESIGN_W / 2, DESIGN_H / 2, 10, 100);
      const tourLines: Record<string, string> = {
        [SCENE.BALCONY]:      'The bonsai looks beautiful! 🌱',
        [SCENE.BATHROOM]:     'Fresh laundry, all folded! 🧺',
        [SCENE.BEDROOM]:      'Bed is made, well rested! 💤',
        [SCENE.OFFICE]:       'Work is all done! 💼',
        [SCENE.LIVING_ROOM]:  'Living room is spotless! 🧹',
        [SCENE.KITCHEN_STOVE]:'Kitchen smells amazing! ✨',
        [SCENE.KITCHEN_SINK]: 'Dishes are sparkling clean! 🍽️',
      };
      const tourMsg = tourLines[roomKey] ?? 'This room is clean!';
      showBubble(this, chrisImg.x, chrisImg.y - CHRIS_H - 30, tourMsg, 2500);
      await this.delay(3000);

      // Last room → final scene
      if (i === TOUR_ROOMS.length - 1) {
        this.cameras.main.fadeOut(300, 0, 0, 0);
        await this.waitForEvent('camerafadeoutcomplete');
        this.children.removeAll(true);
        this.showFinalScene(bgKey);
        return;
      }
    }
  }

  private showFinalScene(lastBgKey: string): void {
    this.add.image(DESIGN_W / 2, DESIGN_H / 2, lastBgKey)
      .setDisplaySize(DESIGN_W, DESIGN_H).setDepth(0);

    const FINAL_FLOOR = FLOOR_Y - 40;
    const together = this.add.image(DESIGN_W / 2, FINAL_FLOOR, 'together')
      .setOrigin(0.5, 1).setDepth(10);
    sizeH(together, TOGETHER_H);

    // Jollibabees around the couple in the final scene
    this.spawnEndingJollibabees(FINAL_FLOOR);

    this.cameras.main.fadeIn(400, 0, 0, 0);

    this.time.delayedCall(800, () => {
      showBubble(this, together.x + 80, together.y - TOGETHER_H - 20,
        'Thank you, Babitee!\nI love you! Let\'s eat!', 4000);
    });

    this.time.delayedCall(3500, () => {
      const food = this.add.image(DESIGN_W / 2, DESIGN_H - 180, 'food_bag')
        .setDepth(15).setAlpha(0).setScale(0.5);
      sizeH(food, PROP_FOOD);
      const finalScaleX = food.scaleX;
      const finalScaleY = food.scaleY;
      food.setScale(finalScaleX * 0.5, finalScaleY * 0.5);
      // Pop-in with scale + fade + sparkle + SFX
      this.tweens.add({
        targets: food,
        alpha: 1,
        scaleX: finalScaleX,
        scaleY: finalScaleY,
        duration: 500,
        ease: 'Back.easeOut',
        onComplete: () => {
          fxSparkle(this, food.x, food.y, 16, 80);
          fxPop(this, food.x, food.y, 1.2);
          this.audio.taskComplete();
        },
      });
    });

    this.time.delayedCall(6000, () => this.showEndScreen());
  }

  private showEndScreen(): void {
    this.add.rectangle(DESIGN_W / 2, DESIGN_H / 2, DESIGN_W, DESIGN_H, 0x000000, 0.7)
      .setDepth(800);

    this.add.text(DESIGN_W / 2, DESIGN_H / 2 - 100,
      '❤️  Thank you for playing  ❤️', {
        ...TEXT.title,
      }).setOrigin(0.5).setDepth(810);

    const s = store.s;
    // Determine ending message based on integrity
    let endMsg = '';
    if (s.integrity < 40) {
      endMsg = 'The forest needs steadier roots.';
    } else if (s.integrity <= 70) {
      endMsg = "You're growing.";
    } else if (s.integrity > 70 && s.hasRing) {
      endMsg = "You didn't just prepare. You chose us.";
    } else {
      endMsg = "You're growing strong.";
    }

    this.add.text(DESIGN_W / 2, DESIGN_H / 2 - 40, endMsg, {
      ...TEXT.body, align: 'center', fontSize: '22px',
      color: PAL_CSS.warmGold,
    }).setOrigin(0.5).setDepth(810);

    this.add.text(DESIGN_W / 2, DESIGN_H / 2 + 30,
      `Hearts: ${s.hearts}  |  Prep: ${s.preparation}  |  Integrity: ${s.integrity}\n` +
      `Energy: ${s.energy}  |  Diamonds: ${s.diamonds}\n` +
      `Jollibabees: ${s.jollibabeesFound.length}/6\n` +
      `Whale Wins: ${s.whaleCoinWins}  |  Whale Losses: ${s.whaleCoinLosses}`, {
        ...TEXT.body, align: 'center', fontSize: '16px',
      }).setOrigin(0.5).setDepth(810);

    const rbW = UI.btnW;
    const rbH = UI.btnH;
    const rby = DESIGN_H / 2 + 140;
    const rbGfx = this.add.graphics().setDepth(810);
    drawPlaque(rbGfx, DESIGN_W / 2 - rbW / 2, rby - rbH / 2, rbW, rbH);
    const btnBg = this.add.rectangle(DESIGN_W / 2, rby, rbW, rbH, 0x000000, 0)
      .setInteractive({ useHandCursor: true }).setDepth(810);
    this.add.text(DESIGN_W / 2, rby, '🔄 Play Again', {
      ...TEXT.button, color: PAL_CSS.gold,
    }).setOrigin(0.5).setDepth(811);

    btnBg.on('pointerdown', () => {
      store.reset();
      this.scene.start(SCENE.INTRO);
    });
  }

  // ═══════════════════════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════════════════════

  private waitForEvent(event: string): Promise<void> {
    return new Promise(resolve => {
      this.cameras.main.once(event, () => resolve());
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => {
      this.time.delayedCall(ms, () => resolve());
    });
  }

  /** Spawn all found jollibabees in a row for ending/tour scenes.
   *  centreX defaults to DESIGN_W / 2. They spread out evenly. */
  private spawnEndingJollibabees(floorY: number, centreX = DESIGN_W / 2): void {
    const found = store.s.jollibabeesFound;
    if (found.length === 0) return;

    const spacing = 70;
    const totalW = (found.length - 1) * spacing;
    const startX = centreX - totalW / 2;

    found.forEach((jbIdx, i) => {
      const def = JOLLIBABEES[jbIdx];
      if (!def) return;

      const x = startX + i * spacing;
      const y = floorY + (def.hover ? -30 : 0);

      const img = this.add.image(x, y, def.assetKey)
        .setOrigin(0.5, 1).setDepth(9);
      sizeH(img, def.height * 0.8); // slightly smaller so they don't overpower the scene

      // Hover bob for JolliBurrito
      if (def.hover) {
        this.tweens.add({
          targets: img, y: y - 8,
          duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
      }
    });
  }
}
