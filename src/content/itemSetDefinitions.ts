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
  { id: 'uncommon_8', prefix: 'set_uncommon', familyName: 'Красных Холмов', level: 8, rarity: 'uncommon', sourceType: 'general', ...generalSource, shape: 'full_class_28' },
  { id: 'uncommon_13', prefix: 'set_uncommon', familyName: 'Лунного Леса', level: 13, rarity: 'uncommon', sourceType: 'general', ...generalSource, shape: 'full_class_28' },
  { id: 'uncommon_18', prefix: 'set_uncommon', familyName: 'Ледяного Хребта', level: 18, rarity: 'uncommon', sourceType: 'general', ...generalSource, shape: 'full_class_28' },

  { id: 'rare_5', prefix: 'set_rare', familyName: 'Красного Колпака', level: 5, rarity: 'rare', sourceType: 'general', ...generalSource, shape: 'full_class_28' },
  { id: 'rare_10', prefix: 'set_rare', familyName: 'Пепельной Стражи', level: 10, rarity: 'rare', sourceType: 'general', ...generalSource, shape: 'full_class_28' },
  { id: 'rare_15', prefix: 'set_rare', familyName: 'Глубокой Топи', level: 15, rarity: 'rare', sourceType: 'general', ...generalSource, shape: 'full_class_28' },
  { id: 'rare_20', prefix: 'set_rare', familyName: 'Верхнего Шпиля', level: 20, rarity: 'rare', sourceType: 'general', ...generalSource, shape: 'full_class_28' },

  { id: 'common_21', prefix: 'set_common', familyName: 'Железного Рубежа', level: 21, rarity: 'common', sourceType: 'general', ...generalSource, shape: 'full_class_28' },
  { id: 'common_26', prefix: 'set_common', familyName: 'Каменного Тракта', level: 26, rarity: 'common', sourceType: 'general', ...generalSource, shape: 'full_class_28' },
  { id: 'common_31', prefix: 'set_common', familyName: 'Пепельной Дуги', level: 31, rarity: 'common', sourceType: 'general', ...generalSource, shape: 'full_class_28' },
  { id: 'common_36', prefix: 'set_common', familyName: 'Ночного Караула', level: 36, rarity: 'common', sourceType: 'general', ...generalSource, shape: 'full_class_28' },
  { id: 'common_41', prefix: 'set_common', familyName: 'Пустой Звезды', level: 41, rarity: 'common', sourceType: 'general', ...generalSource, shape: 'full_class_28' },
  { id: 'common_46', prefix: 'set_common', familyName: 'Красного Узла', level: 46, rarity: 'common', sourceType: 'general', ...generalSource, shape: 'full_class_28' },
  { id: 'common_51', prefix: 'set_common', familyName: 'Старой Дороги', level: 51, rarity: 'common', sourceType: 'general', ...generalSource, shape: 'full_class_28' },
  { id: 'common_56', prefix: 'set_common', familyName: 'Последней Пыли', level: 56, rarity: 'common', sourceType: 'general', ...generalSource, shape: 'full_class_28' },
  { id: 'uncommon_23', prefix: 'set_uncommon', familyName: 'Солёного Ветра', level: 23, rarity: 'uncommon', sourceType: 'general', ...generalSource, shape: 'full_class_28' },
  { id: 'uncommon_28', prefix: 'set_uncommon', familyName: 'Горькой Соли', level: 28, rarity: 'uncommon', sourceType: 'general', ...generalSource, shape: 'full_class_28' },
  { id: 'uncommon_33', prefix: 'set_uncommon', familyName: 'Сумрачного Стекла', level: 33, rarity: 'uncommon', sourceType: 'general', ...generalSource, shape: 'full_class_28' },
  { id: 'uncommon_38', prefix: 'set_uncommon', familyName: 'Грозового Пика', level: 38, rarity: 'uncommon', sourceType: 'general', ...generalSource, shape: 'full_class_28' },
  { id: 'uncommon_43', prefix: 'set_uncommon', familyName: 'Сухой Трясины', level: 43, rarity: 'uncommon', sourceType: 'general', ...generalSource, shape: 'full_class_28' },
  { id: 'uncommon_48', prefix: 'set_uncommon', familyName: 'Обелиска', level: 48, rarity: 'uncommon', sourceType: 'general', ...generalSource, shape: 'full_class_28' },
  { id: 'uncommon_53', prefix: 'set_uncommon', familyName: 'Чёрного Стекла', level: 53, rarity: 'uncommon', sourceType: 'general', ...generalSource, shape: 'full_class_28' },
  { id: 'uncommon_58', prefix: 'set_uncommon', familyName: 'Последнего Солнца', level: 58, rarity: 'uncommon', sourceType: 'general', ...generalSource, shape: 'full_class_28' },
  { id: 'rare_25', prefix: 'set_rare', familyName: 'Синего Прилива', level: 25, rarity: 'rare', sourceType: 'general', ...generalSource, shape: 'full_class_28' },
  { id: 'rare_30', prefix: 'set_rare', familyName: 'Пеплопада', level: 30, rarity: 'rare', sourceType: 'general', ...generalSource, shape: 'full_class_28' },
  { id: 'rare_35', prefix: 'set_rare', familyName: 'Пустого Купола', level: 35, rarity: 'rare', sourceType: 'general', ...generalSource, shape: 'full_class_28' },
  { id: 'rare_40', prefix: 'set_rare', familyName: 'Пика Бури', level: 40, rarity: 'rare', sourceType: 'general', ...generalSource, shape: 'full_class_28' },
  { id: 'rare_45', prefix: 'set_rare', familyName: 'Багрового Обелиска', level: 45, rarity: 'rare', sourceType: 'general', ...generalSource, shape: 'full_class_28' },
  { id: 'rare_50', prefix: 'set_rare', familyName: 'Бледного Короля', level: 50, rarity: 'rare', sourceType: 'general', ...generalSource, shape: 'full_class_28' },
  { id: 'rare_55', prefix: 'set_rare', familyName: 'Пустого Зеркала', level: 55, rarity: 'rare', sourceType: 'general', ...generalSource, shape: 'full_class_28' },
  { id: 'rare_60', prefix: 'set_rare', familyName: 'Нулевого Сердца', level: 60, rarity: 'rare', sourceType: 'general', ...generalSource, shape: 'full_class_28' },
];

