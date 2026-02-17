/**
 * IntroSceneNew — Beehive home screen.
 * Shows title "Beehive", story text, "Start" button.
 * Audio is already unlocked and intro music playing from BootScene.
 * Transitions to WorldScene on start.
 */
import Phaser from 'phaser';
import { DESIGN_W, DESIGN_H, SCENE } from '../constants';
import { store } from '../store/GameStoreNew';
import { PAL_CSS, TEXT, UI, drawPlaque, fs } from '../uiTheme';
import { AudioManager } from '../audio/AudioManager';

export class IntroSceneNew extends Phaser.Scene {
  private audio!: AudioManager;

  constructor() { super(SCENE.INTRO); }

  create(): void {
    store.reset();
    this.cameras.main.fadeIn(400, 0, 0, 0);
    this.audio = new AudioManager(this);

    // Background
    this.add.image(DESIGN_W / 2, DESIGN_H / 2, 'beehive_home')
      .setDisplaySize(DESIGN_W, DESIGN_H)
      .setDepth(0);

    // Dim overlay for readability
    this.add.rectangle(DESIGN_W / 2, DESIGN_H / 2, DESIGN_W, DESIGN_H, 0x000000, 0.35)
      .setDepth(1);

    // Title
    this.add.text(DESIGN_W / 2, 160, 'BEEHIVE', {
      ...TEXT.title,
      fontSize: fs(42),
    }).setOrigin(0.5).setDepth(2);

    // Subtitle
    this.add.text(DESIGN_W / 2, 260, 'Chris & the Jollibabees', {
      fontFamily: '"Press Start 2P", "Courier New", monospace',
      fontSize: fs(11),
      color: PAL_CSS.warmGold,
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(2);

    // Story text
    const story = [
      'Chris must finish domestic quests',
      'across the beehive before',
      'Babitee arrives.',
      '',
      'Clean every room.',
      'The Jollibabees are counting on you!',
    ].join('\n');

    this.add.text(DESIGN_W / 2, 320, story, {
      ...TEXT.body,
      align: 'center',
      wordWrap: { width: 700 },
    }).setOrigin(0.5, 0).setDepth(2);

    // Start button (pixel-art plaque)
    const btnW = UI.btnW;
    const btnH = UI.btnH + 8;
    const btnY = DESIGN_H - 200;
    const btnGfx = this.add.graphics().setDepth(2);
    drawPlaque(btnGfx, DESIGN_W / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH);

    const btnBg = this.add.rectangle(DESIGN_W / 2, btnY, btnW, btnH, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(2);

    const btnLabel = this.add.text(DESIGN_W / 2, btnY, 'Enter the Beehive', {
      ...TEXT.button,
      fontSize: fs(14),
      color: PAL_CSS.gold,
    }).setOrigin(0.5).setDepth(3);

    // Hover pulse
    this.tweens.add({
      targets: [btnGfx, btnBg, btnLabel],
      scaleX: 1.04, scaleY: 1.04,
      duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    btnBg.on('pointerdown', () => {
      this.audio.btnClick();

      store.s.gameStartTime = Date.now();
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start(SCENE.WORLD);
      });
    });
  }
}
