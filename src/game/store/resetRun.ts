import { store } from './GameStore';

/** Reset the entire game state for a new run */
export function resetRun(): void {
  store.reset();
}
