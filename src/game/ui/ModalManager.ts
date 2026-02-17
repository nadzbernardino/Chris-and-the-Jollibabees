/**
 * ModalManager — Cottage-fantasy wood-plaque modal.
 * Only closes via its own buttons (clicking outside does NOT close).
 * Pauses jollibabee speech while open.
 * Uses pixel font + parchment/wood palette from uiTheme.
 *
 * Supports optional image display inside the modal body.
 * Popup cooldown system prevents back-to-back popups.
 */
import Phaser from 'phaser';
import { DESIGN_W, DESIGN_H } from '../constants';
import {
  PAL, PAL_CSS, TEXT, UI, BTN, MODAL, drawPlaque, PIXEL_FONT,
} from '../uiTheme';
import { fxPop } from '../fx';
import { sizeH } from '../spriteSize';

export interface ModalButton {
  label: string;
  callback: () => void;
  color?: number; // override button fill
  style?: 'success' | 'danger'; // convenience preset
}

export interface ModalConfig {
  title: string;
  body?: string;
  /** Optional texture key to display as an image inside the modal */
  imageKey?: string;
  /** Display height of the modal image (default 160) */
  imageHeight?: number;
  buttons: ModalButton[];
  width?: number;
  height?: number;
  countdown?: number;
  onTimeout?: () => void;
}

// ─── Popup Cooldown System ─────────────────────────────
/** Global cooldown between any popup (ms) */
const POPUP_COOLDOWN_MS = 20_000;
/** Per-type cooldowns (ms) */
const TYPE_COOLDOWNS: Record<string, number> = {
  temptation: 40_000,
  whalecoin:  45_000,
  doomscroll: 30_000,
  darmesh:    60_000,
};

/** Track last popup timestamps globally */
const _lastPopupTime: { global: number; byType: Record<string, number> } = {
  global: 0,
  byType: {},
};

/** Check if a popup of the given type can fire now */
export function canShowPopup(type?: string): boolean {
  const now = Date.now();
  if (now - _lastPopupTime.global < POPUP_COOLDOWN_MS) return false;
  if (type && _lastPopupTime.byType[type]) {
    const typeCooldown = TYPE_COOLDOWNS[type] ?? POPUP_COOLDOWN_MS;
    if (now - _lastPopupTime.byType[type] < typeCooldown) return false;
  }
  return true;
}

/** Mark that a popup just appeared */
export function markPopupShown(type?: string): void {
  const now = Date.now();
  _lastPopupTime.global = now;
  if (type) _lastPopupTime.byType[type] = now;
}

