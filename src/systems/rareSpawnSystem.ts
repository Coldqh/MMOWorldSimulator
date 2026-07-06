import { ITEMS } from '../content/items';
import { RARE_ELITE_PREFIXES } from '../content/rareSpawns';
import { getMobById, getSpotById, getZoneById, SPOTS, ZONES } from '../content/world';
import { addNews } from '../engine/news';
import type { Rng } from '../engine/rng';
import { uid } from '../engine/rng';
import type { CombatState, Combatant, InventoryStack, ItemDefinition, RareSpawnState, ServerState } from '../types/game';
import { addInventoryItem } from './itemSystem';
import { addPlayerXp, xpRewardForMob } from './progressionSystem';
import { createPlayerCombatant } from './combatSystem';

const MAX_RARE_ELITES = 3;

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
  if (minutes >= 120) return `${Math.floor(minutes / 60)} ч ${minutes % 60} мин`;
  if (minutes >= 60) return `1 ч ${minutes - 60} мин`;
  return `${minutes} мин`;
};

export const normalizeRareSpawns = (server: ServerState): RareSpawnState[] => {
  const now = serverNow(server);
  return (server.activeRareSpawns ?? [])
    .filter((spawn) => !spawn.defeated)
    .filter((spawn) => Boolean(getMobById(spawn.mobId)))
    .filter((spawn) => Boolean(getZoneById(spawn.zoneId)))
    .filter((spawn) => !spawn.spotId || Boolean(getSpotById(spawn.spotId)))
    .filter((spawn) => toAbsoluteMinute(spawn.expiresDay, spawn.expiresMinute) > now)
    .slice(0, MAX_RARE_ELITES);
};

const candidateSpots = (server: ServerState) => {
  const playerLevel = server.player.level;
  const availableZoneIds = new Set(
    ZONES
      .filter((zone) => playerLevel >= zone.levelRange[0] - 2)
      .filter((zone) => zone.levelRange[0] <= playerLevel + 8)
      .map((zone) => zone.id),
  );

  const close = SPOTS
    .filter((spot) => availableZoneIds.has(spot.zoneId))
    .filter((spot) => spot.mobIds.some((mobId) => Boolean(getMobById(mobId))))
    .filter((spot) => spot.levelRange[0] <= playerLevel + 8 && spot.levelRange[1] >= playerLevel - 8);

  if (close.length > 0) return close;

  const available = SPOTS
    .filter((spot) => availableZoneIds.has(spot.zoneId))
    .filter((spot) => spot.mobIds.some((mobId) => Boolean(getMobById(mobId))));

  return available.length > 0 ? available : SPOTS.filter((spot) => spot.mobIds.some((mobId) => Boolean(getMobById(mobId))));
};

const createRareSpawn = (server: ServerState, rng: Rng): RareSpawnState | undefined => {
  const spots = candidateSpots(server);
  if (spots.length === 0) return undefined;

  const spot = rng.pick(spots);
  const mobs = spot.mobIds
    .map((mobId) => getMobById(mobId))
    .filter((mob): mob is NonNullable<ReturnType<typeof getMobById>> => Boolean(mob));
  if (mobs.length === 0) return undefined;

  const mob = rng.pick(mobs);
  const expires = addMinutes(server, rng.int(75, 180));
  const prefix = rng.pick(RARE_ELITE_PREFIXES);
  const name = `${prefix} ${mob.name}`;

  return {
    id: uid('rare_elite', rng),
    kind: 'rare_elite',
    mobId: mob.id,
    name,
    zoneId: spot.zoneId,
    spotId: spot.id,
    level: mob.level,
    spawnedDay: server.serverDay,
    spawnedMinute: server.currentMinute,
    expiresDay: expires.day,
    expiresMinute: expires.minute,
  };
};

export const tickRareSpawns = (server: ServerState, rng: Rng, minutes = 0): ServerState => {
  let active = normalizeRareSpawns(server);
  let next: ServerState = { ...server, activeRareSpawns: active, rareSpawnHistory: server.rareSpawnHistory ?? [] };

  const targetCount = Math.min(MAX_RARE_ELITES, server.player.level >= 40 ? 3 : server.player.level >= 20 ? 2 : 1);
  const canSpawn = active.length < targetCount;
  const spawnChance = active.length === 0 ? 0.58 : 0.28;

  if (canSpawn && rng.chance(minutes >= 60 ? spawnChance : 0.12)) {
    const spawn = createRareSpawn(next, rng);
    if (spawn) {
      active = [...active, spawn].slice(0, MAX_RARE_ELITES);
      next = { ...next, activeRareSpawns: active };
      const zone = getZoneById(spawn.zoneId);
      next = addNews(next, rng, 'system', `В ${zone?.name ?? 'дикой зоне'} замечена редкая цель: ${spawn.name}.`, true);
    }
  }

  return next;
};

