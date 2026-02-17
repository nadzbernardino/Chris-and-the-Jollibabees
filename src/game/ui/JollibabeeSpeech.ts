import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PALETTE, PALETTE_CSS } from '../config';
import { store } from '../store/GameStore';
import { rng } from '../rng';

/** Jollibabee personality definitions */
interface Jollibabee {
  name: string;
  personality: 'pusher' | 'bullied' | 'flying' | 'bart' | 'big' | 'genz';
  color: number;
  lines: string[];
}

/**
 * Jollibabees ordered by UNLOCK sequence (matches CLAUDE.md spec):
 *  0: JolliCute   (after L1) — leader
 *  1: JolliBart   (after L2) — dreamer (BART lines)
 *  2: JolliBay    (after L3) — bullied
 *  3: JolliLite   (after L4) — pusher
 *  4: JolliBig    (after L5) — big
 *  5: JolliBurrito(after L6) — fly
 */
const JOLLIBABEES: Jollibabee[] = [
  {
    name: 'JolliCute',
    personality: 'bullied', // leader personality
    color: 0xffaaaa,
    lines: [
      "Dadibee, focus",
      "That's right",
      "...can I help?",
    ],
  },
  {
    name: 'JolliBart',
    personality: 'bart', // dreamer — BART lines
    color: 0xdd5555,
    lines: [
      "I want to go to the BART",
      "Yeah, it's very popular here in the Bay area",
      "Oh a bug *sprays*",
    ],
  },
  {
    name: 'JolliBay',
    personality: 'genz', // bullied
    color: 0xff6666,
    lines: [
      "Are you okay?",
      "Oooh what's that?",
      "Ohh it's a flower!",
      "I mean..",
    ],
  },
  {
    name: 'JolliLite',
    personality: 'pusher',
    color: 0xcc3333,
    lines: [
      "Yeah, we know",
      "IYKYK",
      "You dont look like us",
    ],
  },
  {
    name: 'JolliBig',
    personality: 'big',
    color: 0xff4444,
    lines: [
      "I want to be like you, Dadibee",
      "Dadibee, I'm growing",
      "It's not that haard",
      "Dadibee we want honey",
    ],
  },
  {
    name: 'JolliBurrito',
    personality: 'flying', // fly
    color: 0xff8888,
    lines: [
      "I'm the favorite",
      "Where is Mamibee?",
      "Oooh what's that?",
    ],
  },
];

/**
 * Special interaction lines that require multiple unlocked jollibabees.
 * These are checked against current unlock state before being used.
 */
interface InteractionLine {
  /** Index of the initiator jollibabee */
  initiatorIdx: number;
  /** Text the initiator says */
  initiatorLine: string;
  /** Index of the responder (must also be unlocked) */
  responderIdx: number;
  /** Text the responder says (shown after a delay) */
  responderLine: string;
}

const INTERACTION_LINES: InteractionLine[] = [
  // JolliLite(3/pusher) pushes JolliBay(2/bullied) — only when both unlocked (after L4)
  { initiatorIdx: 3, initiatorLine: "You dont look like us",
    responderIdx: 2, responderLine: "Are you okay?" },
  // JolliLite(3) says line → JolliBig(4) replies — only when both unlocked (after L5)
  { initiatorIdx: 3, initiatorLine: "I can't see! you're so big",
    responderIdx: 4, responderLine: "No, I'm just plump" },
];

const SPEECH_INTERVAL_MIN = 15000; // 15s
const SPEECH_INTERVAL_MAX = 35000; // 35s
const SPEECH_DURATION = 3000;      // how long bubble stays

/**
 * Jollibabee speech + sprite system.
 * Call create() in any scene where they should appear.
 * Call destroy() when leaving.
 */
