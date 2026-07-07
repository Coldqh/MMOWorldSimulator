import { ITEMS } from '../content/items';
import { RARE_ELITE_PREFIXES, WORLD_BOSS_PREFIXES } from '../content/rareSpawns';
import { getMobById, getSpotById, getZoneById, SPOTS, ZONES } from '../content/world';
import { addNews } from '../engine/news';
import type { Rng } from '../engine/rng';
import { uid } from '../engine/rng';
import type { CombatState, Combatant, InventoryStack, ItemDefinition, RareSpawnKind, RareSpawnState, ServerState } from '../types/game';
import { addInventoryItem, getGearScore } from './itemSystem';
import { addPlayerXp, xpRewardForMob } from './progressionSystem';
import { createPlayerCombatant } from './combatSystem';
import { hydrateActiveWorldBossRaids, initializeWorldBossRaid } from './worldBossRaidSystem';

type WorldBossBand = 'low' | 'mid' | 'high' | 'max';

const BAND_ORDER: WorldBossBand[] = ['low', 'mid', 'high', 'max'];
const MAX_RARE_ELITES_PER_BAND: Record<WorldBossBand, number> = { low: 2, mid: 2, high: 2, max: 2 };
const MAX_WORLD_BOSSES_PER_BAND: Record<WorldBossBand, number> = { low: 1, mid: 1, high: 1, max: 1 };
export const RARE_ELITE_TARGET_LIST = BAND_ORDER.flatMap((band) => Array.from({ length: MAX_RARE_ELITES_PER_BAND[band] }, (_, slotIndex) => ({ band, slotIndex })));
export const WORLD_BOSS_TARGET_LIST = BAND_ORDER.flatMap((band) => Array.from({ length: MAX_WORLD_BOSSES_PER_BAND[band] }, (_, slotIndex) => ({ band, slotIndex })));

const toAbsoluteMinute = (day: number, minute: number) => (Math.max(1, day) - 1) * 1440 + Math.max(0, minute);
const serverNow = (server: Pick<ServerState, 'serverDay' | 'currentMinute'>) => toAbsoluteMinute(server.serverDay, server.currentMinute);

const addMinutes = (server: Pick<ServerState, 'serverDay' | 'currentMinute'>, minutes: number) => {
  const total = serverNow(server) + Math.max(0, minutes);
  return {
    day: Math.floor(total / 1440) + 1,
    minute: total % 1440,
  };
};

export const minutesUntilRareSpawnExpires = (server: Pick<ServerState, 'serverDay' | 'currentMinute'>, spawn: RareSpawnState) =>
  Math.max(0, toAbsoluteMinute(spawn.expiresDay, spawn.expiresMinute) - serverNow(server));

export const formatRareSpawnTimeLeft = (server: Pick<ServerState, 'serverDay' | 'currentMinute'>, spawn: RareSpawnState) => {
  const minutes = minutesUntilRareSpawnExpires(server, spawn);
  if (minutes >= 1440) return `${Math.floor(minutes / 1440)} д ${Math.floor((minutes % 1440) / 60)} ч`;
  if (minutes >= 120) return `${Math.floor(minutes / 60)} ч ${minutes % 60} мин`;
  if (minutes >= 60) return `1 ч ${minutes - 60} мин`;
  return `${minutes} мин`;
};

export const rareSpawnKindLabel = (kind: RareSpawnKind) => kind === 'world_boss' ? 'мировой босс' : 'редкая элита';

export const getRareSpawnRecommendedGear = (spawn: RareSpawnState) => {
  const base = spawn.kind === 'world_boss' ? 190 : 95;
  return Math.max(100, Math.round(spawn.level * base));
};

const bandForLevel = (level: number): WorldBossBand => {
  if (level >= 60) return 'max';
  if (level >= 41) return 'high';
  if (level >= 21) return 'mid';
  return 'low';
};

const bandForSpot = (spot: { levelRange: readonly [number, number] }): WorldBossBand => {
  const averageLevel = Math.round((spot.levelRange[0] + spot.levelRange[1]) / 2);
  return bandForLevel(averageLevel);
};

