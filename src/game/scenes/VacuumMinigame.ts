/**
 * VacuumMinigame — Carpet background, scattered bugs + hair.
 * Drag vacuum_nossel over debris to remove them.
 * When all removed → callback from registry, return to LivingRoom.
 */
import Phaser from 'phaser';
import { SCENE, DESIGN_W, DESIGN_H } from '../constants';
import { TEXT, PIXEL_FONT, PAL_CSS } from '../uiTheme';
import { AudioManager } from '../audio/AudioManager';
import { fxPoof, fxScreenShake } from '../fx';
import { sizeH, MINI_DEBRIS_H, MINI_NOZZLE_H } from '../spriteSize';

const DEBRIS_ITEMS = [
  { key: 'bug',  x: 300, y: 400 },
  { key: 'hair', x: 600, y: 350 },
  { key: 'bug',  x: 900, y: 500 },
  { key: 'hair', x: 450, y: 650 },
  { key: 'bug',  x: 750, y: 700 },
  { key: 'hair', x: 1100, y: 450 },
];

export class VacuumMinigame extends Phaser.Scene {
  constructor() { super(SCENE.VACUUM_MINI); }

  private nozzle!: Phaser.GameObjects.Image;
  private debrisSprites: Phaser.GameObjects.Image[] = [];
  private cleaned = 0;
  private total = DEBRIS_ITEMS.length;
  private label!: Phaser.GameObjects.Text;
  private audio!: AudioManager;

  create(): void {
    // Reset state for re-entry (Phaser reuses scene instances)
    this.cleaned = 0;
    this.debrisSprites = [];
    this.audio = new AudioManager(this);

    // Background
    this.add.image(DESIGN_W / 2, DESIGN_H / 2, 'carpet')
      .setDisplaySize(DESIGN_W, DESIGN_H).setDepth(0);

    // Instruction
    this.label = this.add.text(DESIGN_W / 2, 40, `Vacuum debris: ${this.cleaned}/${this.total}`, {
      ...TEXT.instruction,
    }).setOrigin(0.5).setDepth(20);

    // Debris
    DEBRIS_ITEMS.forEach((d) => {
      const s = this.add.image(d.x, d.y, d.key)
        .setDepth(5);
      sizeH(s, MINI_DEBRIS_H);
      this.debrisSprites.push(s);
    });

    // Nozzle (drag to clean)
    this.nozzle = this.add.image(DESIGN_W / 2, DESIGN_H - 120, 'vacuum_nossel')
      .setDepth(10)
      .setInteractive({ useHandCursor: true, draggable: true });
    sizeH(this.nozzle, MINI_NOZZLE_H);

    this.input.setDraggable(this.nozzle);
    this.input.on('drag', (_p: any, obj: Phaser.GameObjects.Image, dx: number, dy: number) => {
      if (obj === this.nozzle) obj.setPosition(dx, dy);
    });

    // Check overlap each move
    this.input.on('pointermove', () => this.checkOverlap());

    // Close button
    const closeBtn = this.add.text(DESIGN_W - 60, 20, '✕', {
      fontFamily: PIXEL_FONT, fontSize: '32px', color: PAL_CSS.danger,
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5, 0).setDepth(30).setInteractive({ useHandCursor: true });

    closeBtn.on('pointerdown', () => this.exitMinigame(false));
  }

  private checkOverlap(): void {
    const nx = this.nozzle.x;
    const ny = this.nozzle.y;
    const range = 70;

    for (let i = this.debrisSprites.length - 1; i >= 0; i--) {
      const s = this.debrisSprites[i];
      if (!s.active) continue;
      const dist = Phaser.Math.Distance.Between(nx, ny, s.x, s.y);
      if (dist < range) {
        // FX: dust poof at debris + vacuum tick + subtle nozzle shake
        fxPoof(this, s.x, s.y, 4);
        this.audio.vacuumTick();
        fxScreenShake(this, 0.002, 80);
        s.destroy();
        this.debrisSprites.splice(i, 1);
        this.cleaned++;
        this.label.setText(`Vacuum debris: ${this.cleaned}/${this.total}`);

        if (this.cleaned >= this.total) {
          this.time.delayedCall(500, () => this.exitMinigame(true));
        }
      }
    }
  }

  private exitMinigame(success: boolean): void {
    if (success) {
      const cb = this.registry.get('vacuumCallback') as (() => void) | undefined;
      this.registry.remove('vacuumCallback');
      this.scene.stop();
      this.scene.resume(SCENE.WORLD);
      cb?.();
    } else {
      this.registry.remove('vacuumCallback');
      this.scene.stop();
      this.scene.resume(SCENE.WORLD);
    }
  }
}
