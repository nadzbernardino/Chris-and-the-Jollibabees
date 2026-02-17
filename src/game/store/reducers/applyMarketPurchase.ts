import { GameStats, clampStats } from '../GameStore';

export type MarketItem = 'coffee' | 'gadget' | 'flowers' | 'ring';

export interface MarketItemDef {
  id: MarketItem;
  label: string;
  cost: number;
  description: string;
}

export const MARKET_ITEMS: MarketItemDef[] = [
  { id: 'coffee',  label: 'Coffee',  cost: 5,  description: 'Energy +10, Integrity -1' },
  { id: 'gadget',  label: 'Gadget',  cost: 20, description: 'Integrity -5' },
  { id: 'flowers', label: 'Flowers', cost: 10, description: 'Prep +5, Integrity +5' },
  { id: 'ring',    label: 'Ring',    cost: 25, description: 'Prep +10, Integrity +10' },
];

/**
 * Apply a market purchase. Returns null if player can't afford it.
 */
export function applyMarketPurchase(
  stats: GameStats,
  item: MarketItem,
): GameStats | null {
  const def = MARKET_ITEMS.find(m => m.id === item);
  if (!def || stats.diamonds < def.cost) return null;
  // Prevent buying the ring twice
  if (item === 'ring' && stats.hasRing) return null;

  const base = { ...stats, diamonds: stats.diamonds - def.cost };

  switch (item) {
    case 'coffee':
      return clampStats({ ...base, energy: base.energy + 10, integrity: base.integrity - 1 });
    case 'gadget':
      return clampStats({ ...base, integrity: base.integrity - 5 });
    case 'flowers':
      return clampStats({ ...base, preparation: base.preparation + 5, integrity: base.integrity + 5 });
    case 'ring':
      return clampStats({ ...base, preparation: base.preparation + 10, integrity: base.integrity + 10, hasRing: true });
  }
}
