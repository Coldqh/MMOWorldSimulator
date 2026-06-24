import { getItemById } from '../content/items';
import { getLootTableById } from '../content/world';
import type { Rng } from '../engine/rng';
import type { ItemDefinition } from '../types/game';

const baseDropChance = (item: ItemDefinition, lootTableId: string, declaredChance: number) => {
  if (item.type === 'card') return Math.min(declaredChance, 0.000025);
  if (!item.slot) return declaredChance;
  if (item.rarity === 'common') return 0.2;
  if (item.rarity === 'uncommon') return 0.1;
  if (item.rarity === 'rare') return 0.05;
  if (item.rarity === 'epic') return 0.01;
  if (item.rarity === 'legendary') return lootTableId.includes('raid') ? 0.01 : 0;
  return declaredChance;
};

export const rollLoot = (lootTableId: string, rng: Rng, level = 1): ItemDefinition[] => {
  const table = getLootTableById(lootTableId);
  if (!table) return [];

  return table.entries
    .filter((entry) => (entry.minLevel === undefined || level >= entry.minLevel) && (entry.maxLevel === undefined || level <= entry.maxLevel))
    .filter((entry) => {
      const item = getItemById(entry.itemId);
      if (!item) return false;
      return rng.chance(baseDropChance(item, lootTableId, entry.chance));
    })
    .map((entry) => getItemById(entry.itemId))
    .filter((item): item is ItemDefinition => Boolean(item));
};
