/**
 * SpeechBubbleManager — Manages multiple concurrent speech bubbles
 * attached to speakers (Chris or jollibabees).
 *
 * Features:
 *  - Chris-only lines (coffee/whey)
 *  - Jollibabee scenario-locked lines (Darmesh, Mamibee, bug)
 *  - Ambient jollibabee chatter every 3–6s (max 3 visible)
 *  - Tap interaction (any jollibabee)
 *  - JolliLite pushes JolliCute periodically
 *  - "You're big" → JolliBig replies "I'm not big. I'm just plump"
 *  - Bubbles auto-hide ~2.5s, clamp to camera, follow speakers
 */
import Phaser from 'phaser';
import { JOLLIBABEES } from '../constants';
import { store } from '../store/GameStoreNew';
import { SpeechBubble } from './SpeechBubbleNew';

// ═══════════════════════════════════════════════════════════
//  LINE POOLS
// ═══════════════════════════════════════════════════════════

/** Global pool — any found jollibabee can say these */
const GLOBAL_LINES = [
  'Dadibee, focus',
  "It's not that haard",
  'IYKYK',
  "That's right",
  'Where is Mamibee?',
  'Oooh what\'s that?',
  'Dadibee we want honey',
  'sleeping time',
];

/** Per-jollibabee personal pools (index in JOLLIBABEES) */
const PERSONAL_LINES: Record<number, string[]> = {
  // 0 = JolliCute
  0: ['are you okay?'],
  // 1 = JolliBart
  1: ['Oh a bug *sprays*', 'I want to go to the BART', 'Yeah, it\'s very popular here in the Bay area'],
  // 2 = JolliLite (pusher)
  2: ['You\'re big', 'I can\'t see! you\'re so big'],
  // 3 = JolliBurrito
  3: ['yeah, iykyk', "I want to be like you, Dadibee, a gamer"],
  // 4 = JolliBig
  4: ['Dadibee, I\'m growing', "let's play, Dadibee!"],
  // 5 = JolliBay
  5: ["I want to be like you, Dadibee, a carpenter", "Ohh it's a flower!"],
};

/** Reply pairs: if JolliLite says X, JolliBig replies Y */
const REPLY_PAIRS: { trigger: { speaker: number; line: string }; reply: { speaker: number; line: string } }[] = [
  {
    trigger: { speaker: 2, line: "You're big" },
    reply: { speaker: 4, line: "I'm not big. I'm just plump" },
  },
  {
    trigger: { speaker: 2, line: "I can't see! you're so big" },
    reply: { speaker: 4, line: "No, I'm just plump" },
  },
];

/** Tap extras — 50% chance one is appended after "stop it, dadibee" */
const TAP_EXTRAS = [
  "where's mamibee?",
  "it's not that hard",
  'I mean..',
  'Yeah that\'s right',
];

// ═══════════════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════════════

interface ActiveBubble {
  bubble: SpeechBubble;
  /** Live getter that returns current speaker position each frame */
  getPos: (() => { x: number; y: number } | undefined) | null;
  /** When to auto-remove (scene time) */
  expiry: number;
}

interface SpeakerRef {
  x: number;
  y: number;
}

// ═══════════════════════════════════════════════════════════
//  MANAGER
// ═══════════════════════════════════════════════════════════

export class SpeechBubbleManager {
  private scene!: Phaser.Scene;
  private activeBubbles: ActiveBubble[] = [];
  private ambientTimer?: Phaser.Time.TimerEvent;
  private pushTimer?: Phaser.Time.TimerEvent;
  private paused = false;

  /** External refs set by BaseRoomScene after followers are created */
  private getChris: (() => SpeakerRef | undefined) | null = null;
  private getFollower: ((jbIdx: number) => SpeakerRef | undefined) | null = null;
  private getFollowerContainer: ((jbIdx: number) => Phaser.GameObjects.Container | undefined) | null = null;

  /** Only 1 bubble visible at a time */
  readonly MAX_VISIBLE = 1;

  /** Queued bubbles waiting to show */
  private queue: { pos: SpeakerRef; text: string; duration: number; trackFn: (() => { x: number; y: number } | undefined) | null }[] = [];
  /** Minimum gap (ms) between consecutive bubbles */
  private readonly BUBBLE_GAP = 800;

  // ─── INIT ──────────────────────────────────────────────

  create(
    scene: Phaser.Scene,
    getChris: () => SpeakerRef | undefined,
    getFollower: (jbIdx: number) => SpeakerRef | undefined,
    getFollowerContainer: (jbIdx: number) => Phaser.GameObjects.Container | undefined,
  ): void {
    this.scene = scene;
    this.getChris = getChris;
    this.getFollower = getFollower;
    this.getFollowerContainer = getFollowerContainer;
    this.activeBubbles = [];
    this.paused = false;

    this.startAmbientChatter();
    this.startPushBehavior();
  }

