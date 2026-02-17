/**
 * FollowerSystem — Manages Chris sprite + jollibabee follower chain.
 * Call create() in each room scene, destroy() on exit.
 * Followers trail behind Chris with slight lag.
 *
 * Directional sprites:
 * - Chris: chris_right / chris_left based on movement
 * - JolliBig: jollibig_walk_left / jollibig_walk_right (scale 1.3)
 * - JolliBurrito: jolliburrito_fly_left / jolliburrito_fly_right (hovers)
 * - Others: jollibabee_left / jollibabee_right
 */
import Phaser from 'phaser';
import { store } from '../store/GameStoreNew';
import { JOLLIBABEES, DESIGN_H } from '../constants';
import { showBubble } from './SpeechBubbleNew';
import { sizeH, CHRIS_H, CHAR_Y } from '../spriteSize';

const CHRIS_Y = () => CHAR_Y;
const FOLLOWER_SPACING = 80;   // tighter so all 6 fit on screen with slight overlap
const HOVER_OFFSET = -50;

/** Shadow config */
const SHADOW_COLOR = 0x000000;
const SHADOW_ALPHA = 0.18;
const SHADOW_H = 14;

export class FollowerSystem {
  scene!: Phaser.Scene;
  chris!: Phaser.GameObjects.Image;
  followers: Phaser.GameObjects.Container[] = [];
  /** Image refs inside follower containers for texture swapping */
  private followerImages: Phaser.GameObjects.Image[] = [];
  private chrisShadow!: Phaser.GameObjects.Ellipse;
  private followerShadows: Phaser.GameObjects.Ellipse[] = [];
  chrisX = 200;
  private prevChrisX = 200;
  private facingRight = true;
  visible = true;

  create(scene: Phaser.Scene, startX = 200): void {
    this.scene = scene;
    this.chrisX = startX;
    this.prevChrisX = startX;
    this.followers = [];
    this.followerImages = [];

    // Chris — sized via sizeH for proportional height
    this.chris = scene.add.image(startX, CHRIS_Y(), 'chris_right')
      .setOrigin(0.5, 1)
      .setDepth(100);
    sizeH(this.chris, CHRIS_H);

    // Chris shadow
    this.chrisShadow = scene.add.ellipse(
      startX, CHRIS_Y() + 4, CHRIS_H * 0.45, SHADOW_H, SHADOW_COLOR, SHADOW_ALPHA,
    ).setDepth(99);

    // Build follower sprites for found jollibabees
    this.rebuildFollowers();
  }

