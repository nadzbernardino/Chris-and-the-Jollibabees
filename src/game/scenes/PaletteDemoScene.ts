import Phaser from 'phaser';
import {
  GAME_WIDTH, GAME_HEIGHT, PALETTE, PALETTE_CSS,
  PALETTE_ENTRIES, FONT_SIZES, SPACING, SCENES,
} from '../config';
import { createPixelFont, createPixelText } from '../ui/PixelFont';

/**
 * Demo scene showing all palette swatches and pixel font rendering.
 * Access by pressing D from IntroScene (dev mode) or setting initial scene.
 */
export class PaletteDemoScene extends Phaser.Scene {
  constructor() {
    super(SCENES.PALETTE_DEMO);
  }

  create(): void {
    this.cameras.main.setBackgroundColor(PALETTE.forest1);

    // Generate the pixel font
    createPixelFont(this);

    // ─── TITLE ─────────────────────────────────────────────
    const titleY = 30;
    createPixelText(this, GAME_WIDTH / 2 - 160, titleY, 'WOODLAND PALETTE DEMO', 24);

    // Fallback monospace text for comparison
    this.add.text(GAME_WIDTH / 2 + 200, titleY, '(monospace fallback)', {
      fontSize: '14px', fontFamily: 'monospace', color: PALETTE_CSS.mist,
    });

    // ─── PALETTE SWATCHES ──────────────────────────────────
    const swatchStartY = 80;
    const swatchSize = 50;
    const cols = 7;
    const swatchSpacing = 10;

    this.add.text(16, swatchStartY - 20, 'Palette Swatches:', {
      fontSize: '14px', fontFamily: 'monospace', color: PALETTE_CSS.ivory,
    });

    PALETTE_ENTRIES.forEach(([name, color], i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = 40 + col * (swatchSize + swatchSpacing + 100);
      const y = swatchStartY + row * (swatchSize + swatchSpacing + 20);

      // Swatch rectangle
      this.add.rectangle(x + swatchSize / 2, y + swatchSize / 2, swatchSize, swatchSize, color)
        .setStrokeStyle(2, PALETTE.ivory);

      // Label below swatch — pixel font
      createPixelText(this, x, y + swatchSize + 6, name, 8);

      // Hex value
      const cssKey = name as keyof typeof PALETTE_CSS;
      this.add.text(x, y + swatchSize + 18, PALETTE_CSS[cssKey], {
        fontSize: '9px', fontFamily: 'monospace', color: PALETTE_CSS.mist,
      });
    });

    // ─── PIXEL FONT SIZE DEMOS ─────────────────────────────
    const fontDemoY = 280;
    this.add.text(16, fontDemoY - 20, 'Pixel Font Sizes:', {
      fontSize: '14px', fontFamily: 'monospace', color: PALETTE_CSS.ivory,
    });

    const sizes = [
      { label: 'xs (8)', size: FONT_SIZES.xs },
      { label: 'sm (12)', size: FONT_SIZES.sm },
      { label: 'md (16)', size: FONT_SIZES.md },
      { label: 'lg (24)', size: FONT_SIZES.lg },
      { label: 'xl (32)', size: FONT_SIZES.xl },
    ];

    let yOffset = fontDemoY;
    sizes.forEach(({ label, size }) => {
      this.add.text(16, yOffset, label + ':', {
        fontSize: '11px', fontFamily: 'monospace', color: PALETTE_CSS.mist,
      });

      createPixelText(this, 120, yOffset, 'ABCDEFGHIJ 0123456789', size);
      yOffset += size + SPACING.sm;
    });

    // ─── TINTED TEXT DEMOS ─────────────────────────────────
    const tintDemoY = yOffset + 20;
    this.add.text(16, tintDemoY - 20, 'Pixel Font — Tinted Colors:', {
      fontSize: '14px', fontFamily: 'monospace', color: PALETTE_CSS.ivory,
    });

    const tintColors: [string, number][] = [
      ['Ivory (default)', PALETTE.ivory],
      ['Champagne', PALETTE.champagne],
      ['Highlight 1', PALETTE.highlight1],
      ['Chris Red', PALETTE.chrisRed],
      ['Jollibee Red', PALETTE.jollibeeRed],
      ['Danger', PALETTE.danger],
      ['Forest 3', PALETTE.forest3],
      ['Mist', PALETTE.mist],
    ];

    let tintY = tintDemoY;
    tintColors.forEach(([label, tint]) => {
      this.add.text(16, tintY, label + ':', {
        fontSize: '11px', fontFamily: 'monospace', color: PALETTE_CSS.mist,
      });
      createPixelText(this, 200, tintY, 'Woodland Quest!', 16, tint);
      tintY += 24;
    });

    // ─── UI ELEMENT DEMOS ──────────────────────────────────
    const uiDemoX = GAME_WIDTH / 2 + 100;
    const uiDemoY = 300;

    this.add.text(uiDemoX, uiDemoY - 30, 'UI Elements:', {
      fontSize: '14px', fontFamily: 'monospace', color: PALETTE_CSS.ivory,
    });

    // Wood panel
    this.add.rectangle(uiDemoX + 150, uiDemoY + 30, 280, 50, PALETTE.wood1)
      .setStrokeStyle(2, PALETTE.wood2);
    this.add.rectangle(uiDemoX + 150, uiDemoY + 30, 268, 38, 0x000000, 0)
      .setStrokeStyle(1, PALETTE.highlight1);
    createPixelText(this, uiDemoX + 60, uiDemoY + 22, 'CARVED WOOD PANEL', 16);

    // Button
    const btn = this.add.rectangle(uiDemoX + 150, uiDemoY + 100, 200, 48, PALETTE.forest3)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, PALETTE.ivory);
    createPixelText(this, uiDemoX + 80, uiDemoY + 92, 'TAP BUTTON', 16);

