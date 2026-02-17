/**
 * Generates a pixel-style bitmap font at runtime using canvas.
 * Call createPixelFont(scene) during a scene's preload or create phase.
 * Then use scene.add.bitmapText(x, y, 'pixel', 'text', size)
 */

import Phaser from 'phaser';

const FONT_KEY = 'pixel';
const CHAR_WIDTH = 8;
const CHAR_HEIGHT = 8;
const FIRST_CHAR = 32; // Space
const LAST_CHAR = 126; // Tilde
const CHARS_PER_ROW = 16;
const IVORY = '#F5F2EA';

/**
 * Creates a runtime-generated pixel bitmap font
 * @param scene - The Phaser scene to add the font to
 * @returns The font key for use with scene.add.bitmapText()
 */
export function createPixelFont(scene: Phaser.Scene): string {
  // Check if font already exists
  if (scene.cache.bitmapFont.exists(FONT_KEY)) {
    return FONT_KEY;
  }

  const charCount = LAST_CHAR - FIRST_CHAR + 1;
  const rows = Math.ceil(charCount / CHARS_PER_ROW);

  // Create canvas texture to hold all characters
  const canvasWidth = CHARS_PER_ROW * CHAR_WIDTH;
  const canvasHeight = rows * CHAR_HEIGHT;

  const canvasTexture = scene.textures.createCanvas(
    FONT_KEY,
    canvasWidth,
    canvasHeight
  );

  if (!canvasTexture) {
    throw new Error('Failed to create canvas texture for pixel font');
  }

  const ctx = canvasTexture.context;
  const canvas = canvasTexture.canvas;

  // Set up drawing context for pixel-perfect rendering
  ctx.imageSmoothingEnabled = false;
  ctx.font = '8px monospace';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillStyle = IVORY;

  // Draw each character onto the canvas
  let charCode = FIRST_CHAR;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < CHARS_PER_ROW && charCode <= LAST_CHAR; col++) {
      const x = col * CHAR_WIDTH;
      const y = row * CHAR_HEIGHT;

      // Draw character with pixel font style
      drawPixelChar(ctx, String.fromCharCode(charCode), x, y);
      charCode++;
    }
  }

  // Refresh the texture
  canvasTexture.refresh();

  // Create bitmap font data structure
  const fontData: Phaser.Types.GameObjects.BitmapText.BitmapFontData = {
    font: FONT_KEY,
    size: CHAR_HEIGHT,
    lineHeight: CHAR_HEIGHT,
    retroFont: false,
    chars: {}
  };

  // Define character data for each glyph
  charCode = FIRST_CHAR;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < CHARS_PER_ROW && charCode <= LAST_CHAR; col++) {
      const x = col * CHAR_WIDTH;
      const y = row * CHAR_HEIGHT;

      (fontData.chars as Record<number, unknown>)[charCode] = {
        x: x,
        y: y,
        width: CHAR_WIDTH,
        height: CHAR_HEIGHT,
        centerX: CHAR_WIDTH / 2,
        centerY: CHAR_HEIGHT / 2,
        xOffset: 0,
        yOffset: 0,
        xAdvance: CHAR_WIDTH,
        data: {},
        kerning: {},
      };

      charCode++;
    }
  }

  // Register the bitmap font with Phaser
  scene.cache.bitmapFont.add(FONT_KEY, {
    data: fontData,
    texture: FONT_KEY,
    frame: null
  });

  return FONT_KEY;
}

/**
 * Draws a single character in pixel font style
 */
