/**
 * game.js — 2D HD Pixel Side-Scrolling Life Simulator
 *
 * ONE continuous horizontal world (7680 × 1024) made of 5 stitched rooms.
 * Camera follows the player. No scene transitions, no fades.
 *
 * Structure:
 *   1. Constants & Config
 *   2. Room Definitions
 *   3. Player
 *   4. Camera
 *   5. Chat Bubble
 *   6. Input
 *   7. Update / Render loop
 */

// ═══════════════════════════════════════════════════════════
//  1. CONSTANTS & CONFIG
// ═══════════════════════════════════════════════════════════

const CANVAS_W   = 1536;
const CANVAS_H   = 1024;
const ROOM_W     = 1536;   // each room is one viewport wide
const NUM_ROOMS  = 5;
const WORLD_W    = ROOM_W * NUM_ROOMS;  // 7680
const WORLD_H    = CANVAS_H;            // 1024

const canvas = document.getElementById('game');
const ctx    = canvas.getContext('2d');

// ── Pixel-perfect rendering ──────────────────────────────
// Disable canvas-level smoothing so drawImage() and
// fillRect() stay pixel-sharp at any scale.
ctx.imageSmoothingEnabled = false;

// ═══════════════════════════════════════════════════════════
//  2. ROOM DEFINITIONS
// ═══════════════════════════════════════════════════════════
// Rooms are laid out left-to-right. Each has a fill colour
// (placeholder until real art is loaded) and a label.

const ROOMS = [
  { name: 'Bedroom',      color: '#2a1f3d', accent: '#6b4f8a', furniture: '🛏️' },
  { name: 'Living Room',  color: '#1f3b2c', accent: '#3f6b4f', furniture: '🛋️' },
  { name: 'Kitchen',      color: '#3b2a1a', accent: '#7a4e2d', furniture: '🍳' },
  { name: 'Work Space',   color: '#1a2a3b', accent: '#4a7a9e', furniture: '💻' },
  { name: 'Balcony',      color: '#2f3b1f', accent: '#6b8a4f', furniture: '🌿' },
];

// ═══════════════════════════════════════════════════════════
//  3. PLAYER
// ═══════════════════════════════════════════════════════════

const player = {
  x: ROOM_W / 2,           // start centered in first room
  y: CANVAS_H - 256 - 40,  // 256px tall, 40px from bottom
  w: 96,
  h: 256,
  speed: 6,
  color: '#e84040',         // placeholder red sprite
  facing: 1,               // 1 = right, -1 = left
};

// ═══════════════════════════════════════════════════════════
//  4. CAMERA
// ═══════════════════════════════════════════════════════════
// Camera stores the world X offset that maps world coords
// to screen coords:  screenX = worldX - camera.x
//
// Follow logic:
//   target = player.x - CANVAS_W/2   (center player on screen)
//   clamp  target to [0, WORLD_W - CANVAS_W]
//   lerp   camera.x toward target for smooth follow

const camera = {
  x: 0,
  lerp: 0.1,  // 0 = no follow, 1 = instant snap
};

function updateCamera() {
  // Target: put player center-screen
  const target = player.x + player.w / 2 - CANVAS_W / 2;

  // Clamp so we never show past world edges
  const clamped = Math.max(0, Math.min(target, WORLD_W - CANVAS_W));

  // Smooth interpolation toward target
  camera.x += (clamped - camera.x) * camera.lerp;
}

// ═══════════════════════════════════════════════════════════
//  5. CHAT BUBBLE (room entry notification)
// ═══════════════════════════════════════════════════════════

const bubble = {
  text: '',
  timer: 0,         // remaining ms to show
  duration: 2000,   // 2 seconds
};

let currentRoomIndex = -1;  // track which room player is in

/**
 * Room detection logic:
 *   roomIndex = floor(playerCenterX / ROOM_W)
 *   clamped to [0, NUM_ROOMS - 1]
 *
 * When the index changes → fire a new chat bubble.
 */
