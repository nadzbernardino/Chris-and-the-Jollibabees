/**
 * constants.ts — Asset keys, file paths, room definitions, jollibabee data.
 * Single source of truth for all game content mapping.
 */

// ═══════════════════════════════════════════════════════════
//  DESIGN RESOLUTION
// ═══════════════════════════════════════════════════════════
export const DESIGN_W = 1536;
export const DESIGN_H = 1024;

// ═══════════════════════════════════════════════════════════
//  SCENE KEYS
// ═══════════════════════════════════════════════════════════
export const SCENE = {
  BOOT:           'BootScene',
  INTRO:          'IntroScene',
  WORLD:          'WorldScene',
  KITCHEN_SINK:   'KitchenSinkScene',
  KITCHEN_STOVE:  'KitchenStoveScene',
  LIVING_ROOM:    'LivingRoomScene',
  OFFICE:         'OfficeScene',
  BEDROOM:        'BedroomScene',
  BATHROOM:       'BathroomScene',
  BALCONY:        'BalconyScene',
  EXIT_DOOR:      'ExitDoorScene',
  VACUUM_MINI:    'VacuumMinigame',
  FOLDING_MINI:   'FoldingMinigame',
  DISH_MINI:      'DishMinigame',
} as const;

// ═══════════════════════════════════════════════════════════
//  ROOM ORDER (for left/right navigation)
// ═══════════════════════════════════════════════════════════
export const ROOM_ORDER: string[] = [
  SCENE.KITCHEN_SINK,
  SCENE.KITCHEN_STOVE,
  SCENE.LIVING_ROOM,
  SCENE.OFFICE,
  SCENE.BEDROOM,
  SCENE.BATHROOM,
  SCENE.BALCONY,
  SCENE.EXIT_DOOR,
];

// ═══════════════════════════════════════════════════════════
//  BACKGROUND ASSET KEYS → paths
// ═══════════════════════════════════════════════════════════
const BG = 'assets/backgrounds/standard_1536x1024/';

export const BG_ASSETS: Record<string, string> = {
  beehive_home:      `${BG}beehive_home.png`,
  kitchen_sink_bg:   `${BG}kitchen_sink_bg.png`,
  kitchen_stove_bg:  `${BG}kitchen_stove_bg.png`,
  living_room_bg:    `${BG}living_room_bg.png`,
  workstation_bg:    `${BG}workstation_bg.png?v=3`,
  bedroom_bg:        `${BG}bedroom_bg.png`,
  bathroom_bg:       `${BG}bathroom_bg.png`,
  balcony_garden_bg: `${BG}balcony_garden_bg.png`,
  exit_door_room_bg: `${BG}beehive_home.png`,
  bedroom_bg_original: 'assets/backgrounds/original/bedroom_bg.png',
  carpet:            `${BG}carpet.png`,
  wood_floor:        `${BG}wood_floor.png`,
};

/**
 * Maps scene keys → background asset keys for the ending room tour.
 * Used by ExitDoorScene to show the correct BG for each room.
 */
export const SCENE_TO_BG: Record<string, string> = {
  [SCENE.KITCHEN_SINK]:  'kitchen_sink_bg',
  [SCENE.KITCHEN_STOVE]: 'kitchen_stove_bg',
  [SCENE.LIVING_ROOM]:   'living_room_bg',
  [SCENE.OFFICE]:        'workstation_bg',
  [SCENE.BEDROOM]:       'bedroom_bg',
  [SCENE.BATHROOM]:      'bathroom_bg',
  [SCENE.BALCONY]:       'balcony_garden_bg',
  [SCENE.EXIT_DOOR]:     'exit_door_room_bg',
};

// ═══════════════════════════════════════════════════════════
//  PROP / CHARACTER ASSET KEYS → paths
// ═══════════════════════════════════════════════════════════
const PROP = 'assets/props/';
const CHAR = 'assets/characters/';
const JB   = 'assets/jollibabees/';

