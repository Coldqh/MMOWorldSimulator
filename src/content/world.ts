import type { DungeonDefinition, LootTable, MobDefinition, SpotDefinition, ZoneDefinition, Rarity } from '../types/game';
import { ITEMS, getItemById, rarityScore } from './items';

export const CITY_ID = 'starting_city';
export const CITY_NAME = 'Стартовый город';

export const LOOT_TABLES: LootTable[] = [
  { id: 'lt_greenfield_trash', entries: [
    { itemId: 'minor_potion', chance: 0.12 }, { itemId: 'mana_potion', chance: 0.07 },
    { itemId: 'linen_armor', chance: 0.05 }, { itemId: 'cloth_cap', chance: 0.04 },
    { itemId: 'patched_leggings', chance: 0.04 }, { itemId: 'sharpening_stone', chance: 0.07 },
    { itemId: 'slime_card', chance: 0.00035 }
  ]},
  { id: 'lt_boar_fields', entries: [
    { itemId: 'worn_boots', chance: 0.07 }, { itemId: 'field_helmet', chance: 0.04 },
    { itemId: 'boar_tusk_amulet', chance: 0.018 }, { itemId: 'minor_potion', chance: 0.1 }
  ]},
  { id: 'lt_wolf_den', entries: [
    { itemId: 'wolf_hide_vest', chance: 0.08 }, { itemId: 'hunter_boots', chance: 0.06 },
    { itemId: 'forest_ring', chance: 0.025 }, { itemId: 'wolf_card', chance: 0.00022 },
    { itemId: 'crystal_mount_whistle', chance: 0.0005 }
  ]},
  { id: 'lt_moonwood_ruins', entries: [
    { itemId: 'moonleaf_cowl', chance: 0.04 }, { itemId: 'moonleaf_robe', chance: 0.032 },
    { itemId: 'silverstring_bow', chance: 0.012 }, { itemId: 'moon_wisp_card', chance: 0.00018 },
    { itemId: 'mana_potion', chance: 0.12 }
  ]},
  { id: 'lt_redcap_camp', entries: [
    { itemId: 'redcap_blade', chance: 0.025 }, { itemId: 'silverstring_bow', chance: 0.02 },
    { itemId: 'ember_staff', chance: 0.02 }, { itemId: 'redcap_coat', chance: 0.018 },
    { itemId: 'redcap_card', chance: 0.00018 }, { itemId: 'sharpening_stone', chance: 0.16 }
  ]},
  { id: 'lt_quarry', entries: [
    { itemId: 'iron_miner_helm', chance: 0.05 }, { itemId: 'quarry_guard_greaves', chance: 0.035 },
    { itemId: 'stonehide_ring', chance: 0.018 }, { itemId: 'sharpening_stone', chance: 0.22 }
  ]},
  { id: 'lt_old_lantern_dungeon', entries: [
    { itemId: 'old_lantern_charm', chance: 0.22 }, { itemId: 'redcap_blade', chance: 0.18 },
    { itemId: 'silverstring_bow', chance: 0.18 }, { itemId: 'ember_staff', chance: 0.18 },
    { itemId: 'redcap_coat', chance: 0.16 }, { itemId: 'thorn_crown_token', chance: 0.35 }
  ]},
  { id: 'lt_blackroot_raid', entries: [
    { itemId: 'blackroot_saber', chance: 0.18 }, { itemId: 'blackroot_focus', chance: 0.18 },
    { itemId: 'raiders_seal_ring', chance: 0.14 }, { itemId: 'thorn_crown_token', chance: 0.42 }
  ]},
  { id: 'lt_ashen_mire', entries: [
    { itemId: 'ashen_halberd', chance: 0.055 }, { itemId: 'marsh_stalker_bow', chance: 0.055 },
    { itemId: 'mireglass_scepter', chance: 0.055 }, { itemId: 'ashen_guard_plate', chance: 0.048 },
    { itemId: 'mire_runner_boots', chance: 0.055 }, { itemId: 'sharpening_stone', chance: 0.22 }
  ]},
  { id: 'lt_skyfall_pass', entries: [
    { itemId: 'skyfall_greatsword', chance: 0.065 }, { itemId: 'skyfall_longbow', chance: 0.065 },
    { itemId: 'skyfall_orb', chance: 0.065 }, { itemId: 'stormguard_helm', chance: 0.055 },
    { itemId: 'stormguard_legs', chance: 0.055 }, { itemId: 'cloudbreaker_ring', chance: 0.032 },
    { itemId: 'starwell_amulet', chance: 0.032 }, { itemId: 'sharpening_stone', chance: 0.25 }
  ]},
  { id: 'lt_wyrmspire_raid', entries: [
    { itemId: 'wyrmguard_blade', chance: 0.18 }, { itemId: 'wyrmguard_recurve', chance: 0.18 },
    { itemId: 'wyrmguard_codex', chance: 0.18 }, { itemId: 'first_raid_seal', chance: 0.12 },
    { itemId: 'skyfall_greatsword', chance: 0.18 }, { itemId: 'skyfall_longbow', chance: 0.18 },
    { itemId: 'skyfall_orb', chance: 0.18 }, { itemId: 'cloudbreaker_ring', chance: 0.14 }
  ]}
];

