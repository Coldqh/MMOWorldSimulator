import type { ItemDefinition, Rarity } from '../types/game';
import { calculateCardPrice, calculateItemPrice } from '../balance';
import { normalizeLegacyItemId, normalizeLegacySetId } from './itemLegacy';

const socketSlotsFor = (item: ItemDefinition) => {
  if (!item.slot || item.type === 'card' || item.type === 'consumable' || item.type === 'material' || item.type === 'quest') return 0;
  if (item.rarity === 'legendary' || item.rarity === 'epic') return 2;
  if (item.rarity === 'rare') return Math.max(1, item.socketSlots ?? 1);
  return Math.max(0, item.socketSlots ?? 0);
};

const sourceFor = (item: ItemDefinition): Pick<ItemDefinition, 'sourceType' | 'sourceId' | 'sourceName'> => {
  if (item.sourceType) return { sourceType: item.sourceType, sourceId: item.sourceId, sourceName: item.sourceName };
  if (item.setId?.startsWith('raid_')) return { sourceType: 'raid', sourceId: item.sourceId, sourceName: item.sourceName ?? 'Рейд' };
  if (item.setId?.startsWith('dungeon_')) return { sourceType: 'dungeon', sourceId: item.sourceId, sourceName: item.sourceName ?? 'Данж' };
  if (item.setId) return { sourceType: 'general', sourceId: item.sourceId ?? 'general_sets', sourceName: item.sourceName ?? 'Общий сет' };
  return { sourceType: item.type === 'card' ? 'world' : 'world', sourceId: item.sourceId, sourceName: item.sourceName ?? 'Мир' };
};

export const rarityLabel: Record<Rarity, string> = {
  common: 'Обычный',
  uncommon: 'Необычный',
  rare: 'Редкий',
  epic: 'Эпический',
  legendary: 'Легендарный',
  mythic: 'Мифический',
  unique: 'Уникальный',
};

export const rarityScore: Record<Rarity, number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  legendary: 5,
  mythic: 6,
  unique: 7,
};

export const finalizeItems = (items: ItemDefinition[]): ItemDefinition[] => {
  const byId = new Map<string, ItemDefinition>();
  for (const item of items) {
    const id = normalizeLegacyItemId(item.id);
    const setId = normalizeLegacySetId(item.setId);
    const normalized: ItemDefinition = { ...item, id, setId };
    const source = sourceFor(normalized);
    normalized.sourceType = source.sourceType;
    normalized.sourceId = source.sourceId;
    normalized.sourceName = source.sourceName;
    normalized.socketSlots = socketSlotsFor(normalized);
    normalized.price = normalized.type === 'card'
      ? Math.max(1, normalized.price || calculateCardPrice(normalized))
      : calculateItemPrice(normalized);
    const previous = byId.get(id);
    byId.set(id, previous ? { ...previous, ...normalized } : normalized);
  }
  return [...byId.values()].sort((a, b) => a.levelReq - b.levelReq || a.id.localeCompare(b.id));
};
