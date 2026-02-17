import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PALETTE, PALETTE_CSS, SCENES } from '../config';
import { store } from '../store/GameStore';
// Range of doom scroll photo asset filenames
const DOOM_SCROLL_PHOTO_RANGE = { min: 13, max: 28 };
import { getLevelDef, LevelDef } from '../levels/levelDefs';
import { applyLevelResult } from '../store/reducers/applyLevelResult';
import { applyDarmeshChoice, DarmeshChoice } from '../store/reducers/applyDarmeshChoice';
import { rng } from '../rng';
import { HUD } from '../ui/HUD';
import { JollibabeeSpeechSystem } from '../ui/JollibabeeSpeech';
import { LEVEL_TO_ROOM } from './WorldMapScene';
import { AudioManager } from '../audio/AudioManager';
import { applyDoomScroll, DoomScrollChoice } from '../store/reducers/applyDoomScroll';
import { applyWhaleCoin, WhaleCoinChoice } from '../store/reducers/applyWhaleCoin';
import { applyForestPig } from '../store/reducers/applyForestPig';

export class LevelScene extends Phaser.Scene {
  private levelDef!: LevelDef;
  private timerSeconds = 0;
  private timerEvent?: Phaser.Time.TimerEvent;
  private objectiveProgress = 0;
  private progressText!: Phaser.GameObjects.Text;
  private completed = false;
  private modalActive = false;
  private modalContainer?: Phaser.GameObjects.Container;
  private whaleUsedThisLevel = false;

  private hud!: HUD;
  private jollibabees!: JollibabeeSpeechSystem;
  private audio!: AudioManager;

  // Hazard scheduling
  private temptationCallsPending = 0;
  private doomScrollPending = false;
  private darmeshPending = false;
  private whalePending = false;
  private gameOverReason = '';
  private laundryPhaseText?: Phaser.GameObjects.Text;

  // Drink use counters (max 2 each, reset per level)
  private drinkUses: Record<string, number> = {};
  private drinkCooldown = false;

  constructor() {
    super(SCENES.LEVEL);
  }

  init(data: { levelId: number }): void {
    const def = getLevelDef(data.levelId);
    if (!def) throw new Error(`Unknown level ${data.levelId}`);
    this.levelDef = def;
    this.timerSeconds = def.timerSeconds;
    this.objectiveProgress = 0;
    this.completed = false;
    this.modalActive = false;
    this.whaleUsedThisLevel = false;
    this.gameOverReason = '';
    this.laundryPhaseText = undefined;
    this.drinkUses = {};
    this.drinkCooldown = false;

    this.temptationCallsPending = def.hazards.pigAvoidCount;
    this.doomScrollPending = def.hazards.doomScroll;
    this.darmeshPending = def.hazards.darmeshCall;
    this.whalePending = def.hazards.whaleCoinPolicy === 'forced' ||
      (def.hazards.whaleCoinPolicy === 'chance' && rng.chance(0.3));
  }

