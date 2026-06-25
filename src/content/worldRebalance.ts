import type { DungeonDefinition, MobDefinition, SpotDefinition, ZoneDefinition } from '../types/game';
import type { WorldContentOutput } from './worldFinalize';

export const REMOVED_ZONE_IDS = new Set(['iron_quarry', 'skyfall_pass']);
export const REMOVED_DUNGEON_IDS = new Set(['thorn_crown_crypt']);
export const REMOVED_MOB_IDS = new Set(['thorn_crown_hound', 'thorn_crown_acolyte']);

const stat = (hp: number, mana: number, attack: number, magic: number, defense: number, speed: number) =>
  ({ hp, mana, attack, magic, defense, speed });

export const REBALANCE_MOBS: MobDefinition[] = [
  { id: 'briar_imp', name: 'Колючий бес', level: 4, stats: stat(82, 25, 13, 8, 4, 8), xp: 52, gold: [8, 18], lootTableId: 'lt_greenfield_trash', tags: ['beast'] },

  { id: 'redcap_torchbearer', name: 'Красноколпак-факельщик', level: 6, stats: stat(105, 35, 17, 8, 6, 7), xp: 74, gold: [15, 34], lootTableId: 'lt_redcap_camp', tags: ['humanoid'] },
  { id: 'redcap_bruiser', name: 'Красноколпак-громила', level: 7, stats: stat(135, 10, 21, 3, 8, 5), xp: 92, gold: [20, 42], lootTableId: 'lt_redcap_camp', tags: ['humanoid', 'tough'] },
  { id: 'redcap_cutthroat', name: 'Красноколпак-резак', level: 8, stats: stat(122, 20, 25, 5, 7, 10), xp: 110, gold: [26, 55], lootTableId: 'lt_redcap_camp', tags: ['humanoid', 'elite'] },

  { id: 'ash_mire_leech', name: 'Пепельная пиявка', level: 9, stats: stat(150, 20, 24, 4, 9, 6), xp: 125, gold: [28, 58], lootTableId: 'lt_ashen_mire', tags: ['beast'] },

  { id: 'moon_stag', name: 'Лунный олень', level: 14, stats: stat(245, 80, 30, 28, 13, 11), xp: 260, gold: [72, 130], lootTableId: 'lt_moonwood_ruins', tags: ['beast', 'magic'] },
  { id: 'lunar_bound_guard', name: 'Страж лунной тропы', level: 15, stats: stat(310, 80, 42, 18, 18, 8), xp: 330, gold: [90, 160], lootTableId: 'lt_moonwood_ruins', tags: ['humanoid', 'elite'] },
  { id: 'moonroot_shaman', name: 'Шаман лунного корня', level: 16, stats: stat(270, 170, 24, 48, 15, 8), xp: 390, gold: [110, 190], lootTableId: 'lt_moonwood_ruins', tags: ['humanoid', 'magic'] },

  { id: 'frost_wraith', name: 'Ледяной призрак', level: 19, stats: stat(420, 180, 38, 64, 24, 10), xp: 620, gold: [170, 280], lootTableId: 'lt_frostspire', tags: ['spirit', 'magic'] },

  { id: 'wyrmspire_glassbound', name: 'Стеклянный связанный', level: 20, stats: stat(760, 120, 70, 34, 34, 8), xp: 850, gold: [230, 390], lootTableId: 'lt_wyrmspire_raid', tags: ['humanoid'] },
  { id: 'wyrmspire_scaleguard', name: 'Чешуйчатый страж Вирмшпиля', level: 20, stats: stat(880, 100, 82, 28, 40, 7), xp: 930, gold: [260, 430], lootTableId: 'lt_wyrmspire_raid', tags: ['humanoid', 'elite'] },
];

const mobOverrides: Record<string, Partial<MobDefinition>> = {
  green_slime: { level: 1 },
  field_rat: { level: 1 },
  mud_boar: { level: 2 },
  gray_wolf: { level: 3 },
  moon_wisp: { level: 13, lootTableId: 'lt_moonwood_ruins' },
  redcap_raider: { level: 5 },
  quarry_brute: { level: 6, lootTableId: 'lt_redcap_camp' },

  ash_mire_crawler: { level: 10 },
  mireglass_caster: { level: 11 },
  ash_guard_veteran: { level: 12 },

  skyfall_harrier: { level: 13, lootTableId: 'lt_moonwood_ruins' },
  stormbound_wisp: { level: 14, lootTableId: 'lt_moonwood_ruins' },
  cloudbreaker_guard: { level: 15, lootTableId: 'lt_moonwood_ruins' },

  frost_lynx: { level: 17 },
  blueglass_mender: { level: 17 },
  spire_sellsword: { level: 18 },

  glass_catacomb_guard: { level: 20 },
  glass_catacomb_sage: { level: 20 },
};

