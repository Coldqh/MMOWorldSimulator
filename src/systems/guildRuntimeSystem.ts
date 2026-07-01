import type { Guild, GuildApplication, GuildFocus, GuildTier, GuildWar, GuildWarKillRecord, GuildWarTopKiller, Id, NpcPlayer, ServerState } from '../types/game';
import type { Rng } from '../engine/rng';
import { createRng } from '../engine/rng';
import { getGuildRelationValue } from './guildRelationSystem';
import { guildFocusLabel, normalizeGuildFocus } from './guildIdentitySystem';
import { isPlayerCreatedGuild, protectPlayerCreatedGuilds } from './playerGuildProtection';
import { LEVEL_BANDS } from '../balance';

const SOLO_PREFIX = 'solo_pool_';
const classIds = ['warrior', 'ranger', 'mage', 'priest'];
const raceIds = ['human', 'elf', 'dwarf', 'beastkin'];
const tierTargets: Array<{ tier: GuildTier; count: number; min: number; max: number; offset: number }> = [
  { tier: 'low', count: 30, min: LEVEL_BANDS.low.min, max: LEVEL_BANDS.low.max, offset: 0 },
  { tier: 'mid', count: 30, min: LEVEL_BANDS.mid.min, max: LEVEL_BANDS.mid.max, offset: 30 },
  { tier: 'high', count: 30, min: LEVEL_BANDS.high.min, max: LEVEL_BANDS.high.max, offset: 60 },
  { tier: 'max', count: 10, min: LEVEL_BANDS.max.min, max: LEVEL_BANDS.max.max, offset: 90 },
];

export const normalizeGuildTier = (tier?: GuildTier): GuildTier =>
  tier === 'max' || tier === 'high' || tier === 'mid' ? tier : 'low';

export const getGuildTierMinLevel = (tier?: GuildTier) => LEVEL_BANDS[normalizeGuildTier(tier)].min;

export const normalizeGuildTierRequirement = (guild: Guild): Guild => {
  const tier = normalizeGuildTier(guild.tier);
  return {
    ...guild,
    tier,
    minLevel: getGuildTierMinLevel(tier),
  };
};

export const normalizeGuildTierRequirements = (server: ServerState): ServerState => ({
  ...server,
  guilds: (server.guilds ?? []).map(normalizeGuildTierRequirement),
});

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(value)));
const totalMinute = (day: number, minute: number) => (Math.max(1, day) - 1) * 1440 + Math.max(0, minute);
const npcPower = (npc: NpcPlayer) => Math.max(1, (npc.gearScore ?? 1) * (0.55 + clamp(npc.skill ?? 5, 1, 10) * 0.11));


const addMinutesToClockRuntime = (day: number, minute: number, add: number) => {
  const total = totalMinute(day, minute) + Math.max(0, Math.round(add));
  return { day: Math.floor(total / 1440) + 1, minute: total % 1440 };
};
const runtimePairKey = (a: Id, b: Id) => [a, b].sort().join('::');
const openRuntimeWarExists = (server: ServerState, a: Id, b: Id) =>
  (server.guildWars ?? []).some((war) => (war.status === 'active' || war.status === 'scheduled' || war.status === 'pending_votes') && runtimePairKey(war.attackerGuildId, war.defenderGuildId) === runtimePairKey(a, b));
const startScheduledRuntimeWars = (server: ServerState): ServerState => ({
  ...server,
  guildWars: (server.guildWars ?? []).map((war) => war.status === 'scheduled' && totalMinute(server.serverDay, server.currentMinute) >= totalMinute(war.startsDay ?? war.declaredDay, war.startsMinute ?? war.declaredMinute)
    ? { ...war, status: 'active' as const, lastSimulatedDay: server.serverDay, lastSimulatedMinute: server.currentMinute }
    : war),
});
const dedupeRuntimeWarPairs = (server: ServerState): ServerState => {
  const seen = new Set<string>();
  return {
    ...server,
    guildWars: (server.guildWars ?? []).map((war) => {
      const key = runtimePairKey(war.attackerGuildId, war.defenderGuildId);
      if ((war.status === 'active' || war.status === 'scheduled' || war.status === 'pending_votes') && seen.has(key)) return { ...war, status: 'cancelled' as const };
      if (war.status === 'active' || war.status === 'scheduled' || war.status === 'pending_votes') seen.add(key);
      return war;
    }),
  };
};


