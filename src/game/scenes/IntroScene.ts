import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PALETTE, PALETTE_CSS, SCENES } from '../config';
import { AudioManager } from '../audio/AudioManager';

export class IntroScene extends Phaser.Scene {
  constructor() {
    super(SCENES.INTRO);
  }

  create(): void {

    this.cameras.main.setBackgroundColor(PALETTE.forest1);
    // Only create AudioManager and unlock audio on user gesture (see below)

    // Subtle floating dust particles
    this.addDustParticles();

    // Title
    const title = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.18, 'BEEHIVE', {
      fontSize: '52px',
      fontFamily: 'monospace',
      color: PALETTE_CSS.highlight1,
      align: 'center',
    }).setOrigin(0.5);

    // Gentle glow pulse on title
    this.tweens.add({
      targets: title,
      alpha: 0.8,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Subtitle
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.35, 'Chris & the Jollibabees', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: PALETTE_CSS.champagne,
    }).setOrigin(0.5);

    // Decorative line
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT * 0.40, 200, 2, PALETTE.highlight1, 0.5);

    // ── Story text ──────────────────────────────────────────
    const storyLines = [
      'Babitee is arriving soon.',
      'Chris needs to finish his home quests',
      'before he can pick her up.',
    ].join('\n');

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.54, storyLines, {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: PALETTE_CSS.ivory,
      align: 'center',
      lineSpacing: 6,
    }).setOrigin(0.5).setAlpha(0.85);

    // ── Start button — carved wood plank ────────────────────
    const btnBg = this.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT * 0.78, 320, 68, PALETTE.wood1,
    ).setInteractive({ useHandCursor: true })
      .setStrokeStyle(3, PALETTE.wood2);

    // Inner border for carved look
    this.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT * 0.78, 308, 56, 0x000000, 0,
    ).setStrokeStyle(1, PALETTE.highlight1);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.78, 'Enter the Beehive', {
      fontSize: '24px',
      fontFamily: 'monospace',
      color: PALETTE_CSS.ivory,
    }).setOrigin(0.5);

    btnBg.on('pointerover', () => btnBg.setFillStyle(PALETTE.wood2));
    btnBg.on('pointerout', () => btnBg.setFillStyle(PALETTE.wood1));
    btnBg.on('pointerdown', () => {

      // Unlock audio on first interaction (mobile policy)
      if (!this.audioMgr) this.audioMgr = new AudioManager(this);
      this.audioMgr.unlockAudio();
      this.audioMgr.stopIntroMusic();
      this.audioMgr.buttonTap();

      this.cameras.main.fadeOut(400, 0x1f, 0x3b, 0x2c);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start(SCENES.WORLD_MAP);
      });
    });

    // Fade in
    this.cameras.main.fadeIn(400, 0x1f, 0x3b, 0x2c);

    // Start intro music (may silently fail if audio not yet unlocked on mobile)
    // (Music is now started above, as early as possible)

    // Dev: press D to open palette demo, U for UI showcase
    if (import.meta.env.DEV) {
      this.input.keyboard?.on('keydown-D', () => {
        this.scene.start(SCENES.PALETTE_DEMO);
      });
      this.input.keyboard?.on('keydown-U', () => {
        this.scene.start(SCENES.DEV_UI);
      });
    }
  }

  private addDustParticles(): void {
    // Floating dots to give depth
    for (let i = 0; i < 20; i++) {
      const x = Phaser.Math.Between(0, GAME_WIDTH);
      const y = Phaser.Math.Between(0, GAME_HEIGHT);
      const size = Phaser.Math.Between(1, 3);
      const dot = this.add.circle(x, y, size, PALETTE.champagne, 0.15 + Math.random() * 0.2);

      this.tweens.add({
        targets: dot,
        y: y - Phaser.Math.Between(30, 80),
        x: x + Phaser.Math.Between(-20, 20),
        alpha: 0,
        duration: Phaser.Math.Between(4000, 8000),
        repeat: -1,
        delay: Phaser.Math.Between(0, 3000),
        onRepeat: () => {
          dot.setPosition(
            Phaser.Math.Between(0, GAME_WIDTH),
            Phaser.Math.Between(GAME_HEIGHT * 0.5, GAME_HEIGHT),
          );
          dot.setAlpha(0.15 + Math.random() * 0.2);
        },
      });
    }
  }
}