const zoneDefs: ZoneDefinition[] = [
  { id: 'greenfield', name: 'Зелёные Поля', levelRange: [1, 4], description: '', spotIds: ['greenfield_slimes', 'greenfield_old_road', 'greenfield_boar_mud'] },
  { id: 'redcap_hills', name: 'Холмы Красных Колпаков', levelRange: [5, 8], description: '', spotIds: ['redcap_camp_outer', 'redcap_supply_path'] },
  { id: 'ashen_mire', name: 'Пепельная Топь', levelRange: [9, 12], description: '', spotIds: ['ashen_mire_bank', 'ashen_mire_watch'] },
  { id: 'moonwood', name: 'Лунный Лес', levelRange: [13, 16], description: '', spotIds: ['moonwood_wisp_grove', 'moonwood_lunar_path'] },
  { id: 'frostspire_ridge', name: 'Ледяной Хребет', levelRange: [17, 19], description: '', spotIds: ['frostspire_outer_ridge', 'frostspire_contract_camp'] },
  { id: 'wyrmspire_peak', name: 'Вершина Вирмшпиля', levelRange: [20, 20], description: '', spotIds: ['wyrmspire_approach', 'wyrmspire_glass_field'] },
];

const spotDefs: SpotDefinition[] = [
  { id: 'greenfield_slimes', zoneId: 'greenfield', name: 'Лужайка слизней', levelRange: [1, 1], mobIds: ['green_slime', 'field_rat'], timeCostMinutes: 45, risk: 1, tags: ['solo', 'starter'] },
  { id: 'greenfield_old_road', zoneId: 'greenfield', name: 'Старая дорога', levelRange: [2, 3], mobIds: ['mud_boar', 'gray_wolf'], timeCostMinutes: 60, risk: 2, tags: ['solo'] },
  { id: 'greenfield_boar_mud', zoneId: 'greenfield', name: 'Кабанья низина', levelRange: [3, 4], mobIds: ['gray_wolf', 'briar_imp'], timeCostMinutes: 75, risk: 2, tags: ['solo'] },

  { id: 'redcap_camp_outer', zoneId: 'redcap_hills', name: 'Внешний лагерь', levelRange: [5, 6], mobIds: ['redcap_raider', 'redcap_torchbearer'], timeCostMinutes: 115, risk: 5, tags: ['group'] },
  { id: 'redcap_supply_path', zoneId: 'redcap_hills', name: 'Тропа обозников', levelRange: [7, 8], mobIds: ['redcap_bruiser', 'redcap_cutthroat'], timeCostMinutes: 130, risk: 6, tags: ['group'] },

  { id: 'ashen_mire_bank', zoneId: 'ashen_mire', name: 'Берег Пепельной Топи', levelRange: [9, 10], mobIds: ['ash_mire_leech', 'ash_mire_crawler'], timeCostMinutes: 150, risk: 7, tags: ['elite'] },
  { id: 'ashen_mire_watch', zoneId: 'ashen_mire', name: 'Пост пепельной стражи', levelRange: [11, 12], mobIds: ['mireglass_caster', 'ash_guard_veteran'], timeCostMinutes: 170, risk: 8, tags: ['elite'] },

  { id: 'moonwood_wisp_grove', zoneId: 'moonwood', name: 'Роща огоньков', levelRange: [13, 14], mobIds: ['moon_wisp', 'moon_stag'], timeCostMinutes: 150, risk: 7, tags: ['magic'] },
  { id: 'moonwood_lunar_path', zoneId: 'moonwood', name: 'Лунная тропа', levelRange: [15, 16], mobIds: ['lunar_bound_guard', 'moonroot_shaman'], timeCostMinutes: 170, risk: 8, tags: ['magic', 'elite'] },

  { id: 'frostspire_outer_ridge', zoneId: 'frostspire_ridge', name: 'Внешний хребет', levelRange: [17, 17], mobIds: ['frost_lynx', 'blueglass_mender'], timeCostMinutes: 130, risk: 6, tags: ['solo'] },
  { id: 'frostspire_contract_camp', zoneId: 'frostspire_ridge', name: 'Лагерь наёмников', levelRange: [18, 19], mobIds: ['spire_sellsword', 'frost_wraith'], timeCostMinutes: 150, risk: 7, tags: ['elite'] },

  { id: 'wyrmspire_approach', zoneId: 'wyrmspire_peak', name: 'Подступ к Вирмшпилю', levelRange: [20, 20], mobIds: ['wyrmspire_cultist', 'wyrmspire_scaleguard'], timeCostMinutes: 170, risk: 8, tags: ['raid-prep'] },
  { id: 'wyrmspire_glass_field', zoneId: 'wyrmspire_peak', name: 'Стеклянное поле', levelRange: [20, 20], mobIds: ['wyrmspire_glassbound', 'glass_catacomb_sage'], timeCostMinutes: 180, risk: 9, tags: ['elite'] },
];