const soloName = (tier: GuildTier, index: number) => {
  const low = ['Рик', 'Миро', 'Лана', 'Брен', 'Томми', 'Элла', 'Кайл', 'Нора', 'Дэн', 'Сайна', 'Финн'];
  const mid = ['Кай', 'Мел', 'Дора', 'Рей', 'Ник', 'Алис', 'Глен', 'Тея', 'Бруно', 'Лисса', 'Корин'];
  const high = ['Варн', 'Селин', 'Оскар', 'Рина', 'Маркус', 'Эш', 'Ника', 'Роланд', 'Джуна', 'Люк', 'Тара'];
  const surnames = ['Вейн', 'Кроу', 'Рив', 'Нокс', 'Флинт', 'Рук', 'Восс', 'Грей', 'Фрост', 'Кейн', 'Блэйд', 'Холл'];
  const pool = tier === 'low' ? low : tier === 'mid' ? mid : high;
  return `${pool[index % pool.length]} ${surnames[(index * 3) % surnames.length]} ${index + 1}`;
};

const timeText = (day?: number, minute?: number) => {
  const value = minute ?? 0;
  return `День ${day ?? '?'} · ${Math.floor(value / 60).toString().padStart(2, '0')}:${(value % 60).toString().padStart(2, '0')}`;
};

export const buildGuildWarProfileLines = (server: ServerState, war: GuildWar): string[] => {
  const guildName = (id: string) => server.guilds.find((guild) => guild.id === id)?.name ?? id;
  const npcName = (id: string) => server.npcs.find((npc) => npc.id === id)?.name ?? id;
  const topList = (guildId: string) => {
    const map = new Map<string, number>();
    war.killRecords
      .filter((record) => record.killerGuildId === guildId)
      .forEach((record) => map.set(record.killerId, (map.get(record.killerId) ?? 0) + 1));
    return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5);
  };
  const attackerTop = topList(war.attackerGuildId);
  const defenderTop = topList(war.defenderGuildId);
  return [
    `Война: ${guildName(war.attackerGuildId)} vs ${guildName(war.defenderGuildId)}`,
    `Статус: ${war.status}`,
    `Счёт: ${war.attackerKills}:${war.defenderKills}`,
    `Начало: ${timeText(war.startsDay ?? war.declaredDay, war.startsMinute ?? war.declaredMinute)}`,
    `Завершение: ${timeText(war.endsDay, war.endsMinute)}`,
    `${guildName(war.attackerGuildId)} · топ-5`,
    ...(attackerTop.length ? attackerTop.map(([id, kills], index) => `ACTION_NPC_PROFILE:${id}:#${index + 1} ${npcName(id)} — ${kills}`) : ['Убийств нет.']),
    `${guildName(war.defenderGuildId)} · топ-5`,
    ...(defenderTop.length ? defenderTop.map(([id, kills], index) => `ACTION_NPC_PROFILE:${id}:#${index + 1} ${npcName(id)} — ${kills}`) : ['Убийств нет.']),
  ];
};