export const getRareSpawnBand = (spawn: RareSpawnState): WorldBossBand => bandForLevel(spawn.level);

const spawnLimitRank = (spawn: RareSpawnState) => spawn.kind === 'world_boss' ? 0 : 1;

export const sortRareSpawnsForPlayer = (spawns: RareSpawnState[] = [], playerLevel = 1) =>
  [...spawns].sort((a, b) => {
    const aOver = a.level > playerLevel ? 1 : 0;
    const bOver = b.level > playerLevel ? 1 : 0;
    if (aOver !== bOver) return aOver - bOver;

    const aDistance = aOver ? a.level - playerLevel : playerLevel - a.level;
    const bDistance = bOver ? b.level - playerLevel : playerLevel - b.level;
    if (aDistance !== bDistance) return aDistance - bDistance;

    if (a.kind !== b.kind) return spawnLimitRank(a) - spawnLimitRank(b);
    return a.name.localeCompare(b.name);
  });

export const normalizeRareSpawns = (server: ServerState): RareSpawnState[] => {
  const now = serverNow(server);
  const valid = (server.activeRareSpawns ?? [])
    .filter((spawn) => !spawn.defeated)
    .filter((spawn) => spawn.kind === 'rare_elite' || spawn.kind === 'world_boss')
    .filter((spawn) => Boolean(getMobById(spawn.mobId)))
    .filter((spawn) => Boolean(getZoneById(spawn.zoneId)))
    .filter((spawn) => !spawn.spotId || Boolean(getSpotById(spawn.spotId)))
    .filter((spawn) => toAbsoluteMinute(spawn.expiresDay, spawn.expiresMinute) > now)
    .sort((a, b) => spawnLimitRank(a) - spawnLimitRank(b) || BAND_ORDER.indexOf(getRareSpawnBand(a)) - BAND_ORDER.indexOf(getRareSpawnBand(b)) || toAbsoluteMinute(a.expiresDay, a.expiresMinute) - toAbsoluteMinute(b.expiresDay, b.expiresMinute));

  const bossCounts: Record<WorldBossBand, number> = { low: 0, mid: 0, high: 0, max: 0 };
  const eliteCounts: Record<WorldBossBand, number> = { low: 0, mid: 0, high: 0, max: 0 };
  const result: RareSpawnState[] = [];

  valid.forEach((spawn) => {
    const band = getRareSpawnBand(spawn);
    if (spawn.kind === 'world_boss') {
      if (bossCounts[band] >= MAX_WORLD_BOSSES_PER_BAND[band]) return;
      bossCounts[band] += 1;
      result.push(spawn);
      return;
    }

    if (eliteCounts[band] >= MAX_RARE_ELITES_PER_BAND[band]) return;
    eliteCounts[band] += 1;
    result.push(spawn);
  });

  return result;
};

const spotsForBand = (band: WorldBossBand) => {
  const filtered = SPOTS
    .filter((spot) => bandForSpot(spot) === band)
    .filter((spot) => spot.mobIds.some((mobId) => Boolean(getMobById(mobId))));
  return filtered.length > 0 ? filtered : SPOTS.filter((spot) => spot.mobIds.some((mobId) => Boolean(getMobById(mobId))));
};

const pickMobForSpawn = (spot: { mobIds: string[] }, rng: Rng, kind: RareSpawnKind) => {
  const mobs = spot.mobIds
    .map((mobId) => getMobById(mobId))
    .filter((mob): mob is NonNullable<ReturnType<typeof getMobById>> => Boolean(mob));
  if (mobs.length === 0) return undefined;

  if (kind === 'world_boss') {
    const bossLike = mobs.filter((mob) => mob.tags.includes('boss') || mob.tags.includes('mini-boss'));
    return bossLike.length > 0 ? rng.pick(bossLike) : mobs.sort((a, b) => b.level - a.level)[0];
  }

  return rng.pick(mobs);
};

