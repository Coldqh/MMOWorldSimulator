import { ITEMS } from '../content/items';
import { getMobById, getSpotById, getZoneById } from '../content/world';
import { addNews } from '../engine/news';
import { advanceServerClock } from '../engine/time';
import type { Rng } from '../engine/rng';
import type {
  InventoryStack,
  ItemDefinition,
  RareSpawnState,
  RewardSummary,
  ServerState,
  WorldBossRaidParticipant,
  WorldBossRaidRewardTier,
} from '../types/game';
import { addPlayerActivityCurrency, currencyRewardLine } from './activityCurrencySystem';
import { addInventoryItem, getGearScore, getPlayerStats } from './itemSystem';
import { addPlayerXp, xpRewardForMob } from './progressionSystem';
import { getNpcPlayerEquivalentStats } from './pvpStatSystem';

export const WORLD_BOSS_RAID_MAX_PARTICIPANTS = 30;
export const WORLD_BOSS_RAID_TURN_MINUTES = 5;
const WORLD_BOSS_TARGET_ROUNDS = 42;

type BossRaidResult = {
  server: ServerState;
  spawn?: RareSpawnState;
  ok: boolean;
  reason?: string;
  reward?: RewardSummary;
  rewardTier?: WorldBossRaidRewardTier;
  playerRank?: number;
  resolved?: boolean;
  lines?: string[];
};

const clampInt = (value: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(value)));
const participantKey = (id: string) => id;

const activeParticipants = (spawn: RareSpawnState) => spawn.raidParticipants ?? [];

const setSpawn = (server: ServerState, spawn: RareSpawnState): ServerState => ({
  ...server,
  activeRareSpawns: (server.activeRareSpawns ?? []).map((entry) => entry.id === spawn.id ? spawn : entry),
});

const removeSpawn = (server: ServerState, spawn: RareSpawnState): ServerState => ({
  ...server,
  activeRareSpawns: (server.activeRareSpawns ?? []).filter((entry) => entry.id !== spawn.id),
  rareSpawnHistory: Array.from(new Set([...(server.rareSpawnHistory ?? []), spawn.id])).slice(-80),
});

const levelRangeForSpawn = (spawn: RareSpawnState): readonly [number, number] => {
  const spot = spawn.spotId ? getSpotById(spawn.spotId) : undefined;
  const zone = getZoneById(spawn.zoneId);
  return spot?.levelRange ?? zone?.levelRange ?? [Math.max(1, spawn.level - 5), spawn.level + 5];
};

const isNpcAlreadyJoined = (spawn: RareSpawnState, npcId: string) => activeParticipants(spawn).some((entry) => entry.id === npcId);

const sameBossLocationScore = (spawn: RareSpawnState, npc: ServerState['npcs'][number]) => {
  if (spawn.spotId && npc.currentSpotId === spawn.spotId) return 0;
  if (npc.currentZoneId === spawn.zoneId) return 1;
  return 2;
};

const eligibleNpcPool = (server: ServerState, spawn: RareSpawnState) => {
  const [minLevel, maxLevel] = levelRangeForSpawn(spawn);
  const hardMax = maxLevel + 15;
  return (server.npcs ?? [])
    .filter((npc) => !isNpcAlreadyJoined(spawn, npc.id))
    .filter((npc) => {
      const sameLocation = npc.currentZoneId === spawn.zoneId || (spawn.spotId && npc.currentSpotId === spawn.spotId);
      const levelFits = npc.level >= minLevel && npc.level <= hardMax;
      return sameLocation || levelFits;
    })
    .sort((a, b) => {
      const locationDiff = sameBossLocationScore(spawn, a) - sameBossLocationScore(spawn, b);
      if (locationDiff !== 0) return locationDiff;
      const levelDiff = Math.abs(a.level - spawn.level) - Math.abs(b.level - spawn.level);
      if (levelDiff !== 0) return levelDiff;
      return (b.activityLevel + b.ambition + b.risk) - (a.activityLevel + a.ambition + a.risk);
    });
};