export const MOBS: MobDefinition[] = [
  { id: 'green_slime', name: 'Зелёная слизь', level: 1, stats: { hp: 42, mana: 0, attack: 6, magic: 0, defense: 1, speed: 3 }, xp: 18, gold: [2, 7], lootTableId: 'lt_greenfield_trash', tags: ['beast', 'starter'] },
  { id: 'field_rat', name: 'Полевая крыса', level: 1, stats: { hp: 36, mana: 0, attack: 7, magic: 0, defense: 1, speed: 6 }, xp: 16, gold: [1, 5], lootTableId: 'lt_greenfield_trash', tags: ['beast', 'starter'] },
  { id: 'mud_boar', name: 'Грязевой кабан', level: 2, stats: { hp: 58, mana: 0, attack: 9, magic: 0, defense: 3, speed: 4 }, xp: 26, gold: [4, 10], lootTableId: 'lt_boar_fields', tags: ['beast'] },
  { id: 'gray_wolf', name: 'Серый волк', level: 3, stats: { hp: 68, mana: 0, attack: 11, magic: 0, defense: 3, speed: 8 }, xp: 36, gold: [5, 13], lootTableId: 'lt_wolf_den', tags: ['beast'] },
  { id: 'moon_wisp', name: 'Лунный огонёк', level: 4, stats: { hp: 62, mana: 35, attack: 8, magic: 12, defense: 3, speed: 9 }, xp: 44, gold: [7, 16], lootTableId: 'lt_moonwood_ruins', tags: ['spirit', 'magic'] },
  { id: 'redcap_raider', name: 'Красноколпак-налётчик', level: 5, stats: { hp: 92, mana: 15, attack: 15, magic: 3, defense: 5, speed: 7 }, xp: 64, gold: [12, 28], lootTableId: 'lt_redcap_camp', tags: ['humanoid', 'elite'] },
  { id: 'quarry_brute', name: 'Карьерный громила', level: 6, stats: { hp: 118, mana: 0, attack: 18, magic: 0, defense: 8, speed: 4 }, xp: 78, gold: [16, 34], lootTableId: 'lt_quarry', tags: ['humanoid', 'tough'] },

  { id: 'old_lantern_warden', name: 'Сторож Старого Фонаря', level: 5, stats: { hp: 135, mana: 25, attack: 16, magic: 6, defense: 7, speed: 5 }, xp: 110, gold: [28, 55], lootTableId: 'lt_old_lantern_dungeon', tags: ['mini-boss', 'dungeon'] },
  { id: 'thorn_crown_hound', name: 'Пёс Терновой Короны', level: 7, stats: { hp: 170, mana: 20, attack: 21, magic: 4, defense: 8, speed: 9 }, xp: 145, gold: [40, 80], lootTableId: 'lt_old_lantern_dungeon', tags: ['mini-boss', 'dungeon'] },
  { id: 'blackroot_sentinel', name: 'Часовой Чёрного Корня', level: 9, stats: { hp: 230, mana: 35, attack: 25, magic: 8, defense: 12, speed: 6 }, xp: 220, gold: [75, 135], lootTableId: 'lt_blackroot_raid', tags: ['mini-boss', 'dungeon'] },
  { id: 'old_lantern_keeper', name: 'Хранитель Старого Фонаря', level: 6, stats: { hp: 180, mana: 50, attack: 18, magic: 9, defense: 8, speed: 5 }, xp: 180, gold: [45, 90], lootTableId: 'lt_old_lantern_dungeon', tags: ['boss', 'dungeon', 'aoe'] },
  { id: 'thorn_crown_acolyte', name: 'Послушник Терновой Короны', level: 8, stats: { hp: 240, mana: 70, attack: 18, magic: 14, defense: 10, speed: 6 }, xp: 260, gold: [80, 140], lootTableId: 'lt_old_lantern_dungeon', tags: ['boss', 'dungeon', 'aoe'] },
  { id: 'blackroot_knight', name: 'Рыцарь Чёрного Корня', level: 10, stats: { hp: 340, mana: 80, attack: 28, magic: 12, defense: 14, speed: 7 }, xp: 440, gold: [160, 260], lootTableId: 'lt_blackroot_raid', tags: ['boss', 'dungeon', 'aoe'] },

  { id: 'ash_mire_crawler', name: 'Пепельный ползун', level: 10, stats: { hp: 185, mana: 0, attack: 28, magic: 0, defense: 11, speed: 6 }, xp: 150, gold: [34, 65], lootTableId: 'lt_ashen_mire', tags: ['beast'] },
  { id: 'mireglass_caster', name: 'Топкостеклянный колдун', level: 11, stats: { hp: 165, mana: 95, attack: 16, magic: 26, defense: 9, speed: 7 }, xp: 175, gold: [42, 74], lootTableId: 'lt_ashen_mire', tags: ['magic', 'humanoid'] },
  { id: 'ash_guard_veteran', name: 'Ветеран пепельной стражи', level: 12, stats: { hp: 240, mana: 30, attack: 32, magic: 8, defense: 14, speed: 6 }, xp: 210, gold: [55, 92], lootTableId: 'lt_ashen_mire', tags: ['humanoid', 'elite'] },
  { id: 'skyfall_harrier', name: 'Небопадный гарпунщик', level: 13, stats: { hp: 230, mana: 40, attack: 36, magic: 8, defense: 13, speed: 10 }, xp: 255, gold: [66, 110], lootTableId: 'lt_skyfall_pass', tags: ['humanoid'] },
  { id: 'stormbound_wisp', name: 'Грозовой огонёк', level: 14, stats: { hp: 210, mana: 130, attack: 16, magic: 36, defense: 11, speed: 11 }, xp: 290, gold: [78, 128], lootTableId: 'lt_skyfall_pass', tags: ['spirit', 'magic'] },
  { id: 'cloudbreaker_guard', name: 'Страж Расколотого Облака', level: 15, stats: { hp: 330, mana: 65, attack: 42, magic: 15, defense: 18, speed: 7 }, xp: 360, gold: [95, 160], lootTableId: 'lt_skyfall_pass', tags: ['humanoid', 'elite'] },

  { id: 'wyrmspire_gatekeeper', name: 'Привратник Вирмшпиля', level: 20, stats: { hp: 980, mana: 180, attack: 66, magic: 30, defense: 34, speed: 8 }, xp: 650, gold: [180, 280], lootTableId: 'lt_wyrmspire_raid', tags: ['boss', 'raid', 'aoe'] },
  { id: 'wyrmspire_oracle', name: 'Оракул Вирмшпиля', level: 20, stats: { hp: 1060, mana: 260, attack: 42, magic: 72, defense: 32, speed: 9 }, xp: 840, gold: [240, 360], lootTableId: 'lt_wyrmspire_raid', tags: ['boss', 'raid', 'aoe'] },
  { id: 'first_wyrm', name: 'Первый Вирм', level: 20, stats: { hp: 1420, mana: 320, attack: 82, magic: 74, defense: 42, speed: 8 }, xp: 1250, gold: [420, 680], lootTableId: 'lt_wyrmspire_raid', tags: ['boss', 'raid', 'aoe'] }
];

