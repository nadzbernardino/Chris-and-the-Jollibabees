/**
 * KitchenStoveScene — No tasks, just whey protein item.
 * Whey: tap → +1 heart (once).
 * Entry bubble: "I'm starving"
 */
import { SCENE, DESIGN_W, DESIGN_H } from '../constants';
import { store } from '../store/GameStoreNew';
import { BaseRoomScene } from './BaseRoomScene';
import { fxSparkle, fxHeartFlash } from '../fx';

export class KitchenStoveScene extends BaseRoomScene {
  constructor() { super(SCENE.KITCHEN_STOVE); }
  get bgKey() { return 'kitchen_stove_bg'; }
  get roomKey() { return SCENE.KITCHEN_STOVE; }
  get entryLines() { return ["I'm starving"]; }

  private wheyImg!: Phaser.GameObjects.Image;

  protected onRoomCreate(): void {
    // ── Whey protein ─────────────────────────────────────
    this.wheyImg = this.add.image(DESIGN_W * 0.62, DESIGN_H * 0.50, 'whey')
      .setScale(0.5).setDepth(10)
      .setInteractive({ useHandCursor: true });

    // Dim if already used
    if (store.s.wheyUses >= 2) this.wheyImg.setTint(0x888888);

    this.wheyImg.on('pointerdown', () => this.onWheyTap());
  }

  private onWheyTap(): void {
    if (store.s.wheyUses >= 2) {
      // Second click and beyond — Chris says this
      this.bubbleMgr.chrisSay('No more whey.', 2500);
      return;
    }
    // First click: +1 heart, Chris bubble
    store.useWhey();
    store.addHeart(1);
    this.hud.refresh();
    fxSparkle(this, this.wheyImg.x, this.wheyImg.y, 8, 40);
    fxHeartFlash(this, true);
    this.audio.heartGain();
    this.bubbleMgr.chrisSay('Protein boost!', 2500);
  }
}
