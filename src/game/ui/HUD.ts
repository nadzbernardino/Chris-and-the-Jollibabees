import Phaser from 'phaser';
import { GAME_WIDTH, PALETTE, PALETTE_CSS } from '../config';
import { store } from '../store/GameStore';
import { HUDPanel } from './HUDPanel';
import { IconCounter } from './IconCounter';
import { VineBar } from './VineBar';
import { hudText } from './PixelTextHelper';

/** Safe-area inset from top edge (mobile notch / status bar) */
const SAFE_AREA_TOP = 8;

/** Panel interior height */
const HUD_HEIGHT = 56;

/**
 * Carved-wood HUD: camera-fixed with safe-area padding.
 * Wooden plaque, pixel-art heart/diamond icons, vine bars, optional timer.
 * SPRITE_SWAP: procedural icons can be replaced with real sprite assets.
 */
export class HUD {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private panel!: HUDPanel;
  private heartCounter!: IconCounter;
  private diamondCounter!: IconCounter;
  private prepBar!: VineBar;
  private energyBar!: VineBar;
  private integrityBar!: VineBar;
  private timerText?: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  create(showTimer = false): void {
    // ─── MASTER CONTAINER (camera-fixed) ────────────────
    this.container = this.scene.add.container(0, 0)
      .setDepth(90)
      .setScrollFactor(0);

    // ─── WOOD PLAQUE BACKGROUND ─────────────────────────
    const panelY = SAFE_AREA_TOP + HUD_HEIGHT / 2;
    this.panel = new HUDPanel(this.scene, {
      x: GAME_WIDTH / 2,
      y: panelY,
      width: GAME_WIDTH - 20,
      height: HUD_HEIGHT,
      alpha: 0.93,
    });
    // Move panel into HUD container (auto-removed from scene display list)
    this.container.add(this.panel.container);

    // Y baseline for icons / bars inside the panel
    const contentY = SAFE_AREA_TOP + 16;

    // ─── HEARTS (3 pixel-art icons) ──────── SPRITE_SWAP
    this.heartCounter = new IconCounter(this.scene, 20, contentY, 'heart', { maxIcons: 3 });
    this.container.add(this.heartCounter.container);

    // ─── DIAMONDS (icon + count) ─────────── SPRITE_SWAP
    this.diamondCounter = new IconCounter(this.scene, 95, contentY, 'diamond');
    this.container.add(this.diamondCounter.container);

    // ─── VINE / WOOD BARS ───────────────────────────────
    const barWidth = 130;
    const barY = contentY + 2;

    this.prepBar = new VineBar(this.scene, {
      x: 170, y: barY,
      width: barWidth,
      label: 'Prep',
      fillColor: PALETTE.forest3,
      borderColor: PALETTE.forest3,
    });
    this.container.add(this.prepBar.container);

    this.energyBar = new VineBar(this.scene, {
      x: 360, y: barY,
      width: barWidth,
      label: 'Enrg',
      fillColor: PALETTE.highlight1,
      borderColor: PALETTE.highlight1,
      labelColor: PALETTE_CSS.highlight2,
    });
    this.container.add(this.energyBar.container);

    this.integrityBar = new VineBar(this.scene, {
      x: 550, y: barY,
      width: barWidth,
      label: 'Intg',
      fillColor: PALETTE.champagne,
      borderColor: PALETTE.champagne,
      labelColor: PALETTE_CSS.champagne,
    });
    this.container.add(this.integrityBar.container);

    // ─── TIMER (optional, right-aligned) ────────────────
    if (showTimer) {
      this.timerText = hudText(this.scene, GAME_WIDTH - 28, contentY, '', 22, PALETTE_CSS.highlight2)
        .setOrigin(1, 0);
      this.container.add(this.timerText);
    }

    this.refresh();
  }

  /** Sync HUD display with current store values */
  refresh(timerSeconds?: number): void {
    const s = store.stats;

    this.heartCounter.setValue(s.hearts);
    this.diamondCounter.setValue(s.diamonds);
    this.prepBar.setValue(s.preparation);
    this.energyBar.setValue(s.energy);
    this.integrityBar.setValue(s.integrity);

    // Timer
    if (this.timerText && timerSeconds !== undefined) {
      const mins = Math.floor(timerSeconds / 60);
      const secs = timerSeconds % 60;
      this.timerText.setText(`${mins}:${secs.toString().padStart(2, '0')}`);

      if (timerSeconds <= 10) {
        this.timerText.setColor(PALETTE_CSS.danger);
      } else {
        this.timerText.setColor(PALETTE_CSS.highlight2);
      }
    }
  }

  /** Alias for backward compatibility */
  update(timerSeconds?: number): void {
    this.refresh(timerSeconds);
  }

  show(): void {
    this.container.setVisible(true);
  }

  hide(): void {
    this.container.setVisible(false);
  }

  destroy(): void {
    // Panel is nested inside container — destroy(true) cleans up everything
    this.container?.destroy(true);
  }
}