const npcParticipant = (server: ServerState, spawn: RareSpawnState, npcId: string): WorldBossRaidParticipant | undefined => {
  const npc = server.npcs.find((entry) => entry.id === npcId);
  if (!npc) return undefined;
  return {
    id: npc.id,
    name: npc.name,
    level: npc.level,
    damage: 0,
    joinedDay: server.serverDay,
    joinedMinute: server.currentMinute,
  };
};

const playerParticipant = (server: ServerState): WorldBossRaidParticipant => ({
  id: server.player.id,
  name: server.player.name,
  level: server.player.level,
  damage: 0,
  joinedDay: server.serverDay,
  joinedMinute: server.currentMinute,
  isPlayer: true,
});

const moveJoinedNpcsToBoss = (server: ServerState, spawn: RareSpawnState, npcIds: string[]): ServerState => {
  if (npcIds.length === 0) return server;
  const moved = new Set(npcIds);
  return {
    ...server,
    npcs: server.npcs.map((npc) => moved.has(npc.id)
      ? {
          ...npc,
          currentZoneId: spawn.zoneId,
          currentSpotId: spawn.spotId ?? npc.currentSpotId,
          locationMode: spawn.spotId ? 'spot' : 'zone',
          lastMovedDay: server.serverDay,
          lastMovedMinute: server.currentMinute,
          currentGoal: 'охота на мирового босса',
        }
      : npc),
  };
};

const estimateParticipantDamage = (level: number, attack: number, magic: number, bossDefense: number, rng?: Rng) => {
  const base = Math.max(12, attack + magic * 0.85 + level * 8);
  const roll = rng ? 0.76 + rng.next() * 0.42 : 0.97;
  return Math.max(1, Math.round(base * roll - bossDefense * 0.35));
};

const estimateBossHp = (spawn: RareSpawnState) => {
  const mob = getMobById(spawn.mobId);
  const level = mob?.level ?? spawn.level;
  const attack = mob?.stats.attack ?? level * 4;
  const magic = mob?.stats.magic ?? level * 3;
  const defense = mob?.stats.defense ?? level * 2;
  const expectedOne = estimateParticipantDamage(level, attack, magic, defense);
  const expectedFullRaidRound = Math.max(30, expectedOne * WORLD_BOSS_RAID_MAX_PARTICIPANTS);
  return Math.max((mob?.stats.hp ?? level * 120) * 80, Math.round(expectedFullRaidRound * WORLD_BOSS_TARGET_ROUNDS));
};

export const ensureWorldBossRaidState = (spawn: RareSpawnState): RareSpawnState => {
  if (spawn.kind !== 'world_boss') return spawn;
  const maxHp = spawn.raidBossMaxHp ?? estimateBossHp(spawn);
  return {
    ...spawn,
    raidMaxParticipants: spawn.raidMaxParticipants ?? WORLD_BOSS_RAID_MAX_PARTICIPANTS,
    raidBossMaxHp: maxHp,
    raidBossHp: clampInt(spawn.raidBossHp ?? maxHp, 0, maxHp),
    raidRound: spawn.raidRound ?? 0,
    raidParticipants: activeParticipants(spawn).slice(0, spawn.raidMaxParticipants ?? WORLD_BOSS_RAID_MAX_PARTICIPANTS),
  };
};

export const getWorldBossRaidSummary = (server: ServerState, spawn: RareSpawnState) => {
  const raid = ensureWorldBossRaidState(spawn);
  const participants = [...activeParticipants(raid)].sort((a, b) => b.damage - a.damage || a.name.localeCompare(b.name));
  const playerIndex = participants.findIndex((entry) => entry.id === server.player.id);
  const maxHp = raid.raidBossMaxHp ?? 1;
  const hp = raid.raidBossHp ?? maxHp;
  return {
    maxParticipants: raid.raidMaxParticipants ?? WORLD_BOSS_RAID_MAX_PARTICIPANTS,
    participantCount: participants.length,
    participants,
    hp,
    maxHp,
    hpPercent: Math.max(0, Math.min(100, Math.ceil((hp / Math.max(1, maxHp)) * 100))),
    round: raid.raidRound ?? 0,
    playerJoined: playerIndex >= 0,
    playerRank: playerIndex >= 0 ? playerIndex + 1 : undefined,
    playerDamage: participants[playerIndex]?.damage ?? 0,
  };
};