export const SPOTS: SpotDefinition[] = [
  { id: 'greenfield_slimes', zoneId: 'greenfield', name: 'Лужайка слизней', levelRange: [1, 2], mobIds: ['green_slime', 'field_rat'], timeCostMinutes: 45, risk: 1, tags: ['solo', 'starter'] },
  { id: 'greenfield_old_road', zoneId: 'greenfield', name: 'Старая дорога', levelRange: [1, 3], mobIds: ['field_rat', 'mud_boar'], timeCostMinutes: 60, risk: 2, tags: ['solo'] },
  { id: 'greenfield_boar_mud', zoneId: 'greenfield', name: 'Кабанья низина', levelRange: [2, 4], mobIds: ['mud_boar', 'gray_wolf'], timeCostMinutes: 75, risk: 2, tags: ['solo', 'coins'] },
  { id: 'wolf_den_edge', zoneId: 'moonwood', name: 'Край волчьей норы', levelRange: [3, 5], mobIds: ['gray_wolf'], timeCostMinutes: 90, risk: 3, tags: ['solo', 'rare-drop'] },
  { id: 'moonwood_wisp_grove', zoneId: 'moonwood', name: 'Роща огоньков', levelRange: [4, 6], mobIds: ['moon_wisp'], timeCostMinutes: 105, risk: 4, tags: ['magic', 'rare-drop'] },
  { id: 'redcap_camp_outer', zoneId: 'redcap_hills', name: 'Внешний лагерь красноколпаков', levelRange: [5, 7], mobIds: ['redcap_raider'], timeCostMinutes: 120, risk: 5, tags: ['group', 'pvp-risk'] },
  { id: 'redcap_supply_path', zoneId: 'redcap_hills', name: 'Тропа обозников', levelRange: [5, 8], mobIds: ['redcap_raider', 'quarry_brute'], timeCostMinutes: 135, risk: 6, tags: ['group', 'gear'] },
  { id: 'iron_quarry_yard', zoneId: 'iron_quarry', name: 'Двор карьера', levelRange: [6, 9], mobIds: ['quarry_brute'], timeCostMinutes: 135, risk: 6, tags: ['group', 'enhance'] },
  { id: 'iron_quarry_tunnels', zoneId: 'iron_quarry', name: 'Северные штреки', levelRange: [7, 10], mobIds: ['quarry_brute', 'moon_wisp'], timeCostMinutes: 150, risk: 7, tags: ['elite', 'rare-drop'] },
  { id: 'ashen_mire_bank', zoneId: 'ashen_mire', name: 'Берег Пепельной Топи', levelRange: [10, 12], mobIds: ['ash_mire_crawler', 'mireglass_caster'], timeCostMinutes: 165, risk: 8, tags: ['elite', 'gear'] },
  { id: 'ashen_mire_watch', zoneId: 'ashen_mire', name: 'Пост пепельной стражи', levelRange: [11, 13], mobIds: ['ash_guard_veteran', 'mireglass_caster'], timeCostMinutes: 180, risk: 9, tags: ['elite', 'rare-drop'] },
  { id: 'skyfall_lower_pass', zoneId: 'skyfall_pass', name: 'Нижний перевал', levelRange: [12, 14], mobIds: ['skyfall_harrier', 'stormbound_wisp'], timeCostMinutes: 190, risk: 10, tags: ['elite', 'gear'] },
  { id: 'skyfall_cloud_gate', zoneId: 'skyfall_pass', name: 'Облачные ворота', levelRange: [14, 15], mobIds: ['stormbound_wisp', 'cloudbreaker_guard'], timeCostMinutes: 210, risk: 11, tags: ['hard', 'rare-drop'] }
];

export const ZONES: ZoneDefinition[] = [
  { id: 'greenfield', name: 'Зелёные Поля', levelRange: [1, 4], description: 'Lv. 1–4. Споты, расходники, первый шмот.', spotIds: ['greenfield_slimes', 'greenfield_old_road', 'greenfield_boar_mud'] },
  { id: 'moonwood', name: 'Лунный Лес', levelRange: [3, 6], description: 'Lv. 3–6. Волки, огоньки, карты.', spotIds: ['wolf_den_edge', 'moonwood_wisp_grove'] },
  { id: 'redcap_hills', name: 'Холмы Красных Колпаков', levelRange: [5, 8], description: 'Lv. 5–8. Элитные споты и первые данжи.', spotIds: ['redcap_camp_outer', 'redcap_supply_path'] },
  { id: 'iron_quarry', name: 'Железный Карьер', levelRange: [6, 10], description: 'Lv. 6–10. Камни усиления, тяжёлые враги.', spotIds: ['iron_quarry_yard', 'iron_quarry_tunnels'] },
  { id: 'ashen_mire', name: 'Пепельная Топь', levelRange: [10, 13], description: 'Lv. 10–13. Переход к рейдовому уровню.', spotIds: ['ashen_mire_bank', 'ashen_mire_watch'] },
  { id: 'skyfall_pass', name: 'Перевал Небопада', levelRange: [12, 15], description: 'Lv. 12–15. Высокий риск, сильный шмот.', spotIds: ['skyfall_lower_pass', 'skyfall_cloud_gate'] }
];

