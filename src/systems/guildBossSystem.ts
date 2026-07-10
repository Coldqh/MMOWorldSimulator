import { WORLD_BOSS_PREFIXES } from '../content/rareSpawns';
import { getMobById, getSpotById, getZoneById, SPOTS } from '../content/world';
import { addNews } from '../engine/news';
import type { Rng } from '../engine/rng';
import { uid } from '../engine/rng';
import type { Guild, GuildTier, RareSpawnState, ServerState } from '../types/game';
import { getActivityCurrencyAmount, spendPlayerActivityCurrency } from './activityCurrencySystem';
import { initializeWorldBossRaid, joinWorldBossRaid } from './worldBossRaidSystem';

export const GUILD_BOSS_SUMMON_COOLDOWN_MINUTES = 12 * 60;

export type GuildBossSummonCost = {
  gold: number;
  raidSeals: number;
  warCrests: number;
};

const toAbsoluteMinute = (day: number, minute: number) => (Math.max(1, day) - 1) * 1440 + Math.max(0, minute);
const serverNow = (server: Pick<ServerState, 'serverDay' | 'currentMinute'>) => toAbsoluteMinute(server.serverDay, server.currentMinute);

const addMinutes = (server: Pick<ServerState, 'serverDay' | 'currentMinute'>, minutes: number) => {
  const total = serverNow(server) + Math.max(0, minutes);
  return {
    day: Math.floor(total / 1440) + 1,
    minute: total % 1440,
  };
};

const bossCandidateFromSpot = (spotId?: string) => {
  const spot = spotId ? getSpotById(spotId) : undefined;
  if (!spot) return undefined;
  const mobs = spot.mobIds
    .map((mobId) => getMobById(mobId))
    .filter((mob): mob is NonNullable<ReturnType<typeof getMobById>> => Boolean(mob));
  if (mobs.length === 0) return undefined;
  const bossLike = mobs.filter((mob) => mob.tags.includes('boss') || mob.tags.includes('mini-boss'));
  const pool = bossLike.length > 0 ? bossLike : mobs;
  return pool.sort((a, b) => b.level - a.level || a.name.localeCompare(b.name))[0];
};

const sameGuildOfficerRole = (guild: Guild, playerId: string) =>
  guild.leaderId === playerId || guild.deputyId === playerId || (guild.officerIds ?? []).includes(playerId);

export const getGuildBossSummonCost = (tier: GuildTier = 'low'): GuildBossSummonCost => {
  switch (tier) {
    case 'max':
      return { gold: 32000, raidSeals: 22, warCrests: 12 };
    case 'high':
      return { gold: 24000, raidSeals: 16, warCrests: 8 };
    case 'mid':
      return { gold: 16000, raidSeals: 10, warCrests: 5 };
    case 'low':
    default:
      return { gold: 9000, raidSeals: 6, warCrests: 3 };
  }
};

export const getGuildBossCooldownLeft = (server: ServerState, guild?: Guild) => {
  if (!guild?.lastBossSummonDay && !guild?.lastBossSummonMinute) return 0;
  const lastDay = guild.lastBossSummonDay ?? 1;
  const lastMinute = guild.lastBossSummonMinute ?? 0;
  const elapsed = serverNow(server) - toAbsoluteMinute(lastDay, lastMinute);
  return Math.max(0, GUILD_BOSS_SUMMON_COOLDOWN_MINUTES - elapsed);
};

export const formatGuildBossCooldown = (minutes: number) => {
  if (minutes <= 0) return 'готово';
  if (minutes >= 60) return `${Math.floor(minutes / 60)} ч ${minutes % 60} мин`;
  return `${minutes} мин`;
};

export const getActiveGuildSummonedBoss = (server: ServerState, guildId?: string) =>
  (server.activeRareSpawns ?? []).find((spawn) => spawn.kind === 'world_boss' && spawn.summonSource === 'guild' && spawn.summonedByGuildId === guildId);

const resolveSummonSpot = (server: ServerState) => {
  const currentSpot = server.location.mode === 'spot' ? getSpotById(server.location.spotId ?? '') : undefined;
  const zoneId = currentSpot?.zoneId ?? server.location.zoneId;
  const zone = zoneId ? getZoneById(zoneId) : undefined;
  if (!zone) return undefined;
  const zoneSpots = SPOTS.filter((spot) => spot.zoneId === zone.id);
  const prioritizedSpots = currentSpot
    ? [currentSpot, ...zoneSpots.filter((spot) => spot.id !== currentSpot.id)]
    : zoneSpots;
  const chosenSpot = prioritizedSpots.find((spot) => Boolean(bossCandidateFromSpot(spot.id)));
  return {
    zone,
    spot: chosenSpot,
  };
};