  create(): void {
    this.cameras.main.setBackgroundColor(PALETTE.forest1);
    this.cameras.main.fadeIn(300, 0x1f, 0x3b, 0x2c);
    this.audio = new AudioManager(this);
    this.audio.levelStart();

    // Dust particles
    this.addDustParticles();

    // HUD with timer
    this.hud = new HUD(this);
    this.hud.create(true);

    // Level title panel
    this.add.rectangle(GAME_WIDTH / 2, 80, 350, 36, PALETTE.wood1, 0.8)
      .setStrokeStyle(1, PALETTE.wood2);
    this.add.text(GAME_WIDTH / 2, 80, `L${this.levelDef.id}: ${this.levelDef.title}`, {
      fontSize: '22px', fontFamily: 'monospace', color: PALETTE_CSS.ivory,
    }).setOrigin(0.5);

    // Objective description
    this.add.text(GAME_WIDTH / 2, 115, this.levelDef.objective.description, {
      fontSize: '15px', fontFamily: 'monospace', color: PALETTE_CSS.champagne,
    }).setOrigin(0.5);

    // Progress indicator
    this.progressText = this.add.text(GAME_WIDTH / 2, 140, '', {
      fontSize: '14px', fontFamily: 'monospace', color: PALETTE_CSS.ivory,
    }).setOrigin(0.5);


    // Objective interaction area
    this.createObjectiveUI();

    // Level 1: show a hint bubble that fades after first tap
    if (this.levelDef.id === 1) {
      const hint = this.add.text(GAME_WIDTH / 2, 180,
        'Tap the dishes to clean them!', {
        fontSize: '16px', fontFamily: 'monospace', color: PALETTE_CSS.ivory,
        backgroundColor: '#5c3a21', padding: { x: 10, y: 6 },
      }).setOrigin(0.5).setDepth(50);
      // Fade out after 4 seconds
      this.time.delayedCall(4000, () => {
        this.tweens.add({ targets: hint, alpha: 0, duration: 600, onComplete: () => hint.destroy() });
      });
    }

    // Kitchen drinks — each gives Hearts +1 + Energy +10, usable 2x per level
    this.createKitchenDrinks();

    // Jollibabees
    this.jollibabees = new JollibabeeSpeechSystem(this);
    this.jollibabees.create(GAME_HEIGHT - 30);

    // Start countdown
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: this.onTick,
      callbackScope: this,
      loop: true,
    });

    // Schedule hazards
    this.scheduleHazards();
    this.updateUI();

    // Dev hotkeys
    // Dev hotkeys (guard for Vite env)
    if ((import.meta as any).env?.DEV) {
      this.input.keyboard?.on('keydown-T', () => this.triggerTemptationCall());
      this.input.keyboard?.on('keydown-W', () => this.triggerWhale());
    }
  }

  // ─── TIMER ───────────────────────────────────────────────

  private onTick(): void {
    if (this.completed || this.modalActive) return;
    this.timerSeconds--;
    this.updateUI();
    if (this.timerSeconds <= 0) {
      this.gameOverReason = "Time's up!";
      this.gameOver();
    }
  }

  private adjustTimer(delta: number): void {
    this.timerSeconds = Math.max(0, this.timerSeconds + delta);
    this.updateUI();
    // Don't trigger gameOver here — the caller (modal handler) should
    // close the modal first, then check via checkTimerDeath().
  }

  /** Call after closing a modal that may have reduced the timer */
  private checkTimerDeath(): void {
    if (this.timerSeconds <= 0 && !this.completed) {
      this.gameOverReason = "Time's up!";
      this.gameOver();
    }
  }

  // ─── OBJECTIVE UI ────────────────────────────────────────

  private createObjectiveUI(): void {
    const count = this.levelDef.objective.count;
    const type = this.levelDef.objective.type;

    if (type === 'tapCount' || type === 'closePopups') {
      const cols = Math.min(count, 4);
      const totalWidth = cols * 140;
      const startX = (GAME_WIDTH - totalWidth) / 2 + 70;

      // Subtle floating label for Level 1 (dishes)
      if (this.levelDef.id === 1) {
        this.add.text(GAME_WIDTH / 2, 210, 'Clean the dishes', {
          fontSize: '22px', fontFamily: 'monospace', color: PALETTE_CSS.champagne,
        })
        .setOrigin(0.5)
        .setAlpha(0.82)
        .setDepth(10);
      }

      for (let i = 0; i < count; i++) {
        const x = startX + (i % cols) * 140;
        const y = 250 + Math.floor(i / cols) * 140;
        this.createTapTarget(x, y, i);
      }
    } else if (type === 'dragToTargets') {
      // Drop zone
      const dzX = GAME_WIDTH - 200;
      const dzY = GAME_HEIGHT / 2;
      this.add.rectangle(dzX, dzY, 160, 200, PALETTE.wood2, 0.4)
        .setStrokeStyle(3, PALETTE.highlight1);
      this.add.text(dzX, dzY - 115, 'Drop here', {
        fontSize: '13px', fontFamily: 'monospace', color: PALETTE_CSS.ivory,
      }).setOrigin(0.5);

      const dropZone = this.add.rectangle(dzX, dzY, 160, 200, 0x000000, 0);

      for (let i = 0; i < count; i++) {
        this.createDragItem(200 + i * 180, GAME_HEIGHT / 2, dropZone, i);
      }
    } else if (type === 'sequence') {
      // L6 laundry: fold A→B→C in correct order
      const isLaundry = this.levelDef.id === 6;
      const rawLabels = isLaundry
        ? ['Fold A', 'Fold B', 'Fold C']
        : ['A', 'B', 'C'].slice(0, count);
      const labels = rawLabels.slice(0, count);
      const shuffled = [...labels].sort(() => rng.next() - 0.5);
      const totalWidth = shuffled.length * 160;
      const startX = (GAME_WIDTH - totalWidth) / 2 + 80;

      // Phase indicator for L6
      if (isLaundry) {
        this.laundryPhaseText = this.add.text(GAME_WIDTH / 2, 170,
          'Fold in correct order: A → B → C', {
            fontSize: '14px', fontFamily: 'monospace', color: PALETTE_CSS.highlight2,
          }).setOrigin(0.5);
      }

      for (let i = 0; i < shuffled.length; i++) {
        this.createSequenceTarget(startX + i * 160, GAME_HEIGHT * 0.45, shuffled[i], labels);
      }

      // Level 6 "Fold neatly" bonus button
      if (isLaundry) {
        this.createFoldNeatlyBonus();
      }
    }
  }

  private createTapTarget(x: number, y: number, _index: number): void {

    // Level-specific labels for tap targets
    const tapLabels = this.getTapTargetLabels();
    const labelText = tapLabels[_index] ?? 'TAP';

    const target = this.add.rectangle(x, y, 110, 110, PALETTE.wood2)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, PALETTE.highlight1);

    // Mini guidance text for Level 1
    if (this.levelDef.id === 1) {
      this.add.text(x, y - 60, 'clean the dishes', {
        fontSize: '14px', fontFamily: 'monospace', color: PALETTE_CSS.champagne,
      }).setOrigin(0.5).setAlpha(0.85).setDepth(10);
    }

    const label = this.add.text(x, y, labelText, {
      fontSize: '13px', fontFamily: 'monospace', color: PALETTE_CSS.ivory,
      align: 'center',
    }).setOrigin(0.5);

    target.on('pointerdown', () => {
      if (this.modalActive || this.completed) return;
      this.audio.buttonTap();
      target.setFillStyle(PALETTE.forest3);
      target.removeInteractive();
      label.setText('✓');
      // Brief scale pop
      this.tweens.add({ targets: target, scaleX: 1.1, scaleY: 1.1, duration: 100, yoyo: true });
      this.advanceObjective();
    });
  }

  /** Level-specific labels for tap targets (instead of generic "TAP") */
  private getTapTargetLabels(): string[] {
    switch (this.levelDef.id) {
      case 1: // Dish Cavern — 5 dishes (match objective.count)
        return Array.from({ length: this.levelDef.objective.count }, (_, i) => `Dish ${i + 1}`);
      case 3: // Doomscroll Swamp — 4 popups
        return Array.from({ length: this.levelDef.objective.count }, (_, i) => `Popup ${i + 1}`);
      case 5: // Garden + Groom — 4 plants + 3 groom taps
        return [
          'Water\nRose', 'Water\nFern', 'Water\nMint', 'Water\nIvy',
          'Groom 1', 'Groom 2', 'Groom 3',
        ];
      default:
        return [];
    }
  }

  private createDragItem(x: number, y: number, dropZone: Phaser.GameObjects.Rectangle, index: number): void {
    const item = this.add.rectangle(x, y, 100, 100, PALETTE.highlight1)
      .setInteractive({ useHandCursor: true, draggable: true })
      .setStrokeStyle(2, PALETTE.wood1);

    const label = this.add.text(x, y, `${index + 1}`, {
      fontSize: '20px', fontFamily: 'monospace', color: PALETTE_CSS.wood1,
    }).setOrigin(0.5);

    this.input.setDraggable(item);
    const startX = x;
    const startY = y;

    item.on('drag', (_p: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      if (this.modalActive) return;
      item.setPosition(dragX, dragY);
      label.setPosition(dragX, dragY);
    });

    item.on('dragend', () => {
      if (this.modalActive) return;
      const bounds = dropZone.getBounds();
      if (bounds.contains(item.x, item.y)) {
        this.audio.buttonTap();
        item.setVisible(false);
        label.setVisible(false);
        item.removeInteractive();
        this.advanceObjective();
      } else {
        item.setPosition(startX, startY);
        label.setPosition(startX, startY);
      }
    });
  }

  private createSequenceTarget(x: number, y: number, letter: string, order: string[]): void {
    const bg = this.add.rectangle(x, y, 130, 100, PALETTE.wood2)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, PALETTE.highlight1);

    this.add.text(x, y, letter, {
      fontSize: '32px', fontFamily: 'monospace', color: PALETTE_CSS.ivory,
    }).setOrigin(0.5);

    bg.on('pointerdown', () => {
      if (this.modalActive || this.completed) return;
      if (letter === order[this.objectiveProgress]) {
        this.audio.buttonTap();
        bg.setFillStyle(PALETTE.forest3);
        bg.removeInteractive();
        this.tweens.add({ targets: bg, scaleX: 1.1, scaleY: 1.1, duration: 100, yoyo: true });
        this.advanceObjective();
      } else {
        bg.setFillStyle(PALETTE.danger);
        this.time.delayedCall(300, () => bg.setFillStyle(PALETTE.wood2));
      }
    });
  }

  /** Level 6 optional: "Fold neatly" bonus — Integrity +3 but Timer -5s */
  private createFoldNeatlyBonus(): void {
    const y = GAME_HEIGHT * 0.7;
    const bg = this.add.rectangle(GAME_WIDTH / 2, y, 220, 50, PALETTE.champagne, 0.2)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(1, PALETTE.champagne);

    const label = this.add.text(GAME_WIDTH / 2, y, 'Fold neatly (+3 Intg, -5s)', {
      fontSize: '12px', fontFamily: 'monospace', color: PALETTE_CSS.champagne,
    }).setOrigin(0.5);

    bg.on('pointerdown', () => {
      if (this.modalActive || this.completed) return;
      this.audio.buttonTap();
      store.updateStats({ integrity: store.stats.integrity + 3 });
      this.adjustTimer(-5);
      bg.setFillStyle(PALETTE.forest3, 0.3);
      bg.removeInteractive();
      label.setText('Neatly folded! +3 Intg');
      label.setColor(PALETTE_CSS.ivory);
      this.checkTimerDeath();
    });
  }

  private advanceObjective(): void {
    this.objectiveProgress++;
    this.updateUI();

    if (this.objectiveProgress >= this.levelDef.objective.count) {
      this.levelComplete();
    }
  }

  /** Kitchen drinks row — each gives Hearts +1 + Energy +10, usable 2x */
  private createKitchenDrinks(): void {
    const drinks = [
      { key: 'whey',        label: 'WHEY',   emoji: '💪', color: 0xf5f2ea },
      { key: 'coffee',      label: 'COFFEE', emoji: '☕', color: 0xd4a574 },
      { key: 'water',       label: 'WATER',  emoji: '💧', color: 0xadd8e6 },
      { key: 'energydrink', label: 'ENERGY', emoji: '⚡', color: 0x90ee90 },
    ];

    const startX = GAME_WIDTH - 80 * drinks.length;
    const rowY = GAME_HEIGHT - 120;

    drinks.forEach((drink, i) => {
      const x = startX + i * 80;
      this.createDrinkItem(x, rowY, drink.key, drink.label, drink.emoji, drink.color);
    });
  }

  private createDrinkItem(
    x: number, y: number, key: string, name: string, emoji: string, color: number,
  ): void {
    const bg = this.add.rectangle(x, y, 60, 70, color, 0.9)
      .setStrokeStyle(2, PALETTE.highlight1)
      .setInteractive({ useHandCursor: true });
    const label = this.add.text(x, y - 14, name, {
      fontSize: '9px', fontFamily: 'monospace', color: PALETTE_CSS.wood1,
    }).setOrigin(0.5);
    const icon = this.add.text(x, y + 4, emoji, { fontSize: '18px' }).setOrigin(0.5);
    const usesText = this.add.text(x, y + 28, '2 left', {
      fontSize: '8px', fontFamily: 'monospace', color: PALETTE_CSS.wood1,
    }).setOrigin(0.5);

    // Glow pulse
    this.tweens.add({
      targets: bg, alpha: 0.6, duration: 800,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    bg.on('pointerdown', () => {
      if (this.modalActive || this.completed || this.drinkCooldown) return;
      const used = this.drinkUses[key] ?? 0;
      if (used >= 2) return; // already maxed out

      this.audio.buttonTap();
      this.drinkUses[key] = used + 1;
      const remaining = 2 - (used + 1);

      // 2-second cooldown between drinks
      this.drinkCooldown = true;
      this.time.delayedCall(2000, () => { this.drinkCooldown = false; });

      // Hearts +1, Energy +10
      store.updateStats({
        hearts: store.stats.hearts + 1,
        energy: store.stats.energy + 10,
      });
      this.hud.refresh();

      // Sparkle burst
      for (let k = 0; k < 8; k++) {
        const s = this.add.circle(
          x + Phaser.Math.Between(-20, 20),
          y + Phaser.Math.Between(-20, 20),
          Phaser.Math.Between(2, 4), PALETTE.highlight2, 0.8,
        );
        this.tweens.add({
          targets: s, y: s.y - 30, alpha: 0,
          duration: 600, onComplete: () => s.destroy(),
        });
      }

      // Update uses label
      if (remaining > 0) {
        usesText.setText(`${remaining} left`);
        bg.setAlpha(0.5);
      } else {
        // Maxed out — grey out
        usesText.setText('empty');
        bg.setFillStyle(0x888888, 0.4);
        bg.removeInteractive();
        label.setAlpha(0.4);
        icon.setAlpha(0.4);
      }
    });
  }

  // ─── HAZARD SCHEDULING ──────────────────────────────────

  private scheduleHazards(): void {
    const totalTime = this.levelDef.timerSeconds;

    for (let i = 0; i < this.temptationCallsPending; i++) {
      const delay = ((i + 1) / (this.temptationCallsPending + 1)) * totalTime * 0.7;
      this.time.delayedCall(delay * 1000, () => {
        if (!this.completed) this.triggerTemptationCall();
      });
    }

    if (this.doomScrollPending) {
      this.time.delayedCall(totalTime * 0.5 * 1000, () => {
        if (!this.completed) this.triggerDoomScroll();
      });
    }

    if (this.whalePending) {
      this.time.delayedCall(totalTime * 0.4 * 1000, () => {
        if (!this.completed && !this.whaleUsedThisLevel) this.triggerWhale();
      });
    }

    if (this.darmeshPending) {
      this.time.delayedCall(totalTime * 0.5 * 1000, () => {
        if (!this.completed) this.triggerDarmesh();
      });
    }
  }

  // ─── MODALS ─────────────────────────────────────────────

  private showModal(content: Phaser.GameObjects.GameObject[]): void {
    this.modalActive = true;
    store.setModalOpen(true);
    this.jollibabees.pause();

    const dim = this.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6,
    ).setInteractive().setDepth(200);

    const panel = this.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2, 520, 320, PALETTE.wood1,
    ).setStrokeStyle(3, PALETTE.highlight1).setDepth(200);

    // Inner carved border
    const innerBorder = this.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2, 506, 306, 0x000000, 0,
    ).setStrokeStyle(1, PALETTE.wood2).setDepth(200);

    content.forEach(c => {
      if ('setDepth' in c) (c as unknown as Phaser.GameObjects.Components.Depth).setDepth(201);
    });

    this.modalContainer = this.add.container(0, 0, [dim, panel, innerBorder, ...content]);
    this.modalContainer.setDepth(200);
  }

  private closeModal(): void {
    this.modalActive = false;
    store.setModalOpen(false);
    this.jollibabees.resume();
    this.modalContainer?.destroy(true);
    this.modalContainer = undefined;
  }

  // ─── TEMPTATION INCOMING CALL ───────────────────────────

  private triggerTemptationCall(): void {
    if (this.modalActive || this.completed) return;
    this.modalActive = true;
    this.audio.pigAlert();

    const CALL_TIMEOUT = 3500; // ms — 3.5s to read and respond
    let resolved = false;
    let barTween: Phaser.Tweens.Tween | undefined;
    let timeoutEvent: Phaser.Time.TimerEvent | undefined;
    let countdownTween: Phaser.Tweens.Tween | undefined;

    // Title
    const title = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 140, 'Incoming Call', {
      fontSize: '28px', fontFamily: 'monospace', color: PALETTE_CSS.highlight1,
    }).setOrigin(0.5);

    // Pig image (temptation)
    const pigImg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, 'temptation_pig')
      .setDisplaySize(120, 120);

    // Caller name
    const caller = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40, 'Forest Girl 💋', {
      fontSize: '22px', fontFamily: 'monospace', color: PALETTE_CSS.danger,
    }).setOrigin(0.5);

    // Countdown bar background
    const barBgX = GAME_WIDTH / 2 - 150;
    const barY = GAME_HEIGHT / 2 + 80;
    const barW = 300;
    const barH = 12;
    const barBg = this.add.rectangle(GAME_WIDTH / 2, barY, barW, barH, 0x333333)
      .setStrokeStyle(1, 0x555555);

    // Countdown bar fill
    const barFill = this.add.rectangle(barBgX, barY, barW, barH - 2, PALETTE.danger)
      .setOrigin(0, 0.5);

    // Countdown text
    const countdownText = this.add.text(GAME_WIDTH / 2, barY + 18, '3.5s', {
      fontSize: '14px', fontFamily: 'monospace', color: PALETTE_CSS.champagne,
    }).setOrigin(0.5);

    // BLOCK button — large, green, prominent
    const blockBtn = this.add.rectangle(
      GAME_WIDTH / 2 - 120, GAME_HEIGHT / 2 + 130, 190, 64, PALETTE.forest3,
    ).setInteractive({ useHandCursor: true }).setStrokeStyle(2, PALETTE.ivory);

    const blockLabel = this.add.text(GAME_WIDTH / 2 - 120, GAME_HEIGHT / 2 + 130, 'BLOCK', {
      fontSize: '22px', fontFamily: 'monospace', color: PALETTE_CSS.ivory,
    }).setOrigin(0.5);

    // ACCEPT button — red, dangerous
    const acceptBtn = this.add.rectangle(
      GAME_WIDTH / 2 + 120, GAME_HEIGHT / 2 + 130, 190, 64, PALETTE.danger,
    ).setInteractive({ useHandCursor: true }).setStrokeStyle(2, 0xffffff);

    const acceptLabel = this.add.text(GAME_WIDTH / 2 + 120, GAME_HEIGHT / 2 + 130, 'ACCEPT', {
      fontSize: '22px', fontFamily: 'monospace', color: PALETTE_CSS.ivory,
    }).setOrigin(0.5);

    // Pulse the block button to guide the player
    this.tweens.add({
      targets: blockBtn, scaleX: 1.05, scaleY: 1.05,
      duration: 300, yoyo: true, repeat: -1,
    });

    this.showModal([title, pigImg, caller, barBg, barFill, countdownText, blockBtn, blockLabel, acceptBtn, acceptLabel]);

    // Countdown bar animation
    barTween = this.tweens.add({
      targets: barFill,
      displayWidth: 0,
      duration: CALL_TIMEOUT,
      ease: 'Linear',
    });

    // Countdown number
    countdownTween = this.tweens.addCounter({
      from: 35, to: 0,
      duration: CALL_TIMEOUT,
      onUpdate: (tween) => {
        const val = tween.getValue();
        if (typeof val === 'number') {
          countdownText.setText(`${(val / 10).toFixed(1)}s`);
        }
      },
    });

    // BLOCK handler: success — rewards Prep +3, Diamonds +1
    blockBtn.on('pointerdown', () => {
      if (resolved) return;
      resolved = true;
      barTween?.stop();
      countdownTween?.stop();
      timeoutEvent?.remove();
      this.audio.pigAvoided();
      // Apply block reward
      const result = applyForestPig(store.stats, true);
      store.setStats(result.stats);
      this.closeModal();
      this.updateUI();
    });

    // ACCEPT handler: instant game over
    acceptBtn.on('pointerdown', () => {
      if (resolved) return;
      resolved = true;
      barTween?.stop();
      countdownTween?.stop();
      timeoutEvent?.remove();
      this.closeModal();
      this.gameOverReason = 'Temptation call accepted.';
      this.gameOver();
    });

    // Timeout: auto-accept → instant game over (per spec)
    timeoutEvent = this.time.delayedCall(CALL_TIMEOUT, () => {
      if (!resolved) {
        resolved = true;
        this.closeModal();
        this.gameOverReason = 'Temptation call auto-accepted.';
        this.gameOver();
      }
    });
  }

  // ─── DOOM SCROLL ────────────────────────────────────────

  private triggerDoomScroll(): void {
    if (this.modalActive || this.completed) return;
    this.modalActive = true;
    this.audio.doomScrollOpen();

    // Pause Jollibabee speech
    this.jollibabees?.pause();

    // Pick a random doom scroll photo asset (13.png to 28.png)
    let photoNum = Phaser.Math.Between(DOOM_SCROLL_PHOTO_RANGE.min, DOOM_SCROLL_PHOTO_RANGE.max);
    const photoKey = `props/${photoNum}`;

    // Phone frame
    const phoneW = 340, phoneH = 600;
    const phone = this.add.rectangle(GAME_WIDTH/2, GAME_HEIGHT/2, phoneW, phoneH, PALETTE.wood2, 0.97)
      .setStrokeStyle(8, PALETTE.wood1)
      .setDepth(9999);
    // Screen
    const screen = this.add.rectangle(GAME_WIDTH/2, GAME_HEIGHT/2, phoneW-36, phoneH-60, 0x222222, 0.98)
      .setDepth(10000);
    // Photo
    const photo = this.add.image(GAME_WIDTH/2, GAME_HEIGHT/2-30, photoKey)
      .setDisplaySize(phoneW-60, phoneH-120)
      .setDepth(10001);
    // Title
    const title = this.add.text(GAME_WIDTH/2, GAME_HEIGHT/2-phoneH/2+38, 'Doom Scroll', {
      fontSize: '24px', fontFamily: 'monospace', color: PALETTE_CSS.champagne,
    }).setOrigin(0.5).setDepth(10002);
    // Buttons
    const scrollBtn = this.add.rectangle(GAME_WIDTH/2-90, GAME_HEIGHT/2+phoneH/2-38, 120, 44, PALETTE.forest2, 0.95)
      .setInteractive({ useHandCursor: true }).setDepth(10003);
    const scrollText = this.add.text(GAME_WIDTH/2-90, GAME_HEIGHT/2+phoneH/2-38, 'Scroll more', {
      fontSize: '18px', fontFamily: 'monospace', color: PALETTE_CSS.ivory,
    }).setOrigin(0.5).setDepth(10004);
    const closeBtn = this.add.rectangle(GAME_WIDTH/2+90, GAME_HEIGHT/2+phoneH/2-38, 120, 44, PALETTE.wood1, 0.95)
      .setInteractive({ useHandCursor: true }).setDepth(10003);
    const closeText = this.add.text(GAME_WIDTH/2+90, GAME_HEIGHT/2+phoneH/2-38, 'Close', {
      fontSize: '18px', fontFamily: 'monospace', color: PALETTE_CSS.champagne,
    }).setOrigin(0.5).setDepth(10004);

    // Group for easy cleanup
    const modalGroup = this.add.container(0,0,[phone,screen,photo,title,scrollBtn,scrollText,closeBtn,closeText]);
    modalGroup.setDepth(9999);

    // Block all input below
    this.input.once('pointerdown', (e: any) => e.event.stopPropagation(), this);

    // Button handlers
    scrollBtn.on('pointerdown', () => {
      // Apply scroll penalty but keep the phone open with a new photo
      this.onDoomScrollChoice('scroll');
      // Pick a new random photo different from current
      let nextPhoto = Phaser.Math.Between(DOOM_SCROLL_PHOTO_RANGE.min, DOOM_SCROLL_PHOTO_RANGE.max);
      while (nextPhoto === photoNum && DOOM_SCROLL_PHOTO_RANGE.max > DOOM_SCROLL_PHOTO_RANGE.min) {
        nextPhoto = Phaser.Math.Between(DOOM_SCROLL_PHOTO_RANGE.min, DOOM_SCROLL_PHOTO_RANGE.max);
      }
      photoNum = nextPhoto;
      // Swap the photo texture with a quick fade transition
      photo.setAlpha(0);
      photo.setTexture(`props/${photoNum}`);
      photo.setDisplaySize(phoneW-60, phoneH-120);
      this.tweens.add({ targets: photo, alpha: 1, duration: 200, ease: 'Sine.easeIn' });
    });
    closeBtn.on('pointerdown', () => {
      this.onDoomScrollChoice('close');
      modalGroup.destroy();
      this.modalActive = false;
      this.jollibabees?.resume();
    });
    // Prevent click-outside to close
    // (no-op)
  }

  private onDoomScrollChoice(choice: DoomScrollChoice): void {
    const result = applyDoomScroll(store.stats, choice);
    store.setStats(result.stats);
    this.adjustTimer(result.timerDelta);
    this.updateUI();
    this.checkTimerDeath();
  }

  // ─── WHALE COIN ─────────────────────────────────────────

  private triggerWhale(): void {
    if (this.modalActive || this.completed || this.whaleUsedThisLevel) return;
    this.whaleUsedThisLevel = true;

    const emoji = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 100, '🐋', {
      fontSize: '36px',
    }).setOrigin(0.5);

    const title = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 65, 'WHALE COIN', {
      fontSize: '28px', fontFamily: 'monospace', color: PALETTE_CSS.highlight1,
    }).setOrigin(0.5);

    const subtitle = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 35,
      'Whale Coin is pumping. Invest?', {
      fontSize: '13px', fontFamily: 'monospace', color: PALETTE_CSS.champagne,
    }).setOrigin(0.5);

    const ignoreBtn = this.createModalButton(
      GAME_WIDTH / 2 - 130, GAME_HEIGHT / 2 + 30, 'Ignore',
      () => this.onWhaleChoice('ignore'),
    );

    const investBtn = this.createModalButton(
      GAME_WIDTH / 2 + 130, GAME_HEIGHT / 2 + 30, 'Invest!',
      () => this.onWhaleChoice('invest'),
    );

    this.showModal([emoji, title, subtitle, ...ignoreBtn, ...investBtn]);
  }

  private onWhaleChoice(choice: WhaleCoinChoice): void {
    const roll = rng.chance(0.5);
    const result = applyWhaleCoin(store.stats, choice, roll);
    store.setStats(result.stats);
    this.adjustTimer(result.timerDelta);
    this.closeModal();

    if (choice === 'invest') {
      const msg = result.won ? 'TO THE MOON! +15 Diamonds!' : 'RUG PULL! Lost diamonds & a heart!';
      const color = result.won ? PALETTE_CSS.highlight1 : PALETTE_CSS.danger;
      if (result.won) this.audio.whaleCoinWin(); else this.audio.whaleCoinLose();

      const flash = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, msg, {
        fontSize: '22px', fontFamily: 'monospace', color,
        backgroundColor: '#000000',
        padding: { x: 12, y: 6 },
      }).setOrigin(0.5).setDepth(300);

      this.tweens.add({
        targets: flash, y: flash.y - 40, alpha: 0,
        duration: 2000, delay: 500, onComplete: () => flash.destroy(),
      });

    }

    this.updateUI();
    if (store.stats.hearts <= 0) {
      this.gameOverReason = 'Lost all hearts!';
      this.gameOver();
    } else {
      this.checkTimerDeath();
    }
  }

  // ─── DARMESH CALL ───────────────────────────────────────

  private triggerDarmesh(): void {
    if (this.modalActive || this.completed) return;
    this.audio.darmeshRing();

    // Jollibabees say "Hi Darmesh!" first
    this.jollibabees.showDarmeshGreeting();

    const title = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80, 'Darmesh is calling!', {
      fontSize: '26px', fontFamily: 'monospace', color: PALETTE_CSS.highlight1,
    }).setOrigin(0.5);

    const hint = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 45,
      'Jollibabees: "Hi Darmesh!"', {
      fontSize: '13px', fontFamily: 'monospace', color: PALETTE_CSS.champagne,
    }).setOrigin(0.5);

    const takeBtn = this.createModalButton(
      GAME_WIDTH / 2 - 130, GAME_HEIGHT / 2 + 30, 'Take Call',
      () => this.onDarmeshChoice('take'),
    );

    const ignoreBtn = this.createModalButton(
      GAME_WIDTH / 2 + 130, GAME_HEIGHT / 2 + 30, 'Ignore',
      () => this.onDarmeshChoice('ignore'),
    );

    this.showModal([title, hint, ...takeBtn, ...ignoreBtn]);
  }

  private onDarmeshChoice(choice: DarmeshChoice): void {
    const result = applyDarmeshChoice(store.stats, choice);
    store.setStats(result);
    this.closeModal();
    this.updateUI();
  }

  // ─── MODAL BUTTON HELPER ────────────────────────────────

  private createModalButton(
    x: number, y: number, label: string, onClick: () => void,
  ): [Phaser.GameObjects.Rectangle, Phaser.GameObjects.Text] {
    const bg = this.add.rectangle(x, y, 190, 54, PALETTE.forest3)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, PALETTE.ivory);

    const text = this.add.text(x, y, label, {
      fontSize: '16px', fontFamily: 'monospace', color: PALETTE_CSS.ivory,
    }).setOrigin(0.5);

    bg.on('pointerover', () => bg.setFillStyle(PALETTE.forest2));
    bg.on('pointerout', () => bg.setFillStyle(PALETTE.forest3));
    bg.on('pointerdown', () => {
      this.audio.buttonTap();
      onClick();
    });

    return [bg, text];
  }

  // ─── LEVEL COMPLETE / GAME OVER ─────────────────────────

  private levelComplete(): void {
    if (this.completed) return;
    this.completed = true;
    this.timerEvent?.remove();
    this.audio.levelComplete();

    const newStats = applyLevelResult(store.stats, this.levelDef.id);
    store.setStats(newStats);
    store.completeLevel(this.levelDef.id);

    // Capture which jollibabee was just unlocked (before showing overlay)
    const newBabyName = store.getLastUnlockedJollibabeeName();
    const jbIndex = store.jollibabeeCount - 1; // 0-based index of new baby

    // Results overlay
    const dim = this.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.75,
    ).setDepth(300);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.18, 'Level Complete!', {
      fontSize: '38px', fontFamily: 'monospace', color: PALETTE_CSS.highlight1,
    }).setOrigin(0.5).setDepth(301);

    const s = store.stats;
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.30,
      `Preparation: ${s.preparation}    Energy: ${s.energy}\n` +
      `Integrity: ${s.integrity}    Hearts: ${s.hearts}\n` +
      `Diamonds: ${s.diamonds}`, {
      fontSize: '16px', fontFamily: 'monospace', color: PALETTE_CSS.ivory,
      align: 'center', lineSpacing: 6,
    }).setOrigin(0.5).setDepth(301);

    // ── "Found a Jollibabee!" mini overlay ──────────────────
    if (newBabyName && jbIndex >= 0) {
      const jbColors = [0xcc3333, 0xff8888, 0xffaaaa, 0xdd5555, 0xff4444, 0xff6666];
      const jbSizes = [22, 22, 22, 22, 28, 16];
      const color = jbColors[jbIndex] ?? 0xff6666;
      const sz = jbSizes[jbIndex] ?? 20;

      const foundY = GAME_HEIGHT * 0.46;
      this.add.text(GAME_WIDTH / 2, foundY - 8, `Found: ${newBabyName}`, {
        fontSize: '18px', fontFamily: 'monospace', color: PALETTE_CSS.highlight2,
      }).setOrigin(0.5).setDepth(301);

      // Baby icon with bounce animation
      const babyIcon = this.add.rectangle(
        GAME_WIDTH / 2, foundY + 30, sz, sz, color,
      ).setStrokeStyle(2, 0xffffff).setDepth(301).setScale(0);

      this.add.text(GAME_WIDTH / 2, foundY + 52, newBabyName, {
        fontSize: '12px', fontFamily: 'monospace', color: PALETTE_CSS.champagne,
      }).setOrigin(0.5).setDepth(301);

      // Pop-in bounce
      this.tweens.add({
        targets: babyIcon,
        scale: 1,
        duration: 400,
        ease: 'Back.easeOut',
        delay: 300,
      });

      // Particle sparkle around the icon
      this.time.delayedCall(400, () => {
        for (let k = 0; k < 6; k++) {
          const angle = (k / 6) * Math.PI * 2;
          const sparkle = this.add.circle(
            GAME_WIDTH / 2 + Math.cos(angle) * 24,
            foundY + 30 + Math.sin(angle) * 24,
            3, PALETTE.highlight2, 0.8,
          ).setDepth(301);
          this.tweens.add({
            targets: sparkle,
            x: sparkle.x + Math.cos(angle) * 16,
            y: sparkle.y + Math.sin(angle) * 16,
            alpha: 0,
            duration: 600,
            onComplete: () => sparkle.destroy(),
          });
        }
      });
    }

    // Continue button
    const continueBtn = this.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT * 0.68, 240, 60, PALETTE.wood1,
    ).setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, PALETTE.highlight1).setDepth(301);

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT * 0.68, 228, 48, 0x000000, 0)
      .setStrokeStyle(1, PALETTE.wood2).setDepth(301);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.68, 'Continue', {
      fontSize: '22px', fontFamily: 'monospace', color: PALETTE_CSS.ivory,
    }).setOrigin(0.5).setDepth(301);

    continueBtn.on('pointerdown', () => {
      this.audio.buttonTap();
      const marketAfter = store.progression.marketAvailableAfterLevel;
      const completedLevelId = this.levelDef.id;
      this.jollibabees.destroy();
      this.cameras.main.fadeOut(400, 0x1f, 0x3b, 0x2c);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        if (marketAfter !== null) {
          store.clearMarketAvailable();
          this.scene.start(SCENES.MARKET, { afterLevelId: completedLevelId });
        } else {
          this.scene.start(SCENES.WORLD_MAP, {
            panFromRoom: LEVEL_TO_ROOM[completedLevelId] ?? null,
          });
        }
      });
    });
  }

  private gameOver(): void {
    if (this.completed) return; // prevent double-fire
    this.completed = true;
    this.timerEvent?.remove();
    // Clean up active modal if any
    if (this.modalActive) {
      this.closeModal();
    }
    this.audio.gameOver();
    this.jollibabees.destroy();
    this.scene.start(SCENES.GAME_OVER, { reason: this.gameOverReason || '' });
  }

  // ─── UI UPDATE ──────────────────────────────────────────

  private updateUI(): void {
    this.hud.update(this.timerSeconds);

    this.progressText.setText(
      `${this.objectiveProgress} / ${this.levelDef.objective.count}`
    );
  }

  private addDustParticles(): void {
    for (let i = 0; i < 12; i++) {
      const x = Phaser.Math.Between(0, GAME_WIDTH);
      const y = Phaser.Math.Between(150, GAME_HEIGHT);
      const dot = this.add.circle(x, y, Phaser.Math.Between(1, 2), PALETTE.champagne, 0.1);
      this.tweens.add({
        targets: dot, y: y - Phaser.Math.Between(30, 60), alpha: 0,
        duration: Phaser.Math.Between(4000, 7000), repeat: -1,
        delay: Phaser.Math.Between(0, 3000),
        onRepeat: () => {
          dot.setPosition(Phaser.Math.Between(0, GAME_WIDTH), Phaser.Math.Between(300, GAME_HEIGHT));
          dot.setAlpha(0.1);
        },
      });
    }
  }
}
