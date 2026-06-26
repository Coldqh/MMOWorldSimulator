import { getItemById } from '../content/items';
import { getLootTableById } from '../content/world';
import type { Rng } from '../engine/rng';
import type { ItemDefinition } from '../types/game';

const rarityRank: Record<ItemDefinition['rarity'], number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  legendary: 5,
  unique: 6,
  mythic: 7,
};

const equipmentDropChance = (item: ItemDefinition) => {
  if (!item.slot) return 0;
  if (item.rarity === 'common') return 0.3;
  if (item.rarity === 'uncommon') return 0.2;
  if (item.rarity === 'rare') return 0.1;
  if (item.rarity === 'epic') return 0;
  if (item.rarity === 'legendary') return 0;
  return 0;
};

const baseDropChance = (item: ItemDefinition, declaredChance: number) => {
  if (item.type === 'card') return Math.min(declaredChance, 0.000025);
  if (item.slot) return equipmentDropChance(item);
  return declaredChance;
};

const bestEquipmentDrop = (items: ItemDefinition[], rng: Rng) => {
  const hits = items.filter((item) => rng.chance(equipmentDropChance(item)));
  if (hits.length === 0) return undefined;
  const bestRarity = Math.max(...hits.map((item) => rarityRank[item.rarity] ?? 0));
  const best = hits.filter((item) => (rarityRank[item.rarity] ?? 0) === bestRarity);
  return rng.pick(best);
};

export const rollLoot = (lootTableId: string, rng: Rng, level = 1): ItemDefinition[] => {
  const table = getLootTableById(lootTableId);
  if (!table) return [];

  const eligible = table.entries
    .filter((entry) => (entry.minLevel === undefined || level >= entry.minLevel) && (entry.maxLevel === undefined || level <= entry.maxLevel))
    .map((entry) => ({ entry, item: getItemById(entry.itemId) }))
    .filter((pair): pair is { entry: typeof table.entries[number]; item: ItemDefinition } => Boolean(pair.item));

  const normalDrops = eligible
    .filter(({ item }) => !item.slot)
    .filter(({ entry, item }) => rng.chance(baseDropChance(item, entry.chance)))
    .map(({ item }) => item);

  const equipmentPool = eligible
    .map(({ item }) => item)
    .filter((item) => Boolean(item.slot));

  const equipment = bestEquipmentDrop(equipmentPool, rng);

  return equipment ? [...normalDrops, equipment] : normalDrops;
};