export const DUNGEONS: DungeonDefinition[] = [
  { id: 'old_lantern_cellar', zoneId: 'redcap_hills', name: 'Подвал Старого Фонаря', levelRange: [5, 7], partySize: 4, timeCostMinutes: 190, contentType: 'dungeon', bossMobId: 'old_lantern_keeper', lootTableId: 'lt_old_lantern_dungeon', description: 'Lv. 5–7 · пати 4', floors: [
    { id: 'olf_1', name: 'Входной ход', type: 'mobs', mobIds: ['redcap_raider', 'moon_wisp', 'redcap_raider'], timeCostMinutes: 30 },
    { id: 'olf_2', name: 'Караульная', type: 'boss', mobIds: ['redcap_raider', 'old_lantern_warden'], timeCostMinutes: 38 },
    { id: 'olf_3', name: 'Нижний коридор', type: 'mobs', mobIds: ['redcap_raider', 'redcap_raider', 'moon_wisp'], timeCostMinutes: 34 },
    { id: 'olf_4', name: 'Псарня', type: 'boss', mobIds: ['moon_wisp', 'thorn_crown_hound'], timeCostMinutes: 42 },
    { id: 'olf_5', name: 'Тёмный склад', type: 'mobs', mobIds: ['moon_wisp', 'redcap_raider', 'redcap_raider'], timeCostMinutes: 36 },
    { id: 'olf_6', name: 'Фонарь', type: 'boss', mobIds: ['redcap_raider', 'old_lantern_keeper'], timeCostMinutes: 52 }
  ]},
  { id: 'thorn_crown_crypt', zoneId: 'redcap_hills', name: 'Склеп Терновой Короны', levelRange: [7, 10], partySize: 5, timeCostMinutes: 260, contentType: 'dungeon', bossMobId: 'thorn_crown_acolyte', lootTableId: 'lt_old_lantern_dungeon', description: 'Lv. 7–10 · пати 5', floors: [
    { id: 'tcc_1', name: 'Ступени', type: 'mobs', mobIds: ['redcap_raider', 'moon_wisp', 'quarry_brute'], timeCostMinutes: 40 },
    { id: 'tcc_2', name: 'Псарня', type: 'boss', mobIds: ['redcap_raider', 'thorn_crown_hound'], timeCostMinutes: 48 },
    { id: 'tcc_3', name: 'Крипта', type: 'mobs', mobIds: ['moon_wisp', 'quarry_brute', 'redcap_raider'], timeCostMinutes: 42 },
    { id: 'tcc_4', name: 'Малая часовня', type: 'boss', mobIds: ['quarry_brute', 'old_lantern_keeper'], timeCostMinutes: 54 },
    { id: 'tcc_5', name: 'Глубокие ниши', type: 'mobs', mobIds: ['quarry_brute', 'moon_wisp', 'quarry_brute'], timeCostMinutes: 45 },
    { id: 'tcc_6', name: 'Алтарь', type: 'boss', mobIds: ['redcap_raider', 'thorn_crown_acolyte'], timeCostMinutes: 68 }
  ]},
  { id: 'blackroot_watch', zoneId: 'iron_quarry', name: 'Дозор Чёрного Корня', levelRange: [9, 12], partySize: 5, timeCostMinutes: 310, contentType: 'dungeon', bossMobId: 'blackroot_knight', lootTableId: 'lt_blackroot_raid', description: 'Lv. 9–12 · пати 5', floors: [
    { id: 'brw_1', name: 'Внешний пост', type: 'mobs', mobIds: ['quarry_brute', 'moon_wisp', 'quarry_brute'], timeCostMinutes: 45 },
    { id: 'brw_2', name: 'Караул', type: 'boss', mobIds: ['quarry_brute', 'blackroot_sentinel'], timeCostMinutes: 55 },
    { id: 'brw_3', name: 'Башенный проход', type: 'mobs', mobIds: ['quarry_brute', 'moon_wisp', 'quarry_brute'], timeCostMinutes: 48 },
    { id: 'brw_4', name: 'Командный пост', type: 'boss', mobIds: ['moon_wisp', 'thorn_crown_acolyte'], timeCostMinutes: 62 },
    { id: 'brw_5', name: 'Внутренний двор', type: 'mobs', mobIds: ['quarry_brute', 'quarry_brute', 'moon_wisp'], timeCostMinutes: 50 },
    { id: 'brw_6', name: 'Зал рыцаря', type: 'boss', mobIds: ['moon_wisp', 'blackroot_knight'], timeCostMinutes: 78 }
  ]}
];