type GuildBossSummonResult = {
  server: ServerState;
  ok: boolean;
  reason?: string;
  spawn?: RareSpawnState;
  lines?: string[];
};

export const summonGuildWorldBoss = (server: ServerState, rng: Rng): GuildBossSummonResult => {
  const guild = server.guilds.find((entry) => entry.id === server.player.guildId);
  if (!guild) return { server, ok: false, reason: 'Сначала вступи в гильдию.' };
  if (!sameGuildOfficerRole(guild, server.player.id)) return { server, ok: false, reason: 'Призывать босса может только ГМ, зам или офицер.' };
  if (server.location.mode === 'city') return { server, ok: false, reason: 'Нужно выйти в зону или на спот.' };

  const activeBoss = getActiveGuildSummonedBoss(server, guild.id);
  if (activeBoss) return { server, ok: false, reason: `У гильдии уже есть активный призыв: ${activeBoss.name}.` };

  const cooldownLeft = getGuildBossCooldownLeft(server, guild);
  if (cooldownLeft > 0) return { server, ok: false, reason: `Откат призыва: ${formatGuildBossCooldown(cooldownLeft)}.` };

  const cost = getGuildBossSummonCost(guild.tier ?? 'low');
  if (server.player.gold < cost.gold) return { server, ok: false, reason: `Нужно ${cost.gold} Gold.` };
  if (getActivityCurrencyAmount(server.player, 'raidSeals') < cost.raidSeals) return { server, ok: false, reason: `Нужно ${cost.raidSeals} Raid Seals.` };
  if (getActivityCurrencyAmount(server.player, 'warCrests') < cost.warCrests) return { server, ok: false, reason: `Нужно ${cost.warCrests} War Crests.` };

  const resolvedSpot = resolveSummonSpot(server);
  if (!resolvedSpot) return { server, ok: false, reason: 'В этой локации нельзя вызвать босса.' };
  const mob = bossCandidateFromSpot(resolvedSpot.spot?.id);
  if (!mob) return { server, ok: false, reason: 'Подходящий босс для призыва не найден.' };

  const durationMinutes = rng.int(360, 540);
  const expires = addMinutes(server, durationMinutes);
  const prefix = rng.pick(WORLD_BOSS_PREFIXES);
  const spawn: RareSpawnState = {
    id: uid(`guild_world_boss_${guild.id}`, rng),
    kind: 'world_boss',
    mobId: mob.id,
    name: `${guild.name}: ${prefix} ${mob.name}`,
    zoneId: resolvedSpot.zone.id,
    spotId: resolvedSpot.spot?.id,
    level: Math.max(mob.level, server.player.level),
    spawnedDay: server.serverDay,
    spawnedMinute: server.currentMinute,
    expiresDay: expires.day,
    expiresMinute: expires.minute,
    summonSource: 'guild',
    summonedByGuildId: guild.id,
    summonedByGuildName: guild.name,
    summonedByPlayerId: server.player.id,
  };

  let nextServer: ServerState = {
    ...server,
    player: spendPlayerActivityCurrency(
      spendPlayerActivityCurrency(
        { ...server.player, gold: server.player.gold - cost.gold },
        'raidSeals',
        cost.raidSeals,
      ),
      'warCrests',
      cost.warCrests,
    ),
    guilds: server.guilds.map((entry) => entry.id === guild.id
      ? {
          ...entry,
          lastBossSummonDay: server.serverDay,
          lastBossSummonMinute: server.currentMinute,
        }
      : entry),
    activeRareSpawns: [...(server.activeRareSpawns ?? []), spawn],
  };

  const initialized = initializeWorldBossRaid(nextServer, spawn, rng);
  nextServer = {
    ...initialized.server,
    activeRareSpawns: (initialized.server.activeRareSpawns ?? []).map((entry) => entry.id === spawn.id ? initialized.spawn : entry),
  };

  const joined = joinWorldBossRaid(nextServer, initialized.spawn.id, rng);
  nextServer = joined.server;

  nextServer = addNews(nextServer, rng, 'raid', `${guild.name} призвала мирового босса: ${spawn.name}.`, true);

  const lines = [
    `Гильдия ${guild.name} начала призыв босса.`,
    `Зона: ${resolvedSpot.zone.name}${resolvedSpot.spot ? ` · ${resolvedSpot.spot.name}` : ''}.`,
    `Цена: ${cost.gold} Gold · ${cost.raidSeals} Raid Seals · ${cost.warCrests} War Crests.`,
    `Рейд открыт на ${formatGuildBossCooldown(durationMinutes)}.`,
  ];

  return {
    server: nextServer,
    ok: true,
    spawn: initialized.spawn,
    lines,
  };
};
