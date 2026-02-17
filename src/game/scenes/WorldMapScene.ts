/// <reference types="vite/client" />
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PALETTE, PALETTE_CSS, SCENES } from '../config';
import { store } from '../store/GameStore';
import { LEVEL_DEFS } from '../levels/levelDefs';
import { HUD } from '../ui/HUD';
import { JollibabeeSpeechSystem } from '../ui/JollibabeeSpeech';
import { AudioManager } from '../audio/AudioManager';
import { ModalManager } from '../ui/ModalManager';
import { applyDoomScroll } from '../store/reducers/applyDoomScroll';
import { applyWhaleCoin } from '../store/reducers/applyWhaleCoin';
import { rng } from '../rng';

// ════════════════════════════════════════════════════════════
//  HOUSE OVERWORLD — Side-scrolling interior cross-section
// ════════════════════════════════════════════════════════════

const WORLD_W = 7200;          // total scrollable width
const FLOOR_Y = 540;           // y of the "ground" (house floor)
const CEILING_Y = 80;          // top of walls
const WALL_H = FLOOR_Y - CEILING_Y;
const CHRIS_SPEED = 320;       // px/s
const CHRIS_W = 28;
const CHRIS_H = 44;
const INTERACT_DIST = 60;      // how close Chris has to be to interact
const ROOM_W = 900;            // uniform room width

// ── Level ID → room key mapping (exported for other scenes) ─

export const LEVEL_TO_ROOM: Record<number, string> = {
  1: 'kitchen',
  2: 'entryway',
  3: 'living',
  4: 'office',
  5: 'bathroom',
  6: 'laundry',
};

// ── Room readiness state helpers ────────────────────────────

/** Returns true if a given level (1-6) has been completed */
function levelDone(id: number): boolean {
  return store.progression.completedLevels.has(id);
}

// ── Prop builder type ───────────────────────────────────────

type PropBuilder = (scene: Phaser.Scene, rx: number, rw: number) => Phaser.GameObjects.GameObject[];

// ── Per-room dirty / clean prop builders ────────────────────

const KITCHEN_DIRTY: PropBuilder = (s, rx, rw) => {
  const out: Phaser.GameObjects.GameObject[] = [];
  // Counter
  out.push(s.add.rectangle(rx + rw * 0.3, FLOOR_Y - 30, 200, 60, 0x7a4e2d).setStrokeStyle(1, 0x5c3a21));
  // Stove
  out.push(s.add.rectangle(rx + rw * 0.6, FLOOR_Y - 25, 80, 50, 0x444444).setStrokeStyle(1, 0x333333));
  // Dish pile (messy)
  for (let i = 0; i < 5; i++) {
    out.push(s.add.ellipse(rx + rw * 0.3 + i * 14 - 28, FLOOR_Y - 65, 24, 8, 0xccccbb).setStrokeStyle(1, 0x999988));
  }
  // Stain marks
  out.push(s.add.circle(rx + rw * 0.35, FLOOR_Y - 4, 8, 0x5a4a3a, 0.4));
  out.push(s.add.circle(rx + rw * 0.42, FLOOR_Y - 2, 6, 0x5a4a3a, 0.3));
  // Cabinet
  out.push(s.add.rectangle(rx + rw * 0.25, CEILING_Y + 50, 140, 60, 0x5c3a21).setStrokeStyle(1, 0x3d2b1a));
  return out;
};

const KITCHEN_CLEAN: PropBuilder = (s, rx, rw) => {
  const out: Phaser.GameObjects.GameObject[] = [];
  // Counter (shinier)
  out.push(s.add.rectangle(rx + rw * 0.3, FLOOR_Y - 30, 200, 60, 0x8a5e3d).setStrokeStyle(1, 0x6c4a2e));
  // Counter shine line
  out.push(s.add.rectangle(rx + rw * 0.3, FLOOR_Y - 58, 180, 2, 0xf4c76a, 0.3));
  // Stove
  out.push(s.add.rectangle(rx + rw * 0.6, FLOOR_Y - 25, 80, 50, 0x555555).setStrokeStyle(1, 0x444444));
  // Only 1 dish, neatly placed
  out.push(s.add.ellipse(rx + rw * 0.3, FLOOR_Y - 65, 24, 8, 0xddddd0).setStrokeStyle(1, 0xbbbbaa));
  // Cabinet
  out.push(s.add.rectangle(rx + rw * 0.25, CEILING_Y + 50, 140, 60, 0x5c3a21).setStrokeStyle(1, 0x3d2b1a));
  // Small sparkle
  out.push(s.add.circle(rx + rw * 0.32, FLOOR_Y - 70, 3, 0xf4c76a, 0.7));
  return out;
};

const ENTRYWAY_DIRTY: PropBuilder = (s, rx, rw) => {
  const out: Phaser.GameObjects.GameObject[] = [];
  // Coat hooks
  for (let i = 0; i < 3; i++) {
    out.push(s.add.rectangle(rx + rw * 0.25 + i * 30, CEILING_Y + 70, 6, 20, 0x7a4e2d));
  }
  // Shoe rack
  out.push(s.add.rectangle(rx + rw * 0.7, FLOOR_Y - 18, 120, 36, 0x5c3a21).setStrokeStyle(1, 0x3d2b1a));
  // Trash bag (messy)
  out.push(s.add.circle(rx + rw * 0.45, FLOOR_Y - 20, 16, 0x333333).setStrokeStyle(1, 0x222222));
  out.push(s.add.circle(rx + rw * 0.55, FLOOR_Y - 16, 14, 0x3a3a3a).setStrokeStyle(1, 0x222222));
  // Scattered shoe
  out.push(s.add.rectangle(rx + rw * 0.38, FLOOR_Y - 6, 16, 8, 0x6a5a4a));
  return out;
};

const ENTRYWAY_CLEAN: PropBuilder = (s, rx, rw) => {
  const out: Phaser.GameObjects.GameObject[] = [];
  // Coat hooks with neat coats
  for (let i = 0; i < 3; i++) {
    out.push(s.add.rectangle(rx + rw * 0.25 + i * 30, CEILING_Y + 70, 6, 20, 0x7a4e2d));
    out.push(s.add.rectangle(rx + rw * 0.25 + i * 30, CEILING_Y + 85, 12, 18,
      [0xcc5555, 0x5577aa, 0x55aa55][i], 0.6));
  }
  // Shoe rack
  out.push(s.add.rectangle(rx + rw * 0.7, FLOOR_Y - 18, 120, 36, 0x5c3a21).setStrokeStyle(1, 0x3d2b1a));
  // No trash — clean floor
  // Small welcome mat
  out.push(s.add.rectangle(rx + rw * 0.5, FLOOR_Y - 4, 60, 8, 0x7a6a5a, 0.5));
  // Sparkle
  out.push(s.add.circle(rx + rw * 0.5, FLOOR_Y - 10, 3, 0xf4c76a, 0.6));
  return out;
};

const LIVING_DIRTY: PropBuilder = (s, rx, rw) => {
  const out: Phaser.GameObjects.GameObject[] = [];
  // Couch
  out.push(s.add.rectangle(rx + rw * 0.4, FLOOR_Y - 35, 180, 50, 0x6d4c30).setStrokeStyle(1, 0x5c3a21));
  out.push(s.add.rectangle(rx + rw * 0.4, FLOOR_Y - 60, 180, 10, 0x7a5535));
  // Coffee table
  out.push(s.add.rectangle(rx + rw * 0.65, FLOOR_Y - 20, 80, 30, 0x5c3a21).setStrokeStyle(1, 0x4a2e18));
  // Phone on table (doom scroll reference — screen glowing)
  out.push(s.add.rectangle(rx + rw * 0.66, FLOOR_Y - 38, 14, 22, 0x222222).setStrokeStyle(1, 0x111111));
  out.push(s.add.rectangle(rx + rw * 0.66, FLOOR_Y - 38, 10, 18, 0x4466aa, 0.5)); // screen glow
  // Scattered cushion
  out.push(s.add.rectangle(rx + rw * 0.32, FLOOR_Y - 10, 24, 14, 0x8a6a4a, 0.5));
  return out;
};

