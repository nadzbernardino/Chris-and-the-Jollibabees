/**
 * GameStore — Singleton state machine for persistent game progress.
 * Survives across room transitions.
 */

import { ROOM_TASKS } from '../constants';

export interface RoomTaskState {
  /** Which tasks are done in this room (keyed by task id) */
  tasks: Record<string, boolean>;
}

export interface GameState {
  hearts: number;
  preparation: number;    // 0..100
  integrity: number;      // 0..100
  energy: number;         // 0..100
  diamonds: number;       // min 0
  whaleCoinWins: number;
  whaleCoinLosses: number;
  hasRing: boolean;
  currentRoomIndex: number;
  rooms: Record<string, RoomTaskState>;
  jollibabeesFound: number[];       // indices into JOLLIBABEES array
  coffeeUses: number;   // 0..2 (max 2 uses)
  wheyUses: number;     // 0..2 (max 2 uses)
  waterUses: number;    // 0..2 (max 2 uses)
  energyDrinkUses: number; // 0..2 (max 2 uses)
  hasFlowers: boolean;
  hasSlept: boolean;
  sleepUses: number;    // 0..2 (max 2 naps)
  /** Optional pickups found (one-time per game) */
  pickedUp: Record<string, boolean>;
  gameStartTime: number;            // Date.now() at game start
  /** Accumulated bonus/penalty seconds for the overall 15-min timer */
  bonusTimeSeconds: number;
  /** Bathroom gating: which category is active ('laundry'|'folding'|null) */
  bathroomActiveTask: 'laundry' | 'folding' | null;
}

function createInitialState(): GameState {
  return {
    hearts: 3,
    preparation: 0,
    integrity: 50,
    energy: 100,
    diamonds: 5,
    whaleCoinWins: 0,
    whaleCoinLosses: 0,
    hasRing: false,
    currentRoomIndex: 0,
    rooms: {},
    jollibabeesFound: [],
    coffeeUses: 0,
    wheyUses: 0,
    waterUses: 0,
    energyDrinkUses: 0,
    hasFlowers: false,
    hasSlept: false,
    sleepUses: 0,
    pickedUp: {},
    gameStartTime: Date.now(),
    bonusTimeSeconds: 0,
    bathroomActiveTask: null,
  };
}

class GameStore {
  private state: GameState;

  constructor() {
    this.state = createInitialState();
  }

  get s(): GameState { return this.state; }