function drawPixelChar(
  ctx: CanvasRenderingContext2D,
  char: string,
  x: number,
  y: number
): void {
  // Clear the character cell
  ctx.clearRect(x, y, CHAR_WIDTH, CHAR_HEIGHT);

  const charCode = char.charCodeAt(0);

  // Custom pixel patterns for better readability
  // Define 3x5 pixel patterns for common characters
  const pixelPatterns: { [key: number]: number[][] } = {
    // Space (32) - empty
    32: [],

    // ! (33)
    33: [[1,0],[1,1],[1,2],[1,4]],

    // " (34)
    34: [[0,0],[0,1],[2,0],[2,1]],

    // # (35)
    35: [[1,0],[3,0],[0,1],[1,1],[2,1],[3,1],[4,1],[1,2],[3,2],[0,3],[1,3],[2,3],[3,3],[4,3],[1,4],[3,4]],

    // $ (36)
    36: [[2,0],[1,1],[2,1],[3,1],[2,2],[1,3],[2,3],[3,3],[2,4]],

    // % (37)
    37: [[0,0],[1,0],[3,0],[0,1],[1,1],[3,1],[2,2],[1,3],[3,3],[4,3],[1,4],[3,4],[4,4]],

    // & (38)
    38: [[1,0],[2,0],[0,1],[2,1],[1,2],[3,2],[0,3],[2,3],[3,3],[1,4],[3,4]],

    // ' (39)
    39: [[1,0],[1,1]],

    // ( (40)
    40: [[2,0],[1,1],[1,2],[1,3],[2,4]],

    // ) (41)
    41: [[1,0],[2,1],[2,2],[2,3],[1,4]],

    // * (42)
    42: [[1,0],[0,1],[1,1],[2,1],[1,2]],

    // + (43)
    43: [[1,1],[0,2],[1,2],[2,2],[1,3]],

    // , (44)
    44: [[1,3],[1,4],[0,5]],

    // - (45)
    45: [[0,2],[1,2],[2,2],[3,2]],

    // . (46)
    46: [[1,4]],

    // / (47)
    47: [[3,0],[2,1],[2,2],[1,3],[1,4]],

    // 0-9 (48-57)
    48: [[1,0],[2,0],[0,1],[3,1],[0,2],[3,2],[0,3],[3,3],[1,4],[2,4]],
    49: [[1,0],[0,1],[1,1],[1,2],[1,3],[0,4],[1,4],[2,4]],
    50: [[1,0],[2,0],[0,1],[3,1],[3,2],[2,3],[1,4],[0,4],[3,4]],
    51: [[0,0],[1,0],[2,0],[3,1],[1,2],[2,2],[3,3],[0,4],[1,4],[2,4]],
    52: [[2,0],[1,1],[2,1],[0,2],[2,2],[0,3],[1,3],[2,3],[3,3],[2,4]],
    53: [[0,0],[1,0],[2,0],[3,0],[0,1],[0,2],[1,2],[2,2],[3,3],[0,4],[1,4],[2,4]],
    54: [[1,0],[2,0],[0,1],[0,2],[1,2],[2,2],[0,3],[3,3],[1,4],[2,4]],
    55: [[0,0],[1,0],[2,0],[3,0],[3,1],[2,2],[1,3],[1,4]],
    56: [[1,0],[2,0],[0,1],[3,1],[1,2],[2,2],[0,3],[3,3],[1,4],[2,4]],
    57: [[1,0],[2,0],[0,1],[3,1],[1,2],[2,2],[3,2],[3,3],[1,4],[2,4]],

    // : (58)
    58: [[1,1],[1,3]],

    // ; (59)
    59: [[1,1],[1,3],[1,4],[0,5]],

    // < (60)
    60: [[2,1],[1,2],[2,3]],

    // = (61)
    61: [[0,1],[1,1],[2,1],[0,3],[1,3],[2,3]],

    // > (62)
    62: [[0,1],[1,2],[0,3]],

    // ? (63)
    63: [[1,0],[2,0],[0,1],[3,1],[3,2],[2,3],[2,5]],

    // @ (64)
    64: [[1,0],[2,0],[0,1],[3,1],[0,2],[2,2],[3,2],[0,3],[1,4],[2,4]],
  };

  // A-Z (65-90)
  for (let i = 0; i < 26; i++) {
    const code = 65 + i;
    pixelPatterns[code] = getLetterPattern(String.fromCharCode(code));
  }

  // [ (91)
  pixelPatterns[91] = [[0,0],[1,0],[0,1],[0,2],[0,3],[0,4],[1,4]];

  // \ (92)
  pixelPatterns[92] = [[0,0],[1,1],[1,2],[2,3],[2,4]];

  // ] (93)
  pixelPatterns[93] = [[0,0],[1,0],[1,1],[1,2],[1,3],[0,4],[1,4]];

  // ^ (94)
  pixelPatterns[94] = [[1,0],[0,1],[2,1]];

  // _ (95)
  pixelPatterns[95] = [[0,4],[1,4],[2,4],[3,4]];

  // ` (96)
  pixelPatterns[96] = [[0,0],[1,1]];

  // a-z (97-122) - use uppercase patterns
  for (let i = 0; i < 26; i++) {
    pixelPatterns[97 + i] = pixelPatterns[65 + i];
  }

  // { (123)
  pixelPatterns[123] = [[2,0],[1,1],[1,2],[0,2],[1,3],[2,4]];

  // | (124)
  pixelPatterns[124] = [[1,0],[1,1],[1,2],[1,3],[1,4]];

  // } (125)
  pixelPatterns[125] = [[0,0],[1,1],[1,2],[2,2],[1,3],[0,4]];

  // ~ (126)
  pixelPatterns[126] = [[0,2],[1,1],[2,1],[3,2]];

  // Draw the pixel pattern
  const pattern = pixelPatterns[charCode];
  if (pattern) {
    ctx.fillStyle = IVORY;
    pattern.forEach(([px, py]) => {
      ctx.fillRect(x + px + 2, y + py + 1, 1, 1);
    });
  } else {
    // Fallback to canvas text rendering for undefined characters
    ctx.fillStyle = IVORY;
    ctx.fillText(char, x + 1, y);
  }
}