export const DUNGEON_SET_DEFINITIONS: GeneratedSetDefinition[] = [
  { id: 'dungeon_old_lantern', prefix: 'old_lantern', familyName: 'Старого Фонаря', level: 6, rarity: 'epic', sourceType: 'dungeon', sourceId: 'old_lantern_cellar', sourceName: 'Подвал Старого Фонаря', shape: 'full_class_28' },
  { id: 'dungeon_blackroot', prefix: 'blackroot', familyName: 'Чёрного Короля', level: 11, rarity: 'epic', sourceType: 'dungeon', sourceId: 'blackroot_watch', sourceName: 'Дозор Чёрного Короля', shape: 'full_class_28' },
  { id: 'dungeon_mire_depths', prefix: 'mire_depths', familyName: 'Глубокой Топи', level: 14, rarity: 'epic', sourceType: 'dungeon', sourceId: 'mire_depths', sourceName: 'Глубины Топи', shape: 'full_class_28' },
  { id: 'dungeon_frost_vault', prefix: 'frost_vault', familyName: 'Ледяного Хранилища', level: 18, rarity: 'epic', sourceType: 'dungeon', sourceId: 'frost_vault', sourceName: 'Ледяное Хранилище', shape: 'full_class_28' },
  { id: 'dungeon_glass_catacomb', prefix: 'glass_catacomb', familyName: 'Стеклянных Катакомб', level: 20, rarity: 'epic', sourceType: 'dungeon', sourceId: 'glass_catacomb', sourceName: 'Стеклянные Катакомбы', shape: 'glass_20' },

  { id: 'dungeon_ironwood_frontier', prefix: 'ironwood_frontier_epic', familyName: 'Железный Рубеж', level: 24, rarity: 'epic', sourceType: 'dungeon', sourceId: 'ironwood_frontier_dungeon', sourceName: 'Данж: Железный Рубеж', shape: 'full_class_28' },
  { id: 'dungeon_saltwind_coast', prefix: 'saltwind_coast_epic', familyName: 'Солёный Берег', level: 28, rarity: 'epic', sourceType: 'dungeon', sourceId: 'saltwind_coast_dungeon', sourceName: 'Данж: Солёный Берег', shape: 'full_class_28' },
  { id: 'dungeon_emberfall_badlands', prefix: 'emberfall_badlands_epic', familyName: 'Пеплопад', level: 32, rarity: 'epic', sourceType: 'dungeon', sourceId: 'emberfall_badlands_dungeon', sourceName: 'Данж: Пеплопад', shape: 'full_class_28' },
  { id: 'dungeon_duskglass_reach', prefix: 'duskglass_reach_epic', familyName: 'Сумрачное Стекло', level: 36, rarity: 'epic', sourceType: 'dungeon', sourceId: 'duskglass_reach_dungeon', sourceName: 'Данж: Сумрачное Стекло', shape: 'full_class_28' },
  { id: 'dungeon_stormpeak_gate', prefix: 'stormpeak_gate_epic', familyName: 'Врата Грозового Пика', level: 40, rarity: 'epic', sourceType: 'dungeon', sourceId: 'stormpeak_gate_dungeon', sourceName: 'Данж: Врата Грозового Пика', shape: 'full_class_28' },
  { id: 'dungeon_hollow_star_marsh', prefix: 'hollow_star_marsh_epic', familyName: 'Трясина Пустой Звезды', level: 44, rarity: 'epic', sourceType: 'dungeon', sourceId: 'hollow_star_marsh_dungeon', sourceName: 'Данж: Трясина Пустой Звезды', shape: 'full_class_28' },
  { id: 'dungeon_crimson_obelisk', prefix: 'crimson_obelisk_epic', familyName: 'Багровый Обелиск', level: 48, rarity: 'epic', sourceType: 'dungeon', sourceId: 'crimson_obelisk_dungeon', sourceName: 'Данж: Багровый Обелиск', shape: 'full_class_28' },
  { id: 'dungeon_pale_king_road', prefix: 'pale_king_road_epic', familyName: 'Дорога Бледного Короля', level: 52, rarity: 'epic', sourceType: 'dungeon', sourceId: 'pale_king_road_dungeon', sourceName: 'Данж: Дорога Бледного Короля', shape: 'full_class_28' },
  { id: 'dungeon_voidglass_wastes', prefix: 'voidglass_wastes_epic', familyName: 'Пустоши Чёрного Стекла', level: 56, rarity: 'epic', sourceType: 'dungeon', sourceId: 'voidglass_wastes_dungeon', sourceName: 'Данж: Пустоши Чёрного Стекла', shape: 'full_class_28' },
  { id: 'dungeon_last_sun_plateau', prefix: 'last_sun_plateau_epic', familyName: 'Плато Последнего Солнца', level: 60, rarity: 'epic', sourceType: 'dungeon', sourceId: 'last_sun_plateau_dungeon', sourceName: 'Данж: Плато Последнего Солнца', shape: 'full_class_28' },
];