export class JollibabeeSpeechSystem {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private sprites: Phaser.GameObjects.Rectangle[] = [];
  private labels: Phaser.GameObjects.Text[] = [];
  private bubbleContainer?: Phaser.GameObjects.Container;
  private speechTimer?: Phaser.Time.TimerEvent;
  private speechQueue: { spriteIdx: number; line: string }[] = [];
  private isSpeaking = false;
  private active = true;
  private cameraFixed = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * @param y       Base Y position for sprites
   * @param options.cameraFixed  If true, sets scrollFactor(0) so sprites
   *                             stay on-screen in scrolling scenes.
   */
  create(y?: number, options?: { cameraFixed?: boolean }): void {
    const baseY = y ?? GAME_HEIGHT - 45;
    const startX = GAME_WIDTH - 320;
    const spacing = 48;
    this.cameraFixed = options?.cameraFixed ?? false;

    this.container = this.scene.add.container(0, 0);
    if (this.cameraFixed) this.container.setScrollFactor(0);
    this.sprites = [];
    this.labels = [];

    const count = store.jollibabeeCount; // only show unlocked babies

    for (let i = 0; i < count; i++) {
      const jb = JOLLIBABEES[i];
      const x = startX + i * spacing;
      const size = jb.personality === 'big' ? 28 : jb.personality === 'flying' ? 16 : 22;
      const yOff = jb.personality === 'flying' ? -10 : 0;

      const sprite = this.scene.add.rectangle(x, baseY + yOff, size, size, jb.color)
        .setStrokeStyle(1, 0xffffff)
        .setInteractive({ useHandCursor: true });

      // Tap interaction — "Stop it, Dadibee"
      const tapIdx = i;
      sprite.on('pointerdown', () => {
        if (store.ui.modalOpen) return;
        this.enqueue(tapIdx, "Stop it, Dadibee");
        if (rng.chance(0.3)) {
          this.enqueue(tapIdx, "Where's Mamibee?");
        }
      });

      // Tiny label (added to container so it's cleaned up on destroy)
      const label = this.scene.add.text(x, baseY + 18, jb.name[0], {
        fontSize: '9px', fontFamily: 'monospace', color: PALETTE_CSS.ivory,
      }).setOrigin(0.5);

      this.sprites.push(sprite);
      this.labels.push(label);
      this.container.add(sprite);
      this.container.add(label);
    }

    // Add gentle idle bobbing animation
    this.sprites.forEach((sprite, i) => {
      this.scene.tweens.add({
        targets: sprite,
        y: sprite.y - 4,
        duration: 800 + i * 100,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });

    if (count > 0) {
      this.scheduleSpeech();
    }
  }

  private scheduleSpeech(): void {
    if (!this.active) return;
    const delay = rng.intBetween(SPEECH_INTERVAL_MIN, SPEECH_INTERVAL_MAX);
    this.speechTimer = this.scene.time.delayedCall(delay, () => {
      if (!this.active) return;
      if (!store.ui.modalOpen) {
        this.showRandomLine();
      }
      this.scheduleSpeech();
    });
  }

  private showRandomLine(): void {
    const count = store.jollibabeeCount;
    if (count <= 0) return;

    // 10% chance any jolli says shared filler line
    if (rng.chance(0.1)) {
      const jbIndex = rng.intBetween(0, count - 1);
      this.enqueue(jbIndex, "It's not that hard");
      return;
    }

    // 5% chance any jolli says "I mean.."
    if (rng.chance(0.05)) {
      const jbIndex = rng.intBetween(0, count - 1);
      this.enqueue(jbIndex, "I mean..");
      return;
    }

    // 25% chance to try an interaction line if both parties are unlocked
    if (rng.chance(0.25)) {
      const eligible = INTERACTION_LINES.filter(
        il => il.initiatorIdx < count && il.responderIdx < count,
      );
      if (eligible.length > 0) {
        const il = eligible[rng.intBetween(0, eligible.length - 1)];
        this.showInteractionLine(il);
        return;
      }
    }

    // Normal random line from an unlocked jollibabee
    const jbIndex = rng.intBetween(0, count - 1);
    const jb = JOLLIBABEES[jbIndex];
    const line = jb.lines[rng.intBetween(0, jb.lines.length - 1)];

    this.enqueue(jbIndex, line);

    // 30% chance of a mimic (1-2 others repeat a short phrase)
    if (rng.chance(0.30) && count > 1) {
      const mimicPhrases = ["Yeah, that's right", "yeah, that's right", "Mhm"];
      const phrase = mimicPhrases[rng.intBetween(0, mimicPhrases.length - 1)];
      // Pick a different jollibabee
      let mimicIdx = rng.intBetween(0, count - 1);
      if (mimicIdx === jbIndex) mimicIdx = (mimicIdx + 1) % count;
      this.enqueue(mimicIdx, phrase);
    }
  }

  /** Show an interaction between two jollibabees */
  private showInteractionLine(il: InteractionLine): void {
    this.enqueue(il.initiatorIdx, il.initiatorLine);
    this.enqueue(il.responderIdx, il.responderLine);

    // If this is the push interaction (JolliLite pushes JolliBay/bullied), do bump animation
    if (il.initiatorIdx === 3 && il.responderIdx === 2) {
      const pusher = this.sprites[3];
      const bullied = this.sprites[2];
      if (pusher && bullied) {
        this.scene.tweens.add({
          targets: bullied,
          x: bullied.x + 6,
          duration: 150,
          yoyo: true,
          ease: 'Quad.easeOut',
        });
      }
    }
  }

  /** Add a speech item to the queue */
  private enqueue(spriteIdx: number, line: string): void {
    this.speechQueue.push({ spriteIdx, line });
    if (!this.isSpeaking) this.processQueue();
  }

  /** Process the next item in the speech queue */
  private processQueue(): void {
    if (this.speechQueue.length === 0) {
      this.isSpeaking = false;
      return;
    }
    this.isSpeaking = true;
    const item = this.speechQueue.shift()!;
    const sprite = this.sprites[item.spriteIdx];
    if (!sprite) {
      this.processQueue();
      return;
    }
    this.showBubble(sprite, item.line, () => this.processQueue());
  }

  /** Show a speech bubble above a sprite, call onDone when finished */
  private showBubble(sprite: Phaser.GameObjects.Rectangle, line: string, onDone?: () => void): void {
    if (this.bubbleContainer) {
      this.bubbleContainer.destroy(true);
      this.bubbleContainer = undefined;
    }

    // Parchment-style speech bubble
    const bubbleX = sprite.x;
    const bubbleY = sprite.y - 50;

    const text = this.scene.add.text(0, 0, line, {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: PALETTE_CSS.wood1,
      wordWrap: { width: 150 },
      align: 'center',
    }).setOrigin(0.5);

    const pw = text.width + 16;
    const ph = text.height + 12;

    const bg = this.scene.add.rectangle(0, 0, pw, ph, 0xf5f2ea)
      .setStrokeStyle(1, PALETTE.wood2);

    // Bubble tail (tiny triangle approximation)
    const tail = this.scene.add.triangle(0, ph / 2 + 4, -4, 0, 4, 0, 0, 8, 0xf5f2ea);

    this.bubbleContainer = this.scene.add.container(bubbleX, bubbleY, [bg, text, tail]);
    this.bubbleContainer.setDepth(100);
    if (this.cameraFixed) this.bubbleContainer.setScrollFactor(0);

    // Fade in
    this.bubbleContainer.setAlpha(0);
    this.scene.tweens.add({
      targets: this.bubbleContainer,
      alpha: 1,
      duration: 200,
    });

    // Remove after duration
    this.scene.time.delayedCall(SPEECH_DURATION, () => {
      if (this.bubbleContainer) {
        this.scene.tweens.add({
          targets: this.bubbleContainer,
          alpha: 0,
          duration: 300,
          onComplete: () => {
            this.bubbleContainer?.destroy(true);
            this.bubbleContainer = undefined;
            onDone?.();
          },
        });
      } else {
        onDone?.();
      }
    });
  }

  /** Trigger "Hi Darmesh!" from all Jollibabees in sequence */
  showDarmeshGreeting(): void {
    if (this.bubbleContainer) {
      this.bubbleContainer.destroy(true);
      this.bubbleContainer = undefined;
    }

    this.sprites.forEach((sprite, i) => {
      this.scene.time.delayedCall(i * 250, () => {
        const text = this.scene.add.text(sprite.x, sprite.y - 40, 'Hi Darmesh!', {
          fontSize: '10px', fontFamily: 'monospace', color: PALETTE_CSS.wood1,
          backgroundColor: '#F5F2EA',
          padding: { x: 4, y: 2 },
        }).setOrigin(0.5).setDepth(100);
        if (this.cameraFixed) text.setScrollFactor(0);

        this.scene.tweens.add({
          targets: text,
          y: text.y - 15,
          alpha: 0,
          duration: 1500,
          delay: 800,
          onComplete: () => text.destroy(),
        });
      });
    });
  }

  /** Pause speech (during modals) */
  pause(): void {
    this.active = false;
  }

  /** Resume speech */
  resume(): void {
    this.active = true;
  }

  destroy(): void {
    this.active = false;
    this.speechTimer?.remove();
    this.bubbleContainer?.destroy(true);
    this.container?.destroy(true);
  }
}
