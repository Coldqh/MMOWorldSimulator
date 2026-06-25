import type { DungeonDefinition, LootTable, MobDefinition, SpotDefinition, ZoneDefinition } from '../types/game';

export interface SpotPatch {
  id: string;
  addMobIds?: string[];
  removeMobIds?: string[];
}

export interface DungeonPatch {
  id: string;
  lootTableId?: string;
  zoneId?: string;
}

export interface MobPatch {
  id: string;
  lootTableId?: string;
  name?: string;
}

export const EXTRA_LOOT_TABLES: LootTable[] = [
  { id: 'lt_thorn_crypt', entries: [] },
  { id: 'lt_mire_depths_dungeon', entries: [] },
  { id: 'lt_frostspire', entries: [
    { itemId: 'set_common_warrior_20_chest', chance: 0.06 },
    { itemId: 'set_common_ranger_20_weapon', chance: 0.06 },
    { itemId: 'set_uncommon_mage_18_weapon', chance: 0.06 },
    { itemId: 'set_rare_priest_20_weapon', chance: 0.06 },
    { itemId: 'sharpening_stone', chance: 0.24 }
  ]},
  { id: 'lt_frost_vault', entries: [] },
  { id: 'lt_glass_catacomb', entries: [] },
];

export const EXTRA_MOBS: MobDefinition[] = [
  { id: 'mire_depths_sentry', name: 'Страж Глубокой Топи', level: 13, stats: { hp: 340, mana: 60, attack: 42, magic: 16, defense: 18, speed: 6 }, xp: 340, gold: [90, 155], lootTableId: 'lt_mire_depths_dungeon', tags: ['humanoid', 'elite', 'dungeon'] },
  { id: 'mire_depths_shaman', name: 'Шаман Глубокой Топи', level: 14, stats: { hp: 300, mana: 140, attack: 22, magic: 44, defense: 15, speed: 8 }, xp: 380, gold: [105, 175], lootTableId: 'lt_mire_depths_dungeon', tags: ['humanoid', 'magic', 'dungeon'] },
  { id: 'mire_depths_beast', name: 'Болотный зверь', level: 14, stats: { hp: 420, mana: 30, attack: 50, magic: 8, defense: 20, speed: 7 }, xp: 420, gold: [120, 190], lootTableId: 'lt_mire_depths_dungeon', tags: ['beast', 'elite', 'dungeon'] },
  { id: 'mire_depths_warden', name: 'Надзиратель Топи', level: 14, stats: { hp: 720, mana: 120, attack: 58, magic: 28, defense: 24, speed: 7 }, xp: 780, gold: [240, 380], lootTableId: 'lt_mire_depths_dungeon', tags: ['boss', 'dungeon', 'aoe'] },
  { id: 'mire_depths_oracle', name: 'Оракул Чёрной Воды', level: 15, stats: { hp: 820, mana: 210, attack: 34, magic: 62, defense: 22, speed: 8 }, xp: 960, gold: [320, 520], lootTableId: 'lt_mire_depths_dungeon', tags: ['boss', 'dungeon', 'aoe'] },
  { id: 'mire_depths_heart', name: 'Сердце Глубокой Топи', level: 15, stats: { hp: 1040, mana: 180, attack: 66, magic: 46, defense: 30, speed: 6 }, xp: 1300, gold: [500, 800], lootTableId: 'lt_mire_depths_dungeon', tags: ['boss', 'dungeon', 'aoe'] },

  { id: 'frost_lynx', name: 'Ледяная рысь', level: 16, stats: { hp: 360, mana: 20, attack: 52, magic: 4, defense: 22, speed: 12 }, xp: 430, gold: [110, 190], lootTableId: 'lt_frostspire', tags: ['beast'] },
  { id: 'blueglass_mender', name: 'Чинитель Синего Стекла', level: 17, stats: { hp: 330, mana: 150, attack: 26, magic: 54, defense: 20, speed: 8 }, xp: 480, gold: [125, 210], lootTableId: 'lt_frostspire', tags: ['magic', 'humanoid'] },
  { id: 'spire_sellsword', name: 'Наёмник шпиля', level: 18, stats: { hp: 480, mana: 40, attack: 62, magic: 12, defense: 28, speed: 8 }, xp: 560, gold: [150, 260], lootTableId: 'lt_frostspire', tags: ['humanoid', 'elite'] },
  { id: 'glass_catacomb_guard', name: 'Страж Катакомб', level: 19, stats: { hp: 720, mana: 80, attack: 74, magic: 18, defense: 35, speed: 7 }, xp: 780, gold: [220, 360], lootTableId: 'lt_glass_catacomb', tags: ['humanoid', 'dungeon'] },
  { id: 'glass_catacomb_sage', name: 'Мудрец Катакомб', level: 20, stats: { hp: 640, mana: 260, attack: 34, magic: 84, defense: 30, speed: 8 }, xp: 840, gold: [250, 420], lootTableId: 'lt_glass_catacomb', tags: ['magic', 'dungeon'] },
  { id: 'mirror_knight', name: 'Зеркальный рыцарь', level: 20, stats: { hp: 1220, mana: 140, attack: 92, magic: 30, defense: 48, speed: 7 }, xp: 1600, gold: [500, 850], lootTableId: 'lt_glass_catacomb', tags: ['boss', 'dungeon', 'aoe'] },
  { id: 'catacomb_heart', name: 'Сердце Катакомб', level: 20, stats: { hp: 1480, mana: 320, attack: 68, magic: 96, defense: 44, speed: 7 }, xp: 2100, gold: [700, 1100], lootTableId: 'lt_glass_catacomb', tags: ['boss', 'dungeon', 'aoe'] },

  { id: 'wyrmspire_cultist', name: 'Культист Вирмшпиля', level: 20, stats: { hp: 620, mana: 180, attack: 52, magic: 76, defense: 30, speed: 8 }, xp: 780, gold: [210, 360], lootTableId: 'lt_wyrmspire_raid', tags: ['humanoid', 'magic'] },

  { id: 'frost_vault_guard', name: 'Страж Ледяного Хранилища', level: 16, stats: { hp: 760, mana: 80, attack: 68, magic: 18, defense: 36, speed: 7 }, xp: 820, gold: [220, 340], lootTableId: 'lt_frost_vault', tags: ['humanoid', 'dungeon'] },
  { id: 'frost_vault_mender', name: 'Ледяной чинитель', level: 17, stats: { hp: 690, mana: 220, attack: 34, magic: 76, defense: 30, speed: 8 }, xp: 900, gold: [250, 380], lootTableId: 'lt_frost_vault', tags: ['magic', 'dungeon'] },
  { id: 'frost_vault_beast', name: 'Снежный зверь', level: 18, stats: { hp: 900, mana: 40, attack: 84, magic: 10, defense: 40, speed: 8 }, xp: 980, gold: [280, 420], lootTableId: 'lt_frost_vault', tags: ['beast', 'dungeon'] },
  { id: 'frost_vault_captain', name: 'Капитан Хранилища', level: 18, stats: { hp: 1500, mana: 160, attack: 98, magic: 28, defense: 52, speed: 7 }, xp: 1700, gold: [520, 760], lootTableId: 'lt_frost_vault', tags: ['boss', 'dungeon', 'aoe'] },
  { id: 'frost_vault_seer', name: 'Провидец Хранилища', level: 19, stats: { hp: 1320, mana: 360, attack: 48, magic: 118, defense: 44, speed: 8 }, xp: 1900, gold: [600, 900], lootTableId: 'lt_frost_vault', tags: ['boss', 'dungeon', 'aoe'] },
  { id: 'frost_vault_heart', name: 'Сердце Хранилища', level: 19, stats: { hp: 1900, mana: 280, attack: 126, magic: 72, defense: 62, speed: 7 }, xp: 2400, gold: [760, 1200], lootTableId: 'lt_frost_vault', tags: ['boss', 'dungeon', 'aoe'] },
];