export const RAID_SET_DEFINITIONS: GeneratedSetDefinition[] = [
  { id: 'raid_wyrmspire', prefix: 'wyrmspire', familyName: 'Вирмшпиля', level: 20, rarity: 'epic', sourceType: 'raid', sourceId: 'wyrmspire_first_raid', sourceName: 'Вирмшпиль: первый подъём', shape: 'full_class_28' },
  { id: 'raid_wyrmspire_legendary', prefix: 'wyrmspire_gold', familyName: 'Первого Вирма', level: 20, rarity: 'legendary', sourceType: 'raid', sourceId: 'wyrmspire_first_raid', sourceName: 'Вирмшпиль: первый подъём', shape: 'first_wyrm_10' },

  { id: 'raid_stormpeak_trial_40_epic', prefix: 'stormpeak_trial_40_epic', familyName: 'Испытание Грозового Пика', level: 40, rarity: 'epic', sourceType: 'raid', sourceId: 'raid_stormpeak_trial_40', sourceName: 'Рейд: Испытание Грозового Пика', shape: 'full_class_28' },
  { id: 'raid_stormpeak_trial_40_legendary', prefix: 'stormpeak_trial_40_gold', familyName: 'Испытание Грозового Пика', level: 40, rarity: 'legendary', sourceType: 'raid', sourceId: 'raid_stormpeak_trial_40', sourceName: 'Рейд: Испытание Грозового Пика · GS 8200', shape: 'full_class_28' },
  { id: 'raid_last_sun_vanguard_60_epic', prefix: 'last_sun_vanguard_60_epic', familyName: 'Авангард Последнего Солнца', level: 60, rarity: 'epic', sourceType: 'raid', sourceId: 'raid_last_sun_vanguard_60', sourceName: 'Рейд: Авангард Последнего Солнца', shape: 'full_class_28' },
  { id: 'raid_last_sun_vanguard_60_legendary', prefix: 'last_sun_vanguard_60_gold', familyName: 'Авангард Последнего Солнца', level: 60, rarity: 'legendary', sourceType: 'raid', sourceId: 'raid_last_sun_vanguard_60', sourceName: 'Рейд: Авангард Последнего Солнца · GS 10500', shape: 'full_class_28' },
  { id: 'raid_voidglass_citadel_60_epic', prefix: 'voidglass_citadel_60_epic', familyName: 'Цитадель Чёрного Стекла', level: 60, rarity: 'epic', sourceType: 'raid', sourceId: 'raid_voidglass_citadel_60', sourceName: 'Рейд: Цитадель Чёрного Стекла', shape: 'full_class_28' },
  { id: 'raid_voidglass_citadel_60_legendary', prefix: 'voidglass_citadel_60_gold', familyName: 'Цитадель Чёрного Стекла', level: 60, rarity: 'legendary', sourceType: 'raid', sourceId: 'raid_voidglass_citadel_60', sourceName: 'Рейд: Цитадель Чёрного Стекла · GS 12500', shape: 'full_class_28' },
  { id: 'raid_worldcore_zero_60_epic', prefix: 'worldcore_zero_60_epic', familyName: 'Нулевое Сердце Мира', level: 60, rarity: 'epic', sourceType: 'raid', sourceId: 'raid_worldcore_zero_60', sourceName: 'Рейд: Нулевое Сердце Мира', shape: 'full_class_28' },
  { id: 'raid_worldcore_zero_60_legendary', prefix: 'worldcore_zero_60_gold', familyName: 'Нулевое Сердце Мира', level: 60, rarity: 'legendary', sourceType: 'raid', sourceId: 'raid_worldcore_zero_60', sourceName: 'Рейд: Нулевое Сердце Мира · GS 14500', shape: 'full_class_28' },
];

export const ALL_SET_DEFINITIONS = [
  ...GENERAL_SET_DEFINITIONS,
  ...DUNGEON_SET_DEFINITIONS,
  ...RAID_SET_DEFINITIONS,
];