  rebuildFollowers(): void {
    // Destroy old
    this.followers.forEach(c => c.destroy(true));
    this.followerShadows.forEach(s => s.destroy());
    this.followers = [];
    this.followerImages = [];
    this.followerShadows = [];

    const found = store.s.jollibabeesFound;
    found.forEach((jbIdx, i) => {
      const def = JOLLIBABEES[jbIdx];
      if (!def) return;

      const offsetX = -(i + 1) * FOLLOWER_SPACING;
      const yBase = CHRIS_Y() + (def.hover ? HOVER_OFFSET : 0);

      // Use the default (right-facing) asset initially — explicit height
      const img = this.scene.add.image(0, 0, def.assetKey)
        .setOrigin(0.5, 1);
      sizeH(img, def.height);

      // Name label above (name ONLY — no subtitle)
      const label = this.scene.add.text(0, -img.displayHeight - 8, def.name, {
        fontFamily: '"Press Start 2P", "Courier New", monospace',
        fontSize: '16px', color: '#FFE4B5',
        stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5, 1);

      const container = this.scene.add.container(
        this.chrisX + offsetX, yBase, [img, label],
      ).setDepth(99);

      // Tap interaction
      img.setInteractive({ useHandCursor: true });
      img.on('pointerdown', () => this.onJollibabeeClicked(jbIdx));

      // Hover bob for JolliBurrito
      if (def.hover) {
        this.scene.tweens.add({
          targets: container, y: yBase - 10,
          duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
      }

      this.followers.push(container);
      this.followerImages.push(img);

      // Follower shadow
      const shadow = this.scene.add.ellipse(
        this.chrisX + offsetX, CHRIS_Y() + 4,
        def.height * 0.4, SHADOW_H, SHADOW_COLOR, SHADOW_ALPHA,
      ).setDepth(98);
      this.followerShadows.push(shadow);
    });
  }

  /** Callback set by BaseRoomScene to delegate taps to SpeechBubbleManager */
  onTapCallback?: (jbIdx: number) => void;

  private onJollibabeeClicked(jbIdx: number): void {
    if (this.onTapCallback) {
      this.onTapCallback(jbIdx);
    }
  }

  update(delta: number): void {
    if (!this.visible) return;

    // Update Chris directional sprite based on movement
    const dx = this.chrisX - this.prevChrisX;
    if (dx > 1 && !this.facingRight) {
      this.facingRight = true;
      this.chris.setTexture('chris_right');
      sizeH(this.chris, CHRIS_H);
    } else if (dx < -1 && this.facingRight) {
      this.facingRight = false;
      this.chris.setTexture('chris_left');
      sizeH(this.chris, CHRIS_H);
    }
    this.prevChrisX = this.chrisX;

    // Update Chris shadow to follow
    if (this.chrisShadow) {
      this.chrisShadow.setPosition(this.chrisX, CHRIS_Y() + 4);
    }

    // Smooth follower trailing + update directional sprites
    // Closer followers (lower index) track faster so they don't lag behind
    const found = store.s.jollibabeesFound;
    this.followers.forEach((c, i) => {
      const targetX = this.chrisX - (i + 1) * FOLLOWER_SPACING;
      const prevX = c.x;
      // JolliCute (jbIdx 0) always lags behind — much slower lerp
      const jbIdx = found[i];
      const isJolliCute = jbIdx === 0;
      const baseLerp = 0.12 - (i * 0.01);
      const lerp = isJolliCute ? 0.03 : Math.max(baseLerp, 0.06);
      c.x += (targetX - c.x) * lerp;
      const fdx = c.x - prevX;

      // Update follower shadow position
      if (this.followerShadows[i]) {
        this.followerShadows[i].setPosition(c.x, CHRIS_Y() + 4);
      }

      // Swap jollibabee directional textures & re-apply explicit size
      const def = jbIdx != null ? JOLLIBABEES[jbIdx] : undefined;
      const img = this.followerImages[i];
      if (def && img) {
        if (fdx > 0.3) {
          img.setTexture(def.assetKeyRight);
          sizeH(img, def.height);
        } else if (fdx < -0.3) {
          img.setTexture(def.assetKeyLeft);
          sizeH(img, def.height);
        }
      }
    });
  }

  /** Move Chris to x */
  moveTo(x: number): void {
    this.chrisX = x;
    this.chris.setX(x);
  }

  setFacing(right: boolean): void {
    this.facingRight = right;
    this.chris.setTexture(right ? 'chris_right' : 'chris_left');
    sizeH(this.chris, CHRIS_H);
  }

  /** Hide Chris + followers (used during sleep) */
  hide(): void {
    this.visible = false;
    this.chris.setVisible(false);
    this.chrisShadow?.setVisible(false);
    this.followers.forEach(c => c.setVisible(false));
    this.followerShadows.forEach(s => s.setVisible(false));
  }

  /** Show Chris + followers */
  show(): void {
    this.visible = true;
    this.chris.setVisible(true);
    this.chrisShadow?.setVisible(true);
    this.followers.forEach(c => c.setVisible(true));
    this.followerShadows.forEach(s => s.setVisible(true));
  }

  /** Spawn a newly found jollibabee with name-only bubble */
  spawnNewJollibabee(jbIndex: number): void {
    if (store.foundJollibabee(jbIndex)) return;
    store.addJollibabee(jbIndex);
    this.rebuildFollowers();

    const def = JOLLIBABEES[jbIndex];
    const lastFollower = this.followers[this.followers.length - 1];
    if (lastFollower && def) {
      // Name ONLY — no subtitle
      showBubble(this.scene, lastFollower.x, lastFollower.y - 60, def.name, 3000);
    }
  }

  /** Get the container for a jollibabee by JOLLIBABEES index (or undefined) */
  getFollowerContainer(jbIdx: number): Phaser.GameObjects.Container | undefined {
    const found = store.s.jollibabeesFound;
    const arrayPos = found.indexOf(jbIdx);
    if (arrayPos === -1) return undefined;
    return this.followers[arrayPos];
  }

  /** Get position ref for a jollibabee by JOLLIBABEES index */
  getFollowerPos(jbIdx: number): { x: number; y: number } | undefined {
    const c = this.getFollowerContainer(jbIdx);
    if (!c) return undefined;
    return { x: c.x, y: c.y };
  }

  destroy(): void {
    this.chris?.destroy();
    this.chrisShadow?.destroy();
    this.followers.forEach(c => c.destroy(true));
    this.followerShadows.forEach(s => s.destroy());
    this.followers = [];
    this.followerImages = [];
    this.followerShadows = [];
    this.onTapCallback = undefined;
  }
}