const createRareEliteSpawnForBand = (server: ServerState, rng: Rng, band: WorldBossBand, slotIndex = 0): RareSpawnState | undefined => {
  const spots = spotsForBand(band);
  if (spots.length === 0) return undefined;

  const spot = rng.pick(spots);
  const mob = pickMobForSpawn(spot, rng, 'rare_elite');
  if (!mob) return undefined;

  const expires = addMinutes(server, rng.int(75, 180));
  const prefix = rng.pick(RARE_ELITE_PREFIXES);

  return {
    id: uid(`rare_elite_${band}_${slotIndex}`, rng),
    kind: 'rare_elite',
    mobId: mob.id,
    name: `${prefix} ${mob.name}`,
    zoneId: spot.zoneId,
    spotId: spot.id,
    level: mob.level,
    spawnedDay: server.serverDay,
    spawnedMinute: server.currentMinute,
    expiresDay: expires.day,
    expiresMinute: expires.minute,
  };
};

const createWorldBossSpawnForBand = (server: ServerState, rng: Rng, band: WorldBossBand, slotIndex = 0): RareSpawnState | undefined => {
  const spots = spotsForBand(band);
  if (spots.length === 0) return undefined;

  const spot = rng.pick(spots);
  const mob = pickMobForSpawn(spot, rng, 'world_boss');
  if (!mob) return undefined;

  const expires = addMinutes(server, rng.int(360, 720));
  const prefix = rng.pick(WORLD_BOSS_PREFIXES);

  return {
    id: uid(`world_boss_${band}_${slotIndex}`, rng),
    kind: 'world_boss',
    mobId: mob.id,
    name: `${prefix} ${mob.name}`,
    zoneId: spot.zoneId,
    spotId: spot.id,
    level: mob.level,
    spawnedDay: server.serverDay,
    spawnedMinute: server.currentMinute,
    expiresDay: expires.day,
    expiresMinute: expires.minute,
  };
};

const countByBand = (active: RareSpawnState[], kind: RareSpawnKind): Record<WorldBossBand, number> => {
  const counts: Record<WorldBossBand, number> = { low: 0, mid: 0, high: 0, max: 0 };
  active.filter((spawn) => spawn.kind === kind).forEach((spawn) => {
    counts[getRareSpawnBand(spawn)] += 1;
  });
  return counts;
};

export const tickRareSpawns = (server: ServerState, rng: Rng, minutes = 0): ServerState => {
  let active = normalizeRareSpawns(server);
  let next: ServerState = hydrateActiveWorldBossRaids({
    ...server,
    activeRareSpawns: active,
    rareSpawnHistory: server.rareSpawnHistory ?? [],
    lastWorldBossSpawnDay: server.lastWorldBossSpawnDay,
  }, rng);
  active = next.activeRareSpawns ?? [];

  const bossCounts = countByBand(active, 'world_boss');
  const spawnedBosses: RareSpawnState[] = [];
  WORLD_BOSS_TARGET_LIST.forEach(({ band, slotIndex }) => {
    if (bossCounts[band] >= MAX_WORLD_BOSSES_PER_BAND[band]) return;
    const chance = minutes >= 60 ? 0.42 : 0.08;
    if (!rng.chance(chance)) return;
    const spawn = createWorldBossSpawnForBand(next, rng, band, slotIndex);
    if (!spawn) return;
    const initialized = initializeWorldBossRaid(next, spawn, rng);
    next = initialized.server;
    const raidSpawn = initialized.spawn;
    bossCounts[band] += 1;
    spawnedBosses.push(raidSpawn);
    active = [...active, raidSpawn];
  });

  if (spawnedBosses.length > 0) {
    next = { ...next, activeRareSpawns: normalizeRareSpawns({ ...next, activeRareSpawns: active }), lastWorldBossSpawnDay: next.serverDay };
    const names = spawnedBosses.map((spawn) => spawn.name).join(', ');
    next = addNews(next, rng, 'raid', `Мировые боссы появились: ${names}.`, true);
    active = next.activeRareSpawns ?? [];
  }

  const eliteCounts = countByBand(active, 'rare_elite');
  const spawnedElites: RareSpawnState[] = [];
  RARE_ELITE_TARGET_LIST.forEach(({ band, slotIndex }) => {
    if (eliteCounts[band] >= MAX_RARE_ELITES_PER_BAND[band]) return;
    const chance = minutes >= 60 ? 0.64 : 0.14;
    if (!rng.chance(chance)) return;
    const spawn = createRareEliteSpawnForBand(next, rng, band, slotIndex);
    if (!spawn) return;
    eliteCounts[band] += 1;
    spawnedElites.push(spawn);
    active = [...active, spawn];
  });

  if (spawnedElites.length > 0) {
    next = { ...next, activeRareSpawns: normalizeRareSpawns({ ...next, activeRareSpawns: active }) };
    next = addNews(next, rng, 'system', `Редкие элиты активны: +${spawnedElites.length}.`, spawnedElites.length >= 2);
  }

  return next;
};

