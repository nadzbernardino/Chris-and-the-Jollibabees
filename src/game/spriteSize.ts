/**
 * spriteSize.ts — Explicit design-space pixel sizes for every sprite category.
 *
 * All heights are derived from the 1024-px background height:
 *   Characters      = 2/3 of 1024  ≈ 683 px
 *   Jollibabees     = 1/4 of Characters ≈ 171 px
 *   JolliBurrito    = smaller than jollibabees ≈ 130 px
 *   JolliBig        = larger than jollibabees ≈ 220 px
 *   Large Assets    = same as Characters ≈ 683 px
 *   Medium Assets   = 2/3 of Characters ≈ 455 px
 *   Small Assets    = 1/2 of Medium ≈ 228 px
 *
 * Design canvas: 1536 × 1024 px.  Scale mode: FIT (whole BG visible).
 */

// ─── Design Canvas ─────────────────────────────────────────
export const BG_W = 1536;
export const BG_H = 1024;

// ─── Camera Zoom ───────────────────────────────────────────
/** No zoom — show full background at native resolution */
export const CAM_ZOOM = 1;

// ─── Surface Y-Level Constants (design-space px) ───────────
/** Floor line — 1px margin from canvas bottom (1024) */
export const FLOOR_Y = 1023;
/** Kitchen / bathroom countertop level */
export const COUNTER_Y = 560;
/** Table / desk surface level */
export const TABLE_Y = 600;
/** Wall-mounted items (mirror, clock, etc.) */
export const WALL_Y = 380;
/** Character feet position */
export const CHAR_Y = FLOOR_Y;

// ─── Character Heights (2/3 of 1024 BG) ────────────────────
/** Chris, Mamibee, temptation_pig — 2/3 of background height */
export const CHRIS_H = 683;
export const MAMIBEE_H = 683;
/** together image — same as character height */
export const TOGETHER_H = 683;
/** Food bag in ending (medium-ish) */
export const PROP_FOOD = 455;

// ─── Jollibabee Heights (1/4 of Character) ─────────────────
/** Standard jollibabees — 1/4 of character height */
export const JOLLI_H = 171;
/** JolliBurrito — smaller, flies */
export const JOLLI_BURRITO_H = 130;
/** JolliBig — larger than other jollibabees */
export const JOLLI_BIG_H = 220;

// ─── Prop Heights ──────────────────────────────────────────
/** Large props (bed, bed_with_chris): same as character height */
export const PROP_L = 683;
/** Medium props (vacuum, laundrybasket, clothes, mirror, trashbin,
 *  box, dirtyclothes, dirtyplates, cleanplates, bonsai, bonsaiugly,
 *  vacuum_nossel): 2/3 of character height */
export const PROP_M = 455;
/** Small props — all remaining items in props/ folder:
 *  coffee, whey, bottle, can, tissue, cup, paperbag, hair,
 *  socks, towel, underwear, hoodie, dress, dress_1, pants, jacket,
 *  shorts, shirt, hangers, bucket, plate, plateclean, phone, bug,
 *  food_bag: 1/2 of medium */
export const PROP_S = 228;

// ─── Minigame Sizes (proportional to new scale) ────────────
export const MINI_DEBRIS_H = 171;    // bugs, hair in vacuum minigame
export const MINI_NOZZLE_H = 340;   // vacuum nozzle
export const MINI_CLOTHES_H = 228;  // folding minigame clothes

// ─── Sizing Helper ─────────────────────────────────────────
/**
 * Set an image's display size to a target height, preserving aspect ratio.
 * Uses Phaser's `setDisplaySize` so the result is independent of the PNG's
 * natural resolution. Call *after* the texture is loaded.
 *
 * @param img   Phaser Image / Sprite
 * @param h     Target display height in design-space pixels
 * @returns     The same image (for chaining)
 */
export function sizeH<T extends Phaser.GameObjects.Image>(img: T, h: number): T {
  const tex = img.texture.getSourceImage();
  const natW = tex.width  || 1;
  const natH = tex.height || 1;
  const aspect = natW / natH;
  img.setDisplaySize(h * aspect, h);
  return img;
}

// ─── Drop Shadow Helper ────────────────────────────────────
/**
 * Draw a subtle elliptical shadow under a sprite to ground it visually.
 * Returns the Graphics object so it can be stored and repositioned.
 *
 * @param scene   Active Phaser scene
 * @param x       Centre X of the shadow
 * @param y       Y position (typically FLOOR_Y or feet position)
 * @param w       Width of the sprite (shadow will be ~60% of this)
 * @param depth   Depth layer (should be just below the sprite)
 */
export function drawShadow(
  scene: Phaser.Scene, x: number, y: number, w: number, depth = 9,
): Phaser.GameObjects.Ellipse {
  const sw = w * 0.6;
  const sh = 14;
  const shadow = scene.add.ellipse(x, y + 4, sw, sh, 0x000000, 0.2)
    .setDepth(depth);
  return shadow;
}
