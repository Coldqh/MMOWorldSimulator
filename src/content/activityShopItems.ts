import type { ActivityCurrencyKey, EquipmentSlot, ItemDefinition, ItemType, Rarity, StatBlock } from '../types/game';
import { calculateItemStatBudget } from '../balance';
import { CLASS_LABEL, CLASS_MAIN_STAT, SET_CLASSES, SET_SLOTS, SLOT_LABEL, type SetClassId, type SetSlotId } from './itemSetDefinitions';

export type ActivityShopKind = 'pve' | 'pvp';

export interface ActivityShopSetDefinition {
  id: string;
  prefix: string;
  familyName: string;
  shop: ActivityShopKind;
  currencyKey: ActivityCurrencyKey;
  level: number;
  rarity: Rarity;
  sourceName: string;
  description: string;
  priceBase: number;
  powerScale: number;
}

export interface ActivityShopCatalogEntry {
  id: string;
  shop: ActivityShopKind;
  setId: string;
  itemId: string;
  classId: SetClassId;
  slot: SetSlotId;
  currencyKey: ActivityCurrencyKey;
  price: number;
  description: string;
}

export const ACTIVITY_SHOP_SET_DEFINITIONS: ActivityShopSetDefinition[] = [
  {
    id: 'activity_pve_dungeon_60',
    prefix: 'activity_pve_dungeon_60',
    familyName: 'Покорителя Данжей',
    shop: 'pve',
    currencyKey: 'dungeonMarks',
    level: 60,
    rarity: 'epic',
    sourceName: 'PvE магазин · Dungeon Marks',
    description: 'PvE-сет для стабильного прохождения данжей и фарма элитных целей.',
    priceBase: 130,
    powerScale: 1.0,
  },
  {
    id: 'activity_pve_raid_60',
    prefix: 'activity_pve_raid_60',
    familyName: 'Рейдового Авангарда',
    shop: 'pve',
    currencyKey: 'raidSeals',
    level: 60,
    rarity: 'legendary',
    sourceName: 'PvE магазин · Raid Seals',
    description: 'Рейдовый PvE-сет для боссов, рейдов и мировых угроз.',
    priceBase: 85,
    powerScale: 1.0,
  },
  {
    id: 'activity_pvp_arena_60',
    prefix: 'activity_pvp_arena_60',
    familyName: 'Арены',
    shop: 'pvp',
    currencyKey: 'arenaHonor',
    level: 60,
    rarity: 'epic',
    sourceName: 'PvP магазин · Arena Honor',
    description: 'PvP-сет для арены и дуэлей против игроков.',
    priceBase: 150,
    powerScale: 1.0,
  },
  {
    id: 'activity_pvp_war_60',
    prefix: 'activity_pvp_war_60',
    familyName: 'Гильдейской Войны',
    shop: 'pvp',
    currencyKey: 'warCrests',
    level: 60,
    rarity: 'legendary',
    sourceName: 'PvP магазин · War Crests',
    description: 'Тяжёлый PvP-сет для гильдейских войн и осад.',
    priceBase: 95,
    powerScale: 1.0,
  },
];

const slotType = (slot: SetSlotId): ItemType =>
  slot === 'weapon' ? 'weapon' : slot === 'ring' || slot === 'amulet' ? 'accessory' : 'armor';

const socketSlotsFor = (rarity: Rarity, type: ItemType) => {
  if (type === 'card' || type === 'consumable' || type === 'material' || type === 'quest') return 0;
  if (rarity === 'legendary' || rarity === 'epic') return 2;
  if (rarity === 'rare') return 1;
  return 0;
};

const itemIdFor = (definition: ActivityShopSetDefinition, classId: SetClassId, slot: SetSlotId) =>
  `${definition.prefix}_${classId}_${slot}`;

const setIdFor = (definition: ActivityShopSetDefinition, classId: SetClassId) =>
  `${definition.id}_${classId}`;

const itemPriceFor = (definition: ActivityShopSetDefinition, slot: SetSlotId) => {
  const slotMultiplier = slot === 'weapon' ? 1.4 : slot === 'chest' || slot === 'legs' ? 1.15 : slot === 'ring' || slot === 'amulet' ? 0.9 : 1;
  return Math.max(1, Math.round(definition.priceBase * slotMultiplier));
};

const buildStats = (definition: ActivityShopSetDefinition, slot: EquipmentSlot, classId: SetClassId): Partial<StatBlock> => {
  const type = slotType(slot as SetSlotId);
  const main = CLASS_MAIN_STAT[classId];
  const budget = Math.max(1, Math.round(calculateItemStatBudget({
    level: definition.level,
    rarity: definition.rarity,
    type,
    slot,
  }) * definition.powerScale));

  if (slot === 'weapon') return { [main]: budget + Math.round(definition.level * 0.9) };
  if (slot === 'ring' || slot === 'amulet') {
    const caster = classId === 'mage' || classId === 'priest';
    return {
      hp: Math.max(4, budget * 3),
      mana: caster ? Math.max(3, budget * 2) : Math.max(1, budget),
      [main]: Math.max(1, Math.round(budget * 0.45)),
    };
  }
  if (slot === 'boots') {
    return {
      hp: budget * 3,
      defense: Math.max(1, Math.round(budget * 0.55)),
      speed: definition.rarity === 'legendary' ? 3 : 2,
    };
  }
  return { hp: budget * 4, defense: Math.max(1, Math.round(budget * 0.75)) };
};

const createActivityShopItem = (definition: ActivityShopSetDefinition, classId: SetClassId, slot: SetSlotId): ItemDefinition => {
  const type = slotType(slot);
  return {
    id: itemIdFor(definition, classId, slot),
    name: `${SLOT_LABEL[slot]} ${definition.familyName} ${CLASS_LABEL[classId]}`,
    type,
    rarity: definition.rarity,
    levelReq: definition.level,
    classTags: [classId],
    slot,
    stats: buildStats(definition, slot, classId),
    effects: [],
    socketSlots: socketSlotsFor(definition.rarity, type),
    tradeable: false,
    bindType: 'bindOnPickup',
    price: 1,
    announceIfDropped: false,
    setId: setIdFor(definition, classId),
    sourceType: 'world',
    sourceId: definition.id,
    sourceName: definition.sourceName,
  };
};

export const ACTIVITY_SHOP_ITEMS: ItemDefinition[] = ACTIVITY_SHOP_SET_DEFINITIONS.flatMap((definition) =>
  SET_CLASSES.flatMap((classId) => SET_SLOTS.map((slot) => createActivityShopItem(definition, classId, slot))),
);

export const ACTIVITY_SHOP_CATALOG: ActivityShopCatalogEntry[] = ACTIVITY_SHOP_SET_DEFINITIONS.flatMap((definition) =>
  SET_CLASSES.flatMap((classId) => SET_SLOTS.map((slot) => ({
    id: `${definition.id}_${classId}_${slot}`,
    shop: definition.shop,
    setId: setIdFor(definition, classId),
    itemId: itemIdFor(definition, classId, slot),
    classId,
    slot,
    currencyKey: definition.currencyKey,
    price: itemPriceFor(definition, slot),
    description: definition.description,
  }))),
);