const LIVING_CLEAN: PropBuilder = (s, rx, rw) => {
  const out: Phaser.GameObjects.GameObject[] = [];
  // Couch (tidied)
  out.push(s.add.rectangle(rx + rw * 0.4, FLOOR_Y - 35, 180, 50, 0x7a5c40).setStrokeStyle(1, 0x6d4c30));
  out.push(s.add.rectangle(rx + rw * 0.4, FLOOR_Y - 60, 180, 10, 0x8a6545));
  // Neat cushions on couch
  out.push(s.add.rectangle(rx + rw * 0.34, FLOOR_Y - 35, 26, 22, 0xe6c98b, 0.5));
  out.push(s.add.rectangle(rx + rw * 0.46, FLOOR_Y - 35, 26, 22, 0xe6c98b, 0.5));
  // Coffee table
  out.push(s.add.rectangle(rx + rw * 0.65, FLOOR_Y - 20, 80, 30, 0x5c3a21).setStrokeStyle(1, 0x4a2e18));
  // Phone put away — just table, maybe a book
  out.push(s.add.rectangle(rx + rw * 0.66, FLOOR_Y - 38, 18, 12, 0x3f6b4f)); // book
  // Sparkle
  out.push(s.add.circle(rx + rw * 0.6, FLOOR_Y - 50, 3, 0xf4c76a, 0.6));
  return out;
};

const OFFICE_DIRTY: PropBuilder = (s, rx, rw) => {
  const out: Phaser.GameObjects.GameObject[] = [];
  // Desk
  out.push(s.add.rectangle(rx + rw * 0.5, FLOOR_Y - 35, 180, 50, 0x7a4e2d).setStrokeStyle(1, 0x5c3a21));
  // Monitor — flashing alerts
  out.push(s.add.rectangle(rx + rw * 0.5, FLOOR_Y - 75, 60, 40, 0x222233).setStrokeStyle(1, 0x111122));
  out.push(s.add.rectangle(rx + rw * 0.5, FLOOR_Y - 75, 50, 30, 0xcc3333, 0.15)); // red alert glow
  out.push(s.add.rectangle(rx + rw * 0.5, FLOOR_Y - 55, 10, 12, 0x555555));
  // Chair
  out.push(s.add.rectangle(rx + rw * 0.35, FLOOR_Y - 30, 40, 40, 0x4a3a2a).setStrokeStyle(1, 0x3a2a1a));
  // Bookshelf
  out.push(s.add.rectangle(rx + rw * 0.8, FLOOR_Y - 80, 50, 160, 0x5c3a21).setStrokeStyle(1, 0x4a2e18));
  for (let i = 0; i < 4; i++) {
    out.push(s.add.rectangle(rx + rw * 0.8, FLOOR_Y - 140 + i * 38, 40, 8,
      [0xcc3333, 0x3f6b4f, 0xe8b45e, 0x6d8c8a][i]));
  }
  // Messy papers on desk
  out.push(s.add.rectangle(rx + rw * 0.55, FLOOR_Y - 62, 20, 14, 0xf5f2ea, 0.6));
  out.push(s.add.rectangle(rx + rw * 0.58, FLOOR_Y - 64, 16, 12, 0xf5f2ea, 0.4));
  return out;
};

const OFFICE_CLEAN: PropBuilder = (s, rx, rw) => {
  const out: Phaser.GameObjects.GameObject[] = [];
  // Desk
  out.push(s.add.rectangle(rx + rw * 0.5, FLOOR_Y - 35, 180, 50, 0x7a4e2d).setStrokeStyle(1, 0x5c3a21));
  // Monitor — calm blue
  out.push(s.add.rectangle(rx + rw * 0.5, FLOOR_Y - 75, 60, 40, 0x222233).setStrokeStyle(1, 0x111122));
  out.push(s.add.rectangle(rx + rw * 0.5, FLOOR_Y - 75, 50, 30, 0x2244aa, 0.1)); // calm blue
  out.push(s.add.rectangle(rx + rw * 0.5, FLOOR_Y - 55, 10, 12, 0x555555));
  // Chair
  out.push(s.add.rectangle(rx + rw * 0.35, FLOOR_Y - 30, 40, 40, 0x4a3a2a).setStrokeStyle(1, 0x3a2a1a));
  // Bookshelf (neat)
  out.push(s.add.rectangle(rx + rw * 0.8, FLOOR_Y - 80, 50, 160, 0x5c3a21).setStrokeStyle(1, 0x4a2e18));
  for (let i = 0; i < 4; i++) {
    out.push(s.add.rectangle(rx + rw * 0.8, FLOOR_Y - 140 + i * 38, 40, 8,
      [0xcc3333, 0x3f6b4f, 0xe8b45e, 0x6d8c8a][i]));
  }
  // Small lamp glow on desk
  out.push(s.add.circle(rx + rw * 0.42, FLOOR_Y - 62, 5, 0xf4c76a, 0.7));
  out.push(s.add.circle(rx + rw * 0.42, FLOOR_Y - 62, 14, 0xf4c76a, 0.1));
  return out;
};

const BATHROOM_DIRTY: PropBuilder = (s, rx, rw) => {
  const out: Phaser.GameObjects.GameObject[] = [];
  // Basin
  out.push(s.add.rectangle(rx + rw * 0.3, FLOOR_Y - 25, 120, 40, 0xddeedd).setStrokeStyle(1, 0xbbccbb));
  // Mirror (dull)
  out.push(s.add.rectangle(rx + rw * 0.3, CEILING_Y + 60, 60, 80, 0x8899aa, 0.4).setStrokeStyle(1, 0x667788));
  // Plants (wilted — duller foliage)
  for (let i = 0; i < 3; i++) {
    const px = rx + rw * 0.6 + i * 50;
    out.push(s.add.rectangle(px, FLOOR_Y - 15, 22, 30, 0x7a4e2d));
    out.push(s.add.circle(px, FLOOR_Y - 40, 14, 0x2d4030));
    out.push(s.add.circle(px - 5, FLOOR_Y - 48, 8, 0x223828));
  }
  // Grooming tools scattered
  out.push(s.add.rectangle(rx + rw * 0.35, FLOOR_Y - 48, 8, 18, 0x999999));
  out.push(s.add.rectangle(rx + rw * 0.25, FLOOR_Y - 50, 6, 14, 0x888888));
  return out;
};

const BATHROOM_CLEAN: PropBuilder = (s, rx, rw) => {
  const out: Phaser.GameObjects.GameObject[] = [];
  // Basin
  out.push(s.add.rectangle(rx + rw * 0.3, FLOOR_Y - 25, 120, 40, 0xeeffee).setStrokeStyle(1, 0xccddcc));
  // Mirror (sparkle!)
  out.push(s.add.rectangle(rx + rw * 0.3, CEILING_Y + 60, 60, 80, 0xaacccc, 0.6).setStrokeStyle(1, 0x88aaaa));
  out.push(s.add.circle(rx + rw * 0.28, CEILING_Y + 45, 4, 0xffffff, 0.8)); // sparkle
  out.push(s.add.circle(rx + rw * 0.34, CEILING_Y + 55, 3, 0xf4c76a, 0.6)); // sparkle
  // Plants (healthy — lush green)
  for (let i = 0; i < 3; i++) {
    const px = rx + rw * 0.6 + i * 50;
    out.push(s.add.rectangle(px, FLOOR_Y - 15, 22, 30, 0x7a4e2d));
    out.push(s.add.circle(px, FLOOR_Y - 40, 16, 0x3f6b4f));
    out.push(s.add.circle(px - 5, FLOOR_Y - 48, 10, 0x2f4f3e));
    out.push(s.add.circle(px + 4, FLOOR_Y - 52, 6, 0x4f8b5f)); // extra leaf
  }
  // Grooming tools neatly on shelf
  out.push(s.add.rectangle(rx + rw * 0.22, FLOOR_Y - 48, 40, 4, 0xaaaaaa)); // shelf
  out.push(s.add.rectangle(rx + rw * 0.20, FLOOR_Y - 54, 6, 14, 0x999999));
  out.push(s.add.rectangle(rx + rw * 0.24, FLOOR_Y - 54, 6, 14, 0x888888));
  return out;
};