function detectRoom() {
  const centerX = player.x + player.w / 2;
  const idx = Math.min(NUM_ROOMS - 1, Math.max(0, Math.floor(centerX / ROOM_W)));

  if (idx !== currentRoomIndex) {
    currentRoomIndex = idx;
    bubble.text = ROOMS[idx].name;
    bubble.timer = bubble.duration;
  }
}

// ═══════════════════════════════════════════════════════════
//  6. INPUT
// ═══════════════════════════════════════════════════════════

const keys = {};
window.addEventListener('keydown', (e) => { keys[e.code] = true; });
window.addEventListener('keyup',   (e) => { keys[e.code] = false; });

function handleInput() {
  let dx = 0;
  if (keys['ArrowLeft']  || keys['KeyA']) dx -= 1;
  if (keys['ArrowRight'] || keys['KeyD']) dx += 1;

  player.x += dx * player.speed;

  // Clamp player inside world bounds
  player.x = Math.max(0, Math.min(player.x, WORLD_W - player.w));

  if (dx !== 0) player.facing = dx;
}

// ═══════════════════════════════════════════════════════════
//  7. RENDERING
// ═══════════════════════════════════════════════════════════

/** Draw all room backgrounds, offset by camera */
function drawWorld() {
  for (let i = 0; i < NUM_ROOMS; i++) {
    const room = ROOMS[i];
    const rx = i * ROOM_W - camera.x;   // screen-space X

    // Skip rooms completely off-screen
    if (rx + ROOM_W < 0 || rx > CANVAS_W) continue;

    // ── Room fill ────────────────────────────────────────
    ctx.fillStyle = room.color;
    ctx.fillRect(rx, 0, ROOM_W, CANVAS_H);

    // ── Floor stripe ─────────────────────────────────────
    ctx.fillStyle = room.accent;
    ctx.fillRect(rx, CANVAS_H - 40, ROOM_W, 40);

    // ── Room divider (thin vertical line) ────────────────
    if (i > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(rx - 1, 0, 2, CANVAS_H);
    }

    // ── Room label (large pixel text at top) ─────────────
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.font = '48px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(room.name, rx + ROOM_W / 2, 80);

    // ── Furniture emoji placeholder (center of room) ─────
    ctx.font = '120px serif';
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillText(room.furniture, rx + ROOM_W / 2, CANVAS_H / 2 + 40);

    // ── Window / wall detail ─────────────────────────────
    drawRoomDetails(i, rx, room);
  }
}

/** Draw simple geometric furniture/detail per room */
function drawRoomDetails(roomIdx, rx, room) {
  ctx.strokeStyle = room.accent;
  ctx.lineWidth = 3;

  switch (roomIdx) {
    case 0: // Bedroom — bed outline
      ctx.strokeRect(rx + 200, CANVAS_H - 200, 400, 160);
      ctx.fillStyle = room.accent + '44';
      ctx.fillRect(rx + 200, CANVAS_H - 200, 400, 160);
      break;
    case 1: // Living Room — couch outline
      ctx.strokeRect(rx + 300, CANVAS_H - 180, 500, 140);
      ctx.fillStyle = room.accent + '44';
      ctx.fillRect(rx + 300, CANVAS_H - 180, 500, 140);
      // TV
      ctx.strokeRect(rx + 1000, CANVAS_H - 400, 200, 140);
      break;
    case 2: // Kitchen — counter
      ctx.strokeRect(rx + 100, CANVAS_H - 220, 600, 180);
      ctx.fillStyle = room.accent + '44';
      ctx.fillRect(rx + 100, CANVAS_H - 220, 600, 180);
      // Fridge
      ctx.strokeRect(rx + 1100, CANVAS_H - 380, 160, 340);
      break;
    case 3: // Work Space — desk
      ctx.strokeRect(rx + 400, CANVAS_H - 240, 500, 200);
      ctx.fillStyle = room.accent + '44';
      ctx.fillRect(rx + 400, CANVAS_H - 240, 500, 200);
      // Monitor
      ctx.strokeRect(rx + 550, CANVAS_H - 380, 200, 140);
      break;
    case 4: // Balcony — railing
      ctx.strokeRect(rx + 50, CANVAS_H - 300, ROOM_W - 100, 4);
      // Plant pots
      for (let p = 0; p < 4; p++) {
        const px = rx + 200 + p * 300;
        ctx.strokeRect(px, CANVAS_H - 200, 80, 100);
        ctx.fillStyle = '#4a7a3d44';
        ctx.fillRect(px, CANVAS_H - 200, 80, 100);
      }
      break;
  }
}