const normalizeWar = (server: ServerState, war: Partial<GuildWar> & Record<string, any>): GuildWar | null => {
  if (!war.attackerGuildId || !war.defenderGuildId) return null;
  const startsDay = war.startsDay ?? war.startedDay ?? war.declaredDay ?? server.serverDay;
  const startsMinute = war.startsMinute ?? war.startedMinute ?? war.declaredMinute ?? 0;
  const declaredDay = war.declaredDay ?? startsDay;
  const declaredMinute = war.declaredMinute ?? startsMinute;
  const attackerKills = Number.isFinite(war.attackerKills) ? war.attackerKills : Number(war.attackerScore ?? 0);
  const defenderKills = Number.isFinite(war.defenderKills) ? war.defenderKills : Number(war.defenderScore ?? 0);
  return {
    id: war.id ?? `war_${server.seed}_${war.attackerGuildId}_${war.defenderGuildId}`,
    attackerGuildId: war.attackerGuildId,
    defenderGuildId: war.defenderGuildId,
    status: war.status ?? 'active',
    declaredDay,
    declaredMinute,
    startsDay,
    startsMinute,
    endsDay: war.endsDay ?? war.endDay ?? server.serverDay + 3,
    endsMinute: war.endsMinute ?? war.endMinute ?? 0,
    durationDays: war.durationDays ?? 3,
    extensionCount: war.extensionCount ?? 0,
    attackerKills: Math.max(0, attackerKills || 0),
    defenderKills: Math.max(0, defenderKills || 0),
    killRecords: war.killRecords ?? war.kills ?? [],
    attackerTopKillers: war.attackerTopKillers ?? [],
    defenderTopKillers: war.defenderTopKillers ?? [],
    lastSimulatedDay: war.lastSimulatedDay ?? startsDay,
    lastSimulatedMinute: war.lastSimulatedMinute ?? startsMinute,
  };
};

export const normalizeGuildWarsRuntime = (server: ServerState): ServerState => ({
  ...server,
  guildWars: (server.guildWars ?? [])
    .map((war: any) => normalizeWar(server, war))
    .filter((war): war is GuildWar => Boolean(war)),
  guildWarVotes: server.guildWarVotes ?? [],
});

const isExpired = (server: ServerState, war: GuildWar) =>
  (war.status === 'active' || war.status === 'scheduled') && totalMinute(server.serverDay, server.currentMinute) >= totalMinute(war.endsDay, war.endsMinute);

const finishExpiredWars = (server: ServerState): ServerState => {
  const finished: GuildWar[] = [];
  const guildWars = (server.guildWars ?? []).map((war) => {
    if (!isExpired(server, war)) return war;
    const nextWar = { ...war, status: 'finished' as const };
    finished.push(nextWar);
    return nextWar;
  });
  if (finished.length === 0) return { ...server, guildWars };

  const notifications = finished.map((war) => {
    const guildName = (id: string) => server.guilds.find((guild) => guild.id === id)?.name ?? id;
    return {
      id: `war_finished_${war.id}_${server.serverDay}_${server.currentMinute}`,
      type: 'guild' as const,
      title: 'Война завершена',
      text: `${guildName(war.attackerGuildId)} vs ${guildName(war.defenderGuildId)} · ${war.attackerKills}:${war.defenderKills}`,
      lines: buildGuildWarProfileLines(server, war),
    };
  });

  const news = finished.map((war) => {
    const guildName = (id: string) => server.guilds.find((guild) => guild.id === id)?.name ?? id;
    return {
      id: `news_war_finished_${war.id}_${server.serverDay}_${server.currentMinute}`,
      day: server.serverDay,
      minute: server.currentMinute,
      type: 'guild' as const,
      text: `Война завершена: ${guildName(war.attackerGuildId)} vs ${guildName(war.defenderGuildId)} · ${war.attackerKills}:${war.defenderKills}`,
      important: true,
    };
  });

  return {
    ...server,
    guildWars,
    notifications: [...(server.notifications ?? []), ...notifications],
    worldNews: [...news, ...server.worldNews].slice(0, 80),
  };
};

const activeWarExists = (server: ServerState, a: string, b: string) =>
  (server.guildWars ?? []).some((war) =>
    war.status === 'active' &&
    ((war.attackerGuildId === a && war.defenderGuildId === b) ||
      (war.attackerGuildId === b && war.defenderGuildId === a)),
  );