export const RAIDS: DungeonDefinition[] = [
  { id: 'wyrmspire_first_raid', zoneId: 'wyrmspire_peak', name: 'Вирмшпиль: первый подъём', levelRange: [20, 20], partySize: 6, timeCostMinutes: 420, contentType: 'raid', bossMobId: 'first_wyrm', lootTableId: 'lt_wyrmspire_raid', description: 'Lv. 20 · рейд 6', floors: [
    { id: 'wsp_1', name: 'Врата', type: 'mobs', mobIds: ['ash_guard_veteran', 'skyfall_harrier', 'stormbound_wisp'], timeCostMinutes: 55 },
    { id: 'wsp_2', name: 'Привратник', type: 'boss', mobIds: ['cloudbreaker_guard', 'wyrmspire_gatekeeper'], timeCostMinutes: 70 },
    { id: 'wsp_3', name: 'Подъём', type: 'mobs', mobIds: ['skyfall_harrier', 'stormbound_wisp', 'cloudbreaker_guard'], timeCostMinutes: 60 },
    { id: 'wsp_4', name: 'Оракул', type: 'boss', mobIds: ['stormbound_wisp', 'wyrmspire_oracle'], timeCostMinutes: 82 },
    { id: 'wsp_5', name: 'Верхний мост', type: 'mobs', mobIds: ['cloudbreaker_guard', 'stormbound_wisp', 'cloudbreaker_guard'], timeCostMinutes: 66 },
    { id: 'wsp_6', name: 'Гнездо', type: 'boss', mobIds: ['cloudbreaker_guard', 'first_wyrm'], timeCostMinutes: 105 }
  ]}
];

export const getMobById = (id: string) => MOBS.find((entry) => entry.id === id);
export const getSpotById = (id: string) => SPOTS.find((entry) => entry.id === id);
export const getZoneById = (id: string) => ZONES.find((entry) => entry.id === id);
export const getLootTableById = (id: string) => LOOT_TABLES.find((entry) => entry.id === id);
export const getDungeonById = (id: string) => [...DUNGEONS, ...RAIDS].find((entry) => entry.id === id);
export const getRaidById = (id: string) => RAIDS.find((entry) => entry.id === id);
export const getDungeonsByZoneId = (zoneId: string) => DUNGEONS.filter((entry) => entry.zoneId === zoneId);
export const getRaidsByZoneId = (zoneId: string) => RAIDS.filter((entry) => entry.zoneId === zoneId);

// v0.3.1 content tuning
LOOT_TABLES.forEach((table) => {
  table.entries = table.entries.map((entry) => {
    if (entry.itemId.includes('_card') || entry.itemId.endsWith('card')) return { ...entry, chance: Math.min(entry.chance, 0.00008) };
    return entry;
  });
});

const addLoot = (tableId: string, prefix: string, chance: number) => {
  const table = LOOT_TABLES.find((entry) => entry.id === tableId);
  if (!table) return;
  const ids = [
    'warrior_weapon', 'warrior_head', 'warrior_chest', 'warrior_legs', 'warrior_boots', 'warrior_ring', 'warrior_amulet',
    'ranger_weapon', 'ranger_head', 'ranger_chest', 'ranger_legs', 'ranger_boots', 'ranger_ring', 'ranger_amulet',
    'mage_weapon', 'mage_head', 'mage_chest', 'mage_legs', 'mage_boots', 'mage_ring', 'mage_amulet',
    'priest_weapon', 'priest_head', 'priest_chest', 'priest_legs', 'priest_boots', 'priest_ring', 'priest_amulet',
  ].map((suffix) => `${prefix}_${suffix}`);
  ids.forEach((itemId) => {
    if (!table.entries.some((entry) => entry.itemId === itemId)) table.entries.push({ itemId, chance });
  });
};

addLoot('lt_old_lantern_dungeon', 'old_lantern', 0.11);
addLoot('lt_old_lantern_dungeon', 'thorn_crypt', 0.035);
addLoot('lt_blackroot_raid', 'blackroot', 0.12);
addLoot('lt_wyrmspire_raid', 'wyrmspire', 0.16);
addLoot('lt_wyrmspire_raid', 'wyrmspire_gold', 0.025);

LOOT_TABLES.push({ id: 'lt_mire_depths_dungeon', entries: [] });
addLoot('lt_mire_depths_dungeon', 'mire_depths', 0.14);
addLoot('lt_mire_depths_dungeon', 'blackroot', 0.035);

MOBS.push(
  { id: 'mire_depths_sentry', name: 'Страж Глубокой Топи', level: 13, stats: { hp: 340, mana: 60, attack: 42, magic: 16, defense: 18, speed: 6 }, xp: 340, gold: [90, 155], lootTableId: 'lt_mire_depths_dungeon', tags: ['humanoid', 'elite', 'dungeon'] },
  { id: 'mire_depths_shaman', name: 'Шаман Глубокой Топи', level: 14, stats: { hp: 300, mana: 140, attack: 22, magic: 44, defense: 15, speed: 8 }, xp: 380, gold: [105, 175], lootTableId: 'lt_mire_depths_dungeon', tags: ['humanoid', 'magic', 'dungeon'] },
  { id: 'mire_depths_beast', name: 'Топяной зверь', level: 14, stats: { hp: 420, mana: 30, attack: 50, magic: 8, defense: 20, speed: 7 }, xp: 420, gold: [120, 190], lootTableId: 'lt_mire_depths_dungeon', tags: ['beast', 'elite', 'dungeon'] },
  { id: 'mire_depths_warden', name: 'Надзиратель Топи', level: 14, stats: { hp: 720, mana: 120, attack: 58, magic: 28, defense: 24, speed: 7 }, xp: 780, gold: [240, 380], lootTableId: 'lt_mire_depths_dungeon', tags: ['boss', 'dungeon', 'aoe'] },
  { id: 'mire_depths_oracle', name: 'Оракул Чёрной Воды', level: 15, stats: { hp: 820, mana: 210, attack: 34, magic: 62, defense: 22, speed: 8 }, xp: 960, gold: [320, 520], lootTableId: 'lt_mire_depths_dungeon', tags: ['boss', 'dungeon', 'aoe'] },
  { id: 'mire_depths_heart', name: 'Сердце Глубокой Топи', level: 15, stats: { hp: 1040, mana: 180, attack: 66, magic: 46, defense: 30, speed: 6 }, xp: 1300, gold: [500, 800], lootTableId: 'lt_mire_depths_dungeon', tags: ['boss', 'dungeon', 'aoe'] },
);