  destroy(): void {
    this.ambientTimer?.remove();
    this.pushTimer?.remove();
    this.activeBubbles.forEach(ab => {
      try { ab.bubble.container?.destroy(true); } catch { /* noop */ }
    });
    this.activeBubbles = [];
  }

  pause(): void { this.paused = true; }
  resume(): void { this.paused = false; }
  get isPaused(): boolean { return this.paused; }

  // ─── UPDATE (call every frame) ─────────────────────────

  update(): void {
    const now = this.scene.time.now;

    // Remove expired bubbles
    for (let i = this.activeBubbles.length - 1; i >= 0; i--) {
      if (now >= this.activeBubbles[i].expiry) {
        try { this.activeBubbles[i].bubble.container?.destroy(true); } catch { /* noop */ }
        this.activeBubbles.splice(i, 1);
      }
    }

    // Reposition active bubbles to follow speakers (camera-relative clamping)
    const cam = this.scene.cameras.main;
    for (const ab of this.activeBubbles) {
      const pos = ab.getPos?.();
      if (pos && ab.bubble.container?.active) {
        const sx = pos.x;
        const sy = pos.y;
        const halfW = (ab.bubble.container.width || 120) / 2;
        const clampedX = Phaser.Math.Clamp(sx, cam.scrollX + halfW + 20, cam.scrollX + cam.width - halfW - 20);
        const clampedY = Phaser.Math.Clamp(sy - 90, cam.scrollY + 30, cam.scrollY + cam.height - 60);
        ab.bubble.container.setPosition(clampedX, clampedY);
      }
    }
  }

  // ─── PUBLIC: CHRIS BUBBLE ──────────────────────────────

  /** Show a speech bubble above Chris */
  chrisSay(text: string, duration = 2500): void {
    const chris = this.getChris?.();
    if (!chris) return;
    this.spawnBubble(chris, text, duration, () => this.getChris?.());
  }

  // ─── PUBLIC: JOLLIBABEE BUBBLE ─────────────────────

  /** Show a speech bubble above a specific jollibabee (by JOLLIBABEES index) */
  jbSay(jbIdx: number, text: string, duration = 2500): void {
    const ref = this.getFollower?.(jbIdx);
    if (!ref) return;
    // Use container as live position source so bubble tracks movement
    const container = this.getFollowerContainer?.(jbIdx);
    this.spawnBubble(ref, text, duration, container
      ? () => ({ x: container.x, y: container.y })
      : null,
    );
  }

  /** Show a bubble above a random found jollibabee */
  jbSayRandom(text: string, duration = 2500): void {
    const found = store.s.jollibabeesFound;
    if (found.length === 0) return;
    const jbIdx = found[Math.floor(Math.random() * found.length)];
    this.jbSay(jbIdx, text, duration);
  }

  // ─── PUBLIC: SCENARIO-LOCKED LINES ─────────────────────

  /** Darmesh call starts → one jollibabee says "Hi, Darmesh!" */
  onDarmeshCallStart(): void {
    this.jbSayRandom('Hi, Darmesh!', 2500);
  }

  /** Darmesh call ends → one jollibabee says "Goodbye, Darmesh!" */
  onDarmeshCallEnd(): void {
    this.jbSayRandom('Goodbye, Darmesh!', 2500);
  }

  /** Mamibee appears → one jollibabee says "Mamibee!" */
  onMamibeeAppears(): void {
    this.jbSayRandom('Mamibee!', 3000);
  }

  /** Vacuum bug seen → JolliBart says "Eww a bug *sprays*" */
  onBugSeen(): void {
    const found = store.s.jollibabeesFound;
    if (found.includes(1)) {
      this.jbSay(1, 'Eww a bug *sprays*', 2500);
    }
  }

  // ─── PUBLIC: TAP INTERACTION ───────────────────────────

  /** Called when any jollibabee is tapped */
  onJollibabeeTapped(jbIdx: number): void {
    if (this.paused) return;
    let msg = 'stop it, dadibee';
    if (Math.random() < 0.5) {
      const extra = TAP_EXTRAS[Math.floor(Math.random() * TAP_EXTRAS.length)];
      msg += '\n' + extra;
    }
    this.jbSay(jbIdx, msg, 2500);
  }

  // ─── AMBIENT CHATTER ──────────────────────────────────

