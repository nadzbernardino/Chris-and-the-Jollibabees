/**
 * RoomDefs — Room configuration for the continuous side-scrolling world.
 * Each room occupies DESIGN_W pixels horizontally.
 * Total world width = NUM_ROOMS × DESIGN_W.
 */
import { DESIGN_W, SCENE } from '../constants';

export interface RoomDef {
  index: number;
  name: string;
  sceneKey: string;   // corresponding SCENE constant (used for store keys)
  bgKey: string;      // background asset key (from BG_ASSETS)
  xStart: number;     // world x start position
}

export const ROOM_DEFS: RoomDef[] = [
  { index: 0, name: 'Kitchen Sink',  sceneKey: SCENE.KITCHEN_SINK,  bgKey: 'kitchen_sink_bg',   xStart: 0 },
  { index: 1, name: 'Kitchen Stove', sceneKey: SCENE.KITCHEN_STOVE, bgKey: 'kitchen_stove_bg',  xStart: DESIGN_W },
  { index: 2, name: 'Living Room',   sceneKey: SCENE.LIVING_ROOM,   bgKey: 'living_room_bg',    xStart: DESIGN_W * 2 },
  { index: 3, name: 'Office',        sceneKey: SCENE.OFFICE,        bgKey: 'workstation_bg',    xStart: DESIGN_W * 3 },
  { index: 4, name: 'Bedroom',       sceneKey: SCENE.BEDROOM,       bgKey: 'bedroom_bg',        xStart: DESIGN_W * 4 },
  { index: 5, name: 'Bathroom',      sceneKey: SCENE.BATHROOM,      bgKey: 'bathroom_bg',       xStart: DESIGN_W * 5 },
  { index: 6, name: 'Balcony',       sceneKey: SCENE.BALCONY,       bgKey: 'balcony_garden_bg', xStart: DESIGN_W * 6 },
  { index: 7, name: 'Exit Door',     sceneKey: SCENE.EXIT_DOOR,     bgKey: 'exit_door_room_bg', xStart: DESIGN_W * 7 },
];

export const NUM_ROOMS = ROOM_DEFS.length;
export const WORLD_WIDTH = NUM_ROOMS * DESIGN_W;
export const ROOM_WIDTH = DESIGN_W;
