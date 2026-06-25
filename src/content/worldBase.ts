import type { DungeonDefinition, LootTable, MobDefinition, SpotDefinition, ZoneDefinition } from '../types/game';

export const CITY_ID = 'starting_city';
export const CITY_NAME = 'Стартовый город';

export const BASE_LOOT_TABLES: LootTable[] = [
  { id: 'lt_greenfield_trash', entries: [
    { itemId: 'minor_potion', chance: 0.12 }, { itemId: 'mana_potion', chance: 0.07 },
    { itemId: 'linen_armor', chance: 0.05 }, { itemId: 'cloth_cap', chance: 0.04 },
    { itemId: 'patched_leggings', chance: 0.04 }, { itemId: 'sharpening_stone', chance: 0.07 },
    { itemId: 'card_green_slime', chance: 0.000035 }
  ]},
  { id: 'lt_boar_fields', entries: [
    { itemId: 'worn_boots', chance: 0.07 }, { itemId: 'field_helmet', chance: 0.04 },
    { itemId: 'boar_tusk_amulet', chance: 0.018 }, { itemId: 'minor_potion', chance: 0.1 }
  ]},
  { id: 'lt_wolf_den', entries: [
    { itemId: 'wolf_hide_vest', chance: 0.08 }, { itemId: 'hunter_boots', chance: 0.06 },
    { itemId: 'forest_ring', chance: 0.025 }, { itemId: 'card_gray_wolf', chance: 0.000035 },
    { itemId: 'crystal_mount_whistle', chance: 0.0005 }
  ]},
  { id: 'lt_moonwood_ruins', entries: [
    { itemId: 'moonleaf_cowl', chance: 0.04 }, { itemId: 'moonleaf_robe', chance: 0.032 },
    { itemId: 'silverstring_bow', chance: 0.012 }, { itemId: 'card_moon_wisp', chance: 0.000035 },
    { itemId: 'mana_potion', chance: 0.12 }
  ]},
  { id: 'lt_redcap_camp', entries: [
    { itemId: 'redcap_blade', chance: 0.025 }, { itemId: 'silverstring_bow', chance: 0.02 },
    { itemId: 'ember_staff', chance: 0.02 }, { itemId: 'redcap_coat', chance: 0.018 },
    { itemId: 'card_redcap_raider', chance: 0.00002 }, { itemId: 'sharpening_stone', chance: 0.16 }
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

export const BASE_MOBS: MobDefinition[] = [
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
  { id: 'mireglass_caster', name: 'Колдун Топкого Стекла', level: 11, stats: { hp: 165, mana: 95, attack: 16, magic: 26, defense: 9, speed: 7 }, xp: 175, gold: [42, 74], lootTableId: 'lt_ashen_mire', tags: ['magic', 'humanoid'] },
  { id: 'ash_guard_veteran', name: 'Ветеран пепельной стражи', level: 12, stats: { hp: 240, mana: 30, attack: 32, magic: 8, defense: 14, speed: 6 }, xp: 210, gold: [55, 92], lootTableId: 'lt_ashen_mire', tags: ['humanoid', 'elite'] },
  { id: 'skyfall_harrier', name: 'Гарпунщик Небесного Перевала', level: 13, stats: { hp: 230, mana: 40, attack: 36, magic: 8, defense: 13, speed: 10 }, xp: 255, gold: [66, 110], lootTableId: 'lt_skyfall_pass', tags: ['humanoid'] },
  { id: 'stormbound_wisp', name: 'Грозовой огонёк', level: 14, stats: { hp: 210, mana: 130, attack: 16, magic: 36, defense: 11, speed: 11 }, xp: 290, gold: [78, 128], lootTableId: 'lt_skyfall_pass', tags: ['spirit', 'magic'] },
  { id: 'cloudbreaker_guard', name: 'Страж Расколотого Облака', level: 15, stats: { hp: 330, mana: 65, attack: 42, magic: 15, defense: 18, speed: 7 }, xp: 360, gold: [95, 160], lootTableId: 'lt_skyfall_pass', tags: ['humanoid', 'elite'] },

  { id: 'wyrmspire_gatekeeper', name: 'Привратник Вирмшпиля', level: 20, stats: { hp: 980, mana: 180, attack: 66, magic: 30, defense: 34, speed: 8 }, xp: 650, gold: [180, 280], lootTableId: 'lt_wyrmspire_raid', tags: ['boss', 'raid', 'aoe'] },
  { id: 'wyrmspire_oracle', name: 'Оракул Вирмшпиля', level: 20, stats: { hp: 1060, mana: 260, attack: 42, magic: 72, defense: 32, speed: 9 }, xp: 840, gold: [240, 360], lootTableId: 'lt_wyrmspire_raid', tags: ['boss', 'raid', 'aoe'] },
  { id: 'first_wyrm', name: 'Первый Вирм', level: 20, stats: { hp: 1420, mana: 320, attack: 82, magic: 74, defense: 42, speed: 8 }, xp: 1250, gold: [420, 680], lootTableId: 'lt_wyrmspire_raid', tags: ['boss', 'raid', 'aoe'] }
];

export const BASE_SPOTS: SpotDefinition[] = [
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

export const BASE_ZONES: ZoneDefinition[] = [
  { id: 'greenfield', name: 'Зелёные Поля', levelRange: [1, 4], description: 'Lv. 1–4. Споты, расходники, первый шмот.', spotIds: ['greenfield_slimes', 'greenfield_old_road', 'greenfield_boar_mud'] },
  { id: 'moonwood', name: 'Лунный Лес', levelRange: [3, 6], description: 'Lv. 3–6. Волки, огоньки, карты.', spotIds: ['wolf_den_edge', 'moonwood_wisp_grove'] },
  { id: 'redcap_hills', name: 'Холмы Красных Колпаков', levelRange: [5, 8], description: 'Lv. 5–8. Элитные споты и первые данжи.', spotIds: ['redcap_camp_outer', 'redcap_supply_path'] },
  { id: 'iron_quarry', name: 'Железный Карьер', levelRange: [6, 10], description: 'Lv. 6–10. Камни усиления, тяжёлые враги.', spotIds: ['iron_quarry_yard', 'iron_quarry_tunnels'] },
  { id: 'ashen_mire', name: 'Пепельная Топь', levelRange: [10, 13], description: 'Lv. 10–13. Переход к рейдовому уровню.', spotIds: ['ashen_mire_bank', 'ashen_mire_watch'] },
  { id: 'skyfall_pass', name: 'Перевал Небопада', levelRange: [12, 15], description: 'Lv. 12–15. Высокий риск, сильный шмот.', spotIds: ['skyfall_lower_pass', 'skyfall_cloud_gate'] }
];

export const BASE_DUNGEONS: DungeonDefinition[] = [
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

export const BASE_RAIDS: DungeonDefinition[] = [
  { id: 'wyrmspire_first_raid', zoneId: 'wyrmspire_peak', name: 'Вирмшпиль: первый подъём', levelRange: [20, 20], partySize: 6, timeCostMinutes: 420, contentType: 'raid', bossMobId: 'first_wyrm', lootTableId: 'lt_wyrmspire_raid', description: 'Lv. 20 · рейд 6', floors: [
    { id: 'wsp_1', name: 'Врата', type: 'mobs', mobIds: ['ash_guard_veteran', 'skyfall_harrier', 'stormbound_wisp'], timeCostMinutes: 55 },
    { id: 'wsp_2', name: 'Привратник', type: 'boss', mobIds: ['cloudbreaker_guard', 'wyrmspire_gatekeeper'], timeCostMinutes: 70 },
    { id: 'wsp_3', name: 'Подъём', type: 'mobs', mobIds: ['skyfall_harrier', 'stormbound_wisp', 'cloudbreaker_guard'], timeCostMinutes: 60 },
    { id: 'wsp_4', name: 'Оракул', type: 'boss', mobIds: ['stormbound_wisp', 'wyrmspire_oracle'], timeCostMinutes: 82 },
    { id: 'wsp_5', name: 'Верхний мост', type: 'mobs', mobIds: ['cloudbreaker_guard', 'stormbound_wisp', 'cloudbreaker_guard'], timeCostMinutes: 66 },
    { id: 'wsp_6', name: 'Гнездо', type: 'boss', mobIds: ['cloudbreaker_guard', 'first_wyrm'], timeCostMinutes: 105 }
  ]}
];
