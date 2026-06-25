import type { Rarity } from '../types/game';

export const SET_CLASSES = ['warrior', 'ranger', 'mage', 'priest'] as const;
export type SetClassId = typeof SET_CLASSES[number];

export const SET_SLOTS = ['weapon', 'head', 'chest', 'legs', 'boots', 'ring', 'amulet'] as const;
export type SetSlotId = typeof SET_SLOTS[number];

export const GLASS_CATACOMB_SLOTS = ['weapon', 'chest', 'legs', 'ring', 'amulet'] as const;
export const FIRST_WYRM_SHARED_SLOTS = ['head', 'chest', 'legs', 'boots', 'ring', 'amulet'] as const;

export const CLASS_LABEL: Record<SetClassId, string> = {
  warrior: 'Воина',
  ranger: 'Стрелка',
  mage: 'Мага',
  priest: 'Жреца',
};

export const CLASS_MAIN_STAT: Record<SetClassId, 'attack' | 'magic'> = {
  warrior: 'attack',
  ranger: 'attack',
  mage: 'magic',
  priest: 'magic',
};

export const SLOT_LABEL: Record<SetSlotId, string> = {
  weapon: 'Оружие',
  head: 'Шлем',
  chest: 'Кираса',
  legs: 'Поножи',
  boots: 'Сапоги',
  ring: 'Кольцо',
  amulet: 'Амулет',
};

export interface GeneratedSetDefinition {
  id: string;
  prefix: string;
  familyName: string;
  level: number;
  rarity: Rarity;
  sourceType: 'general' | 'dungeon' | 'raid';
  sourceId?: string;
  sourceName?: string;
  shape: 'full_class_28' | 'glass_20' | 'first_wyrm_10';
}

const generalSource = {
  sourceId: 'general_sets',
  sourceName: 'Общий сет',
};

export const GENERAL_SET_DEFINITIONS: GeneratedSetDefinition[] = [
  { id: 'common_1', prefix: 'set_common', familyName: 'Первой Вылазки', level: 1, rarity: 'common', sourceType: 'general', ...generalSource, shape: 'full_class_28' },
  { id: 'common_5', prefix: 'set_common', familyName: 'Дальнего Тракта', level: 5, rarity: 'common', sourceType: 'general', ...generalSource, shape: 'full_class_28' },
  { id: 'common_10', prefix: 'set_common', familyName: 'Пепельного Пути', level: 10, rarity: 'common', sourceType: 'general', ...generalSource, shape: 'full_class_28' },
  { id: 'common_15', prefix: 'set_common', familyName: 'Северной Кромки', level: 15, rarity: 'common', sourceType: 'general', ...generalSource, shape: 'full_class_28' },
  { id: 'common_20', prefix: 'set_common', familyName: 'Последнего Подъёма', level: 20, rarity: 'common', sourceType: 'general', ...generalSource, shape: 'full_class_28' },

  { id: 'uncommon_3', prefix: 'set_uncommon', familyName: 'Лесной Стражи', level: 3, rarity: 'uncommon', sourceType: 'general', ...generalSource, shape: 'full_class_28' },
  { id: 'uncommon_8', prefix: 'set_uncommon', familyName: 'Карьерного Дозора', level: 8, rarity: 'uncommon', sourceType: 'general', ...generalSource, shape: 'full_class_28' },
  { id: 'uncommon_13', prefix: 'set_uncommon', familyName: 'Небесного Перевала', level: 13, rarity: 'uncommon', sourceType: 'general', ...generalSource, shape: 'full_class_28' },
  { id: 'uncommon_18', prefix: 'set_uncommon', familyName: 'Ледяного Хребта', level: 18, rarity: 'uncommon', sourceType: 'general', ...generalSource, shape: 'full_class_28' },

  { id: 'rare_5', prefix: 'set_rare', familyName: 'Красного Колпака', level: 5, rarity: 'rare', sourceType: 'general', ...generalSource, shape: 'full_class_28' },
  { id: 'rare_10', prefix: 'set_rare', familyName: 'Пепельной Стражи', level: 10, rarity: 'rare', sourceType: 'general', ...generalSource, shape: 'full_class_28' },
  { id: 'rare_15', prefix: 'set_rare', familyName: 'Глубокой Топи', level: 15, rarity: 'rare', sourceType: 'general', ...generalSource, shape: 'full_class_28' },
  { id: 'rare_20', prefix: 'set_rare', familyName: 'Верхнего Шпиля', level: 20, rarity: 'rare', sourceType: 'general', ...generalSource, shape: 'full_class_28' },
];

export const DUNGEON_SET_DEFINITIONS: GeneratedSetDefinition[] = [
  { id: 'dungeon_old_lantern', prefix: 'old_lantern', familyName: 'Старого Фонаря', level: 6, rarity: 'epic', sourceType: 'dungeon', sourceId: 'old_lantern_cellar', sourceName: 'Подвал Старого Фонаря', shape: 'full_class_28' },
  { id: 'dungeon_thorn_crypt', prefix: 'thorn_crypt', familyName: 'Терновой Короны', level: 8, rarity: 'epic', sourceType: 'dungeon', sourceId: 'thorn_crown_crypt', sourceName: 'Склеп Терновой Короны', shape: 'full_class_28' },
  { id: 'dungeon_blackroot', prefix: 'blackroot', familyName: 'Чёрного Корня', level: 11, rarity: 'epic', sourceType: 'dungeon', sourceId: 'blackroot_watch', sourceName: 'Дозор Чёрного Корня', shape: 'full_class_28' },
  { id: 'dungeon_mire_depths', prefix: 'mire_depths', familyName: 'Глубокой Топи', level: 14, rarity: 'epic', sourceType: 'dungeon', sourceId: 'mire_depths', sourceName: 'Глубины Топи', shape: 'full_class_28' },
  { id: 'dungeon_frost_vault', prefix: 'frost_vault', familyName: 'Ледяного Хранилища', level: 18, rarity: 'epic', sourceType: 'dungeon', sourceId: 'frost_vault', sourceName: 'Ледяное Хранилище', shape: 'full_class_28' },
  { id: 'dungeon_glass_catacomb', prefix: 'glass_catacomb', familyName: 'Стеклянных Катакомб', level: 20, rarity: 'epic', sourceType: 'dungeon', sourceId: 'glass_catacomb', sourceName: 'Стеклянные Катакомбы', shape: 'glass_20' },
];

export const RAID_SET_DEFINITIONS: GeneratedSetDefinition[] = [
  { id: 'raid_wyrmspire', prefix: 'wyrmspire', familyName: 'Вирмшпиля', level: 20, rarity: 'epic', sourceType: 'raid', sourceId: 'wyrmspire_first_raid', sourceName: 'Вирмшпиль: первый подъём', shape: 'full_class_28' },
  { id: 'raid_wyrmspire_legendary', prefix: 'wyrmspire_gold', familyName: 'Первого Вирма', level: 20, rarity: 'legendary', sourceType: 'raid', sourceId: 'wyrmspire_first_raid', sourceName: 'Вирмшпиль: первый подъём', shape: 'first_wyrm_10' },
];

export const ALL_SET_DEFINITIONS = [
  ...GENERAL_SET_DEFINITIONS,
  ...DUNGEON_SET_DEFINITIONS,
  ...RAID_SET_DEFINITIONS,
];