  private startAmbientChatter(): void {
    const scheduleNext = () => {
      const delay = 3000 + Math.random() * 3000; // 3–6s
      this.ambientTimer = this.scene.time.delayedCall(delay, () => {
        if (!this.paused) {
          this.emitAmbientLine();
        }
        scheduleNext();
      });
    };
    scheduleNext();
  }

  private emitAmbientLine(): void {
    const found = store.s.jollibabeesFound;
    if (found.length === 0) return;
    if (this.activeBubbles.length >= this.MAX_VISIBLE) return;

    // Pick a random found jollibabee
    const jbIdx = found[Math.floor(Math.random() * found.length)];

    // Build pool: global + personal
    const pool = [...GLOBAL_LINES];
    if (PERSONAL_LINES[jbIdx]) {
      pool.push(...PERSONAL_LINES[jbIdx]);
    }

    const line = pool[Math.floor(Math.random() * pool.length)];
    this.jbSay(jbIdx, line, 2500);

    // Check for reply triggers
    this.checkReplyTrigger(jbIdx, line);
  }

  private checkReplyTrigger(speakerIdx: number, line: string): void {
    for (const pair of REPLY_PAIRS) {
      if (pair.trigger.speaker === speakerIdx && pair.trigger.line === line) {
        // Only reply if the reply speaker is found
        if (store.s.jollibabeesFound.includes(pair.reply.speaker)) {
          this.scene.time.delayedCall(800, () => {
            this.jbSay(pair.reply.speaker, pair.reply.line, 2500);
          });
        }
      }
    }
  }

  // ─── PUSH BEHAVIOR (JolliLite → JolliCute) ────────────

  private startPushBehavior(): void {
    const scheduleNext = () => {
      const delay = 8000 + Math.random() * 6000; // 8–14s
      this.pushTimer = this.scene.time.delayedCall(delay, () => {
        if (!this.paused) {
          this.tryPush();
        }
        scheduleNext();
      });
    };
    scheduleNext();
  }

  private tryPush(): void {
    const found = store.s.jollibabeesFound;
    // JolliLite (pusher) = index 2, JolliCute (bullied) = index 0
    // Pusher is actually JolliBurrito (index 3) per CLAUDE.md: "Pusher can only push once Bullied exists"
    // Using indices 2 (JolliLite as pusher) and 0 (JolliCute as bullied)
    if (!found.includes(2) || !found.includes(0)) return;

    const liteContainer = this.getFollowerContainer?.(2);
    const cuteContainer = this.getFollowerContainer?.(0);
    if (!liteContainer || !cuteContainer) return;

    // Visible bump — JolliLite bumps into JolliCute
    this.scene.tweens.add({
      targets: liteContainer,
      x: liteContainer.x + 25,
      duration: 120,
      yoyo: true,
      ease: 'Power2',
    });
    this.scene.time.delayedCall(120, () => {
      this.scene.tweens.add({
        targets: cuteContainer,
        x: cuteContainer.x + 40,
        duration: 200,
        yoyo: true,
        ease: 'Bounce.easeOut',
      });
    });

    // Always show a reaction line
    const pushLines = [
      { pusher: 'You don\'t look like us!', bullied: 'Are you okay?' },
      { pusher: '*pushes*', bullied: 'Hey! Stop it!' },
      { pusher: 'I can\'t see! You\'re so big!', bullied: 'Ow...' },
      { pusher: 'Move!', bullied: 'Dadibee!' },
      { pusher: '*bump*', bullied: 'Why are you like this...' },
    ];
    const pick = pushLines[Math.floor(Math.random() * pushLines.length)];
    this.jbSay(2, pick.pusher, 2500);
    this.scene.time.delayedCall(1200, () => {
      this.jbSay(0, pick.bullied, 2500);
    });

    // JolliBig sometimes reacts (if found)
    if (found.includes(4) && Math.random() < 0.4) {
      this.scene.time.delayedCall(2800, () => {
        this.jbSay(4, "No, I'm just plump!", 2500);
      });
    }
  }

  // ─── INTERNAL: BUBBLE SPAWNING ─────────────────────────

  private spawnBubble(
    pos: SpeakerRef, text: string, duration: number,
    trackFn: (() => { x: number; y: number } | undefined) | null,
  ): void {
    // Enforce max visible
    while (this.activeBubbles.length >= this.MAX_VISIBLE) {
      const oldest = this.activeBubbles.shift();
      try { oldest?.bubble.container?.destroy(true); } catch { /* noop */ }
    }

    const bubble = new SpeechBubble({
      scene: this.scene,
      x: pos.x,
      y: pos.y - 40,
      text,
      duration: 0, // we manage lifetime ourselves
    });

    this.activeBubbles.push({
      bubble,
      getPos: trackFn,
      expiry: this.scene.time.now + duration,
    });
  }
}