const sameTierWarCount = (server: ServerState, tier: GuildTier) => {
  const guildById = new Map((server.guilds ?? []).map((guild) => [guild.id, guild]));
  return (server.guildWars ?? []).filter((war) => {
    if (war.status !== 'active') return false;
    const a = guildById.get(war.attackerGuildId);
    const b = guildById.get(war.defenderGuildId);
    return a?.tier === tier && b?.tier === tier;
  }).length;
};
const seedWar = (server: ServerState, attackerGuildId: string, defenderGuildId: string, index: number): GuildWar => {
  const start = addMinutesToClockRuntime(server.serverDay, server.currentMinute, 60 + ((index * 173) % 720));
  const end = addMinutesToClockRuntime(start.day, start.minute, (3 + (index % 5)) * 1440 + ((index * 97) % 1440));
  return {
    id: `tier_war_${server.seed}_${server.serverDay}_${server.currentMinute}_${attackerGuildId}_${defenderGuildId}_${index}`,
    attackerGuildId,
    defenderGuildId,
    status: 'scheduled',
    declaredDay: server.serverDay,
    declaredMinute: server.currentMinute,
    startsDay: start.day,
    startsMinute: start.minute,
    endsDay: end.day,
    endsMinute: end.minute,
    durationDays: 3 + (index % 5),
    extensionCount: 0,
    attackerKills: 0,
    defenderKills: 0,
    killRecords: [],
    attackerTopKillers: [],
    defenderTopKillers: [],
    lastSimulatedDay: start.day,
    lastSimulatedMinute: start.minute,
  };
}

const pickTierWarPair = (server: ServerState, tier: GuildTier, used: Set<string>) => {
  const relationMap = new Map((server.guildRelations ?? []).map((entry) => [`${entry.fromGuildId}->${entry.toGuildId}`, entry.value]));
  const relation = (fromGuildId: Id, toGuildId: Id) => relationMap.get(`${fromGuildId}->${toGuildId}`) ?? 0;
  const openPairs = new Set(
    (server.guildWars ?? [])
      .filter((war) => war.status === 'active' || war.status === 'scheduled' || war.status === 'pending_votes')
      .map((war) => runtimePairKey(war.attackerGuildId, war.defenderGuildId)),
  );

  const guilds = server.guilds
    .filter((guild) => guild.tier === tier)
    .sort((a, b) => {
      const af = normalizeGuildFocus(a.guildFocus ?? a.type ?? a.focus);
      const bf = normalizeGuildFocus(b.guildFocus ?? b.type ?? b.focus);
      const focusScore = (focus: GuildFocus) => focus === 'pvp' ? 2 : focus === 'hybrid' ? 1 : 0;
      return focusScore(bf) - focusScore(af) || (b.pvpRating ?? 0) - (a.pvpRating ?? 0);
    });

  let best: { a: Guild; b: Guild; score: number } | undefined;

  for (let ai = 0; ai < guilds.length; ai += 1) {
    const a = guilds[ai];
    if (used.has(a.id)) continue;

    for (let bi = ai + 1; bi < guilds.length; bi += 1) {
      const b = guilds[bi];
      if (used.has(b.id)) continue;
      if (openPairs.has(runtimePairKey(a.id, b.id))) continue;

      const avg = Math.round((relation(a.id, b.id) + relation(b.id, a.id)) / 2);
      const af = normalizeGuildFocus(a.guildFocus ?? a.type ?? a.focus);
      const bf = normalizeGuildFocus(b.guildFocus ?? b.type ?? b.focus);
      let score = -avg;
      if (af === 'pvp' && bf === 'pvp') score += 50;
      if (af === 'pvp' || bf === 'pvp') score += 20;
      if (af === 'pve' && bf === 'pve') score -= 20;

      if (!best || score > best.score) best = { a, b, score };
    }
  }

  return best;
};