export const isPlayerInWorldBossRaid = (server: ServerState, spawn: RareSpawnState) =>
  activeParticipants(spawn).some((entry) => entry.id === server.player.id);

const addNpcRaidParticipants = (server: ServerState, spawn: RareSpawnState, rng: Rng, minAdd: number, maxAdd: number): { server: ServerState; spawn: RareSpawnState; added: number } => {
  let raid = ensureWorldBossRaidState(spawn);
  const maxParticipants = raid.raidMaxParticipants ?? WORLD_BOSS_RAID_MAX_PARTICIPANTS;
  const openSlots = Math.max(0, maxParticipants - activeParticipants(raid).length);
  if (openSlots <= 0) return { server, spawn: raid, added: 0 };

  const desired = Math.min(openSlots, rng.int(minAdd, Math.max(minAdd, maxAdd)));
  const pool = eligibleNpcPool(server, raid).slice(0, Math.max(desired * 3, desired));
  const picked: string[] = [];
  pool.forEach((npc) => {
    if (picked.length >= desired) return;
    const sameLocation = npc.currentZoneId === raid.zoneId || (raid.spotId && npc.currentSpotId === raid.spotId);
    const joinChance = sameLocation ? 0.92 : 0.58;
    if (rng.chance(joinChance)) picked.push(npc.id);
  });

  const participants = [
    ...activeParticipants(raid),
    ...picked.map((id) => npcParticipant(server, raid, id)).filter((entry): entry is WorldBossRaidParticipant => Boolean(entry)),
  ].slice(0, maxParticipants);

  raid = { ...raid, raidParticipants: participants };
  const movedServer = moveJoinedNpcsToBoss(server, raid, picked);
  return { server: movedServer, spawn: raid, added: picked.length };
};

export const initializeWorldBossRaid = (server: ServerState, spawn: RareSpawnState, rng: Rng): { server: ServerState; spawn: RareSpawnState } => {
  if (spawn.kind !== 'world_boss') return { server, spawn };
  const base = ensureWorldBossRaidState(spawn);
  const added = addNpcRaidParticipants(server, base, rng, 6, 14);
  return { server: added.server, spawn: added.spawn };
};

export const hydrateActiveWorldBossRaids = (server: ServerState, rng: Rng): ServerState => {
  let next = server;
  const hydrated = (server.activeRareSpawns ?? []).map((spawn) => {
    if (spawn.kind !== 'world_boss') return spawn;
    const result = initializeWorldBossRaid(next, spawn, rng);
    next = result.server;
    return result.spawn;
  });
  return { ...next, activeRareSpawns: hydrated };
};

export const joinWorldBossRaid = (server: ServerState, spawnId: string, rng: Rng): BossRaidResult => {
  const spawn = (server.activeRareSpawns ?? []).find((entry) => entry.id === spawnId && entry.kind === 'world_boss');
  if (!spawn) return { server, ok: false, reason: 'Мировой босс исчез.' };
  if (server.location.mode === 'city' || server.location.zoneId !== spawn.zoneId) return { server, ok: false, reason: 'Нужно быть в зоне мирового босса.' };

  let raid = ensureWorldBossRaidState(spawn);
  if (isPlayerInWorldBossRaid(server, raid)) return { server: setSpawn(server, raid), spawn: raid, ok: true, reason: 'Ты уже в рейде.' };
  const maxParticipants = raid.raidMaxParticipants ?? WORLD_BOSS_RAID_MAX_PARTICIPANTS;
  if (activeParticipants(raid).length >= maxParticipants) return { server: setSpawn(server, raid), spawn: raid, ok: false, reason: 'Рейд заполнен.' };

  raid = { ...raid, raidParticipants: [...activeParticipants(raid), playerParticipant(server)] };
  const reinforced = addNpcRaidParticipants(server, raid, rng, 1, 4);
  const next = setSpawn(reinforced.server, reinforced.spawn);
  return { server: next, spawn: reinforced.spawn, ok: true, lines: [`Ты вступил в рейд: ${raid.name}.`, `Участники: ${activeParticipants(reinforced.spawn).length}/${maxParticipants}.`] };
};