export const ASSETS: Record<string, string> = {
  // Characters
  chris_right:      `${CHAR}Chris_right_facing.png?v=3`,
  chris_left:       `${CHAR}Chris_left_facing.png?v=3`,
  chris_dizzy:      `${CHAR}chris_dizzy.png`,
  chris_whey:       `${CHAR}chris_whey.png`,
  chris_coffee:     `${CHAR}chris_coffee.png`,
  chris_burger:     `${CHAR}chris_brudger.png`,
  chris_water:      `${CHAR}chris_water.png`,
  chris_wine:       `${CHAR}chris_wine.png`,
  chris_energy:     `${CHAR}chris_energy.png`,
  chris_hugs:       `${CHAR}chris_hugs.png`,
  mamibee_left:         `${CHAR}Mamibee_left_facing.png`,
  mamibee_left_shock:   `${CHAR}Mamibee_left_facing_shock.png`,
  mamibee_right:        `${CHAR}Mamibee_right_facing.png`,
  mamibee_right_shock:  `${CHAR}Mamibee_right_facing_shock.png`,
  temptation_pig:       `${CHAR}temptation_pig.png`,
  together:             `${CHAR}together.png`,
  barbel_down:          `${CHAR}barbel_down.png`,
  barbel_up:            `${CHAR}barbel_up.png`,

  // Props
  dirtyplates:      `${PROP}dirtyplates.png`,
  cleanplates:      `${PROP}cleanplates.png`,
  plate:            `${PROP}plate.png`,
  plateclean:       `${PROP}plateclean.png`,
  coffee:           `${PROP}coffee.png`,
  whey:             `${PROP}whey.png`,
  water:            `${PROP}water.png`,
  energydrink:      `${PROP}energydrink.png`,
  bottle:           `${PROP}bottle.png`,
  can:              `${PROP}can.png`,
  box:              `${PROP}box.png`,
  hair:             `${PROP}hair.png`,
  paperbag:         `${PROP}paperbag.png`,
  tissue:           `${PROP}tissue.png`,
  cup:              `${PROP}cup.png`,
  trashbin:         `${PROP}trashbin.png`,
  vacuum:           `${PROP}vacuum.png`,
  vacuum_nossel:    `${PROP}vacuum_nossel.png`,
  bug:              `${PROP}bug.png`,
  phone:            `${PROP}phone.png`,
  bed:              `${PROP}bed.png`,
  bed_with_chris:   `${PROP}bed_with_chris.png`,
  mirror:           `${PROP}mirror.png`,
  dirtyclothes:     `${PROP}dirtyclothes.png`,
  clothes:          `${PROP}clothes.png`,
  dress:            `${PROP}dress.png`,
  dress_1:          `${PROP}dress_1.png`,
  hoodie:           `${PROP}hoodie.png`,
  jacket:           `${PROP}jacket.png`,
  pants:            `${PROP}pants.png`,
  shorts:           `${PROP}shorts.png`,
  socks:            `${PROP}socks.png`,
  towel:            `${PROP}towel.png`,
  underwear:        `${PROP}underwear.png`,
  shirt:            `${PROP}shirt.png`,
  hangers:          `${PROP}hangers.png`,
  laundrybasket:    `${PROP}laundrybasket.png`,
  bonsaiugly:       `${PROP}bonsaiugly.png`,
  bonsai:           `${PROP}bonsai.png`,
  bucket:           `${PROP}bucket.png`,
  barbel:           `${PROP}barbel.png`,
  food_bag:         `${PROP}foodbag.png`,
  remote:           `${PROP}remote.png`,
  keys:             `${PROP}keys.png`,
  money:            `${PROP}money.png`,
  wallet:           `${PROP}wallet.png`,
  wine:             `${PROP}wine.png`,
  penguin:          `${PROP}penguin.png`,
  burger:           `${PROP}burger.png`,
  plasticbag:       `${PROP}plasticbag.png`,

  // Doom scroll phone screenshots (13–28)
  ...Object.fromEntries(
    Array.from({ length: 16 }, (_, i) => [`doomscroll_${i + 13}`, `${PROP}${i + 13}.png`])
  ),

  // Jollibabees
  jollibig_sit:     `${JB}Jollibig_sit.png`,
  jollibig_stand:   `${JB}Jollibig_stand.png`,
  jollibig_walk_left:  `${JB}Jollibig_left_walk.png`,
  jollibig_walk_right: `${JB}Jollibig_right_walk.png`,
  jolliburrito_front:    `${JB}Jolliburrito_front.png`,
  jolliburrito_fly_left:  `${JB}Jolliburrito_fly_left.png`,
  jolliburrito_fly_right: `${JB}JolliBurrito_fly_right.png`,
  jollibabee_right: `${JB}Jollibabee_right_facing.png`,
  jollibabee_left:  `${JB}Jollibabee_left_facing.png`,
};