const rareEnemyFromMob = (spawn: RareSpawnState): Combatant | undefined => {
  const mob = getMobById(spawn.mobId);
  if (!mob) return undefined;

  const hpScale = spawn.kind === 'world_boss' ? 7 : 2.5;
  const offenseScale = spawn.kind === 'world_boss' ? 2.15 : 1.35;
  const defenseScale = spawn.kind === 'world_boss' ? 1.45 : 1.15;

  return {
    id: spawn.id,
    name: spawn.name,
    level: spawn.level,
    maxHp: Math.max(1, Math.round(mob.stats.hp * hpScale)),
    hp: Math.max(1, Math.round(mob.stats.hp * hpScale)),
    maxMana: mob.stats.mana,
    mana: mob.stats.mana,
    attack: Math.max(1, Math.round(mob.stats.attack * offenseScale)),
    magic: Math.max(0, Math.round(mob.stats.magic * offenseScale)),
    defense: Math.max(0, Math.round(mob.stats.defense * defenseScale)),
    speed: spawn.kind === 'world_boss' ? mob.stats.speed + 1 : mob.stats.speed,
    shield: 0,
    cooldowns: {},
    defending: false,
  };
};

const isPlayerNearSpawn = (server: ServerState, spawn: RareSpawnState) => {
  if (server.location.mode === 'city') return false;
  if (server.location.mode === 'spot') return server.location.spotId === spawn.spotId || server.location.zoneId === spawn.zoneId;
  return server.location.zoneId === spawn.zoneId;
};

export const startRareSpawnCombat = (server: ServerState, spawnId: string, rng: Rng): CombatState | null => {
  const spawn = normalizeRareSpawns(server).find((entry) => entry.id === spawnId);
  if (!spawn || spawn.kind === 'world_boss' || !isPlayerNearSpawn(server, spawn)) return null;

  const enemy = rareEnemyFromMob(spawn);
  if (!enemy) return null;

  return {
    id: uid('rare_spawn_combat', rng),
    source: 'rare_spawn',
    sourceId: spawn.id,
    enemyMobId: spawn.mobId,
    enemyMobIds: [spawn.mobId],
    player: createPlayerCombatant(server),
    enemy,
    partyNpcIds: [],
    turn: 1,
    log: [`${rareSpawnKindLabel(spawn.kind)}: ${spawn.name}.`],
    status: 'active',
  };
};

const addRewardItem = (items: InventoryStack[], itemId: string, amount = 1, enhancement = 0): InventoryStack[] => {
  const existing = items.find((entry) => entry.itemId === itemId && (entry.enhancement ?? 0) === enhancement);
  if (existing) return items.map((entry) => entry.itemId === itemId && (entry.enhancement ?? 0) === enhancement ? { ...entry, amount: entry.amount + amount } : entry);
  return [...items, { itemId, amount, enhancement }];
};

const rareItemPool = (server: ServerState, spawn: RareSpawnState): ItemDefinition[] => {
  const minLevel = Math.max(1, spawn.level - (spawn.kind === 'world_boss' ? 10 : 6));
  const maxLevel = Math.max(server.player.level + 2, spawn.level + (spawn.kind === 'world_boss' ? 6 : 3));
  const allowedRarities = spawn.kind === 'world_boss'
    ? new Set(['rare', 'epic', 'legendary', 'mythic', 'unique'])
    : new Set(['uncommon', 'rare', 'epic']);

  return ITEMS
    .filter((item) => item.type !== 'quest')
    .filter((item) => item.tradeable || item.bindType === 'bindOnPickup')
    .filter((item) => item.levelReq >= minLevel && item.levelReq <= maxLevel)
    .filter((item) => allowedRarities.has(item.rarity))
    .sort((a, b) => b.levelReq - a.levelReq || a.name.localeCompare(b.name));
};