const addParticipantDamage = (participants: WorldBossRaidParticipant[], id: string, damage: number) =>
  participants.map((entry) => entry.id === id ? { ...entry, damage: entry.damage + Math.max(0, Math.round(damage)) } : entry);

const participantRoundDamage = (server: ServerState, spawn: RareSpawnState, participant: WorldBossRaidParticipant, rng: Rng) => {
  const mob = getMobById(spawn.mobId);
  const bossDefense = mob?.stats.defense ?? spawn.level * 2;
  if (participant.isPlayer || participant.id === server.player.id) {
    const stats = getPlayerStats(server.player);
    return estimateParticipantDamage(server.player.level, stats.attack, stats.magic, bossDefense, rng);
  }
  const npc = server.npcs.find((entry) => entry.id === participant.id);
  if (!npc) return estimateParticipantDamage(participant.level, participant.level * 4, participant.level * 2, bossDefense, rng);
  const stats = getNpcPlayerEquivalentStats(npc);
  return estimateParticipantDamage(npc.level, stats.attack, stats.magic, bossDefense, rng);
};

const rewardTierForRank = (rank: number): WorldBossRaidRewardTier => {
  if (rank <= 5) return 'top';
  if (rank <= 10) return 'high';
  return 'normal';
};

const tierLabel = (tier: WorldBossRaidRewardTier) => {
  if (tier === 'top') return 'Высшая награда';
  if (tier === 'high') return 'Высокая награда';
  return 'Обычная награда';
};

const addRewardItem = (items: InventoryStack[], itemId: string, amount = 1, enhancement = 0): InventoryStack[] => {
  const existing = items.find((entry) => entry.itemId === itemId && (entry.enhancement ?? 0) === enhancement);
  if (existing) return items.map((entry) => entry.itemId === itemId && (entry.enhancement ?? 0) === enhancement ? { ...entry, amount: entry.amount + amount } : entry);
  return [...items, { itemId, amount, enhancement }];
};

const worldBossRewardPool = (server: ServerState, spawn: RareSpawnState): ItemDefinition[] => ITEMS
  .filter((item) => item.type !== 'quest')
  .filter((item) => item.bindType === 'bindOnPickup' || item.tradeable)
  .filter((item) => item.levelReq >= Math.max(1, spawn.level - 10) && item.levelReq <= Math.max(server.player.level + 3, spawn.level + 8))
  .filter((item) => ['rare', 'epic', 'legendary', 'mythic', 'unique'].includes(item.rarity))
  .sort((a, b) => b.levelReq - a.levelReq || b.price - a.price || a.name.localeCompare(b.name));

const maybeWorldBossItemReward = (server: ServerState, spawn: RareSpawnState, tier: WorldBossRaidRewardTier, rng: Rng) => {
  const chance = tier === 'top' ? 0.92 : tier === 'high' ? 0.58 : 0.24;
  if (!rng.chance(chance)) return undefined;
  const pool = worldBossRewardPool(server, spawn).slice(0, tier === 'top' ? 40 : 28);
  if (pool.length === 0) return undefined;
  const item = rng.pick(pool);
  const enhancement = item.slot ? (tier === 'top' ? rng.int(2, 4) : tier === 'high' ? rng.int(1, 3) : rng.chance(0.35) ? 1 : 0) : 0;
  return { item, enhancement };
};