const dungeonOverrides: Record<string, Partial<DungeonDefinition>> = {
  old_lantern_cellar: {
    zoneId: 'redcap_hills',
    levelRange: [5, 8],
    partySize: 5,
    description: '',
    floors: [
      { id: 'olf_1', name: 'Входной ход', type: 'mobs', mobIds: ['redcap_raider', 'redcap_torchbearer', 'redcap_raider'], timeCostMinutes: 30 },
      { id: 'olf_2', name: 'Караульная', type: 'boss', mobIds: ['redcap_raider', 'old_lantern_warden'], timeCostMinutes: 38 },
      { id: 'olf_3', name: 'Нижний коридор', type: 'mobs', mobIds: ['redcap_torchbearer', 'redcap_bruiser', 'redcap_raider'], timeCostMinutes: 34 },
      { id: 'olf_4', name: 'Псарня', type: 'boss', mobIds: ['redcap_bruiser', 'old_lantern_keeper'], timeCostMinutes: 42 },
      { id: 'olf_5', name: 'Тёмный склад', type: 'mobs', mobIds: ['redcap_bruiser', 'redcap_cutthroat', 'redcap_torchbearer'], timeCostMinutes: 36 },
      { id: 'olf_6', name: 'Фонарь', type: 'boss', mobIds: ['redcap_cutthroat', 'old_lantern_keeper'], timeCostMinutes: 52 },
    ],
  },
  blackroot_watch: {
    zoneId: 'ashen_mire',
    name: 'Дозор Чёрного Короля',
    levelRange: [9, 12],
    partySize: 5,
    description: '',
    floors: [
      { id: 'brw_1', name: 'Внешний пост', type: 'mobs', mobIds: ['ash_mire_leech', 'ash_mire_crawler', 'mireglass_caster'], timeCostMinutes: 45 },
      { id: 'brw_2', name: 'Караул', type: 'boss', mobIds: ['ash_mire_crawler', 'blackroot_sentinel'], timeCostMinutes: 55 },
      { id: 'brw_3', name: 'Башенный проход', type: 'mobs', mobIds: ['ash_mire_crawler', 'mireglass_caster', 'ash_guard_veteran'], timeCostMinutes: 48 },
      { id: 'brw_4', name: 'Командный пост', type: 'boss', mobIds: ['mireglass_caster', 'blackroot_sentinel'], timeCostMinutes: 62 },
      { id: 'brw_5', name: 'Внутренний двор', type: 'mobs', mobIds: ['ash_guard_veteran', 'ash_mire_leech', 'mireglass_caster'], timeCostMinutes: 50 },
      { id: 'brw_6', name: 'Зал короля', type: 'boss', mobIds: ['ash_guard_veteran', 'blackroot_knight'], timeCostMinutes: 78 },
    ],
  },
  mire_depths: {
    zoneId: 'moonwood',
    levelRange: [13, 16],
    partySize: 5,
    description: '',
  },
  frost_vault: {
    zoneId: 'frostspire_ridge',
    levelRange: [17, 19],
    partySize: 5,
    description: '',
  },
  glass_catacomb: {
    zoneId: 'wyrmspire_peak',
    levelRange: [20, 20],
    partySize: 5,
    description: '',
  },
};

const cleanMobs = (mobs: MobDefinition[]): MobDefinition[] => {
  const map = new Map(mobs.map((mob) => [mob.id, { ...mob }]));
  REBALANCE_MOBS.forEach((mob) => map.set(mob.id, { ...mob }));
  REMOVED_MOB_IDS.forEach((id) => map.delete(id));
  return [...map.values()].map((mob) => {
    const override = mobOverrides[mob.id];
    if (!override) return mob;
    return { ...mob, ...override, stats: override.stats ?? mob.stats, tags: mob.tags.filter((tag) => tag !== 'mini-boss') };
  });
};

const applyDungeonOverrides = (dungeon: DungeonDefinition): DungeonDefinition => {
  const override = dungeonOverrides[dungeon.id];
  if (!override) return { ...dungeon, description: '' };
  return {
    ...dungeon,
    ...override,
    floors: override.floors ?? dungeon.floors,
    description: '',
  };
};

export const rebalanceWorldContent = (world: WorldContentOutput): WorldContentOutput => {
  const zones = zoneDefs;
  const spots = spotDefs;
  const mobs = cleanMobs(world.mobs)
    .filter((mob) => !REMOVED_MOB_IDS.has(mob.id))
    .sort((a, b) => a.level - b.level || a.id.localeCompare(b.id));

  const dungeons = world.dungeons
    .filter((dungeon) => !REMOVED_DUNGEON_IDS.has(dungeon.id))
    .filter((dungeon) => dungeon.id !== 'thorn_crown_crypt')
    .map(applyDungeonOverrides)
    .filter((dungeon) => ['old_lantern_cellar', 'blackroot_watch', 'mire_depths', 'frost_vault', 'glass_catacomb'].includes(dungeon.id))
    .sort((a, b) => a.levelRange[0] - b.levelRange[0] || a.id.localeCompare(b.id));

  const raids = world.raids.map((raid) => ({
    ...raid,
    zoneId: raid.id === 'wyrmspire_first_raid' ? 'wyrmspire_peak' : raid.zoneId,
    description: '',
  }));

  return {
    ...world,
    mobs,
    spots,
    zones,
    dungeons,
    raids,
  };
};
