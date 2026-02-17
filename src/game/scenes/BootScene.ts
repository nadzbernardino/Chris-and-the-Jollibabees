/**
 * BootScene — Tap to unlock audio, then loads ALL assets with music playing.
 */
import Phaser from 'phaser';
import { SCENE, BG_ASSETS, ASSETS, DESIGN_W, DESIGN_H } from '../constants';
import { generateAllAudio } from '../audio/ProceduralAudio';

export class BootScene extends Phaser.Scene {
  private audioData: Record<string, string> = {};

  constructor() { super(SCENE.BOOT); }

  preload(): void {
    // Pre-generate audio data URLs (fast, no loading needed)
    this.audioData = generateAllAudio();
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#1F3B2C');

    // Title
    const title = this.add.text(DESIGN_W / 2, DESIGN_H / 2 - 80, 'BEEHIVE', {
      fontSize: '64px',
      fontFamily: '"Press Start 2P", "Courier New", monospace',
      color: '#F4C76A',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5);

    // Tap prompt
    const tapText = this.add.text(DESIGN_W / 2, DESIGN_H / 2 + 40, '♫ Tap to Start ♫', {
      fontSize: '24px',
      fontFamily: '"Press Start 2P", "Courier New", monospace',
      color: '#E6C98B',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // Pulse the tap text
    this.tweens.add({
      targets: tapText,
      alpha: { from: 1, to: 0.3 },
      duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // On first tap: unlock audio, start music, begin loading assets
    this.input.once('pointerdown', () => {
      // Unlock WebAudio context
      if (this.sound && 'context' in this.sound) {
        const ctx = (this.sound as unknown as { context: AudioContext }).context;
        if (ctx?.state === 'suspended') {
          ctx.resume();
        }
      }

      // Load audio data URLs into Phaser's audio cache first
      // so we can play intro music during asset loading
      for (const [key, dataUrl] of Object.entries(this.audioData)) {
        this.cache.audio.remove(key); // clear if exists
      }

      title.destroy();
      tapText.destroy();

      // Start loading all assets with a progress bar
      this.startAssetLoading();
    });
  }

  private startAssetLoading(): void {
    const cx = DESIGN_W / 2;
    const cy = DESIGN_H / 2;
    const barW = 400;
    const barH = 30;
    const bg = this.add.rectangle(cx, cy, barW, barH, 0x333333);
    const fill = this.add.rectangle(cx - barW / 2, cy, 0, barH - 4, 0xf4c76a).setOrigin(0, 0.5);
    const label = this.add.text(cx, cy - 40, 'Loading...', {
      fontSize: '24px', fontFamily: '"Press Start 2P", "Courier New", monospace', color: '#F4C76A',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5);

    this.load.on('progress', (v: number) => {
      fill.width = (barW - 4) * v;
    });

    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn(`[BootScene] Asset missing: "${file.key}" at "${file.url}" — creating placeholder`);
    });

    // ── Load backgrounds ─────────────────────────────────
    for (const [key, path] of Object.entries(BG_ASSETS)) {
      this.load.image(key, path);
    }

    // ── Load props / characters / jollibabees ────────────
    for (const [key, path] of Object.entries(ASSETS)) {
      this.load.image(key, path);
    }

    // ── Load procedural audio ────────────────────────────
    for (const [key, dataUrl] of Object.entries(this.audioData)) {
      this.load.audio(key, dataUrl);
    }

    // ── Load MP3 music files ────────────────────────────
    this.load.audio('music1', 'assets/audio/music1.mp3');
    this.load.audio('music2', 'assets/audio/music2.mp3');

    this.load.once('complete', () => {
      bg.destroy(); fill.destroy(); label.destroy();

      // Start intro music now that audio is loaded + unlocked
      try {
        if (this.cache.audio.exists('intro_music')) {
          this.sound.play('intro_music', { loop: true, volume: 0.35 });
        }
      } catch (e) {
        console.warn('[BootScene] Could not start intro music:', e);
      }

      // Create placeholder textures for any that failed to load
      const allKeys = [...Object.keys(BG_ASSETS), ...Object.keys(ASSETS)];
      for (const key of allKeys) {
        if (!this.textures.exists(key)) {
          console.warn(`[BootScene] Generating placeholder for missing asset: "${key}"`);
          const g = this.add.graphics();
          g.fillStyle(0xff00ff, 1);
          g.fillRect(0, 0, 128, 128);
          g.lineStyle(2, 0xffffff);
          g.strokeRect(0, 0, 128, 128);
          g.generateTexture(key, 128, 128);
          g.destroy();
        }
      }

      this.scene.start(SCENE.INTRO);
    });

    // Start the load
    this.load.start();
  }
}