DUNGEONS.push({ id: 'mire_depths', zoneId: 'skyfall_pass', name: 'Глубины Топи', levelRange: [13, 15], partySize: 5, timeCostMinutes: 360, contentType: 'dungeon', bossMobId: 'mire_depths_heart', lootTableId: 'lt_mire_depths_dungeon', description: 'Lv. 13–15 · пати 5', floors: [
  { id: 'md_1', name: 'Затопленный вход', type: 'mobs', mobIds: ['mire_depths_sentry', 'mire_depths_shaman', 'mire_depths_beast'], timeCostMinutes: 45 },
  { id: 'md_2', name: 'Пост надзирателя', type: 'boss', mobIds: ['mire_depths_sentry', 'mire_depths_warden'], timeCostMinutes: 65 },
  { id: 'md_3', name: 'Чёрная вода', type: 'mobs', mobIds: ['mire_depths_shaman', 'mire_depths_sentry', 'mire_depths_beast'], timeCostMinutes: 50 },
  { id: 'md_4', name: 'Камень оракула', type: 'boss', mobIds: ['mire_depths_shaman', 'mire_depths_oracle'], timeCostMinutes: 78 },
  { id: 'md_5', name: 'Глубокие сваи', type: 'mobs', mobIds: ['mire_depths_beast', 'mire_depths_sentry', 'mire_depths_shaman'], timeCostMinutes: 55 },
  { id: 'md_6', name: 'Сердце', type: 'boss', mobIds: ['mire_depths_beast', 'mire_depths_heart'], timeCostMinutes: 95 },
]});


// v0.3.2 level 16-20 content
LOOT_TABLES.push(
  { id: 'lt_frostspire', entries: [
    { itemId: 'set_common_warrior_16_chest', chance: 0.2 }, { itemId: 'set_uncommon_warrior_18_weapon', chance: 0.1 },
    { itemId: 'set_rare_ranger_20_weapon', chance: 0.05 }, { itemId: 'sharpening_stone', chance: 0.24 }
  ]},
  { id: 'lt_glass_catacomb', entries: [] },
);
addLoot('lt_glass_catacomb', 'glass_catacomb', 0.12);
addLoot('lt_glass_catacomb', 'glass_catacomb_epic', 0.04);
addLoot('lt_wyrmspire_raid', 'wyrmspire', 0.3);
addLoot('lt_wyrmspire_raid', 'wyrmspire_gold', 0.1);

MOBS.push(
  { id: 'frost_lynx', name: 'Ледяная рысь', level: 16, stats: { hp: 360, mana: 20, attack: 52, magic: 4, defense: 22, speed: 12 }, xp: 430, gold: [110, 190], lootTableId: 'lt_frostspire', tags: ['beast'] },
  { id: 'blueglass_mender', name: 'Синестеклянный чинитель', level: 17, stats: { hp: 330, mana: 150, attack: 26, magic: 54, defense: 20, speed: 8 }, xp: 480, gold: [125, 210], lootTableId: 'lt_frostspire', tags: ['magic', 'humanoid'] },
  { id: 'spire_sellsword', name: 'Наёмник шпиля', level: 18, stats: { hp: 480, mana: 40, attack: 62, magic: 12, defense: 28, speed: 8 }, xp: 560, gold: [150, 260], lootTableId: 'lt_frostspire', tags: ['humanoid', 'elite'] },
  { id: 'glass_catacomb_guard', name: 'Страж Катакомб', level: 19, stats: { hp: 720, mana: 80, attack: 74, magic: 18, defense: 35, speed: 7 }, xp: 780, gold: [220, 360], lootTableId: 'lt_glass_catacomb', tags: ['humanoid', 'dungeon'] },
  { id: 'glass_catacomb_sage', name: 'Мудрец Катакомб', level: 20, stats: { hp: 640, mana: 260, attack: 34, magic: 84, defense: 30, speed: 8 }, xp: 840, gold: [250, 420], lootTableId: 'lt_glass_catacomb', tags: ['magic', 'dungeon'] },
  { id: 'mirror_knight', name: 'Зеркальный рыцарь', level: 20, stats: { hp: 1220, mana: 140, attack: 92, magic: 30, defense: 48, speed: 7 }, xp: 1600, gold: [500, 850], lootTableId: 'lt_glass_catacomb', tags: ['boss', 'dungeon', 'aoe'] },
  { id: 'catacomb_heart', name: 'Сердце Катакомб', level: 20, stats: { hp: 1480, mana: 320, attack: 68, magic: 96, defense: 44, speed: 7 }, xp: 2100, gold: [700, 1100], lootTableId: 'lt_glass_catacomb', tags: ['boss', 'dungeon', 'aoe'] },
);

SPOTS.push(
  { id: 'frostspire_outer_ridge', zoneId: 'frostspire_ridge', name: 'Внешний хребет', levelRange: [16, 18], mobIds: ['frost_lynx', 'blueglass_mender'], timeCostMinutes: 130, risk: 6, tags: ['solo', 'rare-drop'] },
  { id: 'frostspire_contract_camp', zoneId: 'frostspire_ridge', name: 'Лагерь наёмников', levelRange: [18, 20], mobIds: ['spire_sellsword', 'blueglass_mender'], timeCostMinutes: 150, risk: 7, tags: ['elite', 'gear'] },
  { id: 'wyrmspire_approach', zoneId: 'wyrmspire_peak', name: 'Подступ к Вирмшпилю', levelRange: [20, 20], mobIds: ['cloudbreaker_guard', 'spire_sellsword'], timeCostMinutes: 170, risk: 8, tags: ['raid-prep'] },
);