const BEDROOM_BASE: PropBuilder = (s, rx, rw) => {
  const out: Phaser.GameObjects.GameObject[] = [];
  // Bed
  out.push(s.add.rectangle(rx + rw * 0.45, FLOOR_Y - 30, 180, 50, 0x5a4a6a).setStrokeStyle(1, 0x4a3a5a));
  out.push(s.add.rectangle(rx + rw * 0.35, FLOOR_Y - 45, 40, 30, 0xeeddcc));
  out.push(s.add.rectangle(rx + rw * 0.45, FLOOR_Y - 30, 160, 35, 0x7a6a8a, 0.6));
  // Nightstand
  out.push(s.add.rectangle(rx + rw * 0.65, FLOOR_Y - 22, 36, 40, 0x5c3a21).setStrokeStyle(1, 0x4a2e18));
  // Lamp
  out.push(s.add.circle(rx + rw * 0.65, FLOOR_Y - 50, 8, 0xf4c76a));
  out.push(s.add.circle(rx + rw * 0.65, FLOOR_Y - 50, 20, 0xf4c76a, 0.15));
  // Moon icon
  out.push(s.add.circle(rx + rw * 0.8, CEILING_Y + 50, 16, 0xe6c98b, 0.8));
  out.push(s.add.circle(rx + rw * 0.8 + 6, CEILING_Y + 48, 14, 0x302838));
  return out;
};

const BEDROOM_RESTED: PropBuilder = (s, rx, rw) => {
  const out = BEDROOM_BASE(s, rx, rw);
  // Extra cozy glow
  out.push(s.add.circle(rx + rw * 0.45, FLOOR_Y - 30, 60, 0xf4c76a, 0.06));
  // Zzz text
  out.push(s.add.text(rx + rw * 0.55, FLOOR_Y - 80, 'Zzz', {
    fontSize: '14px', fontFamily: 'monospace', color: '#e6c98b',
  }).setAlpha(0.5));
  return out;
};

const LAUNDRY_DIRTY: PropBuilder = (s, rx, rw) => {
  const out: Phaser.GameObjects.GameObject[] = [];
  // Washing machine
  out.push(s.add.rectangle(rx + rw * 0.3, FLOOR_Y - 35, 70, 70, 0xcccccc).setStrokeStyle(1, 0x999999));
  out.push(s.add.circle(rx + rw * 0.3, FLOOR_Y - 35, 20, 0xdddddd).setStrokeStyle(1, 0xaaaaaa));
  // Laundry basket (overflowing)
  out.push(s.add.rectangle(rx + rw * 0.55, FLOOR_Y - 20, 50, 40, 0x7a6a5a).setStrokeStyle(1, 0x5a4a3a));
  for (let i = 0; i < 5; i++) {
    out.push(s.add.rectangle(rx + rw * 0.55 + (i - 2) * 10, FLOOR_Y - 44, 18, 8,
      [0xcc5555, 0x5588cc, 0x55aa55, 0xdddd55, 0xaa55aa][i]));
  }
  // Clothes on floor
  out.push(s.add.rectangle(rx + rw * 0.65, FLOOR_Y - 6, 20, 6, 0xcc5555, 0.5));
  out.push(s.add.rectangle(rx + rw * 0.72, FLOOR_Y - 4, 16, 6, 0x5588cc, 0.5));
  // Ironing board
  out.push(s.add.rectangle(rx + rw * 0.75, FLOOR_Y - 40, 100, 8, 0xaaaaaa).setStrokeStyle(1, 0x888888));
  return out;
};

const LAUNDRY_CLEAN: PropBuilder = (s, rx, rw) => {
  const out: Phaser.GameObjects.GameObject[] = [];
  // Washing machine
  out.push(s.add.rectangle(rx + rw * 0.3, FLOOR_Y - 35, 70, 70, 0xcccccc).setStrokeStyle(1, 0x999999));
  out.push(s.add.circle(rx + rw * 0.3, FLOOR_Y - 35, 20, 0xdddddd).setStrokeStyle(1, 0xaaaaaa));
  // Basket empty
  out.push(s.add.rectangle(rx + rw * 0.55, FLOOR_Y - 14, 50, 28, 0x8a7a6a).setStrokeStyle(1, 0x6a5a4a));
  // Folded pile (neat stack)
  const foldX = rx + rw * 0.7;
  out.push(s.add.rectangle(foldX, FLOOR_Y - 14, 42, 8, 0xcc5555));
  out.push(s.add.rectangle(foldX, FLOOR_Y - 22, 42, 8, 0x5588cc));
  out.push(s.add.rectangle(foldX, FLOOR_Y - 30, 42, 8, 0x55aa55));
  out.push(s.add.rectangle(foldX, FLOOR_Y - 38, 42, 8, 0xdddd55));
  // Sparkle
  out.push(s.add.circle(foldX + 20, FLOOR_Y - 44, 3, 0xf4c76a, 0.7));
  // Ironing board
  out.push(s.add.rectangle(rx + rw * 0.75, FLOOR_Y - 60, 100, 8, 0xbbbbbb).setStrokeStyle(1, 0x999999));
  return out;
};

const FRONTDOOR_BASE: PropBuilder = (s, rx, rw) => {
  const out: Phaser.GameObjects.GameObject[] = [];
  // Large ornate door
  out.push(s.add.rectangle(rx + rw * 0.5, FLOOR_Y - 100, 100, 200, 0x5c3a21).setStrokeStyle(3, 0x7a4e2d));
  out.push(s.add.circle(rx + rw * 0.5 + 35, FLOOR_Y - 100, 6, 0xe8b45e));
  out.push(s.add.rectangle(rx + rw * 0.5, FLOOR_Y - 5, 100, 10, 0x7a6a5a));
  out.push(s.add.rectangle(rx + rw * 0.35, CEILING_Y + 80, 20, 20, 0xe8b45e, 0.7));
  return out;
};

// ── Room definition with readiness props ────────────────────

interface RoomDef {
  key: string;
  label: string;
  x: number;
  w: number;
  wallColor: number;
  floorColor: number;
  node?: { type: 'level' | 'sleep' | 'final'; levelId?: number };
  /** Returns true when the room should show its "clean" state */
  isClean: () => boolean;
  buildDirty: PropBuilder;
  buildClean: PropBuilder;
}