export const seedActiveGuildWarsIfEmpty = (server: ServerState): ServerState => {
  let next = dedupeRuntimeWarPairs(finishExpiredWars(startScheduledRuntimeWars(normalizeGuildWarsRuntime(server))));
  const used = new Set<string>();

  (['max', 'high', 'mid', 'low'] as const).forEach((tier) => {
    while (sameTierWarCount(next, tier) < 2) {
      const pair = pickTierWarPair(next, tier, used);
      if (!pair) break;
      used.add(pair.a.id);
      used.add(pair.b.id);
      next = { ...next, guildWars: [...next.guildWars, seedWar(next, pair.a.id, pair.b.id, next.guildWars.length)] };
    }
  });

  return next;
};

const updateTopKillers = (list: GuildWarTopKiller[], characterId: Id, guildId: Id): GuildWarTopKiller[] => {
  const map = new Map(list.map((entry) => [entry.characterId, { ...entry }]));
  const current = map.get(characterId) ?? { characterId, guildId, kills: 0 };
  current.kills += 1;
  map.set(characterId, current);
  return [...map.values()].sort((a, b) => b.kills - a.kills || a.characterId.localeCompare(b.characterId)).slice(0, 10);
};

const recordKill = (server: ServerState, war: GuildWar, winner: NpcPlayer, loser: NpcPlayer): GuildWar => {
  const attackerWon = winner.guildId === war.attackerGuildId;
  const record: GuildWarKillRecord = {
    id: `war_kill_${server.serverDay}_${server.currentMinute}_${winner.id}_${loser.id}_${war.killRecords.length}`,
    day: server.serverDay,
    minute: server.currentMinute,
    killerId: winner.id,
    killerGuildId: winner.guildId!,
    victimId: loser.id,
    victimGuildId: loser.guildId!,
    locationId: server.location.spotId ?? server.location.zoneId,
    source: 'simulated',
  };
  return {
    ...war,
    attackerKills: war.attackerKills + (attackerWon ? 1 : 0),
    defenderKills: war.defenderKills + (attackerWon ? 0 : 1),
    killRecords: [...war.killRecords, record].slice(-250),
    attackerTopKillers: attackerWon ? updateTopKillers(war.attackerTopKillers, winner.id, winner.guildId!) : war.attackerTopKillers,
    defenderTopKillers: attackerWon ? war.defenderTopKillers : updateTopKillers(war.defenderTopKillers, winner.id, winner.guildId!),
  };
};

const resolveWarDuel = (server: ServerState, war: GuildWar, rng: Rng): GuildWar => {
  const attackers = server.npcs.filter((npc) => npc.guildId === war.attackerGuildId);
  const defenders = server.npcs.filter((npc) => npc.guildId === war.defenderGuildId);
  if (attackers.length === 0 || defenders.length === 0) return war;
  const a = rng.pick(attackers);
  const b = rng.pick(defenders);
  const pa = npcPower(a);
  const pb = npcPower(b);
  const chanceA = Math.max(0.15, Math.min(0.85, 0.5 + ((pa - pb) / Math.max(400, pa + pb))));
  const attackerWon = rng.chance(chanceA);
  return recordKill(server, war, attackerWon ? a : b, attackerWon ? b : a);
};

export const simulateGuildWarsEveryHalfHour = (server: ServerState, rng: Rng, minutesAdvanced: number): ServerState => {
  let next = dedupeRuntimeWarPairs(startScheduledRuntimeWars(seedActiveGuildWarsIfEmpty(server)));
  const now = totalMinute(next.serverDay, next.currentMinute);
  const guildWars = next.guildWars.map((war) => {
    if (war.status !== 'active') return war;
    const last = totalMinute(war.lastSimulatedDay ?? war.startsDay ?? war.declaredDay, war.lastSimulatedMinute ?? war.startsMinute ?? war.declaredMinute);
    const dueFromClock = Math.floor(Math.max(0, now - last) / 30);
    const dueFromAdvance = Math.floor(Math.max(0, minutesAdvanced) / 30);
    const due = Math.min(6, Math.max(dueFromClock, dueFromAdvance));
    if (due <= 0) return war;
    let current = war;
    for (let i = 0; i < Math.min(48, due); i += 1) current = resolveWarDuel(next, current, rng);
    return { ...current, lastSimulatedDay: next.serverDay, lastSimulatedMinute: next.currentMinute };
  });
  return seedActiveGuildWarsIfEmpty({ ...next, guildWars });
};