ZONES.push(
  { id: 'frostspire_ridge', name: 'Ледяной Хребет', levelRange: [16, 20], description: 'Lv. 16–20', spotIds: ['frostspire_outer_ridge', 'frostspire_contract_camp'] },
  { id: 'wyrmspire_peak', name: 'Вершина Вирмшпиля', levelRange: [20, 20], description: 'Lv. 20', spotIds: ['wyrmspire_approach'] },
);

DUNGEONS.push({ id: 'glass_catacomb', zoneId: 'wyrmspire_peak', name: 'Стеклянные Катакомбы', levelRange: [20, 20], partySize: 5, timeCostMinutes: 390, contentType: 'dungeon', bossMobId: 'catacomb_heart', lootTableId: 'lt_glass_catacomb', description: 'Lv. 20 · пати 5', floors: [
  { id: 'gc_1', name: 'Синий вход', type: 'mobs', mobIds: ['glass_catacomb_guard', 'glass_catacomb_sage', 'glass_catacomb_guard'], timeCostMinutes: 55 },
  { id: 'gc_2', name: 'Зеркальный зал', type: 'boss', mobIds: ['glass_catacomb_guard', 'mirror_knight'], timeCostMinutes: 82 },
  { id: 'gc_3', name: 'Нижние арки', type: 'mobs', mobIds: ['glass_catacomb_sage', 'glass_catacomb_guard', 'glass_catacomb_sage'], timeCostMinutes: 62 },
  { id: 'gc_4', name: 'Треснувший купол', type: 'boss', mobIds: ['glass_catacomb_sage', 'mirror_knight'], timeCostMinutes: 88 },
  { id: 'gc_5', name: 'Глубокий проход', type: 'mobs', mobIds: ['glass_catacomb_guard', 'glass_catacomb_sage', 'glass_catacomb_guard'], timeCostMinutes: 65 },
  { id: 'gc_6', name: 'Сердце', type: 'boss', mobIds: ['glass_catacomb_guard', 'catacomb_heart'], timeCostMinutes: 110 },
]});

// v0.3.3 loot table cleanup
const stoneDrops = [
  { itemId: 'sharpening_stone', chance: 0.08 },
  { itemId: 'enhance_stone_uncommon', chance: 0.025 },
  { itemId: 'enhance_stone_rare', chance: 0.006 },
  { itemId: 'enhance_stone_epic', chance: 0.0012 },
  { itemId: 'enhance_stone_legendary', chance: 0.00025 },
];
LOOT_TABLES.forEach((table) => {
  table.entries = table.entries.filter((entry) => Boolean(getItemById(entry.itemId)));
  stoneDrops.forEach((drop) => {
    if (!table.entries.some((entry) => entry.itemId === drop.itemId)) table.entries.push(drop);
  });
  table.entries = table.entries.map((entry) => {
    const item = getItemById(entry.itemId);
    if (item?.type === 'card') return { ...entry, chance: Math.min(entry.chance, 0.00003) };
    return entry;
  });
});

const replaceTableEntries = (tableId: string, itemIds: string[], chance: number) => {
  const table = LOOT_TABLES.find((entry) => entry.id === tableId);
  if (!table) return;
  const materialEntries = table.entries.filter((entry) => {
    const item = getItemById(entry.itemId);
    return item && !item.slot;
  });
  table.entries = [
    ...materialEntries,
    ...itemIds.filter((id) => Boolean(getItemById(id))).map((itemId) => ({ itemId, chance })),
  ];
};

replaceTableEntries('lt_frostspire', [
  'set_common_warrior_20_chest', 'set_common_ranger_20_weapon', 'set_uncommon_mage_18_weapon', 'set_rare_priest_20_weapon',
], 0.06);
replaceTableEntries('lt_wyrmspire_raid', [
  'wyrmspire_warrior_weapon', 'wyrmspire_ranger_weapon', 'wyrmspire_mage_weapon', 'wyrmspire_priest_weapon',
  'wyrmspire_head', 'wyrmspire_chest', 'wyrmspire_legs', 'wyrmspire_boots', 'wyrmspire_ring', 'wyrmspire_amulet',
  'wyrmspire_gold_warrior_weapon', 'wyrmspire_gold_ranger_weapon', 'wyrmspire_gold_mage_weapon', 'wyrmspire_gold_priest_weapon',
  'wyrmspire_gold_head', 'wyrmspire_gold_chest', 'wyrmspire_gold_legs', 'wyrmspire_gold_boots', 'wyrmspire_gold_ring', 'wyrmspire_gold_amulet',
], 0.08);



// v0.4.8: sane mob names, full 1-20 spot coverage, and extra high-level targets.
const renameMob = (id: string, name: string) => {
  const mob = MOBS.find((entry) => entry.id === id);
  if (mob) mob.name = name;
};
renameMob('mireglass_caster', 'Колдун Топкого Стекла');
renameMob('skyfall_harrier', 'Гарпунщик Небесного Перевала');
renameMob('mire_depths_beast', 'Болотный зверь');
renameMob('blueglass_mender', 'Чинитель Синего Стекла');

