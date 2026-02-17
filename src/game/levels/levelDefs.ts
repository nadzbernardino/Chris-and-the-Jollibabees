export type ObjectiveType = 'tapCount' | 'dragToTargets' | 'closePopups' | 'sequence';

export type WhaleCoinPolicy = 'off' | 'chance' | 'forced';

export interface LevelDef {
  id: number;
  title: string;
  timerSeconds: number;
  objective: {
    type: ObjectiveType;
    count: number;            // how many actions to complete
    description: string;      // shown to player
  };
  hazards: {
    pigAvoidCount: number;    // number of AVOID prompts
    doomScroll: boolean;      // one doom scroll mid-level
    whaleCoinPolicy: WhaleCoinPolicy;
    darmeshCall: boolean;     // L4 only
  };
}

export const LEVEL_DEFS: LevelDef[] = [
  {
    id: 1,
    title: 'Dish Cavern',
    timerSeconds: 90,
    objective: { type: 'tapCount', count: 5, description: 'Clean 5 dishes' },
    hazards: { pigAvoidCount: 2, doomScroll: false, whaleCoinPolicy: 'chance', darmeshCall: false },
  },
  {
    id: 2,
    title: 'Trash Run Trail',
    timerSeconds: 80,
    objective: { type: 'dragToTargets', count: 3, description: 'Drag 3 trash bags' },
    hazards: { pigAvoidCount: 0, doomScroll: true, whaleCoinPolicy: 'chance', darmeshCall: false },
  },
  {
    id: 3,
    title: 'Doomscroll Swamp',
    timerSeconds: 95,
    objective: { type: 'closePopups', count: 4, description: 'Close 4 popups fast' },
    hazards: { pigAvoidCount: 2, doomScroll: false, whaleCoinPolicy: 'forced', darmeshCall: false },
  },
  {
    id: 4,
    title: "Darmesh's Clearing",
    timerSeconds: 100,
    objective: { type: 'sequence', count: 3, description: 'Complete 3 work checkboxes in order' },
    hazards: { pigAvoidCount: 1, doomScroll: false, whaleCoinPolicy: 'chance', darmeshCall: true },
  },
  {
    id: 5,
    title: 'Garden + Groom',
    timerSeconds: 110,
    objective: { type: 'tapCount', count: 7, description: 'Water 4 plants + groom (3 taps)' },
    hazards: { pigAvoidCount: 0, doomScroll: true, whaleCoinPolicy: 'chance', darmeshCall: false },
  },
  {
    id: 6,
    title: 'Laundry Woods',
    timerSeconds: 100,
    objective: { type: 'sequence', count: 3, description: 'Fold laundry in correct A→B→C order' },
    hazards: { pigAvoidCount: 2, doomScroll: false, whaleCoinPolicy: 'chance', darmeshCall: false },
  },
];

export function getLevelDef(id: number): LevelDef | undefined {
  return LEVEL_DEFS.find(l => l.id === id);
}