// ═══════════════════════════════════════════════════════════
//  JOLLIBABEES
// ═══════════════════════════════════════════════════════════

export interface JollibabeeDef {
  name: string;
  assetKey: string;       // default / right-facing
  assetKeyLeft: string;   // left-facing
  assetKeyRight: string;  // right-facing
  scale: number;          // legacy — kept for compat, prefer height
  height: number;         // explicit design-space px height
  hover: boolean;         // JolliBurrito hovers
}

/**
 * Deterministic mapping: which room spawns which jollibabee.
 * Index in array = discovery order.
 */
export const JOLLIBABEES: JollibabeeDef[] = [
  { name: 'JolliCute',    assetKey: 'jollibabee_right', assetKeyLeft: 'jollibabee_left', assetKeyRight: 'jollibabee_right', scale: 0.35, height: 171, hover: false },
  { name: 'JolliBart',    assetKey: 'jollibabee_right', assetKeyLeft: 'jollibabee_left', assetKeyRight: 'jollibabee_right', scale: 0.35, height: 171, hover: false },
  { name: 'JolliLite',    assetKey: 'jollibabee_right', assetKeyLeft: 'jollibabee_left', assetKeyRight: 'jollibabee_right', scale: 0.35, height: 171, hover: false },
  { name: 'JolliBurrito', assetKey: 'jolliburrito_fly_right', assetKeyLeft: 'jolliburrito_fly_left', assetKeyRight: 'jolliburrito_fly_right', scale: 0.35, height: 130, hover: true },
  { name: 'JolliBig',     assetKey: 'jollibig_walk_right', assetKeyLeft: 'jollibig_walk_left', assetKeyRight: 'jollibig_walk_right', scale: 1.3, height: 220, hover: false },
  { name: 'JolliBay',     assetKey: 'jollibabee_right', assetKeyLeft: 'jollibabee_left', assetKeyRight: 'jollibabee_right', scale: 0.35, height: 171, hover: false },
];

/**
 * Which room index (in ROOM_ORDER) spawns which jollibabee index.
 * room scene key → jollibabee index in JOLLIBABEES array.
 * Some rooms spawn 2 (living room).
 */
export const ROOM_JOLLIBABEE_MAP: Record<string, number[]> = {
  [SCENE.KITCHEN_SINK]:  [0],     // JolliCute after dishes
  [SCENE.LIVING_ROOM]:   [1, 2],  // JolliBart (vacuum) + JolliLite (trash)
  [SCENE.OFFICE]:        [3],     // JolliBurrito after work
  [SCENE.BEDROOM]:       [4],     // JolliBig after sleep
  [SCENE.BALCONY]:       [5],     // JolliBay after watering
};

// ═══════════════════════════════════════════════════════════
//  TAP RESPONSE LINES
// ═══════════════════════════════════════════════════════════
export const JOLLIBABEE_TAP_EXTRAS = [
  "where's mamibee?",
  "it's not that hard",
  "I mean..",
  "Yeah that's right",
];

// ═══════════════════════════════════════════════════════════
//  ROOM TASKS — used by store.allQuestsComplete()
// ═══════════════════════════════════════════════════════════
export const ROOM_TASKS: Record<string, string[]> = {
  [SCENE.KITCHEN_SINK]:  ['dishes'],
  [SCENE.LIVING_ROOM]:   ['trash', 'vacuum'],
  [SCENE.OFFICE]:        ['work'],
  [SCENE.BEDROOM]:       ['sleep'],
  [SCENE.BATHROOM]:      ['laundry', 'folding'],
  [SCENE.BALCONY]:       ['water'],
};

// ═══════════════════════════════════════════════════════════
//  STYLING  (kept for backward-compat; prefer uiTheme.ts)
// ═══════════════════════════════════════════════════════════
export const FONT = {
  family: '"Press Start 2P", "Courier New", monospace',
  color: '#FFFFFF',
  bubbleBg: 0xeee4c8,
  bubbleText: '#3A2A14',
  bubbleStroke: 0x7a4e2d,
};