if (!MOBS.some((mob) => mob.id === 'wyrmspire_cultist')) {
  MOBS.push({ id: 'wyrmspire_cultist', name: 'Культист Вирмшпиля', level: 20, stats: { hp: 620, mana: 180, attack: 52, magic: 76, defense: 30, speed: 8 }, xp: 780, gold: [210, 360], lootTableId: 'lt_wyrmspire_raid', tags: ['humanoid', 'magic'] });
}
const wyrmSpot = SPOTS.find((spot) => spot.id === 'wyrmspire_approach');
if (wyrmSpot && !wyrmSpot.mobIds.includes('wyrmspire_cultist')) wyrmSpot.mobIds.push('wyrmspire_cultist');

// Make sure there is at least one non-boss mob for every level from 1 to 20.
for (let level = 1; level <= 20; level += 1) {
  if (MOBS.some((mob) => mob.level === level && !mob.tags.includes('boss'))) continue;
  const id = `wild_level_${level}_mob`;
  if (MOBS.some((mob) => mob.id === id)) continue;
  const table = level <= 4 ? 'lt_greenfield_trash' : level <= 8 ? 'lt_redcap_camp' : level <= 12 ? 'lt_ashen_mire' : level <= 15 ? 'lt_skyfall_pass' : level <= 19 ? 'lt_frostspire' : 'lt_wyrmspire_raid';
  MOBS.push({ id, name: `Дикий враг ${level} уровня`, level, stats: { hp: 42 + level * 36, mana: level >= 8 ? 20 + level * 5 : 0, attack: 6 + level * 4, magic: level >= 8 ? 3 + level * 3 : 0, defense: 2 + level * 2, speed: 4 + Math.floor(level / 3) }, xp: 16 + level * 22, gold: [Math.max(2, level * 8), Math.max(8, level * 16)], lootTableId: table, tags: ['beast'] });
}

// v0.3.9: every mob and boss has its own card.
const slugifyMobId = (id: string) => `card_${id}`;
const cardRarityForMob = (mob: MobDefinition): Rarity => {
  if (mob.tags.includes('raid') && mob.tags.includes('boss')) return 'legendary';
  if (mob.tags.includes('boss') || mob.tags.includes('dungeon') || mob.tags.includes('elite')) return 'epic';
  return 'rare';
};
const cardStatsForMob = (mob: MobDefinition) => {
  const rarity = cardRarityForMob(mob);
  const scale = Math.max(1, Math.round(mob.level / 4)) + Math.max(0, rarityScore[rarity] - 4);
  if ((mob.stats.magic ?? 0) > (mob.stats.attack ?? 0)) {
    return { magic: Math.max(1, scale), mana: Math.max(6, scale * 8) };
  }
  if ((mob.stats.defense ?? 0) > (mob.stats.attack ?? 0) * 0.72 || mob.tags.includes('boss')) {
    return { defense: Math.max(1, Math.round(scale * 0.75)), hp: Math.max(12, scale * 14) };
  }
  return { attack: Math.max(1, scale), speed: mob.stats.speed >= 10 ? 1 : 0 };
};
const cardDropChanceForMob = (mob: MobDefinition) => {
  if (mob.tags.includes('raid') && mob.tags.includes('boss')) return 0.000006;
  if (mob.tags.includes('boss')) return 0.00001;
  if (mob.tags.includes('dungeon') || mob.tags.includes('elite')) return 0.00002;
  return 0.000035;
};

MOBS.forEach((mob) => {
  const cardId = slugifyMobId(mob.id);
  const rarity = cardRarityForMob(mob);
  const stats = cardStatsForMob(mob);
  const statTotal = Object.values(stats).reduce((sum, value) => sum + Math.abs(value ?? 0), 0);
  if (!ITEMS.some((item) => item.id === cardId)) {
    ITEMS.push({
      id: cardId,
      name: `Карта: ${mob.name}`,
      type: 'card',
      rarity,
      levelReq: mob.level,
      classTags: [],
      stats,
      effects: [],
      socketSlots: 0,
      tradeable: true,
      price: Math.max(8000, Math.round(statTotal * mob.level * rarityScore[rarity] * 1450)),
      announceIfDropped: true,
    });
  }
  const table = LOOT_TABLES.find((entry) => entry.id === mob.lootTableId);
  if (table && !table.entries.some((entry) => entry.itemId === cardId)) {
    table.entries.push({ itemId: cardId, chance: cardDropChanceForMob(mob) });
  }
});



// v0.4.8: update existing card names after mob renames.
MOBS.forEach((mob) => {
  const card = ITEMS.find((item) => item.id === `card_${mob.id}`);
  if (card) {
    card.name = `Карта: ${mob.name}`;
    card.levelReq = mob.level;
  }
});

// v0.4.7 spot tuning: spot mobs have twice the current HP after the v0.4.6 reduction.
const v047SpotMobIds = new Set(SPOTS.flatMap((spot) => spot.mobIds));
MOBS.forEach((mob) => {
  if (v047SpotMobIds.has(mob.id) && !mob.tags.includes('dungeon') && !mob.tags.includes('raid') && !mob.tags.includes('boss')) {
    mob.stats.hp = Math.round(mob.stats.hp * 2);
  }
});

// v0.4.9 card pricing: First Wyrm card is 80k, all other cards scale by card gear value.
const cardGearValue = (itemId: string) => {
  const item = getItemById(itemId);
  if (!item) return 1;
  return Math.max(1, Object.values(item.stats).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0) * (rarityScore[item.rarity] ?? 1));
};
const wyrmCardValue = cardGearValue('card_first_wyrm');
const cardGoldPerValue = 80000 / Math.max(1, wyrmCardValue);
ITEMS.forEach((item) => {
  if (item.type === 'card') {
    item.price = Math.max(50, Math.round(cardGearValue(item.id) * cardGoldPerValue));
  }
});