const makeSoloNpc = (index: number, level: number, tier: GuildTier, rng: Rng): NpcPlayer => {
  const classId = ['warrior', 'ranger', 'mage', 'priest'][index % 4];
  const raceId = ['human', 'elf', 'dwarf', 'beastkin'][index % 4];
  return {
    id: `${SOLO_PREFIX}${index.toString().padStart(3, '0')}`,
    name: soloName(tier, index),
    raceId,
    classId,
    level,
    xp: 0,
    gearScore: level * (45 + (index % 13) * 4) + rng.int(25, 240),
    gold: rng.int(level * 40, level * 180),
    roleFocus: 'pve',
    currentGoal: 'Ищет гильдию',
    reputation: rng.int(0, 140),
    activityLevel: rng.int(3, 8),
    ambition: rng.int(3, 9),
    risk: rng.int(2, 8),
    socialWeight: rng.int(3, 9),
    inventory: [],
    equipment: {},
    arenaRating: 900 + level * 14 + rng.int(-80, 140),
    skill: clamp(2 + Math.floor(level / 3) + rng.int(0, 3), 1, 10),
    playstyle: 'mixed',
    locationMode: rng.chance(0.35) ? 'city' : 'zone',
    currentZoneId: undefined,
    currentSpotId: undefined,
  };
};

export const ensureSoloNpcPool = (server: ServerState): ServerState => {
  const existing = new Set((server.npcs ?? []).map((npc) => npc.id));
  const rng = createRng((server.seed ?? 1) + 601400);
  const additions: NpcPlayer[] = [];
  tierTargets.forEach((group) => {
    for (let i = 0; i < group.count; i += 1) {
      const index = group.offset + i;
      const id = `${SOLO_PREFIX}${index.toString().padStart(3, '0')}`;
      if (!existing.has(id)) additions.push(makeSoloNpc(index, rng.int(group.min, group.max), group.tier, rng));
    }
  });
  return {
    ...server,
    npcs: [
      ...server.npcs.map((npc) => npc.id.startsWith(SOLO_PREFIX) && npc.guildId ? { ...npc, guildId: undefined, playstyle: 'mixed' as const, roleFocus: 'pve' as const } : npc),
      ...additions,
    ],
  };
};