  // ─── Clamp helper ───────────────────────────────────────
  private clamp(val: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, val));
  }

  /** Clamp all stats to legal ranges */
  clampStats(): void {
    this.state.hearts      = this.clamp(this.state.hearts,      0, 3);
    this.state.preparation = this.clamp(this.state.preparation, 0, 100);
    this.state.integrity   = this.clamp(this.state.integrity,   0, 100);
    this.state.energy      = this.clamp(this.state.energy,      0, 100);
    this.state.diamonds    = Math.max(0, this.state.diamonds);
  }

  // ─── Hearts ────────────────────────────────────────────
  addHeart(n = 1): void {
    this.state.hearts = this.clamp(this.state.hearts + n, 0, 3);
  }

  removeHeart(n = 1): void {
    this.state.hearts = Math.max(0, this.state.hearts - n);
  }

  // ─── Preparation ──────────────────────────────────────
  addPrep(n: number): void {
    this.state.preparation = this.clamp(this.state.preparation + n, 0, 100);
  }

  // ─── Integrity ────────────────────────────────────────
  addIntegrity(n: number): void {
    this.state.integrity = this.clamp(this.state.integrity + n, 0, 100);
  }

  // ─── Energy ───────────────────────────────────────────
  addEnergy(n: number): void {
    this.state.energy = this.clamp(this.state.energy + n, 0, 100);
  }

  // ─── Diamonds ─────────────────────────────────────────
  addDiamonds(n: number): void {
    this.state.diamonds = Math.max(0, this.state.diamonds + n);
  }

  // ─── Whale Coin tracking ──────────────────────────────
  recordWhaleCoinWin(): void { this.state.whaleCoinWins++; }
  recordWhaleCoinLoss(): void { this.state.whaleCoinLosses++; }

  // ─── Ring ─────────────────────────────────────────────
  buyRing(): void { this.state.hasRing = true; }

  // ─── Room tasks ────────────────────────────────────────
  /** Get or init a room's task state */
  private ensureRoom(roomKey: string): RoomTaskState {
    if (!this.state.rooms[roomKey]) {
      this.state.rooms[roomKey] = { tasks: {} };
    }
    return this.state.rooms[roomKey];
  }

  isTaskDone(roomKey: string, taskId: string): boolean {
    return this.ensureRoom(roomKey).tasks[taskId] === true;
  }

  completeTask(roomKey: string, taskId: string): void {
    this.ensureRoom(roomKey).tasks[taskId] = true;
  }

  resetTask(roomKey: string, taskId: string): void {
    this.ensureRoom(roomKey).tasks[taskId] = false;
  }

  /** Check if ALL tasks for a room are done (pass expected task ids) */
  allTasksDone(roomKey: string, taskIds: string[]): boolean {
    return taskIds.every(id => this.isTaskDone(roomKey, id));
  }

  /** Count completed tasks in a room */
  completedTaskCount(roomKey: string, taskIds: string[]): number {
    return taskIds.filter(id => this.isTaskDone(roomKey, id)).length;
  }

  // ─── Jollibabees ───────────────────────────────────────
  foundJollibabee(index: number): boolean {
    return this.state.jollibabeesFound.includes(index);
  }

  addJollibabee(index: number): void {
    if (!this.foundJollibabee(index)) {
      this.state.jollibabeesFound.push(index);
    }
  }

  // ─── Pickups ──────────────────────────────────────────
  hasPickedUp(key: string): boolean {
    return this.state.pickedUp[key] === true;
  }

  pickUp(key: string): void {
    this.state.pickedUp[key] = true;
  }

  // ─── Navigation ────────────────────────────────────────
  get roomIndex(): number { return this.state.currentRoomIndex; }
  set roomIndex(v: number) { this.state.currentRoomIndex = v; }

  // ─── Consumables ───────────────────────────────────────
  useCoffee(): boolean {
    if (this.state.coffeeUses >= 2) return false;
    this.state.coffeeUses++;
    return true;
  }

  useWhey(): boolean {
    if (this.state.wheyUses >= 2) return false;
    this.state.wheyUses++;
    return true;
  }

  useWater(): boolean {
    this.state.waterUses++;
    return true;
  }

  useEnergyDrink(): boolean {
    if (this.state.energyDrinkUses >= 2) return false;
    this.state.energyDrinkUses++;
    return true;
  }

  // ─── Bathroom gating ──────────────────────────────────
  setBathroomTask(cat: 'laundry' | 'folding'): void {
    if (!this.state.bathroomActiveTask) {
      this.state.bathroomActiveTask = cat;
    }
  }

  get bathroomActiveTask() { return this.state.bathroomActiveTask; }

  clearBathroomTask(): void {
    this.state.bathroomActiveTask = null;
  }

  // ─── Timer ─────────────────────────────────────────────
  get elapsedSeconds(): number {
    return Math.floor((Date.now() - this.state.gameStartTime) / 1000);
  }

  /** Total game duration in seconds (base 900 + bonus) */
  get totalGameSeconds(): number {
    return 900 + this.state.bonusTimeSeconds;
  }

  /** Remaining seconds on the 15-min countdown */
  get remainingSeconds(): number {
    return Math.max(0, this.totalGameSeconds - this.elapsedSeconds);
  }

  /** Add (or subtract) bonus seconds to the overall timer */
  addBonusSeconds(n: number): void {
    this.state.bonusTimeSeconds += n;
  }

  // ─── All quests check ─────────────────────────────────
  /** Returns true if every task in every room (from ROOM_TASKS) is done */
  allQuestsComplete(): boolean {
    for (const [roomKey, taskIds] of Object.entries(ROOM_TASKS)) {
      if (!this.allTasksDone(roomKey, taskIds)) return false;
    }
    return true;
  }

  /** Check if a specific room's tasks are all done (using ROOM_TASKS map) */
  isRoomComplete(roomKey: string): boolean {
    const tasks = ROOM_TASKS[roomKey];
    if (!tasks || tasks.length === 0) return true; // no tasks = always complete
    return this.allTasksDone(roomKey, tasks);
  }

  // ─── Reset ─────────────────────────────────────────────
  reset(): void {
    this.state = createInitialState();
  }
}

export const store = new GameStore();