const pickRareReward = (server: ServerState, spawn: RareSpawnState, rng: Rng) => {
  const pool = rareItemPool(server, spawn).slice(0, spawn.kind === 'world_boss' ? 36 : 24);
  if (pool.length === 0) return undefined;
  const item = rng.pick(pool);
  const enhancement = item.slot
    ? spawn.kind === 'world_boss'
      ? rng.int(1, 3)
      : rng.chance(0.2) ? 1 : 0
    : 0;
  return { item, enhancement };
};

export const finishRareSpawnVictory = (server: ServerState, combat: CombatState, rng: Rng): { server: ServerState; combat: CombatState } => {
  if (combat.source !== 'rare_spawn') return { server, combat };

  const spawn = (server.activeRareSpawns ?? []).find((entry) => entry.id === combat.sourceId);
  const mob = spawn ? getMobById(spawn.mobId) : undefined;
  if (!spawn || !mob) return { server, combat };

  const xpMultiplier = spawn.kind === 'world_boss' ? 4 : 1;
  const goldMultiplier = spawn.kind === 'world_boss' ? 3 : 1;
  const bonusXp = xpRewardForMob(mob, server.player.level) * xpMultiplier;
  const bonusGold = Array.from({ length: goldMultiplier }).reduce<number>((sum) => sum + rng.int(mob.gold[0], mob.gold[1]), 0);
  const beforeLevel = server.player.level;
  let player = addPlayerXp(server.player, bonusXp);
  const leveledUp = player.level > beforeLevel;
  player = { ...player, gold: player.gold + bonusGold };

  let rewardItems = combat.reward?.items ?? [];
  const rewardLines = [
    ...(combat.reward?.lines ?? []),
    `${rareSpawnKindLabel(spawn.kind)}: +${bonusXp} XP${leveledUp ? ` · Lv. ${player.level}` : ''}.`,
    `${rareSpawnKindLabel(spawn.kind)}: +${bonusGold} Gold.`,
  ];

  const dropChance = spawn.kind === 'world_boss' ? 0.75 : 0.35;
  const picked = rng.chance(dropChance) ? pickRareReward(server, spawn, rng) : undefined;
  if (picked) {
    player = { ...player, inventory: addInventoryItem(player.inventory, picked.item.id, 1, picked.enhancement) };
    rewardItems = addRewardItem(rewardItems, picked.item.id, 1, picked.enhancement);
    rewardLines.push(`${spawn.kind === 'world_boss' ? 'Босс-трофей' : 'Редкий трофей'}: ${picked.item.name}${picked.enhancement > 0 ? ` +${picked.enhancement}` : ''}.`);
  }

  const playerGear = getGearScore(player.equipment);
  if (spawn.kind === 'world_boss') rewardLines.push(`Gear после боя: ${playerGear}.`);

  let nextServer: ServerState = {
    ...server,
    player,
    activeRareSpawns: (server.activeRareSpawns ?? []).filter((entry) => entry.id !== spawn.id),
    rareSpawnHistory: Array.from(new Set([...(server.rareSpawnHistory ?? []), spawn.id])).slice(-80),
  };

  nextServer = addNews(
    nextServer,
    rng,
    spawn.kind === 'world_boss' ? 'raid' : 'system',
    spawn.kind === 'world_boss'
      ? `${server.player.name} убил мирового босса: ${spawn.name}.`
      : `${server.player.name} убил редкую цель: ${spawn.name}.`,
    true,
  );

  const reward = {
    xp: (combat.reward?.xp ?? 0) + bonusXp,
    gold: (combat.reward?.gold ?? 0) + bonusGold,
    items: rewardItems,
    lines: rewardLines,
  };

  return {
    server: nextServer,
    combat: {
      ...combat,
      reward,
      log: [...combat.log, `${rareSpawnKindLabel(spawn.kind)} убит: ${spawn.name}.`].slice(-80),
    },
  };
};
