import { ITEMS, rarityScore } from './items';
import type { EquipmentSlot, Id, ItemDefinition, StatBlock } from '../types/game';

type ClassId = Id | 'neutral';

const EQUIPMENT_SLOTS: EquipmentSlot[] = ['weapon', 'chest', 'head', 'legs', 'boots', 'ring', 'amulet'];
const CORE_CLASS_IDS = ['warrior', 'ranger', 'mage', 'priest'] as const;

const statScore = (stats: Partial<StatBlock>) =>
  Object.values(stats).reduce((sum, value) => sum + Math.abs(value ?? 0), 0);

const itemPoolScore = (item: ItemDefinition) =>
  item.levelReq * 100 + (rarityScore[item.rarity] ?? 1) * 18 + statScore(item.stats);

const canClassUseItem = (classId: string, item: ItemDefinition) =>
  item.classTags.length === 0 || item.classTags.includes(classId);

const bySlot = new Map<EquipmentSlot, ItemDefinition[]>();
const bySlotClass = new Map<string, ItemDefinition[]>();
const bySourceId = new Map<Id, ItemDefinition[]>();

const sortedItems = [...ITEMS].sort((a, b) => itemPoolScore(b) - itemPoolScore(a) || a.id.localeCompare(b.id));

sortedItems.forEach((item) => {
  if (item.sourceId) {
    const sourceBucket = bySourceId.get(item.sourceId) ?? [];
    sourceBucket.push(item);
    bySourceId.set(item.sourceId, sourceBucket);
  }

  if (!item.slot) return;

  const slotBucket = bySlot.get(item.slot) ?? [];
  slotBucket.push(item);
  bySlot.set(item.slot, slotBucket);

  const classes: ClassId[] = item.classTags.length > 0 ? item.classTags : ['neutral', ...CORE_CLASS_IDS];
  classes.forEach((classId) => {
    const key = `${item.slot}:${classId}`;
    const bucket = bySlotClass.get(key) ?? [];
    bucket.push(item);
    bySlotClass.set(key, bucket);
  });
});

const cards = sortedItems.filter((item) => item.type === 'card');

export const ITEM_POOL_INDEX = {
  equipmentBySlot: bySlot,
  equipmentBySlotClass: bySlotClass,
  cards,
  itemsBySourceId: bySourceId,
};

export const getNpcEquipmentCandidates = (
  classId: string,
  level: number,
  slot: EquipmentSlot,
  minLevelWindow = 8,
): ItemDefinition[] => {
  const classPool = ITEM_POOL_INDEX.equipmentBySlotClass.get(`${slot}:${classId}`) ?? [];
  const neutralPool = ITEM_POOL_INDEX.equipmentBySlotClass.get(`${slot}:neutral`) ?? [];
  const merged = [...classPool, ...neutralPool]
    .filter((item, index, arr) => arr.findIndex((entry) => entry.id === item.id) === index)
    .filter((item) =>
      item.levelReq <= level &&
      item.rarity !== 'mythic' &&
      item.rarity !== 'unique' &&
      canClassUseItem(classId, item),
    );

  const nearby = merged.filter((item) => level - item.levelReq <= minLevelWindow);
  return (nearby.length > 0 ? nearby : merged).slice(0, 36);
};

export const getBestNpcItemCandidates = (classId: string, level: number, slot: EquipmentSlot, limit = 8): ItemDefinition[] =>
  getNpcEquipmentCandidates(classId, level, slot, 20).slice(0, limit);

export const getNpcCardCandidates = (level: number): ItemDefinition[] =>
  ITEM_POOL_INDEX.cards.filter((item) => item.levelReq <= level).slice(0, 48);

export const getItemsBySourceId = (sourceId: Id): ItemDefinition[] =>
  ITEM_POOL_INDEX.itemsBySourceId.get(sourceId) ?? [];
