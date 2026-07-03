import type { EquipmentSlot, ItemDefinition, ItemType, Rarity } from '../types/game';
import { calculateItemStatBudget } from '../balance';
import {
  ALL_SET_DEFINITIONS,
  CLASS_LABEL,
  CLASS_MAIN_STAT,
  FIRST_WYRM_SHARED_SLOTS,
  GLASS_CATACOMB_SLOTS,
  SET_CLASSES,
  SET_SLOTS,
  SLOT_LABEL,
  type GeneratedSetDefinition,
  type SetClassId,
  type SetSlotId,
} from './itemSetDefinitions';

const slotType = (slot: SetSlotId): ItemType =>
  slot === 'weapon' ? 'weapon' : slot === 'ring' || slot === 'amulet' ? 'accessory' : 'armor';

const socketSlotsFor = (rarity: Rarity, type: ItemType) => {
  if (type === 'card' || type === 'consumable' || type === 'material' || type === 'quest') return 0;
  if (rarity === 'legendary' || rarity === 'epic') return 2;
  if (rarity === 'rare') return 1;
  return 0;
};

const buildStats = (level: number, rarity: Rarity, slot: EquipmentSlot, classId?: SetClassId): ItemDefinition['stats'] => {
  const type = slotType(slot as SetSlotId);
  const budget = Math.max(1, calculateItemStatBudget({ level, rarity, type, slot }));
  const main = classId ? CLASS_MAIN_STAT[classId] : 'attack';
  if (slot === 'weapon') return { [main]: budget + Math.round(level * 0.9) };
  if (slot === 'ring' || slot === 'amulet') {
    const caster = classId === 'mage' || classId === 'priest' || !classId;
    return {
      hp: Math.max(4, budget * 3),
      mana: caster ? Math.max(3, budget * 2) : Math.max(1, budget),
      [main]: Math.max(1, Math.round(budget * 0.45)),
    };
  }
  if (slot === 'boots') {
    return { hp: budget * 3, defense: Math.max(1, Math.round(budget * 0.55)), speed: Math.max(1, rarity === 'legendary' ? 3 : rarity === 'epic' ? 2 : 1) };
  }
  return { hp: budget * 4, defense: Math.max(1, Math.round(budget * 0.75)) };
};

const itemIdFor = (definition: GeneratedSetDefinition, slot: SetSlotId, classId?: SetClassId) => {
  if (definition.sourceType === 'general' && classId) return `set_${definition.rarity}_${classId}_${definition.level}_${slot}`;
  return classId ? `${definition.prefix}_${classId}_${slot}` : `${definition.prefix}_${slot}`;
};

const setIdFor = (definition: GeneratedSetDefinition, classId?: SetClassId) => {
  if (definition.sourceType === 'general' && classId) return `${definition.rarity}_${classId}_${definition.level}`;
  return definition.id;
};

export const createSetItem = (
  definition: GeneratedSetDefinition,
  slot: SetSlotId,
  classId?: SetClassId,
): ItemDefinition => {
  const type = slotType(slot);
  const id = itemIdFor(definition, slot, classId);
  const name = classId
    ? `${SLOT_LABEL[slot]} ${definition.familyName} ${CLASS_LABEL[classId]}`
    : `${SLOT_LABEL[slot]} ${definition.familyName}`;
  return {
    id,
    name,
    type,
    rarity: definition.rarity,
    levelReq: definition.level,
    classTags: classId ? [classId] : [],
    slot,
    stats: buildStats(definition.level, definition.rarity, slot, classId),
    effects: [],
    socketSlots: socketSlotsFor(definition.rarity, type),
    tradeable: definition.sourceType === 'general',
    bindType: definition.sourceType === 'general' ? 'none' : 'bindOnPickup',
    price: 1,
    announceIfDropped: definition.rarity !== 'common',
    setId: setIdFor(definition, classId),
    sourceType: definition.sourceType,
    sourceId: definition.sourceId,
    sourceName: definition.sourceName ?? (definition.sourceType === 'general' ? 'Общий сет' : undefined),
  };
};

export const createGeneralSetItems = (definition: GeneratedSetDefinition): ItemDefinition[] =>
  SET_CLASSES.flatMap((classId) => SET_SLOTS.map((slot) => createSetItem(definition, slot, classId)));

export const createDungeonSetItems = (definition: GeneratedSetDefinition): ItemDefinition[] => {
  if (definition.shape === 'glass_20') return createGlassCatacombItems(definition);
  return SET_CLASSES.flatMap((classId) => SET_SLOTS.map((slot) => createSetItem(definition, slot, classId)));
};

export const createRaidSetItems = (definition: GeneratedSetDefinition): ItemDefinition[] => {
  if (definition.shape === 'first_wyrm_10') return createFirstWyrmItems(definition);
  return SET_CLASSES.flatMap((classId) => SET_SLOTS.map((slot) => createSetItem(definition, slot, classId)));
};

export const createFirstWyrmItems = (definition: GeneratedSetDefinition): ItemDefinition[] => [
  ...SET_CLASSES.map((classId) => createSetItem(definition, 'weapon', classId)),
  ...FIRST_WYRM_SHARED_SLOTS.map((slot) => createSetItem(definition, slot)),
];

export const createGlassCatacombItems = (definition: GeneratedSetDefinition): ItemDefinition[] =>
  SET_CLASSES.flatMap((classId) => GLASS_CATACOMB_SLOTS.map((slot) => createSetItem(definition, slot, classId)));

export const createMaterialItem = (id: string, name: string, rarity: Rarity, price = 1): ItemDefinition => ({
  id,
  name,
  type: 'material',
  rarity,
  levelReq: 1,
  classTags: [],
  stats: {},
  effects: [],
  socketSlots: 0,
  tradeable: true,
  price,
  announceIfDropped: false,
  sourceType: 'world',
  sourceName: 'Мир',
});

export const createCardItem = (id: string, name: string, levelReq: number, rarity: Rarity, stats: ItemDefinition['stats']): ItemDefinition => ({
  id,
  name,
  type: 'card',
  rarity,
  levelReq,
  classTags: [],
  stats,
  effects: [],
  socketSlots: 0,
  tradeable: true,
  price: 1,
  announceIfDropped: true,
  sourceType: 'world',
  sourceName: 'Мир',
});

export const buildGeneratedItems = (): ItemDefinition[] => {
  const items: ItemDefinition[] = [];
  for (const definition of ALL_SET_DEFINITIONS) {
    if (definition.sourceType === 'general') items.push(...createGeneralSetItems(definition));
    else if (definition.sourceType === 'dungeon') items.push(...createDungeonSetItems(definition));
    else items.push(...createRaidSetItems(definition));
  }
  return items;
};
