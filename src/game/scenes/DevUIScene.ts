import Phaser from 'phaser';
import {
  GAME_WIDTH, GAME_HEIGHT, PALETTE, PALETTE_CSS,
  FONT_SIZES, SPACING, SCENES,
} from '../config';
import { HUDPanel } from '../ui/HUDPanel';
import { IconCounter } from '../ui/IconCounter';
import { VineBar } from '../ui/VineBar';
import { SpeechBubble } from '../ui/SpeechBubble';
import { WoodButton } from '../ui/WoodButton';
import { pxText, hudText } from '../ui/PixelTextHelper';
import { createPixelFont } from '../ui/PixelFont';

/**
 * Dev-only UI showcase scene.
 * Displays every reusable UI component with sample data.
 * Access: press U from IntroScene (dev mode).
 */
export class DevUIScene extends Phaser.Scene {
  private heartCounter!: IconCounter;
  private heartValue = 3;

  constructor() {
    super(SCENES.DEV_UI);
  }

  create(): void {
    this.cameras.main.setBackgroundColor(PALETTE.forest1);
    createPixelFont(this);

    // ── SECTION LABEL HELPER ──────────────────────────────
    const sectionLabel = (x: number, y: number, text: string) => {
      return this.add.text(x, y, text, {
        fontSize: '11px', fontFamily: 'monospace', color: PALETTE_CSS.mist,
      });
    };

    // ════════════════════════════════════════════════════════
    //  TITLE
    // ════════════════════════════════════════════════════════
    pxText(this, GAME_WIDTH / 2 - 170, 14, 'UI COMPONENT SHOWCASE', 'lg', PALETTE.highlight1);

    // ════════════════════════════════════════════════════════
    //  LEFT COLUMN — HUDPanel + Icon Counters + Vine Bars
    // ════════════════════════════════════════════════════════
    const LX = 30;

    // ── HUDPanel ──────────────────────────────────────────
    sectionLabel(LX, 56, '1. HUDPanel (wood plaque)');

    // Big panel
    new HUDPanel(this, {
      x: LX + 180, y: 110,
      width: 340, height: 60,
    }).setDepth(10);

    pxText(this, LX + 50, 104, 'CARVED WOOD PANEL', 'md', PALETTE.ivory);

    // Small panel
    new HUDPanel(this, {
      x: LX + 460, y: 110,
      width: 140, height: 60,
      fill: PALETTE.forest2,
      accent: PALETTE.champagne,
    }).setDepth(10);

    pxText(this, LX + 410, 104, 'FOREST', 'md', PALETTE.champagne);

    // ── Icon Counters ─────────────────────────────────────
    sectionLabel(LX, 152, '2. IconCounter (heart icons + diamond counter)');

    // Hearts row — full hearts
    hudText(this, LX, 178, 'Hearts (3/3):', 12, PALETTE_CSS.mist);
    this.heartCounter = new IconCounter(this, LX + 110, 176, 'heart', { maxIcons: 3 });
    this.heartCounter.setValue(3);
    this.heartCounter.setDepth(10);

    // Hearts row — 1 heart
    hudText(this, LX + 210, 178, '(1/3):', 12, PALETTE_CSS.mist);
    const hearts1 = new IconCounter(this, LX + 260, 176, 'heart', { maxIcons: 3 });
    hearts1.setValue(1);
    hearts1.setDepth(10);

    // Hearts row — 0 hearts
    hudText(this, LX + 350, 178, '(0/3):', 12, PALETTE_CSS.mist);
    const hearts0 = new IconCounter(this, LX + 400, 176, 'heart', { maxIcons: 3 });
    hearts0.setValue(0);
    hearts0.setDepth(10);

    // Diamonds
    hudText(this, LX, 206, 'Diamonds:', 12, PALETTE_CSS.mist);
    const diamonds42 = new IconCounter(this, LX + 110, 204, 'diamond');
    diamonds42.setValue(42);
    diamonds42.setDepth(10);

    const diamonds0 = new IconCounter(this, LX + 200, 204, 'diamond');
    diamonds0.setValue(0);
    diamonds0.setDepth(10);

    // ── Vine Bars ─────────────────────────────────────────
    sectionLabel(LX, 240, '3. VineBar (prep/energy/integrity bars)');

    const barW = 200;

    const prepBar = new VineBar(this, {
      x: LX, y: 266,
      width: barW,
      label: 'Prep',
      fillColor: PALETTE.forest3,
      borderColor: PALETTE.forest3,
      value: 65,
    });
    prepBar.setDepth(10);

    const energyBar = new VineBar(this, {
      x: LX, y: 292,
      width: barW,
      label: 'Enrg',
      fillColor: PALETTE.highlight1,
      borderColor: PALETTE.highlight1,
      labelColor: PALETTE_CSS.highlight2,
      value: 80,
    });
    energyBar.setDepth(10);

    const intgBar = new VineBar(this, {
      x: LX, y: 318,
      width: barW,
      label: 'Intg',
      fillColor: PALETTE.champagne,
      borderColor: PALETTE.champagne,
      labelColor: PALETTE_CSS.champagne,
      value: 45,
    });
    intgBar.setDepth(10);

    // Low values
    const lowBar = new VineBar(this, {
      x: LX + 290, y: 266,
      width: barW,
      label: 'Low',
      fillColor: PALETTE.danger,
      borderColor: PALETTE.danger,
      labelColor: PALETTE_CSS.danger,
      value: 12,
    });
    lowBar.setDepth(10);

    // Full bar
    const fullBar = new VineBar(this, {
      x: LX + 290, y: 292,
      width: barW,
      label: 'Full',
      fillColor: PALETTE.forest3,
      borderColor: PALETTE.forest3,
      value: 100,
    });
    fullBar.setDepth(10);

    // Empty bar
    const emptyBar = new VineBar(this, {
      x: LX + 290, y: 318,
      width: barW,
      label: 'None',
      fillColor: PALETTE.mist,
      borderColor: PALETTE.mist,
      value: 0,
    });
    emptyBar.setDepth(10);

    // ════════════════════════════════════════════════════════
    //  RIGHT COLUMN — Speech Bubbles + Wood Buttons
    // ════════════════════════════════════════════════════════
    const RX = GAME_WIDTH / 2 + 80;

    // ── Speech Bubbles ────────────────────────────────────
    sectionLabel(RX - 40, 56, '4. SpeechBubble (parchment + tail directions)');

    new SpeechBubble(this, {
      x: RX - 20, y: 80,
      text: '"Dadibee, focus!"',
      speaker: 'Flyer',
      tailDir: 'down',
    }).setDepth(20);

    new SpeechBubble(this, {
      x: RX + 230, y: 80,
      text: '"I\'m just plump"',
      speaker: 'Biggie',
      tailDir: 'left',
    }).setDepth(20);

    new SpeechBubble(this, {
      x: RX + 60, y: 172,
      text: '"Where is Mamibee?"',
      tailDir: 'up',
    }).setDepth(20);

    new SpeechBubble(this, {
      x: RX + 310, y: 172,
      text: '"IYKYK"',
      speaker: 'Pusher',
      tailDir: 'right',
    }).setDepth(20);

    // ── Wood Buttons ──────────────────────────────────────
    sectionLabel(RX - 40, 260, '5. WoodButton (plank-style, tap-friendly)');

    new WoodButton(this, {
      x: RX + 90, y: 306,
      text: 'Begin Quest',
      width: 220, height: 52,
      onClick: () => this.showFeedback('Begin Quest tapped!'),
    }).setDepth(20);

    new WoodButton(this, {
      x: RX + 350, y: 306,
      text: 'Buy Flowers',
      width: 180, height: 48,
      fontSize: FONT_SIZES.sm,
      onClick: () => this.showFeedback('Buy Flowers tapped!'),
    }).setDepth(20);

    // Disabled button
    const disabledBtn = new WoodButton(this, {
      x: RX + 90, y: 370,
      text: 'Locked Level',
      width: 220, height: 52,
    });
    disabledBtn.setEnabled(false).setDepth(20);

    // ── PixelText Sizes ───────────────────────────────────
    sectionLabel(RX - 40, 410, '6. PixelText (bitmap font at various sizes)');

    let ty = 434;
    const sizeEntries: [string, keyof typeof FONT_SIZES][] = [
      ['xs (8)', 'xs'], ['sm (12)', 'sm'], ['md (16)', 'md'], ['lg (24)', 'lg'],
    ];
    sizeEntries.forEach(([label, key]) => {
      hudText(this, RX - 20, ty + 2, label + ':', 10, PALETTE_CSS.mist);
      pxText(this, RX + 80, ty, 'Woodland Quest!', key, PALETTE.ivory);
      ty += FONT_SIZES[key] + SPACING.sm;
    });

    // ════════════════════════════════════════════════════════
    //  BOTTOM — HUD assembled preview
    // ════════════════════════════════════════════════════════
    sectionLabel(LX, 365, '7. Full HUD assembled (panel + icons + bars)');

    // Assembled HUD panel
    const hudPanel = new HUDPanel(this, {
      x: GAME_WIDTH / 4 + 20, y: 400,
      width: GAME_WIDTH / 2 - 10, height: 54,
      alpha: 0.95,
    });
    hudPanel.setDepth(30);

    // Hearts inside HUD
    const hudHearts = new IconCounter(this, LX + 20, 386, 'heart', { maxIcons: 3 });
    hudHearts.setValue(2);
    hudHearts.setDepth(31);

    // Diamonds inside HUD
    const hudDia = new IconCounter(this, LX + 100, 386, 'diamond');
    hudDia.setValue(15);
    hudDia.setDepth(31);

    // Bars inside HUD
    const hudPrep = new VineBar(this, {
      x: LX + 170, y: 388, width: 110,
      label: 'Prep', fillColor: PALETTE.forest3, borderColor: PALETTE.forest3, value: 35,
    });
    hudPrep.setDepth(31);

    const hudEnrg = new VineBar(this, {
      x: LX + 328, y: 388, width: 110,
      label: 'Enrg', fillColor: PALETTE.highlight1, borderColor: PALETTE.highlight1, value: 72,
    });
    hudEnrg.setDepth(31);

    const hudIntg = new VineBar(this, {
      x: LX + 486, y: 388, width: 110,
      label: 'Intg', fillColor: PALETTE.champagne, borderColor: PALETTE.champagne, value: 50,
    });
    hudIntg.setDepth(31);

    // Timer mock
    hudText(this, LX + 600, 390, '0:45', 18, PALETTE_CSS.highlight2).setDepth(31);

    // ════════════════════════════════════════════════════════
    //  INTERACTIVE DEMO — tap to toggle hearts
    // ════════════════════════════════════════════════════════
    sectionLabel(LX, 440, '8. Interactive: tap to cycle hearts');

    new WoodButton(this, {
      x: LX + 120, y: 478,
      text: 'Toggle Hearts',
      width: 200, height: 44,
      fontSize: FONT_SIZES.sm,
      onClick: () => {
        this.heartValue = (this.heartValue + 2) % 4; // cycle 3→2→1→0→3
        this.heartCounter.setValue(this.heartValue);
        hudHearts.setValue(this.heartValue);
      },
    }).setDepth(10);

    // Animated bar demo
    sectionLabel(LX + 280, 440, 'Animated bar:');
    const animBar = new VineBar(this, {
      x: LX + 280, y: 466, width: 200,
      label: 'Anim',
      fillColor: PALETTE.forest3, borderColor: PALETTE.forest3, value: 0,
    });
    animBar.setDepth(10);

    // Animate the bar value smoothly
    let animDir = 1;
    let animVal = 0;
    this.time.addEvent({
      delay: 40,
      loop: true,
      callback: () => {
        animVal += animDir * 1.2;
        if (animVal >= 100) { animVal = 100; animDir = -1; }
        if (animVal <= 0) { animVal = 0; animDir = 1; }
        animBar.setValue(animVal);
      },
    });

    // ════════════════════════════════════════════════════════
    //  FEEDBACK TEXT (hidden until button tap)
    // ════════════════════════════════════════════════════════
    this.feedbackText = hudText(this, GAME_WIDTH / 2, GAME_HEIGHT - 60, '', 14, PALETTE_CSS.highlight2)
      .setOrigin(0.5)
      .setDepth(50);

    // ════════════════════════════════════════════════════════
    //  NAVIGATION
    // ════════════════════════════════════════════════════════
    new WoodButton(this, {
      x: GAME_WIDTH - 120, y: GAME_HEIGHT - 34,
      text: 'Back to Intro',
      width: 200, height: 44,
      fontSize: FONT_SIZES.sm,
      onClick: () => this.scene.start(SCENES.INTRO),
    }).setDepth(50);

    // Keyboard shortcut
    this.input.keyboard?.on('keydown-ESC', () => {
      this.scene.start(SCENES.INTRO);
    });

    // ── DEV INFO ──────────────────────────────────────────
    this.add.text(16, GAME_HEIGHT - 16, 'Press U from Intro to return here | ESC to go back', {
      fontSize: '9px', fontFamily: 'monospace', color: PALETTE_CSS.mist,
    });
  }

  // ─── HELPERS ──────────────────────────────────────────────

  private feedbackText!: Phaser.GameObjects.Text;

  private showFeedback(msg: string): void {
    this.feedbackText.setText(msg).setAlpha(1);
    this.tweens.add({
      targets: this.feedbackText,
      alpha: 0,
      duration: 1200,
      delay: 600,
    });
  }
}