const ROOMS: RoomDef[] = [
  {
    key: 'kitchen', label: 'Kitchen', x: 0, w: ROOM_W,
    wallColor: 0x3d2b1a, floorColor: 0x5c3a21,
    node: { type: 'level', levelId: 1 },
    isClean: () => levelDone(1),
    buildDirty: KITCHEN_DIRTY, buildClean: KITCHEN_CLEAN,
  },
  {
    key: 'entryway', label: 'Entryway', x: ROOM_W, w: ROOM_W,
    wallColor: 0x3a2e1e, floorColor: 0x5c3a21,
    node: { type: 'level', levelId: 2 },
    isClean: () => levelDone(2),
    buildDirty: ENTRYWAY_DIRTY, buildClean: ENTRYWAY_CLEAN,
  },
  {
    key: 'living', label: 'Living Room', x: ROOM_W * 2, w: ROOM_W,
    wallColor: 0x352a1c, floorColor: 0x5c3a21,
    node: { type: 'level', levelId: 3 },
    isClean: () => levelDone(3),
    buildDirty: LIVING_DIRTY, buildClean: LIVING_CLEAN,
  },
  {
    key: 'office', label: 'Office', x: ROOM_W * 3, w: ROOM_W,
    wallColor: 0x3a3020, floorColor: 0x5c3a21,
    // No door node — interaction via COMPUTER prop (Section B/H)
    isClean: () => levelDone(4),
    buildDirty: OFFICE_DIRTY, buildClean: OFFICE_CLEAN,
  },
  {
    key: 'bathroom', label: 'Bathroom / Plant Corner', x: ROOM_W * 4, w: ROOM_W,
    wallColor: 0x2e3830, floorColor: 0x4a5a50,
    node: { type: 'level', levelId: 5 },
    isClean: () => levelDone(5),
    buildDirty: BATHROOM_DIRTY, buildClean: BATHROOM_CLEAN,
  },
  {
    key: 'bedroom', label: 'Bedroom', x: ROOM_W * 5, w: ROOM_W,
    wallColor: 0x302838, floorColor: 0x4a3a52,
    // No door node — interaction via BED prop (Section B/I)
    isClean: () => store.progression.sleepCompleted,
    buildDirty: BEDROOM_BASE, buildClean: BEDROOM_RESTED,
  },
  {
    key: 'laundry', label: 'Laundry Room', x: ROOM_W * 6, w: ROOM_W,
    wallColor: 0x3a3228, floorColor: 0x5c3a21,
    node: { type: 'level', levelId: 6 },
    isClean: () => levelDone(6),
    buildDirty: LAUNDRY_DIRTY, buildClean: LAUNDRY_CLEAN,
  },
  {
    key: 'frontdoor', label: 'Front Door', x: ROOM_W * 7, w: ROOM_W,
    wallColor: 0x3a2e1e, floorColor: 0x5c3a21,
    node: { type: 'final' },
    isClean: () => store.allLevelsComplete(),
    buildDirty: FRONTDOOR_BASE, buildClean: FRONTDOOR_BASE,
  },
];

// ── Door node shape ─────────────────────────────────────────

interface DoorNode {
  roomKey: string;
  type: 'level' | 'sleep' | 'final';
  levelId?: number;
  worldX: number;       // center of the doorway in world coords
  bg: Phaser.GameObjects.Rectangle;
  frame: Phaser.GameObjects.Rectangle;
  nameText: Phaser.GameObjects.Text;
  statusText: Phaser.GameObjects.Text;
  lockIcon?: Phaser.GameObjects.Text;
  glow?: Phaser.GameObjects.Rectangle;
}

interface InteractableProp {
  roomKey: string;
  label: string;
  worldX: number;
  bg: Phaser.GameObjects.Rectangle;
  labelText: Phaser.GameObjects.Text;
  action: () => void;
  isAvailable: () => boolean;
}

// ═════════════════════════════════════════════════════════════

export class WorldMapScene extends Phaser.Scene {
  private nodes: DoorNode[] = [];
  private chris!: Phaser.GameObjects.Container;
  private chrisX = 450; // world-space x
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private moveLeft = false;
  private moveRight = false;
  private inputLocked = false; // locked during camera pan
  private promptText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private hud!: HUD;
  private jollibabees!: JollibabeeSpeechSystem;
  private audio!: AudioManager;
  private jbSprites: Phaser.GameObjects.Rectangle[] = [];
  private interactableProps: InteractableProp[] = [];
  private modalManager!: ModalManager;
  private memeCoinUsed = false;

  /** Tracks room prop game objects for rebuild on state change */
  private roomPropObjects = new Map<string, Phaser.GameObjects.GameObject[]>();

  /** If set, camera pans from this room to the next on create */
  private panFromRoom: string | null = null;

  constructor() {
    super(SCENES.WORLD_MAP);
  }

  // ═══════════════════════════════════════════════════════════
  //  INIT — receive data from returning scenes
  // ═══════════════════════════════════════════════════════════

  init(data?: { panFromRoom?: string }): void {
    this.panFromRoom = data?.panFromRoom ?? null;
  }