export class ModalManager {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;
  private blocker: Phaser.GameObjects.Rectangle | null = null;
  private timer?: Phaser.Time.TimerEvent;
  private countdownText?: Phaser.GameObjects.Text;
  private countdownValue = 0;
  /** Track active button hitZones so we can clean up listeners */
  private activeHitZones: Phaser.GameObjects.Rectangle[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  get isOpen(): boolean {
    return this.container !== null;
  }

  show(cfg: ModalConfig): void {
    // Always close previous modal first (cleans up listeners)
    if (this.isOpen) this.close();

    const w = cfg.width ?? MODAL.width;
    const h = cfg.height ?? (cfg.buttons.length > 2 ? 460 : MODAL.height);
    const cx = DESIGN_W / 2;
    const cy = DESIGN_H / 2;
    const left = cx - w / 2;
    const top = cy - h / 2;

    // ── Fullscreen input blocker ─────────────────────────
    this.blocker = this.scene.add.rectangle(cx, cy, DESIGN_W, DESIGN_H, PAL.overlay, MODAL.overlayAlpha)
      .setScrollFactor(0)
      .setDepth(900)
      .setInteractive();

    this.container = this.scene.add.container(0, 0)
      .setScrollFactor(0)
      .setDepth(901);

    // ── Wood plaque panel ────────────────────────────────
    const panel = this.scene.add.graphics();
    drawPlaque(panel, left, top, w, h, MODAL.panelFill, MODAL.panelStroke);
    // Inner dark inset  
    panel.fillStyle(MODAL.innerFill, 0.45);
    panel.fillRoundedRect(left + 8, top + 8, w - 16, h - 16, UI.radius - 2);
    this.container.add(panel);

    // ── Title ────────────────────────────────────────────
    const titleObj = this.scene.add.text(cx, top + 38, cfg.title, {
      ...TEXT.heading,
      wordWrap: { width: w - 40 },
      align: 'center',
    }).setOrigin(0.5);
    this.container.add(titleObj);

    let nextY = titleObj.y + titleObj.height / 2 + 24;

    // ── Optional Image ───────────────────────────────────
    if (cfg.imageKey && this.scene.textures.exists(cfg.imageKey)) {
      const imgH = cfg.imageHeight ?? 160;
      const img = this.scene.add.image(cx, nextY + imgH / 2, cfg.imageKey)
        .setDepth(902);
      sizeH(img, imgH);
      this.container.add(img);
      nextY += imgH + 16;
    }

    // ── Body text ────────────────────────────────────────
    if (cfg.body) {
      const bodyObj = this.scene.add.text(cx, nextY, cfg.body, {
        ...TEXT.body,
        wordWrap: { width: w - 60 },
        align: 'center',
      }).setOrigin(0.5, 0);
      this.container.add(bodyObj);
      nextY = bodyObj.y + bodyObj.height + 24;
    }

    // ── Countdown ────────────────────────────────────────
    if (cfg.countdown && cfg.countdown > 0) {
      this.countdownValue = cfg.countdown;
      this.countdownText = this.scene.add.text(cx, nextY, `${this.countdownValue}`, {
        fontFamily: PIXEL_FONT,
        fontSize: '42px',
        color: PAL_CSS.danger,
        stroke: '#000000',
        strokeThickness: 4,
      }).setOrigin(0.5, 0);
      this.container.add(this.countdownText);
      nextY += 48;

      this.timer = this.scene.time.addEvent({
        delay: 1000,
        repeat: cfg.countdown - 1,
        callback: () => {
          this.countdownValue--;
          if (this.countdownText) this.countdownText.setText(`${this.countdownValue}`);
          if (this.countdownValue <= 0) {
            const cb = cfg.onTimeout ?? cfg.buttons[cfg.buttons.length - 1]?.callback;
            this.close();
            cb?.();
          }
        },
      });
    }

    // ── Buttons ──────────────────────────────────────────
    this.activeHitZones = [];
    const btnW = UI.btnW;
    const btnH = UI.btnH;
    const gap = 14;
    const totalBtnH = cfg.buttons.length * (btnH + gap) - gap;
    let btnY = Math.max(nextY + 12, cy + h / 2 - totalBtnH - 28);

    cfg.buttons.forEach((btn) => {
      const preset = btn.style === 'success' ? BTN.success
        : btn.style === 'danger' ? BTN.danger
        : BTN.idle;

      const fillColor = btn.color ?? preset.fill;
      const borderColor = preset.border;

      // Button bg with pixel border
      const btnGfx = this.scene.add.graphics();
      const bx = cx - btnW / 2;
      const by = btnY;
      drawPlaque(btnGfx, bx, by, btnW, btnH, fillColor, borderColor);

      // Hit area — scene-level (NOT in container) so hit testing works
      // with camera zoom + container scrollFactor(0).
      const hitZone = this.scene.add.rectangle(cx, by + btnH / 2, btnW, btnH, 0x000000, 0)
        .setScrollFactor(0)
        .setDepth(903)
        .setInteractive({ useHandCursor: true });

      const lbl = this.scene.add.text(cx, by + btnH / 2, btn.label, {
        ...TEXT.button,
      }).setOrigin(0.5);

      // Capture callback reference
      const btnCallback = btn.callback;

      // Hover / press feedback
      hitZone.on('pointerover', () => {
        btnGfx.clear();
        drawPlaque(btnGfx, bx, by, btnW, btnH, preset.highlight, preset.border);
        lbl.setScale(1.03);
      });
      hitZone.on('pointerout', () => {
        btnGfx.clear();
        drawPlaque(btnGfx, bx, by, btnW, btnH, fillColor, borderColor);
        lbl.setScale(1);
      });
      hitZone.on('pointerdown', () => {
        if (!this.isOpen) return;
        lbl.setScale(0.96);
        this.close();
        btnCallback();
      });

      this.activeHitZones.push(hitZone);
      // Visual elements go in the container (animation + auto-destroy);
      // hitZone stays scene-level for reliable input with camera zoom.
      this.container!.add([btnGfx, lbl]);
      btnY += btnH + gap;
    });

    // Pop-in
    this.container.setScale(0.85).setAlpha(0);
    this.scene.tweens.add({
      targets: this.container,
      scaleX: 1, scaleY: 1, alpha: 1,
      duration: 200, ease: 'Back.easeOut',
    });
    // FX: pop at modal center
    fxPop(this.scene, cx, cy);
  }

  close(): void {
    // FX: small reverse pop at modal center before destroying
    if (this.container) {
      const cx = DESIGN_W / 2;
      const cy = DESIGN_H / 2;
      fxPop(this.scene, cx, cy, 0.6);
    }
    // Clean up button hitZones (scene-level, not in container)
    this.activeHitZones.forEach(hz => {
      hz.removeAllListeners();
      hz.disableInteractive();
      hz.destroy();
    });
    this.activeHitZones = [];

    this.timer?.remove();
    this.timer = undefined;
    this.blocker?.destroy();
    this.blocker = null;
    this.container?.destroy(true);
    this.container = null;
  }

  destroy(): void {
    if (this.isOpen) this.close();
  }
}
