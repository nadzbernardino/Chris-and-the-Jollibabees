/**
 * BedroomScene — Sleep task + Mirror prompt.
 * Bed: tap → swap bed/bed_with_chris, hide characters, after 3s restore.
 *   Sleep restores 1 heart.
 * Mirror: tap → modal with 4 options (+1 or -1 heart each).
 * Spawns JolliBig (index 4) after sleep or mirror.
 */
import { SCENE, DESIGN_W, DESIGN_H } from '../constants';
import { store } from '../store/GameStoreNew';
import { BaseRoomScene } from './BaseRoomScene';
import { showBubble } from '../ui/SpeechBubbleNew';
import { fxShimmer, fxSparkle, fxHeartFlash, fxOuchFlicker } from '../fx';

const TASK_SLEEP = 'sleep';

export class BedroomScene extends BaseRoomScene {
  constructor() { super(SCENE.BEDROOM); }
  get bgKey() { return 'bedroom_bg'; }
  get roomKey() { return SCENE.BEDROOM; }
  get entryLines() { return ['I should get some rest']; }

  private bedImg!: Phaser.GameObjects.Image;
  private bedChrisImg!: Phaser.GameObjects.Image;
  private mirrorImg!: Phaser.GameObjects.Image;
  private sleeping = false;
  private mirrorUsed = false;

  protected onRoomCreate(): void {
    const sleepDone = this.isTaskDone(TASK_SLEEP);

    // ── Bed ──────────────────────────────────────────────
    this.bedImg = this.add.image(DESIGN_W * 0.45, DESIGN_H * 0.58, 'bed')
      .setScale(0.55).setDepth(10)
      .setInteractive({ useHandCursor: true });

    this.bedChrisImg = this.add.image(DESIGN_W * 0.45, DESIGN_H * 0.58, 'bed_with_chris')
      .setScale(0.55).setDepth(10)
      .setVisible(false);

    if (!sleepDone) {
      this.bedImg.on('pointerdown', () => this.onBedTap());
    } else {
      // Already slept — show normal bed
    }

    // ── Mirror ───────────────────────────────────────────
    this.mirrorImg = this.add.image(DESIGN_W * 0.82, DESIGN_H * 0.38, 'mirror')
      .setScale(0.5).setDepth(10)
      .setInteractive({ useHandCursor: true });
    this.mirrorImg.on('pointerdown', () => this.showMirrorPrompt());

    if (sleepDone) this.trySpawnRoomJollibabee();
  }

  private onBedTap(): void {
    if (this.sleeping || this.isTaskDone(TASK_SLEEP)) return;
    this.sleeping = true;

    // Swap to bed_with_chris, hide followers
    this.bedImg.setVisible(false);
    this.bedChrisImg.setVisible(true);
    // FX: shimmer on bed swap
    fxShimmer(this, this.bedChrisImg.x, this.bedChrisImg.y, 8, 50);
    this.followers.hide();

    // Dim
    const dim = this.add.rectangle(DESIGN_W / 2, DESIGN_H / 2, DESIGN_W, DESIGN_H, 0x000000, 0)
      .setDepth(50);
    this.tweens.add({ targets: dim, alpha: 0.6, duration: 800 });

    const zzz = this.add.text(DESIGN_W / 2, DESIGN_H / 2 - 140, '💤 Sleeping...', {
      fontSize: '22px', fontFamily: '"Press Start 2P", "Courier New", monospace', color: '#F4C76A',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(51);

    // After 3 seconds, restore
    this.time.delayedCall(3000, () => {
      dim.destroy();
      zzz.destroy();
      this.bedChrisImg.setVisible(false);
      this.bedImg.setVisible(true);
      // FX: shimmer back on bed restore
      fxShimmer(this, this.bedImg.x, this.bedImg.y, 8, 50);
      this.followers.show();
      this.sleeping = false;

      this.markTaskDone(TASK_SLEEP);
      store.addHeart(1);
      this.hud.refresh();
      fxHeartFlash(this, true);
      fxSparkle(this, this.bedImg.x, this.bedImg.y - 40, 12, 70);
      this.audio.heartGain();
      this.showTaskCompleteBubble();
      this.trySpawnRoomJollibabee(); // JolliBig
    });
  }

  private showMirrorPrompt(): void {
    if (this.modal.isOpen || this.sleeping || this.mirrorUsed) return;
    this.mirrorUsed = true;

    this.modal.show({
      title: '🪞 Mirror Reflection',
      body: 'You look at yourself. How do you feel?',
      height: 480,
      buttons: [
        {
          label: 'Looking good!',
          callback: () => {
            store.addHeart(1); this.hud.refresh();
            fxHeartFlash(this, true);
            fxSparkle(this, this.mirrorImg.x, this.mirrorImg.y, 8, 50);
            this.audio.heartGain();
            this.mirrorFeedback('+1 ❤️');
          },
          color: 0x336633,
        },
        {
          label: 'I can do better',
          callback: () => {
            store.addHeart(1); this.hud.refresh();
            fxHeartFlash(this, true);
            fxSparkle(this, this.mirrorImg.x, this.mirrorImg.y, 8, 50);
            this.audio.heartGain();
            this.mirrorFeedback('+1 ❤️ Motivated!');
          },
          color: 0x336633,
        },
        {
          label: 'Meh...',
          callback: () => {
            store.removeHeart(1); this.hud.refresh();
            fxOuchFlicker(this);
            this.audio.bloop();
            this.mirrorFeedback('-1 ❤️');
            this.checkGameOver();
          },
          color: 0x993333,
        },
        {
          label: 'Not great',
          callback: () => {
            store.removeHeart(1); this.hud.refresh();
            fxOuchFlicker(this);
            this.audio.bloop();
            this.mirrorFeedback('-1 ❤️');
            this.checkGameOver();
          },
          color: 0x993333,
        },
      ],
    });
  }

  private mirrorFeedback(msg: string): void {
    showBubble(this, this.mirrorImg.x, this.mirrorImg.y - 80, msg, 2000);
  }
}