export const createPlayerGuildRuntime = (
  server: ServerState,
  name: string,
  focus: GuildFocus,
  tier: GuildTier = 'low',
): { server: ServerState; ok: boolean; message: string } => {
  const cleanName = name.trim().slice(0, 32);
  if (!cleanName) return { server, ok: false, message: 'Название пустое.' };
  if (server.player.guildId) return { server, ok: false, message: 'Ты уже в гильдии.' };
  if (server.player.gold < 50000) return { server, ok: false, message: 'Нужно 50 000 золота.' };
  if (server.guilds.some((guild) => guild.name.toLowerCase() === cleanName.toLowerCase())) return { server, ok: false, message: 'Гильдия с таким названием уже есть.' };

  const normalizedTier = normalizeGuildTier(tier);
  const requiredLevel = getGuildTierMinLevel(normalizedTier);
  if (server.player.level < requiredLevel) return { server, ok: false, message: `Для ${normalizedTier.toUpperCase()} гильдии нужен уровень ${requiredLevel}.` };

  const guild: Guild = {
    id: `guild_player_${server.seed}_${server.serverDay}_${server.currentMinute}`,
    name: cleanName,
    type: focus === 'pvp' ? 'PVP' : focus === 'pve' ? 'PVE' : 'MIXED',
    guildFocus: focus,
    reputation: 0,
    memberIds: [server.player.id],
    leaderId: server.player.id,
    deputyId: undefined,
    officerIds: [],
    tier: normalizedTier,
    minLevel: requiredLevel,
    focus,
    castleControl: undefined,
    raidProgress: 0,
    pvpRating: focus === 'pvp' ? 1000 : 800,
    treasuryGold: 0,
    stability: 100,
    recruitmentPolicy: 'open',
    createdByPlayer: true,
    founderPlayerId: server.player.id,
    createdDay: server.serverDay,
    createdMinute: server.currentMinute,
  };

  return {
    ok: true,
    message: `${cleanName} создана. Ты ГМ. Участников: 1.`,
    server: protectPlayerCreatedGuilds({
      ...server,
      player: { ...server.player, gold: server.player.gold - 50000, guildId: guild.id },
      guilds: [...server.guilds, guild],
      guildRelations: [
        ...server.guildRelations,
        ...server.guilds.flatMap((other) => [
          { fromGuildId: guild.id, toGuildId: other.id, value: 0, lastChangedDay: server.serverDay, lastChangedMinute: server.currentMinute },
          { fromGuildId: other.id, toGuildId: guild.id, value: 0, lastChangedDay: server.serverDay, lastChangedMinute: server.currentMinute },
        ]),
      ],
    }),
  };
};

export const repairFreshPlayerGuildLeadership = (server: ServerState): ServerState => {
  const guildId = server.player.guildId;
  if (!guildId) return server;
  const guild = server.guilds.find((entry) => entry.id === guildId);
  if (!isPlayerCreatedGuild(guild)) return server;
  return protectPlayerCreatedGuilds(server);
};


export const maybeGeneratePlayerGuildApplication = (server: ServerState, rng: Rng): ServerState => {
  const guildId = server.player.guildId;
  if (!guildId) return server;
  const guild = server.guilds.find((entry) => entry.id === guildId);
  if (!guild || guild.leaderId !== server.player.id) return server;
  const lastAppTotal = (server.guildApplications ?? [])
    .filter((app) => app.guildId === guildId && app.id.startsWith('player_guild_app_'))
    .reduce((max, app) => Math.max(max, totalMinute(app.createdDay, app.createdMinute)), 0);
  const now = totalMinute(server.serverDay, server.currentMinute);
  if (lastAppTotal > 0 && now - lastAppTotal < 720) return server;
  if ((server.guildApplications ?? []).some((app) => app.guildId === guildId && app.status === 'pending' && app.id.startsWith('player_guild_app_'))) return server;

  const withPool = ensureSoloNpcPool(server);
  const eligible = withPool.npcs
    .filter((npc) => !npc.guildId)
    .filter((npc) => !npc.guildId || npc.id.startsWith(SOLO_PREFIX))
    .filter((npc) => npc.level <= Math.max(LEVEL_BANDS.low.max, (guild.minLevel ?? 1) + 6));
  if (eligible.length === 0) return withPool;
  const applicant = rng.pick(eligible);
  const app: GuildApplication = {
    id: `player_guild_app_${server.serverDay}_${server.currentMinute}_${applicant.id}`,
    guildId,
    applicantNpcId: applicant.id,
    status: 'pending',
    createdDay: server.serverDay,
    createdMinute: server.currentMinute,
    resolveDay: server.serverDay + 3,
    resolveMinute: server.currentMinute,
    resultText: `${applicant.name} хочет вступить в ${guild.name}.`,
  };
  return {
    ...withPool,
    guildApplications: [...withPool.guildApplications, app],
    notifications: [
      ...(withPool.notifications ?? []),
      { id: `guild_app_notify_${app.id}`, type: 'guild', title: 'Новая заявка в гильдию', text: applicant.name, lines: [`Lv. ${applicant.level}`, `Gear ${applicant.gearScore}`, `Skill ${applicant.skill ?? 5}/10`] },
    ],
  };
};