export const EXTRA_SPOTS: SpotDefinition[] = [
  { id: 'frostspire_outer_ridge', zoneId: 'frostspire_ridge', name: 'Внешний хребет', levelRange: [16, 18], mobIds: ['frost_lynx', 'blueglass_mender'], timeCostMinutes: 130, risk: 6, tags: ['solo', 'rare-drop'] },
  { id: 'frostspire_contract_camp', zoneId: 'frostspire_ridge', name: 'Лагерь наёмников', levelRange: [18, 20], mobIds: ['spire_sellsword', 'blueglass_mender'], timeCostMinutes: 150, risk: 7, tags: ['elite', 'gear'] },
  { id: 'wyrmspire_approach', zoneId: 'wyrmspire_peak', name: 'Подступ к Вирмшпилю', levelRange: [20, 20], mobIds: ['cloudbreaker_guard', 'spire_sellsword'], timeCostMinutes: 170, risk: 8, tags: ['raid-prep'] },
];

export const EXTRA_ZONES: ZoneDefinition[] = [
  { id: 'frostspire_ridge', name: 'Ледяной Хребет', levelRange: [16, 20], description: 'Lv. 16–20', spotIds: ['frostspire_outer_ridge', 'frostspire_contract_camp'] },
  { id: 'wyrmspire_peak', name: 'Вершина Вирмшпиля', levelRange: [20, 20], description: 'Lv. 20', spotIds: ['wyrmspire_approach'] },
];

