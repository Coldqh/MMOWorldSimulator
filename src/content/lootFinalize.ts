import type { ItemDefinition, LootTable, MobDefinition } from '../types/game';
import { normalizeLegacyItemId } from './itemLegacy';
import { getMobCardDropChance, getMobCardId } from './mobCards';

export const INSTANCE_SET_IDS_BY_LOOT_TABLE: Record<string, string[]> = {
  lt_old_lantern_dungeon: ['dungeon_old_lantern'],
  lt_thorn_crypt: ['dungeon_thorn_crypt'],
  lt_blackroot_raid: ['dungeon_blackroot'],
  lt_mire_depths_dungeon: ['dungeon_mire_depths'],
  lt_frost_vault: ['dungeon_frost_vault'],
  lt_glass_catacomb: ['dungeon_glass_catacomb'],
  lt_wyrmspire_raid: ['raid_wyrmspire', 'raid_wyrmspire_legendary'],
};

const STONE_DROPS = [
  { itemId: 'sharpening_stone', chance: 0.08 },
  { itemId: 'enhance_stone_uncommon', chance: 0.025 },
  { itemId: 'enhance_stone_rare', chance: 0.006 },
  { itemId: 'enhance_stone_epic', chance: 0.0012 },
  { itemId: 'enhance_stone_legendary', chance: 0.00025 },
];

export const ensureLootTable = (lootTables: LootTable[], tableId: string): LootTable => {
  let table = lootTables.find((entry) => entry.id === tableId);
  if (!table) {
    table = { id: tableId, entries: [] };
    lootTables.push(table);
  }
  return table;
};

export const addLootEntry = (table: LootTable, itemId: string, chance: number) => {
  const normalizedItemId = normalizeLegacyItemId(itemId);
  const existing = table.entries.find((entry) => normalizeLegacyItemId(entry.itemId) === normalizedItemId);
  if (existing) existing.chance = chance;
  else table.entries.push({ itemId: normalizedItemId, chance });
};

export const addMobCardsToLootTables = (lootTables: LootTable[], mobs: MobDefinition[]) => {
  mobs.forEach((mob) => {
    const table = ensureLootTable(lootTables, mob.lootTableId);
    addLootEntry(table, getMobCardId(mob), getMobCardDropChance(mob));
  });
};

export const replaceTableSetGear = (
  lootTables: LootTable[],
  setIdsByTable: Record<string, string[]>,
  items: ItemDefinition[],
) => {
  const itemById = new Map(items.map((item) => [item.id, item]));
  Object.entries(setIdsByTable).forEach(([tableId, setIds]) => {
    const table = ensureLootTable(lootTables, tableId);
    const setIdSet = new Set(setIds);
    const nonTargetGear = table.entries.filter((entry) => {
      const item = itemById.get(normalizeLegacyItemId(entry.itemId));
      return item && (!item.slot || !item.setId || !setIdSet.has(item.setId));
    });
    const setGear = items
      .filter((item) => item.slot && item.setId && setIdSet.has(item.setId))
      .map((item) => ({ itemId: item.id, chance: 1 }));
    table.entries = [...nonTargetGear, ...setGear];
  });
};

export const finalizeLootTables = (
  sourceLootTables: LootTable[],
  mobs: MobDefinition[],
  items: ItemDefinition[],
): LootTable[] => {
  const itemById = new Map(items.map((item) => [item.id, item]));
  const lootTables = sourceLootTables.map((table) => ({
    ...table,
    entries: table.entries.map((entry) => ({ ...entry, itemId: normalizeLegacyItemId(entry.itemId) })),
  }));

  mobs.forEach((mob) => ensureLootTable(lootTables, mob.lootTableId));
  replaceTableSetGear(lootTables, INSTANCE_SET_IDS_BY_LOOT_TABLE, items);
  addMobCardsToLootTables(lootTables, mobs);

  lootTables.forEach((table) => {
    STONE_DROPS.forEach((drop) => {
      if (itemById.has(drop.itemId)) addLootEntry(table, drop.itemId, drop.chance);
    });

    const byItemId = new Map<string, { itemId: string; chance: number }>();
    table.entries.forEach((entry) => {
      const itemId = normalizeLegacyItemId(entry.itemId);
      const item = itemById.get(itemId);
      if (!item) return;
      byItemId.set(itemId, { ...entry, itemId, chance: item.type === 'card' ? Math.min(entry.chance, getMobCardDropChance(mobs.find((mob) => getMobCardId(mob) === itemId) ?? ({ id: itemId, tags: [], level: 1, name: item.name, stats: { hp: 1, mana: 0, attack: 1, magic: 0, defense: 0, speed: 1 }, xp: 1, gold: [1, 1], lootTableId: table.id } as MobDefinition))) : entry.chance });
    });
    table.entries = [...byItemId.values()].sort((a, b) => a.itemId.localeCompare(b.itemId));
  });

  return lootTables.sort((a, b) => a.id.localeCompare(b.id));
};