export const acceptPlayerGuildApplication = (server: ServerState, applicationId: string): ServerState => {
  const app = (server.guildApplications ?? []).find((entry) => entry.id === applicationId);
  if (!app || app.status !== 'pending' || !app.applicantNpcId) return server;
  const guild = server.guilds.find((entry) => entry.id === app.guildId);
  const npc = server.npcs.find((entry) => entry.id === app.applicantNpcId);
  if (!guild || !npc || guild.leaderId !== server.player.id) return server;
  return protectPlayerCreatedGuilds({
    ...server,
    guildApplications: server.guildApplications.map((entry) => entry.id === applicationId ? { ...entry, status: 'accepted' as const, resultText: 'Принят.' } : entry),
    guilds: server.guilds.map((entry) => entry.id === guild.id ? { ...entry, memberIds: [...new Set([...entry.memberIds, npc.id])] } : entry),
    npcs: server.npcs.map((entry) => entry.id === npc.id ? { ...entry, guildId: guild.id, playstyle: guild.guildFocus === 'pvp' ? 'pvp' : guild.guildFocus === 'pve' ? 'pve' : entry.playstyle ?? 'mixed', roleFocus: guild.guildFocus === 'pvp' ? 'pvp' : guild.guildFocus === 'pve' ? 'pve' : entry.roleFocus } : entry),
  });
};

export const rejectPlayerGuildApplication = (server: ServerState, applicationId: string): ServerState => ({
  ...server,
  guildApplications: (server.guildApplications ?? []).map((entry) => entry.id === applicationId ? { ...entry, status: 'declined' as const, resultText: 'Отклонён.' } : entry),
});

export const declareWarDirectRuntime = (server: ServerState, targetGuildId: string): { server: ServerState; ok: boolean; message: string } => {
  const playerGuildId = server.player.guildId;
  if (!playerGuildId) return { server, ok: false, message: 'Ты не в гильдии.' };
  const playerGuild = server.guilds.find((guild) => guild.id === playerGuildId);
  const targetGuild = server.guilds.find((guild) => guild.id === targetGuildId);
  if (!playerGuild || !targetGuild) return { server, ok: false, message: 'Гильдия не найдена.' };
  if (playerGuild.leaderId !== server.player.id) return { server, ok: false, message: 'Войну может объявлять только ГМ.' };
  if (playerGuildId === targetGuildId) return { server, ok: false, message: 'Нельзя объявить войну себе.' };
  if (activeWarExists(server, playerGuildId, targetGuildId)) return { server, ok: false, message: 'Война уже идёт.' };
  return { ok: true, message: `Война объявлена: ${playerGuild.name} vs ${targetGuild.name}.`, server: { ...server, guildWars: [...server.guildWars, seedWar(server, playerGuildId, targetGuildId, server.guildWars.length)] } };
};

export const getPlayerGuildPendingApplications = (server: ServerState) => {
  const guildId = server.player.guildId;
  if (!guildId) return [];
  return (server.guildApplications ?? [])
    .filter((app) => app.guildId === guildId && app.status === 'pending' && app.applicantNpcId)
    .map((app) => ({ ...app, npc: server.npcs.find((npc) => npc.id === app.applicantNpcId) }))
    .filter((entry): entry is GuildApplication & { npc: NpcPlayer } => Boolean(entry.npc));
};

export const guildWarScoreText = (war: GuildWar) => `${war.attackerKills}:${war.defenderKills}`;
export const getGuildWarReason = (server: ServerState, war: GuildWar) => {
  const attacker = server.guilds.find((guild) => guild.id === war.attackerGuildId);
  const defender = server.guilds.find((guild) => guild.id === war.defenderGuildId);
  if (!attacker || !defender) return 'Война';
  return `${attacker.name} vs ${defender.name} · ${guildFocusLabel(attacker.guildFocus)} / ${guildFocusLabel(defender.guildFocus)}`;
};