const rareEnemyFromMob = (spawn: RareSpawnState): Combatant | undefined => {
  const mob = getMobById(spawn.mobId);
  if (!mob) return undefined;

  return {
    id: spawn.id,
    name: spawn.name,
    level: mob.level,
    maxHp: Math.max(1, Math.round(mob.stats.hp * 2.5)),
    hp: Math.max(1, Math.round(mob.stats.hp * 2.5)),
    maxMana: mob.stats.mana,
    mana: mob.stats.mana,
    attack: Math.max(1, Math.round(mob.stats.attack * 1.35)),
    magic: Math.max(0, Math.round(mob.stats.magic * 1.35)),
    defense: Math.max(0, Math.round(mob.stats.defense * 1.15)),
    speed: mob.stats.speed,
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
  if (!spawn || !isPlayerNearSpawn(server, spawn)) return null;

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
    log: [`Редкая цель: ${spawn.name}.`],
    status: 'active',
  };
};

const addRewardItem = (items: InventoryStack[], itemId: string, amount = 1, enhancement = 0): InventoryStack[] => {
  const existing = items.find((entry) => entry.itemId === itemId && (entry.enhancement ?? 0) === enhancement);
  if (existing) return items.map((entry) => entry.itemId === itemId && (entry.enhancement ?? 0) === enhancement ? { ...entry, amount: entry.amount + amount } : entry);
  return [...items, { itemId, amount, enhancement }];
};

const rareItemPool = (server: ServerState, spawn: RareSpawnState): ItemDefinition[] => {
  const minLevel = Math.max(1, spawn.level - 6);
  const maxLevel = Math.max(server.player.level + 2, spawn.level + 3);
  return ITEMS
    .filter((item) => item.type !== 'quest')
    .filter((item) => item.tradeable || item.bindType === 'bindOnPickup')
    .filter((item) => item.levelReq >= minLevel && item.levelReq <= maxLevel)
    .filter((item) => item.rarity === 'rare' || item.rarity === 'epic' || item.rarity === 'uncommon')
    .sort((a, b) => b.levelReq - a.levelReq || a.name.localeCompare(b.name));
};

export const finishRareSpawnVictory = (server: ServerState, combat: CombatState, rng: Rng): { server: ServerState; combat: CombatState } => {
  if (combat.source !== 'rare_spawn') return { server, combat };

  const spawn = (server.activeRareSpawns ?? []).find((entry) => entry.id === combat.sourceId);
  const mob = spawn ? getMobById(spawn.mobId) : undefined;
  if (!spawn || !mob) return { server, combat };

  const bonusXp = xpRewardForMob(mob, server.player.level);
  const bonusGold = rng.int(mob.gold[0], mob.gold[1]);
  const beforeLevel = server.player.level;
  let player = addPlayerXp(server.player, bonusXp);
  const leveledUp = player.level > beforeLevel;
  player = { ...player, gold: player.gold + bonusGold };

  let rewardItems = combat.reward?.items ?? [];
  const rewardLines = [
    ...(combat.reward?.lines ?? []),
    `Редкая цель: +${bonusXp} XP${leveledUp ? ` · Lv. ${player.level}` : ''}.`,
    `Редкая цель: +${bonusGold} Gold.`,
  ];

  const rarePool = rareItemPool(server, spawn).slice(0, 24);
  if (rarePool.length > 0 && rng.chance(0.35)) {
    const item = rng.pick(rarePool);
    const enhancement = item.slot && rng.chance(0.2) ? 1 : 0;
    player = { ...player, inventory: addInventoryItem(player.inventory, item.id, 1, enhancement) };
    rewardItems = addRewardItem(rewardItems, item.id, 1, enhancement);
    rewardLines.push(`Редкий трофей: ${item.name}${enhancement > 0 ? ` +${enhancement}` : ''}.`);
  }

  let nextServer: ServerState = {
    ...server,
    player,
    activeRareSpawns: (server.activeRareSpawns ?? []).filter((entry) => entry.id !== spawn.id),
    rareSpawnHistory: Array.from(new Set([...(server.rareSpawnHistory ?? []), spawn.id])).slice(-50),
  };

  nextServer = addNews(nextServer, rng, 'system', `${server.player.name} убил редкую цель: ${spawn.name}.`, true);

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
      log: [...combat.log, `Редкая цель убита: ${spawn.name}.`].slice(-80),
    },
  };
};