/** Draw the player sprite (placeholder rectangle) */
function drawPlayer() {
  const sx = player.x - camera.x;  // world → screen
  const sy = player.y;

  // Body
  ctx.fillStyle = player.color;
  ctx.fillRect(sx, sy, player.w, player.h);

  // Head
  ctx.fillStyle = '#ffd5a0';
  ctx.fillRect(sx + 16, sy, 64, 64);

  // Eyes (direction-aware)
  ctx.fillStyle = '#222';
  const eyeOffX = player.facing > 0 ? 20 : 8;
  ctx.fillRect(sx + eyeOffX + 16, sy + 20, 8, 8);
  ctx.fillRect(sx + eyeOffX + 36, sy + 20, 8, 8);

  // Feet
  ctx.fillStyle = '#5c3a21';
  ctx.fillRect(sx + 8, sy + player.h - 20, 32, 20);
  ctx.fillRect(sx + player.w - 40, sy + player.h - 20, 32, 20);
}

/** Draw chat bubble above player when entering a new room */
function drawBubble(dt) {
  if (bubble.timer <= 0) return;
  bubble.timer -= dt;

  const sx = player.x + player.w / 2 - camera.x;
  const sy = player.y - 60;

  // Fade out in last 400ms
  const alpha = Math.min(1, bubble.timer / 400);

  ctx.save();
  ctx.globalAlpha = alpha;

  // Bubble background
  const textW = ctx.measureText(bubble.text).width;
  const bw = Math.max(textW + 40, 200);
  const bh = 50;
  const bx = sx - bw / 2;
  const by = sy - bh;

  ctx.fillStyle = '#f5f2ea';
  roundRect(ctx, bx, by, bw, bh, 12);
  ctx.fill();

  ctx.strokeStyle = '#7a4e2d';
  ctx.lineWidth = 3;
  roundRect(ctx, bx, by, bw, bh, 12);
  ctx.stroke();

  // Tail triangle
  ctx.fillStyle = '#f5f2ea';
  ctx.beginPath();
  ctx.moveTo(sx - 8, by + bh);
  ctx.lineTo(sx + 8, by + bh);
  ctx.lineTo(sx, by + bh + 14);
  ctx.closePath();
  ctx.fill();

  // Text
  ctx.fillStyle = '#3a2a14';
  ctx.font = 'bold 20px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(bubble.text, sx, by + bh / 2);

  ctx.restore();
}

/** Helper: trace a rounded rectangle path */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ═══════════════════════════════════════════════════════════
//  GAME LOOP
// ═══════════════════════════════════════════════════════════

let lastTime = 0;

function gameLoop(timestamp) {
  const dt = timestamp - lastTime;
  lastTime = timestamp;

  // ── Update ─────────────────────────────────────────────
  handleInput();
  detectRoom();
  updateCamera();

  // ── Render (order matters: background → player → UI) ──
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  drawWorld();
  drawPlayer();
  drawBubble(dt);

  requestAnimationFrame(gameLoop);
}

// ── Kick off ─────────────────────────────────────────────
// Initial room detection so the first room name shows
detectRoom();
requestAnimationFrame(gameLoop);