const resolveWorldBossRaidVictory = (server: ServerState, spawn: RareSpawnState, rng: Rng): BossRaidResult => {
  const mob = getMobById(spawn.mobId);
  if (!mob) return { server, spawn, ok: false, reason: 'Босс не найден.' };
  const ranking = [...activeParticipants(spawn)].sort((a, b) => b.damage - a.damage || a.name.localeCompare(b.name));
  const playerRank = Math.max(1, ranking.findIndex((entry) => entry.id === server.player.id) + 1);
  const tier = rewardTierForRank(playerRank);
  const tierScale = tier === 'top' ? 8 : tier === 'high' ? 5 : 3;
  const goldScale = tier === 'top' ? 8 : tier === 'high' ? 5 : 3;
  const raidSeals = tier === 'top' ? 24 : tier === 'high' ? 14 : 6;
  const bonusXp = xpRewardForMob(mob, server.player.level) * tierScale;
  const bonusGold = Math.max(1, Array.from({ length: goldScale }).reduce<number>((sum) => sum + rng.int(mob.gold[0], mob.gold[1]), 0));
  const beforeLevel = server.player.level;
  let player = addPlayerXp(server.player, bonusXp);
  const leveledUp = player.level > beforeLevel;
  player = addPlayerActivityCurrency({ ...player, gold: player.gold + bonusGold }, 'raidSeals', raidSeals);

  let rewardItems: InventoryStack[] = [];
  const lines = [
    `Рейдовый босс убит: ${spawn.name}.`,
    `Место по урону: #${playerRank}.`,
    `${tierLabel(tier)}.`,
    `+${bonusXp} XP${leveledUp ? ` · Lv. ${player.level}` : ''}.`,
    `+${bonusGold} Gold.`,
    currencyRewardLine('raidSeals', raidSeals),
  ];

  const picked = maybeWorldBossItemReward(server, spawn, tier, rng);
  if (picked) {
    player = { ...player, inventory: addInventoryItem(player.inventory, picked.item.id, 1, picked.enhancement) };
    rewardItems = addRewardItem(rewardItems, picked.item.id, 1, picked.enhancement);
    lines.push(`Босс-трофей: ${picked.item.name}${picked.enhancement > 0 ? ` +${picked.enhancement}` : ''}.`);
  }
  lines.push(`Твой урон: ${ranking.find((entry) => entry.id === server.player.id)?.damage ?? 0}.`);
  lines.push(`Gear после боя: ${getGearScore(player.equipment)}.`);

  let next = removeSpawn({ ...server, player }, spawn);
  next = addNews(next, rng, 'raid', `${server.player.name} участвовал в убийстве мирового босса: ${spawn.name}. #${playerRank} по урону.`, true);

  return {
    server: next,
    spawn,
    ok: true,
    resolved: true,
    rewardTier: tier,
    playerRank,
    reward: { xp: bonusXp, gold: bonusGold, items: rewardItems, lines },
    lines,
  };
};

export const attackWorldBossRaid = (server: ServerState, spawnId: string, rng: Rng): BossRaidResult => {
  const spawn = (server.activeRareSpawns ?? []).find((entry) => entry.id === spawnId && entry.kind === 'world_boss');
  if (!spawn) return { server, ok: false, reason: 'Мировой босс исчез.' };

  const joined = isPlayerInWorldBossRaid(server, spawn);
  if (!joined) return { server, spawn, ok: false, reason: 'Сначала вступи в рейд.' };

  const reinforced = addNpcRaidParticipants(server, ensureWorldBossRaidState(spawn), rng, 1, 5);
  let raid = reinforced.spawn;
  let participants = activeParticipants(raid);
  let totalDamage = 0;
  participants.forEach((participant) => {
    const damage = participantRoundDamage(reinforced.server, raid, participant, rng);
    totalDamage += damage;
    participants = addParticipantDamage(participants, participant.id, damage);
  });

  const maxHp = raid.raidBossMaxHp ?? estimateBossHp(raid);
  const currentHp = raid.raidBossHp ?? maxHp;
  raid = {
    ...raid,
    raidBossMaxHp: maxHp,
    raidBossHp: Math.max(0, currentHp - totalDamage),
    raidRound: (raid.raidRound ?? 0) + 1,
    raidParticipants: participants,
  };

  const timedServer = advanceServerClock(reinforced.server, WORLD_BOSS_RAID_TURN_MINUTES);
  if ((raid.raidBossHp ?? 0) <= 0) return resolveWorldBossRaidVictory(timedServer, raid, rng);

  return {
    server: setSpawn(timedServer, raid),
    spawn: raid,
    ok: true,
    resolved: false,
    lines: [`Ход рейда ${raid.raidRound}: нанесено ${totalDamage} урона.`, `HP босса: ${raid.raidBossHp}/${raid.raidBossMaxHp}.`],
  };
};