  create(): void {
    // Reset transient state (scene instances persist across restarts)
    this.chrisX = 450;
    this.moveLeft = false;
    this.moveRight = false;
    this.inputLocked = false;
    this.nodes = [];
    this.jbSprites = [];
    this.roomPropObjects.clear();
    this.interactableProps = [];
    this.memeCoinUsed = false;

    this.cameras.main.fadeIn(400, 0x1f, 0x3b, 0x2c);
    this.audio = new AudioManager(this);

    // ── World bounds ────────────────────────────────────────
    this.cameras.main.setBounds(0, 0, WORLD_W, GAME_HEIGHT);
    this.physics.world.setBounds(0, 0, WORLD_W, GAME_HEIGHT);

    // ── Draw house ──────────────────────────────────────────
    this.drawHouse();

    // ── Door nodes ──────────────────────────────────────────
    this.nodes = [];
    for (const room of ROOMS) {
      if (room.node) {
        this.nodes.push(this.createDoorNode(room));
      }
    }

    // ── Chris sprite (placeholder) ──────────────────────────
    this.chris = this.createChris(this.chrisX, FLOOR_Y - CHRIS_H / 2 - 4);

    // ── Jollibabee followers (world-space) ──────────────────
    this.jbSprites = this.createJollibabeeFollowers();

    // ── Camera follow ───────────────────────────────────────
    this.cameras.main.startFollow(this.chris, false, 0.08, 0.08);

    // ── HUD (fixed to camera, depth 90) ─────────────────────
    this.hud = new HUD(this);
    this.hud.create();

    // ── Jollibabees speech system ───────────────────────────
    this.jollibabees = new JollibabeeSpeechSystem(this);
    this.jollibabees.create(GAME_HEIGHT - 30, { cameraFixed: true });

    // ── Pan camera if returning from a level ────────────────
    if (this.panFromRoom) {
      this.doPanSequence(this.panFromRoom);
      this.panFromRoom = null;
    }

    // ── Prompt text (fixed to camera via scrollFactor) ──────
    this.promptText = this.add.text(GAME_WIDTH / 2, FLOOR_Y + 40, '', {
      fontSize: '14px', fontFamily: 'monospace', color: PALETTE_CSS.highlight2,
      backgroundColor: '#3a2e1e', padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(80).setVisible(false);

    // ── Message text (fixed to camera) ──────────────────────
    this.messageText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 50, '', {
      fontSize: '15px', fontFamily: 'monospace', color: PALETTE_CSS.danger,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(80);

    // ── Input ───────────────────────────────────────────────
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.setupTouchControls();

    // ── Keyboard interact (SPACE / ENTER) ───────────────────
    this.input.keyboard?.on('keydown-SPACE', () => this.tryInteractNearest());
    this.input.keyboard?.on('keydown-ENTER', () => this.tryInteractNearest());

    // ── Dev keys ────────────────────────────────────────────
    if (import.meta.env.DEV) {
      this.input.keyboard?.on('keydown-R', () => {
        store.reset();
        this.refreshAllNodes();
        this.showMessage('Run reset (dev)');
      });
    }

    this.refreshAllNodes();

    // ── Interactive room props (phone, computer, bed) ────
    this.modalManager = new ModalManager(this);
    this.createInteractableProps();

    // ── Random meme coin trigger (overworld, once per visit)
    this.time.delayedCall(rng.intBetween(25000, 50000), () => {
      if (!this.memeCoinUsed && !this.modalManager.isOpen && !this.inputLocked) {
        this.triggerOverworldMemeCoin();
      }
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  UPDATE
  // ═══════════════════════════════════════════════════════════

  update(_time: number, delta: number): void {
    // ── Movement (blocked during pan) ────────────────────
    if (this.inputLocked) return;

    let dx = 0;
    if (this.cursors.left.isDown || this.moveLeft) dx -= 1;
    if (this.cursors.right.isDown || this.moveRight) dx += 1;

    if (dx !== 0) {
      this.chrisX += dx * CHRIS_SPEED * (delta / 1000);
      this.chrisX = Phaser.Math.Clamp(this.chrisX, 60, WORLD_W - 60);

      // Progression lock: can't walk past a room until its level is done
      // (blocks Chris at the right edge of the current incomplete room)
      const p = store.progression;
      for (const room of ROOMS) {
        if (room.node?.type === 'level' && room.node.levelId != null) {
          const lid = room.node.levelId;
          if (!p.completedLevels.has(lid) && lid <= p.unlockedLevel) {
            // This is the current task room — block rightward movement past it
            const maxX = room.x + room.w;
            if (this.chrisX > maxX) {
              this.chrisX = maxX;
            }
            break; // only block at the first incomplete room
          }
        }
      }

      this.chris.setX(this.chrisX);
      this.chris.setScale(dx < 0 ? -1 : 1, 1); // flip
    }

    // ── Jollibabee followers trail behind Chris ──────────
    this.jbSprites.forEach((spr, i) => {
      const targetX = this.chrisX - 50 - i * 36;
      spr.x += (targetX - spr.x) * 0.04;
    });

    // ── Overlap check ────────────────────────────────────
    const nearest = this.getNearestInteractable();
    const nearestProp = this.getNearestProp();
    if (nearest) {
      this.promptText.setText(`▶  ${nearest.nameText.text}  ◀`);
      this.promptText.setVisible(true);
    } else if (nearestProp) {
      this.promptText.setText(`▶  ${nearestProp.label}  ◀`);
      this.promptText.setVisible(true);
    } else {
      this.promptText.setVisible(false);
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  DRAW THE HOUSE
  // ═══════════════════════════════════════════════════════════

  private drawHouse(): void {
    // ── Ceiling / sky strip above the house ──────────────
    this.add.rectangle(WORLD_W / 2, CEILING_Y / 2, WORLD_W, CEILING_Y, 0x1f3b2c);

    // ── Floor ────────────────────────────────────────────
    this.add.rectangle(WORLD_W / 2, FLOOR_Y + (GAME_HEIGHT - FLOOR_Y) / 2,
      WORLD_W, GAME_HEIGHT - FLOOR_Y, 0x4a2e18);
    // Floor highlights
    this.add.rectangle(WORLD_W / 2, FLOOR_Y + 2, WORLD_W, 3, 0x7a4e2d, 0.5);

    for (const room of ROOMS) {
      const cx = room.x + room.w / 2;

      // ── Back wall ──────────────────────────────────────
      this.add.rectangle(cx, CEILING_Y + WALL_H / 2, room.w, WALL_H, room.wallColor)
        .setStrokeStyle(1, 0x2a1e10);

      // ── Floor tint per room ────────────────────────────
      this.add.rectangle(cx, FLOOR_Y + 4, room.w, 8, room.floorColor, 0.4);

      // ── Room dividers (walls between rooms) ────────────
      this.add.rectangle(room.x, CEILING_Y + WALL_H / 2, 6, WALL_H + 4, 0x5c3a21)
        .setStrokeStyle(1, 0x3d2b1a);

      // ── Window (forest outside) ────────────────────────
      const winX = room.x + room.w * 0.85;
      const winY = CEILING_Y + 80;
      // Outer frame
      this.add.rectangle(winX, winY, 64, 80, 0x000000, 0).setStrokeStyle(2, 0x7a4e2d);
      // Forest view inside window
      this.add.rectangle(winX, winY, 58, 74, 0x1f3b2c);
      // Distant trees
      this.add.triangle(winX - 14, winY + 10, 0, 30, 14, -10, 28, 30, 0x2f4f3e);
      this.add.triangle(winX + 10, winY + 6, 0, 34, 12, -8, 24, 34, 0x3f6b4f);
      // Mist
      this.add.rectangle(winX, winY + 28, 54, 14, 0x6d8c8a, 0.25);
      // Cross bars
      this.add.rectangle(winX, winY, 2, 74, 0x7a4e2d);
      this.add.rectangle(winX, winY, 58, 2, 0x7a4e2d);

      // ── Room label (top, on the wall) ──────────────────
      this.add.text(cx, CEILING_Y + 20, room.label, {
        fontSize: '13px', fontFamily: 'monospace', color: PALETTE_CSS.champagne,
      }).setOrigin(0.5).setAlpha(0.7);

      // ── Per-room props (data-driven dirty/clean) ───────
      this.buildRoomProps(room);
    }

    // ── Right-edge wall cap ──────────────────────────────
    this.add.rectangle(WORLD_W, CEILING_Y + WALL_H / 2, 6, WALL_H + 4, 0x5c3a21);

    // ── Floor path markers (dotted stepping marks between rooms) ─
    for (let i = 0; i < ROOMS.length - 1; i++) {
      const r = ROOMS[i];
      const nextR = ROOMS[i + 1];
      const startX = r.x + r.w * 0.6;
      const endX = nextR.x + nextR.w * 0.4;
      const pathY = FLOOR_Y + 6;
      const dotSpacing = 28;
      for (let dx = startX; dx < endX; dx += dotSpacing) {
        this.add.rectangle(dx, pathY, 6, 3, PALETTE.champagne, 0.22)
          .setDepth(2);
      }
    }

    // ── Warm lanterns on ceiling (every ~500px) ──────────
    for (let lx = 250; lx < WORLD_W; lx += 500) {
      this.add.circle(lx, CEILING_Y + 8, 5, 0xf4c76a).setAlpha(0.9);
      this.add.circle(lx, CEILING_Y + 10, 30, 0xf4c76a, 0.08); // glow
      this.add.rectangle(lx, CEILING_Y + 2, 2, 8, 0x7a4e2d); // chain
    }

    // ── Floating dust particles ─────────────────────────
    for (let i = 0; i < 30; i++) {
      const px = Phaser.Math.Between(0, WORLD_W);
      const py = Phaser.Math.Between(CEILING_Y + 20, FLOOR_Y - 10);
      const dot = this.add.circle(px, py, Phaser.Math.Between(1, 2), PALETTE.champagne, 0.1);
      this.tweens.add({
        targets: dot,
        y: py - Phaser.Math.Between(30, 70),
        alpha: 0,
        duration: Phaser.Math.Between(5000, 9000),
        repeat: -1,
        delay: Phaser.Math.Between(0, 5000),
        onRepeat: () => {
          dot.setPosition(Phaser.Math.Between(0, WORLD_W), Phaser.Math.Between(CEILING_Y + 40, FLOOR_Y - 10));
          dot.setAlpha(0.1);
        },
      });
    }

    // ── Fireflies (golden flicker, distinct from dust) ──
    for (let i = 0; i < 18; i++) {
      const fx = Phaser.Math.Between(0, WORLD_W);
      const fy = Phaser.Math.Between(CEILING_Y + 40, FLOOR_Y - 30);
      const fly = this.add.circle(fx, fy, 2, 0xf4c76a, 0).setDepth(3);
      // Each firefly fades in/out with random drift
      this.tweens.add({
        targets: fly,
        alpha: { from: 0, to: 0.6 },
        x: fx + Phaser.Math.Between(-40, 40),
        y: fy + Phaser.Math.Between(-20, 20),
        duration: Phaser.Math.Between(2000, 4000),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 6000),
        ease: 'Sine.easeInOut',
      });
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  DOOR NODES
  // ═══════════════════════════════════════════════════════════

  private createDoorNode(room: RoomDef): DoorNode {
    const n = room.node!;
    const doorX = room.x + room.w * 0.5;
    const doorY = FLOOR_Y - 70;
    const doorW = 64;
    const doorH = 120;

    // Warm glow behind (only visible when open)
    const glow = this.add.rectangle(doorX, doorY, doorW + 24, doorH + 16, PALETTE.champagne, 0)
      .setDepth(4);

    // Door rectangle
    const bg = this.add.rectangle(doorX, doorY, doorW, doorH, PALETTE.wood1)
      .setStrokeStyle(2, PALETTE.wood2).setDepth(5)
      .setInteractive({ useHandCursor: true });

    // Inner frame
    const frame = this.add.rectangle(doorX, doorY, doorW - 10, doorH - 10, 0x000000, 0)
      .setStrokeStyle(1, PALETTE.highlight1).setDepth(6);

    // Doorknob
    this.add.circle(doorX + doorW / 2 - 10, doorY + 10, 4, PALETTE.highlight1).setDepth(7);

    // Name sign above door
    const signY = doorY - doorH / 2 - 18;
    // Sign plank
    this.add.rectangle(doorX, signY, 120, 22, PALETTE.wood2, 0.9)
      .setStrokeStyle(1, PALETTE.wood1).setDepth(6);
    const nameText = this.add.text(doorX, signY, this.getNodeDisplayName(room), {
      fontSize: '11px', fontFamily: 'monospace', color: PALETTE_CSS.ivory,
    }).setOrigin(0.5).setDepth(7);

    // Status text below door
    const statusText = this.add.text(doorX, FLOOR_Y + 12, '', {
      fontSize: '10px', fontFamily: 'monospace', color: PALETTE_CSS.highlight1,
    }).setOrigin(0.5).setDepth(7);

    // Lock icon (hidden by default)
    const lockIcon = this.add.text(doorX, doorY, '🔒', {
      fontSize: '20px',
    }).setOrigin(0.5).setDepth(8).setVisible(false);

    // Tap to interact
    bg.on('pointerdown', () => {
      if (this.inputLocked) return;
      this.audio.buttonTap();
      this.interactNode({ roomKey: room.key, type: n.type, levelId: n.levelId,
        worldX: doorX, bg, frame, nameText, statusText, lockIcon, glow });
    });

    return {
      roomKey: room.key,
      type: n.type,
      levelId: n.levelId,
      worldX: doorX,
      bg, frame, nameText, statusText, lockIcon, glow,
    };
  }

  private getNodeDisplayName(room: RoomDef): string {
    const n = room.node!;
    if (n.type === 'sleep') return '☽ Bedroom';
    if (n.type === 'final') return '🚪 Front Door';
    const def = LEVEL_DEFS.find(l => l.id === n.levelId);
    return def ? `L${def.id}: ${def.title}` : room.label;
  }

  // ═══════════════════════════════════════════════════════════
  //  CHRIS
  // ═══════════════════════════════════════════════════════════

  private createChris(x: number, y: number): Phaser.GameObjects.Container {
    const c = this.add.container(x, y).setDepth(50);
    // Body
    c.add(this.add.rectangle(0, 0, CHRIS_W, CHRIS_H, PALETTE.chrisRed)
      .setStrokeStyle(1, 0xffffff));
    // Head
    c.add(this.add.rectangle(0, -CHRIS_H / 2 - 8, 18, 16, 0xf5d5b8)
      .setStrokeStyle(1, 0xddbb99));
    // Eyes
    c.add(this.add.rectangle(-4, -CHRIS_H / 2 - 10, 3, 3, 0x222222));
    c.add(this.add.rectangle(4, -CHRIS_H / 2 - 10, 3, 3, 0x222222));
    // Label
    c.add(this.add.text(0, CHRIS_H / 2 + 6, 'Chris', {
      fontSize: '9px', fontFamily: 'monospace', color: PALETTE_CSS.ivory,
    }).setOrigin(0.5));
    return c;
  }

  // ═══════════════════════════════════════════════════════════
  //  JOLLIBABEE FOLLOWERS
  // ═══════════════════════════════════════════════════════════

  private createJollibabeeFollowers(): Phaser.GameObjects.Rectangle[] {
    // Unlock order: JolliCute, JolliBurrito, JolliBart, JolliLite, JolliBig, JolliBay
    const colors = [0xffaaaa, 0xff8888, 0xdd5555, 0xcc3333, 0xff4444, 0xff6666];
    const sizes  = [18,       16,       18,       18,       24,       18];
    const yOffs  = [0,        -10,      0,        0,        0,        0]; // Burrito hovers
    const sprites: Phaser.GameObjects.Rectangle[] = [];
    const count = store.jollibabeeCount; // only show unlocked babies
    for (let i = 0; i < count; i++) {
      const sx = this.chrisX - 50 - i * 36;
      const spr = this.add.rectangle(sx, FLOOR_Y - sizes[i] / 2 - 4 + yOffs[i], sizes[i], sizes[i], colors[i])
        .setStrokeStyle(1, 0xffffff).setDepth(45);
      // Idle bob
      this.tweens.add({
        targets: spr,
        y: spr.y - 4,
        duration: 700 + i * 80,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      sprites.push(spr);
    }
    return sprites;
  }

  // ═══════════════════════════════════════════════════════════
  //  TOUCH / MOBILE CONTROLS
  // ═══════════════════════════════════════════════════════════

  private setupTouchControls(): void {
    // Left / right tap zones at bottom of screen (scrollFactor 0 = fixed)
    const zoneH = 100;
    const zoneW = 120;
    const zoneY = GAME_HEIGHT - zoneH / 2;

    // Left arrow zone
    const leftZone = this.add.rectangle(zoneW / 2 + 10, zoneY, zoneW, zoneH, PALETTE.wood1, 0.25)
      .setInteractive().setScrollFactor(0).setDepth(85);
    this.add.text(zoneW / 2 + 10, zoneY, '◀', {
      fontSize: '28px', color: PALETTE_CSS.ivory,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(86).setAlpha(0.6);

    leftZone.on('pointerdown', () => { this.moveLeft = true; });
    leftZone.on('pointerup', () => { this.moveLeft = false; });
    leftZone.on('pointerout', () => { this.moveLeft = false; });

    // Right arrow zone
    const rightZone = this.add.rectangle(zoneW / 2 + zoneW + 30, zoneY, zoneW, zoneH, PALETTE.wood1, 0.25)
      .setInteractive().setScrollFactor(0).setDepth(85);
    this.add.text(zoneW / 2 + zoneW + 30, zoneY, '▶', {
      fontSize: '28px', color: PALETTE_CSS.ivory,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(86).setAlpha(0.6);

    rightZone.on('pointerdown', () => { this.moveRight = true; });
    rightZone.on('pointerup', () => { this.moveRight = false; });
    rightZone.on('pointerout', () => { this.moveRight = false; });

    // Interact button
    const interBtn = this.add.rectangle(GAME_WIDTH - 80, zoneY, 120, zoneH, PALETTE.highlight1, 0.3)
      .setInteractive().setScrollFactor(0).setDepth(85);
    this.add.text(GAME_WIDTH - 80, zoneY, 'ENTER', {
      fontSize: '14px', fontFamily: 'monospace', color: PALETTE_CSS.ivory,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(86).setAlpha(0.7);

    interBtn.on('pointerdown', () => {
      if (this.inputLocked) return;
      this.tryInteractNearest();
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  INTERACTION
  // ═══════════════════════════════════════════════════════════

  private getNearestInteractable(): DoorNode | null {
    let best: DoorNode | null = null;
    let bestDist = Infinity;
    for (const node of this.nodes) {
      const dist = Math.abs(this.chrisX - node.worldX);
      if (dist < INTERACT_DIST && dist < bestDist) {
        if (this.isNodeInteractable(node)) {
          best = node;
          bestDist = dist;
        }
      }
    }
    return best;
  }

  private isNodeInteractable(node: DoorNode): boolean {
    const p = store.progression;
    if (node.type === 'level') {
      const id = node.levelId!;
      if (p.completedLevels.has(id)) return false; // already done
      if (id > p.unlockedLevel) return false;       // locked
      if (id === 6 && !p.sleepCompleted) return false;
      return true;
    }
    if (node.type === 'sleep') {
      if (p.sleepCompleted) return false;
      for (let i = 1; i <= 5; i++) if (!p.completedLevels.has(i)) return false;
      return true;
    }
    if (node.type === 'final') {
      return store.allLevelsComplete();
    }
    return false;
  }

  private tryInteractNearest(): void {
    const node = this.getNearestInteractable();
    if (node) {
      this.interactNode(node);
      return;
    }
    // Check interactive props (phone, computer, bed)
    const prop = this.getNearestProp();
    if (prop) {
      if (prop.isAvailable()) {
        this.audio.buttonTap();
        prop.action();
      } else {
        this.showPropLockedMessage(prop.roomKey);
      }
      return;
    }
    // Maybe show a locked message for close-by locked nodes
    const closest = this.getClosestNode();
    if (closest && Math.abs(this.chrisX - closest.worldX) < INTERACT_DIST) {
      this.showLockedMessage(closest);
    }
  }

  private getClosestNode(): DoorNode | null {
    let best: DoorNode | null = null;
    let bestDist = Infinity;
    for (const node of this.nodes) {
      const d = Math.abs(this.chrisX - node.worldX);
      if (d < bestDist) { best = node; bestDist = d; }
    }
    return best;
  }

  private showLockedMessage(node: DoorNode): void {
    const p = store.progression;
    if (node.type === 'level') {
      const id = node.levelId!;
      if (p.completedLevels.has(id)) {
        this.showMessage('Already completed.');
      } else if (id === 6 && !p.sleepCompleted) {
        this.showMessage('Sacred Sleep required first.');
      } else {
        this.showMessage(`Level ${id} is locked.`);
      }
    } else if (node.type === 'sleep') {
      if (p.sleepCompleted) {
        this.showMessage('Already rested.');
      } else {
        this.showMessage('Complete Levels 1-5 first.');
      }
    } else if (node.type === 'final') {
      this.showMessage('Complete all levels first.');
    }
  }

  private interactNode(node: DoorNode): void {
    if (node.type === 'level') {
      this.startLevel(node.levelId!);
    } else if (node.type === 'sleep') {
      this.goToSleep();
    } else if (node.type === 'final') {
      this.tryFinalPickup();
    }
  }

  private startLevel(id: number): void {
    const p = store.progression;
    if (id > p.unlockedLevel) { this.showMessage(`Level ${id} is locked.`); return; }
    if (p.completedLevels.has(id)) { this.showMessage('Already completed.'); return; }
    if (id === 6 && !p.sleepCompleted) { this.showMessage('Sacred Sleep required.'); return; }

    this.jollibabees.destroy();
    this.cameras.main.fadeOut(400, 0x1f, 0x3b, 0x2c);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(SCENES.LEVEL, { levelId: id });
    });
  }

  private tryFinalPickup(): void {
    if (!store.allLevelsComplete()) {
      this.showMessage('Complete all 6 levels first.');
      return;
    }
    this.jollibabees.destroy();
    this.cameras.main.fadeOut(400, 0x1f, 0x3b, 0x2c);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(SCENES.FINAL_PICKUP);
    });
  }

  private goToSleep(): void {
    if (store.progression.sleepCompleted) { this.showMessage('Already rested.'); return; }
    for (let i = 1; i <= 5; i++) {
      if (!store.progression.completedLevels.has(i)) {
        this.showMessage('Complete Levels 1-5 first.');
        return;
      }
    }
    this.jollibabees.destroy();
    this.cameras.main.fadeOut(400, 0x1f, 0x3b, 0x2c);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(SCENES.SLEEP);
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  REFRESH NODES
  // ═══════════════════════════════════════════════════════════

  private refreshAllNodes(): void {
    this.hud.update();
    const p = store.progression;

    for (const node of this.nodes) {
      if (node.type === 'level') {
        const id = node.levelId!;
        if (p.completedLevels.has(id)) {
          // DONE — green tint
          node.bg.setFillStyle(PALETTE.forest3);
          node.frame.setStrokeStyle(1, PALETTE.forest3);
          node.statusText.setText('✓ DONE').setColor(PALETTE_CSS.forest3);
          node.lockIcon?.setVisible(false);
          node.glow?.setAlpha(0);
        } else if (id <= p.unlockedLevel && !(id === 6 && !p.sleepCompleted)) {
          // OPEN — warm glow
          node.bg.setFillStyle(PALETTE.wood1);
          node.frame.setStrokeStyle(1, PALETTE.highlight1);
          node.statusText.setText('OPEN').setColor(PALETTE_CSS.highlight1);
          node.lockIcon?.setVisible(false);
          node.glow?.setAlpha(0.15);
          node.nameText.setAlpha(1);
          // Pulse glow
          this.tweens.add({
            targets: node.glow,
            alpha: { from: 0.1, to: 0.25 },
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          });
        } else {
          // LOCKED — desaturated
          node.bg.setFillStyle(0x4a4a4a);
          node.frame.setStrokeStyle(1, 0x666666);
          node.statusText.setText('LOCKED').setColor(PALETTE_CSS.mist);
          node.lockIcon?.setVisible(true);
          node.glow?.setAlpha(0);
          node.nameText.setAlpha(0.5);
        }
      } else if (node.type === 'sleep') {
        if (p.sleepCompleted) {
          node.bg.setFillStyle(PALETTE.forest3);
          node.statusText.setText('✓ RESTED').setColor(PALETTE_CSS.forest3);
          node.lockIcon?.setVisible(false);
          node.glow?.setAlpha(0);
        } else {
          const canSleep = [1, 2, 3, 4, 5].every(i => p.completedLevels.has(i));
          if (canSleep) {
            node.bg.setFillStyle(PALETTE.wood2);
            node.statusText.setText('OPEN').setColor(PALETTE_CSS.highlight1);
            node.lockIcon?.setVisible(false);
            node.glow?.setAlpha(0.15);
            this.tweens.add({
              targets: node.glow,
              alpha: { from: 0.1, to: 0.25 },
              duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
            });
          } else {
            node.bg.setFillStyle(0x4a4a4a);
            node.statusText.setText('LOCKED').setColor(PALETTE_CSS.mist);
            node.lockIcon?.setVisible(true);
            node.glow?.setAlpha(0);
            node.nameText.setAlpha(0.5);
          }
        }
      } else if (node.type === 'final') {
        if (store.allLevelsComplete()) {
          node.bg.setFillStyle(PALETTE.highlight1);
          node.statusText.setText('READY').setColor(PALETTE_CSS.highlight2);
          node.lockIcon?.setVisible(false);
          node.glow?.setAlpha(0.2);
          this.tweens.add({
            targets: node.glow,
            alpha: { from: 0.15, to: 0.35 },
            duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
          });
        } else {
          node.bg.setFillStyle(0x4a4a4a);
          node.statusText.setText('LOCKED').setColor(PALETTE_CSS.mist);
          node.lockIcon?.setVisible(true);
          node.glow?.setAlpha(0);
          node.nameText.setAlpha(0.5);
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  ROOM PROPS (dirty / clean)
  // ═══════════════════════════════════════════════════════════

  /** Build room props according to current completion state */
  private buildRoomProps(room: RoomDef): void {
    // Destroy any existing props for this room
    const existing = this.roomPropObjects.get(room.key);
    if (existing) {
      for (const obj of existing) {
        if (obj && 'destroy' in obj) (obj as Phaser.GameObjects.GameObject).destroy();
      }
    }
    // Build the appropriate set
    const builder = room.isClean() ? room.buildClean : room.buildDirty;
    const objs = builder(this, room.x, room.w);
    // Set depth so props render on top of walls but below doors/Chris
    for (const obj of objs) {
      if ('setDepth' in obj) (obj as any).setDepth(3);
    }
    this.roomPropObjects.set(room.key, objs);
  }

  /** Rebuild props for a single room (e.g. after level completion) */
  private rebuildRoomProps(roomKey: string): void {
    const room = ROOMS.find(r => r.key === roomKey);
    if (room) this.buildRoomProps(room);
  }

  // ═══════════════════════════════════════════════════════════
  //  CAMERA PAN SEQUENCE (post-level return)
  // ═══════════════════════════════════════════════════════════

  /**
   * After returning from a completed level:
   * 1. Place Chris at the completed room's doorway
   * 2. Briefly show the completed room (clean state)
   * 3. Pan camera to the NEXT room
   * 4. Walk Chris to that room, re-enable input
   */
  private doPanSequence(fromRoomKey: string): void {
    this.inputLocked = true;

    const fromIdx = ROOMS.findIndex(r => r.key === fromRoomKey);
    if (fromIdx < 0) { this.inputLocked = false; return; }

    const fromRoom = ROOMS[fromIdx];
    const toIdx = Math.min(fromIdx + 1, ROOMS.length - 1);
    const toRoom = ROOMS[toIdx];

    // Place Chris at the completed room door
    const startX = fromRoom.x + fromRoom.w * 0.5;
    this.chrisX = startX;
    this.chris.setX(startX);

    // Snap followers immediately
    this.jbSprites.forEach((spr, i) => {
      spr.x = startX - 50 - i * 36;
    });

    // Stop camera follow, set camera on the completed room
    this.cameras.main.stopFollow();
    this.cameras.main.scrollX = Phaser.Math.Clamp(
      startX - GAME_WIDTH / 2, 0, WORLD_W - GAME_WIDTH
    );

    // Rebuild the completed room props to show clean state
    this.rebuildRoomProps(fromRoomKey);

    // Brief pause to admire the cleaned room, then pan
    this.time.delayedCall(800, () => {
      const targetX = toRoom.x + toRoom.w * 0.5;
      const targetScrollX = Phaser.Math.Clamp(
        targetX - GAME_WIDTH / 2, 0, WORLD_W - GAME_WIDTH
      );

      // Pan camera
      this.tweens.add({
        targets: this.cameras.main,
        scrollX: targetScrollX,
        duration: 1200,
        ease: 'Cubic.easeInOut',
        onComplete: () => {
          // Walk Chris to the next room
          const walkDuration = Math.abs(targetX - this.chrisX) / CHRIS_SPEED * 1000;
          const walkDir = targetX > this.chrisX ? 1 : -1;
          this.chris.setScale(walkDir, 1);

          this.tweens.add({
            targets: this,
            chrisX: targetX,
            duration: Math.max(walkDuration, 400),
            ease: 'Sine.easeInOut',
            onUpdate: () => {
              this.chris.setX(this.chrisX);
              // Followers trail
              this.jbSprites.forEach((spr, i) => {
                const tx = this.chrisX - 50 - i * 36;
                spr.x += (tx - spr.x) * 0.08;
              });
            },
            onComplete: () => {
              // Re-enable camera follow and input
              this.cameras.main.startFollow(this.chris, false, 0.08, 0.08);
              this.inputLocked = false;
            },
          });
        },
      });
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  INTERACTIVE PROPS (phone, computer, bed)
  // ═══════════════════════════════════════════════════════════

  private createInteractableProps(): void {
    this.interactableProps = [];

    // ── Phone in Living Room (doomscroll trigger) ────────
    const living = ROOMS.find(r => r.key === 'living')!;
    this.addProp(
      'living',
      living.x + living.w * 0.66,
      FLOOR_Y - 38,
      '📱', 'Phone',
      () => this.triggerOverworldDoomScroll(),
      () => !this.modalManager.isOpen,
    );

    // ── Computer in Office (starts L4) ──────────────────
    const office = ROOMS.find(r => r.key === 'office')!;
    this.addProp(
      'office',
      office.x + office.w * 0.5,
      FLOOR_Y - 75,
      '💻', 'Computer',
      () => this.startLevel(4),
      () => {
        const p = store.progression;
        if (p.completedLevels.has(4)) return false;
        if (4 > p.unlockedLevel) return false;
        return true;
      },
    );

    // ── Bed in Bedroom (Sacred Sleep) ───────────────────
    const bedroom = ROOMS.find(r => r.key === 'bedroom')!;
    this.addProp(
      'bedroom',
      bedroom.x + bedroom.w * 0.45,
      FLOOR_Y - 30,
      '🛏', 'Bed',
      () => this.goToSleep(),
      () => {
        if (store.progression.sleepCompleted) return false;
        for (let i = 1; i <= 5; i++) {
          if (!store.progression.completedLevels.has(i)) return false;
        }
        return true;
      },
    );
  }

  private addProp(
    roomKey: string, worldX: number, worldY: number,
    icon: string, label: string,
    action: () => void, isAvailable: () => boolean,
  ): void {
    // Glow highlight behind prop
    const glow = this.add.rectangle(worldX, worldY, 56, 56, PALETTE.highlight1, 0.15)
      .setDepth(8);
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.1, to: 0.3 },
      duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Interactive hit area
    const hitArea = this.add.rectangle(worldX, worldY, 64, 64, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(9);

    // Label above prop
    const labelText = this.add.text(worldX, worldY - 38, `${icon} ${label}`, {
      fontSize: '10px', fontFamily: 'monospace', color: PALETTE_CSS.ivory,
      backgroundColor: '#3a2e1e', padding: { x: 4, y: 2 },
    }).setOrigin(0.5).setDepth(9);

    hitArea.on('pointerdown', () => {
      if (this.inputLocked || this.modalManager.isOpen) return;
      if (isAvailable()) {
        this.audio.buttonTap();
        action();
      } else {
        this.showPropLockedMessage(roomKey);
      }
    });

    this.interactableProps.push({
      roomKey, label: `${icon} ${label}`, worldX, bg: hitArea, labelText, action, isAvailable,
    });
  }

  private getNearestProp(): InteractableProp | null {
    if (this.modalManager?.isOpen) return null;
    let best: InteractableProp | null = null;
    let bestDist = Infinity;
    for (const prop of this.interactableProps) {
      const dist = Math.abs(this.chrisX - prop.worldX);
      if (dist < INTERACT_DIST && dist < bestDist) {
        best = prop;
        bestDist = dist;
      }
    }
    return best;
  }

  private showPropLockedMessage(roomKey: string): void {
    if (roomKey === 'office') {
      if (store.progression.completedLevels.has(4)) {
        this.showMessage('Work already completed.');
      } else if (4 > store.progression.unlockedLevel) {
        this.showMessage('Complete earlier tasks first.');
      }
    } else if (roomKey === 'bedroom') {
      if (store.progression.sleepCompleted) {
        this.showMessage('Already rested.');
      } else {
        this.showMessage('Complete Levels 1-5 first.');
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  OVERWORLD DOOMSCROLL (triggered by phone prop)
  // ═══════════════════════════════════════════════════════════

  private triggerOverworldDoomScroll(): void {
    if (this.modalManager.isOpen) return;
    this.inputLocked = true;

    this.modalManager.show({
      title: 'Doom Scroll...',
      body: 'The feed never ends.\nKeep scrolling?',
      buttons: [
        {
          label: 'Scroll more',
          callback: () => {
            const result = applyDoomScroll(store.stats, 'scroll');
            store.setStats(result.stats);
            this.inputLocked = false;
            this.hud.update();
            this.showMessage('Integrity -5. The scroll consumed you.');
          },
        },
        {
          label: 'Close',
          callback: () => {
            const result = applyDoomScroll(store.stats, 'close');
            store.setStats(result.stats);
            this.inputLocked = false;
            this.hud.update();
            this.showMessage('Good choice. Integrity +1.');
          },
        },
      ],
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  OVERWORLD MEME COIN (random trigger)
  // ═══════════════════════════════════════════════════════════

  private triggerOverworldMemeCoin(): void {
    if (this.modalManager.isOpen || this.memeCoinUsed) return;
    this.memeCoinUsed = true;
    this.inputLocked = true;

    this.modalManager.show({
      title: '🐋 WHALE COIN',
      body: 'Whale Coin is pumping. Invest?',
      buttons: [
        {
          label: 'INVEST',
          callback: () => {
            const roll = rng.chance(0.5);
            const result = applyWhaleCoin(store.stats, 'invest', roll);
            store.setStats(result.stats);
            this.hud.update();

            const msg = result.won
              ? '🚀 TO THE MOON! +15 Diamonds!'
              : '📉 RUG PULL! Lost diamonds!';
            this.showMessage(msg);

            this.inputLocked = false;
          },
        },
        {
          label: 'IGNORE',
          callback: () => {
            const result = applyWhaleCoin(store.stats, 'ignore', false);
            store.setStats(result.stats);
            this.inputLocked = false;
            this.hud.update();
            this.showMessage('+2 Diamonds, +1 Integrity.');
          },
        },
      ],
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  MESSAGES
  // ═══════════════════════════════════════════════════════════

  private showMessage(msg: string): void {
    this.messageText.setText(msg);
    this.time.delayedCall(2500, () => {
      if (this.messageText) this.messageText.setText('');
    });
  }
}