export const EXTRA_DUNGEONS: DungeonDefinition[] = [
  { id: 'mire_depths', zoneId: 'skyfall_pass', name: 'Глубины Топи', levelRange: [13, 15], partySize: 5, timeCostMinutes: 360, contentType: 'dungeon', bossMobId: 'mire_depths_heart', lootTableId: 'lt_mire_depths_dungeon', description: 'Lv. 13–15 · пати 5', floors: [
    { id: 'md_1', name: 'Затопленный вход', type: 'mobs', mobIds: ['mire_depths_sentry', 'mire_depths_shaman', 'mire_depths_beast'], timeCostMinutes: 45 },
    { id: 'md_2', name: 'Пост надзирателя', type: 'boss', mobIds: ['mire_depths_sentry', 'mire_depths_warden'], timeCostMinutes: 65 },
    { id: 'md_3', name: 'Чёрная вода', type: 'mobs', mobIds: ['mire_depths_shaman', 'mire_depths_sentry', 'mire_depths_beast'], timeCostMinutes: 50 },
    { id: 'md_4', name: 'Камень оракула', type: 'boss', mobIds: ['mire_depths_shaman', 'mire_depths_oracle'], timeCostMinutes: 78 },
    { id: 'md_5', name: 'Глубокие сваи', type: 'mobs', mobIds: ['mire_depths_beast', 'mire_depths_sentry', 'mire_depths_shaman'], timeCostMinutes: 55 },
    { id: 'md_6', name: 'Сердце', type: 'boss', mobIds: ['mire_depths_beast', 'mire_depths_heart'], timeCostMinutes: 95 },
  ]},
  { id: 'frost_vault', zoneId: 'frostspire_ridge', name: 'Ледяное Хранилище', levelRange: [16, 19], partySize: 5, timeCostMinutes: 370, contentType: 'dungeon', bossMobId: 'frost_vault_heart', lootTableId: 'lt_frost_vault', description: 'Lv. 16–19 · пати 5', floors: [
    { id: 'fv_1', name: 'Верхний зал', type: 'mobs', mobIds: ['frost_vault_guard', 'frost_vault_mender', 'frost_vault_beast'], timeCostMinutes: 55 },
    { id: 'fv_2', name: 'Караул капитана', type: 'boss', mobIds: ['frost_vault_guard', 'frost_vault_captain'], timeCostMinutes: 78 },
    { id: 'fv_3', name: 'Синий коридор', type: 'mobs', mobIds: ['frost_vault_mender', 'frost_vault_guard', 'frost_vault_beast'], timeCostMinutes: 62 },
    { id: 'fv_4', name: 'Зал провидца', type: 'boss', mobIds: ['frost_vault_mender', 'frost_vault_seer'], timeCostMinutes: 86 },
    { id: 'fv_5', name: 'Нижние цепи', type: 'mobs', mobIds: ['frost_vault_beast', 'frost_vault_guard', 'frost_vault_mender'], timeCostMinutes: 65 },
    { id: 'fv_6', name: 'Сердце', type: 'boss', mobIds: ['frost_vault_beast', 'frost_vault_heart'], timeCostMinutes: 105 },
  ]},
  { id: 'glass_catacomb', zoneId: 'wyrmspire_peak', name: 'Стеклянные Катакомбы', levelRange: [20, 20], partySize: 5, timeCostMinutes: 390, contentType: 'dungeon', bossMobId: 'catacomb_heart', lootTableId: 'lt_glass_catacomb', description: 'Lv. 20 · пати 5', floors: [
    { id: 'gc_1', name: 'Синий вход', type: 'mobs', mobIds: ['glass_catacomb_guard', 'glass_catacomb_sage', 'glass_catacomb_guard'], timeCostMinutes: 55 },
    { id: 'gc_2', name: 'Зеркальный зал', type: 'boss', mobIds: ['glass_catacomb_guard', 'mirror_knight'], timeCostMinutes: 82 },
    { id: 'gc_3', name: 'Нижние арки', type: 'mobs', mobIds: ['glass_catacomb_sage', 'glass_catacomb_guard', 'glass_catacomb_sage'], timeCostMinutes: 62 },
    { id: 'gc_4', name: 'Треснувший купол', type: 'boss', mobIds: ['glass_catacomb_sage', 'mirror_knight'], timeCostMinutes: 88 },
    { id: 'gc_5', name: 'Глубокий проход', type: 'mobs', mobIds: ['glass_catacomb_guard', 'glass_catacomb_sage', 'glass_catacomb_guard'], timeCostMinutes: 65 },
    { id: 'gc_6', name: 'Сердце', type: 'boss', mobIds: ['glass_catacomb_guard', 'catacomb_heart'], timeCostMinutes: 110 },
  ]},
];

export const EXTRA_SPOT_PATCHES: SpotPatch[] = [
  { id: 'wyrmspire_approach', addMobIds: ['wyrmspire_cultist'] },
];

export const EXTRA_DUNGEON_PATCHES: DungeonPatch[] = [
  { id: 'thorn_crown_crypt', lootTableId: 'lt_thorn_crypt' },
];

export const EXTRA_MOB_PATCHES: MobPatch[] = [
  { id: 'thorn_crown_hound', lootTableId: 'lt_thorn_crypt' },
  { id: 'thorn_crown_acolyte', lootTableId: 'lt_thorn_crypt' },
];