/**
 * Returns pixel patterns for A-Z letters
 */
function getLetterPattern(letter: string): number[][] {
  const patterns: { [key: string]: number[][] } = {
    'A': [[1,0],[2,0],[0,1],[3,1],[0,2],[1,2],[2,2],[3,2],[0,3],[3,3],[0,4],[3,4]],
    'B': [[0,0],[1,0],[2,0],[0,1],[3,1],[0,2],[1,2],[2,2],[0,3],[3,3],[0,4],[1,4],[2,4]],
    'C': [[1,0],[2,0],[3,0],[0,1],[0,2],[0,3],[1,4],[2,4],[3,4]],
    'D': [[0,0],[1,0],[2,0],[0,1],[3,1],[0,2],[3,2],[0,3],[3,3],[0,4],[1,4],[2,4]],
    'E': [[0,0],[1,0],[2,0],[3,0],[0,1],[0,2],[1,2],[2,2],[0,3],[0,4],[1,4],[2,4],[3,4]],
    'F': [[0,0],[1,0],[2,0],[3,0],[0,1],[0,2],[1,2],[2,2],[0,3],[0,4]],
    'G': [[1,0],[2,0],[3,0],[0,1],[0,2],[2,2],[3,2],[0,3],[3,3],[1,4],[2,4],[3,4]],
    'H': [[0,0],[3,0],[0,1],[3,1],[0,2],[1,2],[2,2],[3,2],[0,3],[3,3],[0,4],[3,4]],
    'I': [[0,0],[1,0],[2,0],[1,1],[1,2],[1,3],[0,4],[1,4],[2,4]],
    'J': [[3,0],[3,1],[3,2],[0,3],[3,3],[1,4],[2,4]],
    'K': [[0,0],[3,0],[0,1],[2,1],[0,2],[1,2],[0,3],[2,3],[0,4],[3,4]],
    'L': [[0,0],[0,1],[0,2],[0,3],[0,4],[1,4],[2,4],[3,4]],
    'M': [[0,0],[4,0],[0,1],[1,1],[3,1],[4,1],[0,2],[2,2],[4,2],[0,3],[4,3],[0,4],[4,4]],
    'N': [[0,0],[3,0],[0,1],[1,1],[3,1],[0,2],[2,2],[3,2],[0,3],[3,3],[0,4],[3,4]],
    'O': [[1,0],[2,0],[0,1],[3,1],[0,2],[3,2],[0,3],[3,3],[1,4],[2,4]],
    'P': [[0,0],[1,0],[2,0],[0,1],[3,1],[0,2],[1,2],[2,2],[0,3],[0,4]],
    'Q': [[1,0],[2,0],[0,1],[3,1],[0,2],[3,2],[0,3],[2,3],[3,3],[1,4],[2,4],[4,4]],
    'R': [[0,0],[1,0],[2,0],[0,1],[3,1],[0,2],[1,2],[2,2],[0,3],[2,3],[0,4],[3,4]],
    'S': [[1,0],[2,0],[3,0],[0,1],[0,2],[1,2],[2,2],[3,3],[0,4],[1,4],[2,4]],
    'T': [[0,0],[1,0],[2,0],[3,0],[4,0],[2,1],[2,2],[2,3],[2,4]],
    'U': [[0,0],[3,0],[0,1],[3,1],[0,2],[3,2],[0,3],[3,3],[1,4],[2,4]],
    'V': [[0,0],[4,0],[0,1],[4,1],[1,2],[3,2],[1,3],[3,3],[2,4]],
    'W': [[0,0],[4,0],[0,1],[4,1],[0,2],[2,2],[4,2],[0,3],[1,3],[3,3],[4,3],[1,4],[3,4]],
    'X': [[0,0],[3,0],[1,1],[2,1],[1,2],[2,2],[1,3],[2,3],[0,4],[3,4]],
    'Y': [[0,0],[4,0],[1,1],[3,1],[2,2],[2,3],[2,4]],
    'Z': [[0,0],[1,0],[2,0],[3,0],[3,1],[2,2],[1,3],[0,4],[1,4],[2,4],[3,4]],
  };

  return patterns[letter] || [];
}

/**
 * Helper to create bitmap text with the pixel font
 * @param scene - The Phaser scene
 * @param x - X position
 * @param y - Y position
 * @param text - Text to display
 * @param size - Font size (default 8)
 * @param tint - Color tint (default ivory)
 * @returns The created BitmapText game object
 */
export function createPixelText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  size: number = 8,
  tint?: number
): Phaser.GameObjects.BitmapText {
  const bitmapText = scene.add.bitmapText(x, y, FONT_KEY, text, size);

  if (tint !== undefined) {
    bitmapText.setTint(tint);
  }

  return bitmapText;
}

export default {
  createPixelFont,
  createPixelText,
  FONT_KEY
};