    btn.on('pointerover', () => btn.setFillStyle(PALETTE.forest2));
    btn.on('pointerout', () => btn.setFillStyle(PALETTE.forest3));

    // Vine bar
    this.add.text(uiDemoX, uiDemoY + 145, 'Vine Bar:', {
      fontSize: '11px', fontFamily: 'monospace', color: PALETTE_CSS.mist,
    });
    this.add.rectangle(uiDemoX + 200, uiDemoY + 150, 200, 14, PALETTE.forest1)
      .setStrokeStyle(1, PALETTE.forest3);
    this.add.rectangle(uiDemoX + 150, uiDemoY + 150, 140, 10, PALETTE.forest3)
      .setOrigin(0, 0.5);

    // Hearts
    this.add.text(uiDemoX, uiDemoY + 175, 'Hearts:', {
      fontSize: '11px', fontFamily: 'monospace', color: PALETTE_CSS.mist,
    });
    createPixelText(this, uiDemoX + 100, uiDemoY + 172, 'H:♥♥♥', 16, PALETTE.chrisRed);

    // Parchment speech bubble
    const bubbleX = uiDemoX + 150;
    const bubbleY = uiDemoY + 240;
    this.add.rectangle(bubbleX, bubbleY, 220, 40, PALETTE.ivory)
      .setStrokeStyle(1, PALETTE.wood2);
    this.add.triangle(bubbleX - 30, bubbleY + 24, -5, 0, 5, 0, 0, 10, PALETTE.ivory);
    this.add.text(bubbleX, bubbleY, '"Dadibee, focus!"', {
      fontSize: '12px', fontFamily: 'monospace', color: PALETTE_CSS.wood1,
    }).setOrigin(0.5);

    // ─── CHARACTER PLACEHOLDER SPRITES ─────────────────────
    const spriteY = uiDemoY + 310;
    this.add.text(uiDemoX, spriteY - 20, 'Character Sprites (placeholder):', {
      fontSize: '11px', fontFamily: 'monospace', color: PALETTE_CSS.mist,
    });

    // Chris
    this.add.rectangle(uiDemoX + 40, spriteY + 20, 24, 32, PALETTE.chrisRed)
      .setStrokeStyle(1, PALETTE.ivory);
    this.add.text(uiDemoX + 40, spriteY + 45, 'Chris', {
      fontSize: '9px', fontFamily: 'monospace', color: PALETTE_CSS.ivory,
    }).setOrigin(0.5);

    // 6 Jollibabees
    for (let i = 0; i < 6; i++) {
      const jx = uiDemoX + 100 + i * 40;
      const size = i === 1 ? 20 : i === 0 ? 12 : 16; // big, small flying, normal
      const yOff = i === 0 ? -6 : 0;
      this.add.rectangle(jx, spriteY + 20 + yOff, size, size, PALETTE.jollibeeRed)
        .setStrokeStyle(1, PALETTE.ivory);
    }
    this.add.text(uiDemoX + 200, spriteY + 45, 'Jollibabees', {
      fontSize: '9px', fontFamily: 'monospace', color: PALETTE_CSS.ivory,
    }).setOrigin(0.5);

    // ─── BACK BUTTON ───────────────────────────────────────
    const backBtn = this.add.rectangle(GAME_WIDTH - 100, GAME_HEIGHT - 30, 160, 36, PALETTE.wood1)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(1, PALETTE.highlight1);
    this.add.text(GAME_WIDTH - 100, GAME_HEIGHT - 30, 'Back to Intro', {
      fontSize: '13px', fontFamily: 'monospace', color: PALETTE_CSS.ivory,
    }).setOrigin(0.5);

    backBtn.on('pointerdown', () => {
      this.scene.start(SCENES.INTRO);
    });

    // ─── DEV INFO ──────────────────────────────────────────
    this.add.text(16, GAME_HEIGHT - 20, 'Press D from Intro to return here | 1280x720 pixelArt nearest-neighbor', {
      fontSize: '10px', fontFamily: 'monospace', color: PALETTE_CSS.mist,
    });
  }
}
