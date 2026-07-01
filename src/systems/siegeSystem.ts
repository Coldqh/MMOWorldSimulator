import { CASTLE_SIEGE_WEEKDAYS, DEFAULT_CASTLES, getSiegeMapById } from '../content/castles';
import { addNews } from '../engine/news';
import type { Rng } from '../engine/rng';
import { uid } from '../engine/rng';
import type { Castle, CastleHistoryEntry, Guild, Id, NpcPlayer, ServerState, SiegeCell, SiegeRoster, SiegeRun, SiegeUnit } from '../types/game';
import { getGearScore, getPlayerStats } from './itemSystem';
import { LEVEL_BANDS } from '../balance';
import { getNpcEffectiveGearScore, getNpcPlayerEquivalentStats } from './pvpStatSystem';

const MAX_SIEGE_TURNS = 200;
const SIEGE_MINUTE = 0;
const MAX_GUILDS_PER_SIEGE = 4;
const MAX_ROSTER_SIZE = 10;
const MIN_ROSTER_SIZE = 5;
const REGISTRATION_DAYS_BEFORE = 3;

export type SiegeMoveDirection = 'up' | 'down' | 'left' | 'right' | 'auto';

const totalMinute = (day: number, minute: number) => (Math.max(1, day) - 1) * 1440 + Math.max(0, minute);
const weekDayIndex = (day: number): 0 | 1 | 2 | 3 | 4 | 5 | 6 => ((Math.max(1, day) - 1) % 7) as 0 | 1 | 2 | 3 | 4 | 5 | 6;

const nextScheduledDay = (currentDay: number, currentMinute: number, targetWeekday: 0 | 2 | 4) => {
  const current = weekDayIndex(currentDay);
  let delta = (targetWeekday - current + 7) % 7;
  if (delta === 0 && currentMinute > SIEGE_MINUTE) delta = 7;
  return currentDay + delta;
};

const normalizeCastleSchedule = (server: ServerState, castle: Castle): Castle => {
  const targetWeekday = CASTLE_SIEGE_WEEKDAYS[castle.id] ?? 0;
  const nextDay = nextScheduledDay(server.serverDay, server.currentMinute, targetWeekday);
  const scheduleIsWrongWeekday = weekDayIndex(castle.nextSiegeDay) !== targetWeekday || castle.nextSiegeMinute !== SIEGE_MINUTE;
  const dueAlreadyResolvedToday = castle.lastResolvedSiegeDay === server.serverDay;
  const scheduleIsOld = totalMinute(castle.nextSiegeDay, castle.nextSiegeMinute) < totalMinute(server.serverDay, server.currentMinute) && !dueAlreadyResolvedToday;
  const hasRegisteredRosters = (server.siegeRosters ?? []).some((roster) => roster.castleId === castle.id);
  if (scheduleIsOld && hasRegisteredRosters) return { ...castle, tier: 'max', levelRange: [LEVEL_BANDS.max.min, LEVEL_BANDS.max.max], nextSiegeMinute: SIEGE_MINUTE };
  if (!scheduleIsWrongWeekday && !scheduleIsOld) return { ...castle, tier: 'max', levelRange: [LEVEL_BANDS.max.min, LEVEL_BANDS.max.max], nextSiegeMinute: SIEGE_MINUTE };
  return { ...castle, tier: 'max', levelRange: [LEVEL_BANDS.max.min, LEVEL_BANDS.max.max], nextSiegeDay: nextDay, nextSiegeMinute: SIEGE_MINUTE };
};

const notifyOnce = (server: ServerState, id: string, title: string, text: string, lines: string[] = []): ServerState => {
  if ((server.notifications ?? []).some((notification) => notification.id === id)) return server;
  return { ...server, notifications: [...(server.notifications ?? []), { id, type: 'guild', title, text, lines }] };
};

const classRole = (classId?: string) => {
  if (classId === 'warrior') return 'tank' as const;
  if (classId === 'priest') return 'healer' as const;
  if (classId === 'mage') return 'magicDps' as const;
  return 'physicalDps' as const;
};

const castleTierAllowed = (guild: Guild, castle: Castle) => {
  if (castle.tier === 'max') return guild.tier === 'max';
  if (castle.tier === 'high') return guild.tier === 'high' || guild.tier === 'max';
  return guild.tier === 'mid' || guild.tier === 'high' || guild.tier === 'max';
};


const isOfficerOrLeader = (guild: Guild | undefined, id: Id) =>
  Boolean(guild && (guild.leaderId === id || guild.deputyId === id || (guild.officerIds ?? []).includes(id)));

interface SiegeLookupContext {
  npcById: Map<Id, NpcPlayer>;
  guildById: Map<Id, Guild>;
  validMemberIds: Set<Id>;
  rosterCache: Map<string, Id[]>;
  powerCache: Map<Id, number>;
}

const createSiegeLookupContext = (server: ServerState): SiegeLookupContext => ({
  npcById: new Map((server.npcs ?? []).map((npc) => [npc.id, npc])),
  guildById: new Map((server.guilds ?? []).map((guild) => [guild.id, guild])),
  validMemberIds: new Set([server.player.id, ...(server.npcs ?? []).map((npc) => npc.id)]),
  rosterCache: new Map(),
  powerCache: new Map(),
});

const characterPower = (server: ServerState, id: Id, context: SiegeLookupContext = createSiegeLookupContext(server)) => {
  if (id === server.player.id) {
    return getGearScore(server.player.equipment) + server.player.level * 120 + server.player.arenaRating * 0.4 + 999;
  }

  const npc = context.npcById.get(id);
  if (!npc) return 0;
  return getNpcEffectiveGearScore(npc) + npc.level * 120 + npc.arenaRating * 0.4 + (npc.skill ?? 5) * 80;
};

export const chooseSiegeRosterMembers = (
  server: ServerState,
  guild: Guild,
  maxCount = MAX_ROSTER_SIZE,
  context: SiegeLookupContext = createSiegeLookupContext(server),
): Id[] => {
  const cacheKey = `${guild.id}:${maxCount}`;
  const cached = context.rosterCache.get(cacheKey);
  if (cached) return cached;

  const roster = Array.from(new Set(guild.memberIds))
    .filter((id) => context.validMemberIds.has(id))
    .sort((a, b) => characterPower(server, b, context) - characterPower(server, a, context) || a.localeCompare(b))
    .slice(0, maxCount);

  context.rosterCache.set(cacheKey, roster);
  return roster;
};

const guildPower = (
  server: ServerState,
  guild: Guild,
  context: SiegeLookupContext = createSiegeLookupContext(server),
) => {
  const cached = context.powerCache.get(guild.id);
  if (cached !== undefined) return cached;

  const power = chooseSiegeRosterMembers(server, guild, MAX_ROSTER_SIZE, context)
    .reduce((sum, id) => sum + characterPower(server, id, context), 0);

  context.powerCache.set(guild.id, power);
  return power;
};

const eligibleNpcGuildsForCastle = (
  server: ServerState,
  castle: Castle,
  context: SiegeLookupContext = createSiegeLookupContext(server),
) => {
  const playerGuildId = server.player.guildId;
  return server.guilds
    .filter((guild) => guild.id !== playerGuildId)
    .filter((guild) => castleTierAllowed(guild, castle))
    .filter((guild) => chooseSiegeRosterMembers(server, guild, MAX_ROSTER_SIZE, context).length >= MIN_ROSTER_SIZE)
    .sort((a, b) => {
      if (a.id === castle.ownerGuildId) return -1;
      if (b.id === castle.ownerGuildId) return 1;
      return guildPower(server, b, context) - guildPower(server, a, context) || (b.pvpRating ?? 0) - (a.pvpRating ?? 0);
    })
    .slice(0, MAX_GUILDS_PER_SIEGE);
};



const normalizeSiegeDisplayText = (value: string) => {
  const oldHighGuildReason = `Нужна ${'хай'}-гильдия.`;
  return value
    .replace(/High · 20/g, 'Максимальный · 60')
    .replace(/Mid · 10–19/g, 'Средний · 21–40')
    .replace(new RegExp(`хай-${'гильдии'}`, 'g'), 'гильдии нужного уровня')
    .replace(new RegExp(oldHighGuildReason, 'g'), 'Нужна гильдия максимального уровня.');
};

const normalizeCastleHistoryEntry = (entry: CastleHistoryEntry): CastleHistoryEntry => ({
  ...entry,
  scoreSummary: normalizeSiegeDisplayText(entry.scoreSummary),
});

const buildRoster = (
  server: ServerState,
  castleId: Id,
  guild: Guild,
  context: SiegeLookupContext = createSiegeLookupContext(server),
): SiegeRoster => ({
  castleId,
  guildId: guild.id,
  memberIds: chooseSiegeRosterMembers(server, guild, MAX_ROSTER_SIZE, context),
  registeredDay: server.serverDay,
  registeredMinute: server.currentMinute,
});

const normalizeCastles = (server: ServerState): Castle[] => {
  const existing = new Map((server.castles ?? []).map((castle) => [castle.id, castle]));
  const guildIds = new Set((server.guilds ?? []).map((guild) => guild.id));

  return DEFAULT_CASTLES.map((base) => {
    const old = existing.get(base.id);
    const history = (old?.history ?? base.history ?? []).map(normalizeCastleHistoryEntry);
    const merged: Castle = {
      ...base,
      ...old,
      id: base.id,
      name: base.name,
      tier: base.tier,
      levelRange: base.levelRange,
      mapId: base.mapId,
      history,
    };

    return normalizeCastleSchedule(server, {
      ...merged,
      registeredGuildIds: Array.from(new Set([...(old?.registeredGuildIds ?? [])])).filter((id) => guildIds.has(id)),
    });
  });
};

const upsertRoster = (rosters: SiegeRoster[], roster: SiegeRoster) => [
  ...rosters.filter((entry) => !(entry.castleId === roster.castleId && entry.guildId === roster.guildId)),
  roster,
];

const rosterKey = (castleId: Id, guildId: Id) => `${castleId}:${guildId}`;

const registrationWindowOpen = (server: ServerState, castle: Castle) => {
  const now = totalMinute(server.serverDay, server.currentMinute);
  const due = totalMinute(castle.nextSiegeDay, castle.nextSiegeMinute);
  return now >= due - REGISTRATION_DAYS_BEFORE * 1440 && now < due;
};


const selectSiegeGuildsForCastle = (
  server: ServerState,
  castle: Castle,
  context: SiegeLookupContext = createSiegeLookupContext(server),
): Guild[] => {
  const playerGuildId = server.player.guildId;
  const candidates = server.guilds
    .filter((guild) => castleTierAllowed(guild, castle))
    .filter((guild) => chooseSiegeRosterMembers(server, guild, MAX_ROSTER_SIZE, context).length >= MIN_ROSTER_SIZE)
    .sort((a, b) => {
      if (a.id === castle.ownerGuildId) return -1;
      if (b.id === castle.ownerGuildId) return 1;
      if (a.id === playerGuildId) return -1;
      if (b.id === playerGuildId) return 1;
      return guildPower(server, b, context) - guildPower(server, a, context) || (b.pvpRating ?? 0) - (a.pvpRating ?? 0);
    });

  const picked: Guild[] = [];
  const add = (guild?: Guild) => {
    if (!guild) return;
    if (picked.some((entry) => entry.id === guild.id)) return;
    if (picked.length >= MAX_GUILDS_PER_SIEGE) return;
    picked.push(guild);
  };

  add(candidates.find((guild) => guild.id === castle.ownerGuildId));
  add(candidates.find((guild) => guild.id === playerGuildId));
  candidates.forEach(add);
  return picked;
};



const registerGuildsForCastleNow = (server: ServerState, castle: Castle): ServerState => {
  let next = { ...server, castles: normalizeCastles(server), siegeRosters: [...(server.siegeRosters ?? [])] };
  const rosters = [...(next.siegeRosters ?? [])];
  const context = createSiegeLookupContext(next);
  const playerGuildAlreadyRegistered = rosters.some((entry) => entry.castleId === castle.id && entry.guildId === next.player.guildId);

  selectSiegeGuildsForCastle(next, castle, context).forEach((guild) => {
    if (guild.id === next.player.guildId && !playerGuildAlreadyRegistered) return;
    const memberIds = chooseSiegeRosterMembers(next, guild, MAX_ROSTER_SIZE, context);
    if (memberIds.length < MIN_ROSTER_SIZE) return;
    rosters.splice(0, rosters.length, ...upsertRoster(rosters, {
      castleId: castle.id,
      guildId: guild.id,
      memberIds,
      registeredDay: next.serverDay,
      registeredMinute: next.currentMinute,
    }));
  });

  const byCastle = new Map<string, Set<string>>();
  rosters.forEach((roster) => {
    if (!byCastle.has(roster.castleId)) byCastle.set(roster.castleId, new Set());
    byCastle.get(roster.castleId)!.add(roster.guildId);
  });

  next = {
    ...next,
    siegeRosters: rosters,
    castles: (next.castles ?? []).map((entry) => ({ ...entry, registeredGuildIds: Array.from(byCastle.get(entry.id) ?? new Set()) })),
  };

  return notifyPlayerIfRostered(next);
};

const autoRegisterNpcGuildsForOpenSieges = (server: ServerState): ServerState => {
  let next = { ...server, castles: normalizeCastles(server), siegeRosters: server.siegeRosters ?? [] };
  const rosters = [...(next.siegeRosters ?? [])];

  for (const castle of next.castles ?? []) {
    if (!registrationWindowOpen(next, castle)) continue;

    const context = createSiegeLookupContext(next);
    const selectedGuilds = selectSiegeGuildsForCastle(next, castle, context).filter((guild) => guild.id !== next.player.guildId);

    for (const guild of selectedGuilds) {
      const strongest = chooseSiegeRosterMembers(next, guild, MAX_ROSTER_SIZE, context);
      if (strongest.length < MIN_ROSTER_SIZE) continue;

      const existing = rosters.find((entry) => entry.castleId === castle.id && entry.guildId === guild.id);
      const same = existing && existing.memberIds.join('|') === strongest.join('|');
      if (same) continue;

      const roster = {
        castleId: castle.id,
        guildId: guild.id,
        memberIds: strongest,
        registeredDay: next.serverDay,
        registeredMinute: next.currentMinute,
      };
      rosters.splice(0, rosters.length, ...upsertRoster(rosters, roster));
    }
  }

  const byCastle = new Map<string, Set<string>>();
  rosters.forEach((roster) => {
    if (!byCastle.has(roster.castleId)) byCastle.set(roster.castleId, new Set());
    byCastle.get(roster.castleId)!.add(roster.guildId);
  });

  next = {
    ...next,
    siegeRosters: rosters,
    castles: (next.castles ?? []).map((castle) => ({ ...castle, registeredGuildIds: Array.from(byCastle.get(castle.id) ?? new Set()) })),
  };

  return next;
};

const notifyPlayerIfRostered = (server: ServerState): ServerState => {
  const guildId = server.player.guildId;
  if (!guildId) return server;

  let next = server;
  for (const roster of server.siegeRosters ?? []) {
    if (roster.guildId !== guildId) continue;
    if (!roster.memberIds.includes(server.player.id)) continue;

    const castle = (server.castles ?? []).find((entry) => entry.id === roster.castleId);
    if (!castle) continue;

    next = notifyOnce(
      next,
      `siege_rostered_${roster.castleId}_${roster.registeredDay}_${roster.registeredMinute}`,
      'Ты в составе на осаду',
      castle.name,
      [
        `Замок: ${castle.name}`,
        `Старт: день ${castle.nextSiegeDay}, 00:00`,
        'Ты в составе сильнейших бойцов гильдии.',
      ],
    );
  }

  return next;
};

export const normalizeSiegeState = (server: ServerState): ServerState => {
  const baseCastles = normalizeCastles(server);
  const castleIds = new Set(baseCastles.map((castle) => castle.id));
  const guildIds = new Set(server.guilds.map((guild) => guild.id));
  const memberIds = new Set([server.player.id, ...server.npcs.map((npc) => npc.id)]);

  const siegeRosters = (server.siegeRosters ?? [])
    .filter((roster) => castleIds.has(roster.castleId) && guildIds.has(roster.guildId))
    .map((roster) => {
      const guild = server.guilds.find((entry) => entry.id === roster.guildId);
      const strongest = guild ? chooseSiegeRosterMembers(server, guild, MAX_ROSTER_SIZE) : [];
      const nextMembers = strongest.length >= MIN_ROSTER_SIZE
        ? strongest
        : Array.from(new Set(roster.memberIds)).filter((id) => memberIds.has(id));
      return { ...roster, memberIds: nextMembers.slice(0, MAX_ROSTER_SIZE) };
    })
    .filter((roster) => roster.memberIds.length >= MIN_ROSTER_SIZE && roster.memberIds.length <= MAX_ROSTER_SIZE);

  const base: ServerState = {
    ...server,
    castles: baseCastles,
    siegeRosters,
    siegeHistory: server.siegeHistory ?? [],
    currentSiegeRun: server.currentSiegeRun?.status === 'active' ? server.currentSiegeRun : server.currentSiegeRun,
  };
  return notifyPlayerIfRostered(autoRegisterNpcGuildsForOpenSieges(base));
};

const getPlayerGuildCastleRegistrationCheck = (server: ServerState, castleId: Id): { ok: boolean; reason?: string } => {
  const castles = server.castles?.length ? server.castles : normalizeCastles(server);
  const castle = castles.find((entry) => entry.id === castleId);
  const guild = server.guilds.find((entry) => entry.id === server.player.guildId);
  if (!castle) return { ok: false, reason: 'Замок не найден.' };
  if (!guild) return { ok: false, reason: 'Нет гильдии.' };
  if (!isOfficerOrLeader(guild, server.player.id)) return { ok: false, reason: 'Нужен ГМ, зам или офицер.' };
  if (!castleTierAllowed(guild, castle)) return { ok: false, reason: castle.tier === 'max' ? 'Нужна гильдия максимального уровня.' : 'Нужна гильдия подходящего уровня.' };
  if (!registrationWindowOpen(server, castle)) return { ok: false, reason: 'Регистрация откроется за 3 дня до осады.' };
  if ((server.siegeRosters ?? []).some((roster) => roster.castleId === castleId && roster.guildId === guild.id)) return { ok: false, reason: 'Гильдия уже зарегистрирована.' };
  const roster = chooseSiegeRosterMembers(server, guild, MAX_ROSTER_SIZE);
  if (roster.length < MIN_ROSTER_SIZE) return { ok: false, reason: 'Нужно минимум 5 участников.' };
  return { ok: true };
};

export const canRegisterPlayerGuildForCastle = getPlayerGuildCastleRegistrationCheck;

export const canUnregisterPlayerGuildFromCastle = (server: ServerState, castleId: Id): { ok: boolean; reason?: string } => {
  const normalized = normalizeSiegeState(server);
  const guild = normalized.guilds.find((entry) => entry.id === normalized.player.guildId);
  const roster = (normalized.siegeRosters ?? []).find((entry) => entry.castleId === castleId && entry.guildId === guild?.id);
  if (!guild) return { ok: false, reason: 'Нет гильдии.' };
  if (!roster) return { ok: false, reason: 'Гильдия не зарегистрирована.' };
  if (!isOfficerOrLeader(guild, normalized.player.id)) return { ok: false, reason: 'Нужен ГМ, зам или офицер.' };
  if (normalized.currentSiegeRun?.status === 'active' && normalized.currentSiegeRun.castleId === castleId) return { ok: false, reason: 'Осада уже идёт.' };
  return { ok: true };
};

export const registerPlayerGuildForCastle = (server: ServerState, castleId: Id): ServerState => {
  const normalized = normalizeSiegeState(server);
  const check = getPlayerGuildCastleRegistrationCheck(normalized, castleId);
  if (!check.ok) return { ...normalized, notifications: [...(normalized.notifications ?? []), { id: `siege_register_fail_${castleId}_${normalized.serverDay}_${normalized.currentMinute}`, type: 'guild', title: 'Осада недоступна', text: check.reason ?? 'Регистрация невозможна.', lines: [check.reason ?? 'Регистрация невозможна.'] }] };
  const guild = normalized.guilds.find((entry) => entry.id === normalized.player.guildId)!;
  const memberIds = chooseSiegeRosterMembers(normalized, guild, MAX_ROSTER_SIZE);
  const roster: SiegeRoster = {
    castleId,
    guildId: guild.id,
    memberIds,
    registeredDay: normalized.serverDay,
    registeredMinute: normalized.currentMinute,
  };
  const next = {
    ...normalized,
    siegeRosters: upsertRoster(normalized.siegeRosters ?? [], roster),
  };
  return notifyPlayerIfRostered(autoRegisterNpcGuildsForOpenSieges({
    ...next,
    notifications: [...(next.notifications ?? []), { id: `siege_register_${castleId}_${normalized.serverDay}_${normalized.currentMinute}`, type: 'guild', title: 'Состав зарегистрирован', text: guild.name, lines: [`Замок: ${normalized.castles!.find((castle) => castle.id === castleId)?.name ?? castleId}`, `Сильнейшие бойцы: ${memberIds.length}/10`] }],
  }));
};

export const unregisterPlayerGuildFromCastle = (server: ServerState, castleId: Id): ServerState => {
  const normalized = normalizeSiegeState(server);
  const check = canUnregisterPlayerGuildFromCastle(normalized, castleId);
  if (!check.ok) {
    return {
      ...normalized,
      notifications: [
        ...(normalized.notifications ?? []),
        {
          id: `siege_unregister_fail_${castleId}_${normalized.serverDay}_${normalized.currentMinute}`,
          type: 'guild',
          title: 'Регистрация не снята',
          text: check.reason ?? 'Недостаточно прав.',
          lines: [check.reason ?? 'Недостаточно прав.'],
        },
      ],
    };
  }

  const guildId = normalized.player.guildId!;
  return autoRegisterNpcGuildsForOpenSieges({
    ...normalized,
    siegeRosters: (normalized.siegeRosters ?? []).filter((roster) => !(roster.castleId === castleId && roster.guildId === guildId)),
    notifications: [
      ...(normalized.notifications ?? []),
      {
        id: `siege_unregister_${castleId}_${normalized.serverDay}_${normalized.currentMinute}`,
        type: 'guild',
        title: 'Регистрация снята',
        text: 'Состав снят с осады.',
        lines: ['Гильдия больше не зарегистрирована на эту осаду.'],
      },
    ],
  });
};

const passable = (cell?: SiegeCell) => Boolean(cell && cell.type !== 'wall');
const cellAt = (run: SiegeRun, x: number, y: number) => getSiegeMapById(run.mapId).cells.find((cell) => cell.x === x && cell.y === y);
const occupied = (run: SiegeRun, x: number, y: number) => run.units.some((unit) => unit.alive && unit.x === x && unit.y === y);
const distance = (a: SiegeUnit, b: SiegeUnit) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const spawnPoints = (mapId: string) => getSiegeMapById(mapId).cells.filter((cell) => cell.type === 'spawn' || cell.type === 'floor' || cell.type === 'center');

const makeUnit = (server: ServerState, sourceId: Id, guildId: Id, index: number, spawn: SiegeCell): SiegeUnit | null => {
  if (sourceId === server.player.id) {
    const stats = getPlayerStats(server.player);
    return {
      id: `siege_${sourceId}`,
      sourceId,
      guildId,
      name: server.player.name,
      classId: server.player.classId,
      role: classRole(server.player.classId),
      hp: Math.max(1, Math.min(server.player.hp, stats.hp)),
      maxHp: stats.hp,
      mana: Math.max(0, Math.min(server.player.mana, stats.mana)),
      maxMana: stats.mana,
      attack: stats.attack,
      magic: stats.magic,
      defense: stats.defense,
      speed: stats.speed,
      x: spawn.x,
      y: spawn.y,
      alive: true,
      kills: 0,
      damageDealt: 0,
      healingDone: 0,
    };
  }
  const npc = server.npcs.find((entry) => entry.id === sourceId);
  if (!npc) return null;
  const stats = getNpcPlayerEquivalentStats(npc);
  return {
    id: `siege_${sourceId}`,
    sourceId,
    guildId,
    name: npc.name,
    classId: npc.classId,
    role: classRole(npc.classId),
    hp: stats.hp,
    maxHp: stats.hp,
    mana: stats.mana,
    maxMana: stats.mana,
    attack: stats.attack,
    magic: stats.magic,
    defense: stats.defense,
    speed: stats.speed,
    x: spawn.x,
    y: spawn.y,
    alive: true,
    kills: 0,
    damageDealt: 0,
    healingDone: 0,
  };
};

const createSiegeRun = (server: ServerState, castle: Castle, rosters: SiegeRoster[], rng: Rng): SiegeRun => {
  const context = createSiegeLookupContext(server);
  const spawns = spawnPoints(castle.mapId);
  const units: SiegeUnit[] = [];

  rosters
    .slice(0, MAX_GUILDS_PER_SIEGE)
    .sort((a, b) => {
      const guildA = context.guildById.get(a.guildId);
      const guildB = context.guildById.get(b.guildId);
      return (guildB ? guildPower(server, guildB, context) : 0) - (guildA ? guildPower(server, guildA, context) : 0);
    })
    .forEach((roster, rosterIndex) => {
      roster.memberIds.slice(0, MAX_ROSTER_SIZE).forEach((memberId, memberIndex) => {
        const spawn = spawns[(rosterIndex * 3 + memberIndex) % spawns.length];
        const unit = makeUnit(server, memberId, roster.guildId, memberIndex, spawn);
        if (unit) units.push(unit);
      });
    });

  return {
    id: uid(`siege_${castle.id}`, rng),
    castleId: castle.id,
    mapId: castle.mapId,
    day: server.serverDay,
    minute: server.currentMinute,
    status: 'active',
    participatingGuildIds: Array.from(new Set(rosters.slice(0, MAX_GUILDS_PER_SIEGE).map((roster) => roster.guildId))),
    units,
    turn: 1,
    log: [`Осада началась: ${castle.name}. Нажми "Начать осаду".`],
  };
};



const nearestEnemy = (unit: SiegeUnit, units: SiegeUnit[]) =>
  units.filter((other) => other.alive && other.guildId !== unit.guildId).sort((a, b) => distance(unit, a) - distance(unit, b) || (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];

const woundedAlly = (unit: SiegeUnit, units: SiegeUnit[]) =>
  units.filter((other) => other.alive && other.guildId === unit.guildId && other.hp < other.maxHp && distance(unit, other) <= 2).sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];

const nextManualPosition = (run: SiegeRun, unit: SiegeUnit, direction: SiegeMoveDirection): { x: number; y: number } | undefined => {
  const delta = direction === 'up' ? { x: 0, y: -1 } : direction === 'down' ? { x: 0, y: 1 } : direction === 'left' ? { x: -1, y: 0 } : direction === 'right' ? { x: 1, y: 0 } : undefined;
  if (!delta) return undefined;
  const pos = { x: unit.x + delta.x, y: unit.y + delta.y };
  if (pos.x < 0 || pos.x >= 10 || pos.y < 0 || pos.y >= 10) return undefined;
  if (!passable(cellAt(run, pos.x, pos.y)) || occupied(run, pos.x, pos.y)) return undefined;
  return pos;
};

const moveToward = (run: SiegeRun, unit: SiegeUnit, target: SiegeUnit, manualDirection?: SiegeMoveDirection): SiegeUnit => {
  const manual = manualDirection ? nextManualPosition(run, unit, manualDirection) : undefined;
  if (manual) return { ...unit, x: manual.x, y: manual.y };

  const options = [
    { x: unit.x + Math.sign(target.x - unit.x), y: unit.y },
    { x: unit.x, y: unit.y + Math.sign(target.y - unit.y) },
    { x: unit.x + 1, y: unit.y },
    { x: unit.x - 1, y: unit.y },
    { x: unit.x, y: unit.y + 1 },
    { x: unit.x, y: unit.y - 1 },
  ].filter((pos) => pos.x >= 0 && pos.x < 10 && pos.y >= 0 && pos.y < 10 && passable(cellAt(run, pos.x, pos.y)) && !occupied(run, pos.x, pos.y));
  const best = options.sort((a, b) => Math.abs(a.x - target.x) + Math.abs(a.y - target.y) - (Math.abs(b.x - target.x) + Math.abs(b.y - target.y)))[0];
  return best ? { ...unit, x: best.x, y: best.y } : unit;
};

export const isPlayerSiegeCommander = (server: ServerState, run = server.currentSiegeRun): boolean => {
  if (!run || run.status !== 'active') return false;
  const guild = server.guilds.find((entry) => entry.id === server.player.guildId);
  return Boolean(guild && guild.leaderId === server.player.id && run.participatingGuildIds.includes(guild.id));
};

export const shouldAutoResolveSiege = (server: ServerState, run: SiegeRun): boolean => {
  if (run.status !== 'active') return false;
  const playerGuildId = server.player.guildId;
  if (!playerGuildId) return true;
  if (!run.participatingGuildIds.includes(playerGuildId)) return true;
  if (!run.units.some((unit) => unit.sourceId === server.player.id && unit.guildId === playerGuildId)) return true;
  return !isPlayerSiegeCommander(server, run);
};

const resolveSiegeTurn = (run: SiegeRun, rng: Rng, playerGuildId?: Id, playerDirection: SiegeMoveDirection = 'auto'): SiegeRun => {
  let units = run.units.map((unit) => ({ ...unit }));
  const log: string[] = [];
  const order = [...units].filter((unit) => unit.alive).sort((a, b) => b.speed - a.speed || a.name.localeCompare(b.name));

  order.forEach((snapshot) => {
    const actorIndex = units.findIndex((unit) => unit.id === snapshot.id);
    const actor = units[actorIndex];
    if (!actor?.alive) return;

    const aliveGuilds = new Set(units.filter((unit) => unit.alive).map((unit) => unit.guildId));
    if (aliveGuilds.size <= 1) return;

    if (actor.role === 'healer') {
      const ally = woundedAlly(actor, units);
      if (ally && actor.mana >= 8) {
        const heal = Math.max(8, Math.round(actor.magic * 0.75 + rng.int(3, 12)));
        units = units.map((unit) => unit.id === ally.id ? { ...unit, hp: Math.min(unit.maxHp, unit.hp + heal) } : unit.id === actor.id ? { ...unit, mana: Math.max(0, unit.mana - 8), healingDone: unit.healingDone + heal } : unit);
        log.push(`${actor.name} лечит ${ally.name} +${heal}.`);
        return;
      }
    }

    const target = nearestEnemy(actor, units);
    if (!target) return;
    if (distance(actor, target) <= 1) {
      const raw = actor.classId === 'mage' || actor.classId === 'priest' ? actor.magic : actor.attack;
      const crit = rng.chance(actor.role === 'physicalDps' || actor.role === 'magicDps' ? 0.14 : 0.08);
      const damage = Math.max(1, Math.round((raw + rng.int(-4, 6)) * (crit ? 1.45 : 1) - target.defense * 0.45));
      units = units.map((unit) => {
        if (unit.id === actor.id) return { ...unit, damageDealt: unit.damageDealt + damage };
        if (unit.id !== target.id) return unit;
        const hp = Math.max(0, unit.hp - damage);
        return { ...unit, hp, alive: hp > 0, lastHitById: actor.sourceId };
      });
      const killed = target.hp > 0 && target.hp - damage <= 0;
      if (killed) units = units.map((unit) => unit.id === actor.id ? { ...unit, kills: unit.kills + 1 } : unit);
      log.push(`${actor.name} бьёт ${target.name} — ${damage}${crit ? ' · крит' : ''}${killed ? ' · выбит' : ''}.`);
      return;
    }

    const manualDirection = actor.guildId === playerGuildId ? playerDirection : 'auto';
    const moved = moveToward({ ...run, units }, actor, target, manualDirection);
    if (moved.x !== actor.x || moved.y !== actor.y) {
      units[actorIndex] = moved;
      log.push(`${actor.name} двигается ${manualDirection !== 'auto' && actor.guildId === playerGuildId ? `по приказу: ${manualDirection}` : `к ${target.name}`}.`);
    }
  });

  return { ...run, units, turn: run.turn + 1, log: [...run.log, ...log].slice(-80) };
};

const chooseWinner = (run: SiegeRun, castle: Castle): Id | undefined => {
  const aliveUnits = run.units.filter((unit) => unit.alive);
  const aliveGuilds = Array.from(new Set(aliveUnits.map((unit) => unit.guildId)));
  if (aliveGuilds.length === 1) return aliveGuilds[0];
  const scores = aliveGuilds.map((guildId) => ({
    guildId,
    alive: aliveUnits.filter((unit) => unit.guildId === guildId).length,
    hp: aliveUnits.filter((unit) => unit.guildId === guildId).reduce((sum, unit) => sum + unit.hp, 0),
  })).sort((a, b) => b.alive - a.alive || b.hp - a.hp);
  if (scores.length === 0) return castle.ownerGuildId;
  if (scores.length > 1 && scores[0].alive === scores[1].alive && scores[0].hp === scores[1].hp) return castle.ownerGuildId;
  return scores[0].guildId;
};

const siegeMvp = (run: SiegeRun): Id | undefined =>
  [...run.units].sort((a, b) => b.kills - a.kills || b.damageDealt - a.damageDealt || b.healingDone - a.healingDone)[0]?.sourceId;

const scoreSummary = (run: SiegeRun) =>
  run.participatingGuildIds.map((guildId) => {
    const units = run.units.filter((unit) => unit.guildId === guildId);
    return `${guildId}: alive ${units.filter((unit) => unit.alive).length}/${units.length}, kills ${units.reduce((sum, unit) => sum + unit.kills, 0)}`;
  }).join(' | ');

const finishSiege = (server: ServerState, castle: Castle, run: SiegeRun, winnerGuildId: Id | undefined, rng: Rng): ServerState => {
  const previousOwnerGuildId = castle.ownerGuildId;
  const mvpId = siegeMvp(run);
  const entry: CastleHistoryEntry = {
    day: server.serverDay,
    minute: server.currentMinute,
    winnerGuildId,
    previousOwnerGuildId,
    participatingGuildIds: run.participatingGuildIds,
    scoreSummary: scoreSummary(run),
    mvpId,
  };
  const targetWeekday = CASTLE_SIEGE_WEEKDAYS[castle.id] ?? 0;
  const updatedCastle: Castle = {
    ...castle,
    ownerGuildId: winnerGuildId,
    nextSiegeDay: nextScheduledDay(server.serverDay + 1, 0, targetWeekday),
    nextSiegeMinute: SIEGE_MINUTE,
    registeredGuildIds: [],
    history: [entry, ...(castle.history ?? [])].slice(0, 20),
    lastSiegeRunId: run.id,
    lastResolvedSiegeDay: server.serverDay,
  };

  const aliveWinnerIds = new Set(run.units.filter((unit) => unit.alive && unit.guildId === winnerGuildId).map((unit) => unit.sourceId));
  const siegeNpcSourceIds = new Set(run.units.map((unit) => unit.sourceId));
  let next: ServerState = {
    ...server,
    castles: (server.castles ?? DEFAULT_CASTLES).map((item) => item.id === castle.id ? updatedCastle : item),
    siegeRosters: (server.siegeRosters ?? []).filter((roster) => roster.castleId !== castle.id),
    currentSiegeRun: { ...run, status: 'finished', winnerGuildId },
    siegeHistory: [entry, ...(server.siegeHistory ?? [])].slice(0, 60),
    guilds: server.guilds.map((guild) => {
      const withoutOldControl = guild.castleControl === castle.id && guild.id !== winnerGuildId ? { ...guild, castleControl: undefined } : guild;
      if (guild.id !== winnerGuildId) return withoutOldControl;
      return { ...withoutOldControl, castleControl: castle.id, treasuryGold: (guild.treasuryGold ?? 0) + 25000, reputation: guild.reputation + 500 };
    }),
    npcs: server.npcs.map((npc) => siegeNpcSourceIds.has(npc.id) ? { ...npc, locationMode: 'city', currentZoneId: undefined, currentSpotId: undefined } : npc),
  };

  if (aliveWinnerIds.has(server.player.id)) {
    const stats = getPlayerStats(server.player);
    next = { ...next, player: { ...next.player, hp: stats.hp, mana: stats.mana } };
  } else if (run.units.some((unit) => unit.sourceId === server.player.id)) {
    next = { ...next, location: { mode: 'city' }, player: { ...next.player, hp: 1, mana: 0 } };
  }

  const winnerName = winnerGuildId ? server.guilds.find((guild) => guild.id === winnerGuildId)?.name ?? winnerGuildId : 'нет победителя';
  return addNews(next, rng, 'guild', `${castle.name}: осада завершена. Победитель: ${winnerName}.`, true);
};

const finishSiegeWithoutCombat = (server: ServerState, castle: Castle, winnerGuildId: Id | undefined, participatingGuildIds: Id[], rng: Rng, logLine: string): ServerState => {
  const previousOwnerGuildId = castle.ownerGuildId;
  const run: SiegeRun = {
    id: uid(`siege_${castle.id}`, rng),
    castleId: castle.id,
    mapId: castle.mapId,
    day: server.serverDay,
    minute: server.currentMinute,
    status: 'finished',
    participatingGuildIds,
    units: [],
    turn: 0,
    log: [logLine],
    winnerGuildId,
  };
  const entry: CastleHistoryEntry = {
    day: server.serverDay,
    minute: server.currentMinute,
    winnerGuildId,
    previousOwnerGuildId,
    participatingGuildIds,
    scoreSummary: logLine,
  };
  const targetWeekday = CASTLE_SIEGE_WEEKDAYS[castle.id] ?? 0;
  const updatedCastle: Castle = {
    ...castle,
    ownerGuildId: winnerGuildId,
    nextSiegeDay: nextScheduledDay(server.serverDay + 1, 0, targetWeekday),
    nextSiegeMinute: SIEGE_MINUTE,
    registeredGuildIds: [],
    history: [entry, ...(castle.history ?? [])].slice(0, 20),
    lastSiegeRunId: run.id,
    lastResolvedSiegeDay: server.serverDay,
  };
  const next: ServerState = {
    ...server,
    castles: (server.castles ?? DEFAULT_CASTLES).map((item) => item.id === castle.id ? updatedCastle : item),
    siegeRosters: (server.siegeRosters ?? []).filter((roster) => roster.castleId !== castle.id),
    currentSiegeRun: run,
    siegeHistory: [entry, ...(server.siegeHistory ?? [])].slice(0, 60),
  };
  const winnerName = winnerGuildId ? server.guilds.find((guild) => guild.id === winnerGuildId)?.name ?? winnerGuildId : 'РЅРµС‚ РїРѕР±РµРґРёС‚РµР»СЏ';
  return addNews(next, rng, 'guild', `${castle.name}: РѕСЃР°РґР° Р·Р°РІРµСЂС€РµРЅР°. РџРѕР±РµРґРёС‚РµР»СЊ: ${winnerName}.`, true);
};

export const autoResolveSiegeRun = (server: ServerState, castle: Castle, run: SiegeRun, rng: Rng): ServerState => {
  let nextRun = run;
  let guard = 0;
  while (guard < MAX_SIEGE_TURNS) {
    const aliveGuilds = new Set(nextRun.units.filter((unit) => unit.alive).map((unit) => unit.guildId));
    if (nextRun.turn > MAX_SIEGE_TURNS || aliveGuilds.size <= 1) break;
    nextRun = resolveSiegeTurn(nextRun, rng);
    guard += 1;
  }
  const winnerGuildId = chooseWinner(nextRun, castle);
  return finishSiege(server, castle, { ...nextRun, status: 'finished', winnerGuildId }, winnerGuildId, rng);
};

const openDueSiege = (server: ServerState, castle: Castle, rosters: SiegeRoster[], rng: Rng): ServerState => {
  const dueRosters = rosters.slice(0, MAX_GUILDS_PER_SIEGE);
  if (dueRosters.length <= 0) {
    return finishSiegeWithoutCombat(server, castle, castle.ownerGuildId, [], rng, `${castle.name}: РЅРёРєС‚Рѕ РЅРµ Р·Р°СЂРµРіРёСЃС‚СЂРёСЂРѕРІР°Р»СЃСЏ РЅР° РѕСЃР°РґСѓ.`);
  }

  const run = createSiegeRun(server, castle, dueRosters, rng);

  if (dueRosters.length === 1) {
    const winnerGuildId = dueRosters[0].guildId;
    return finishSiege(server, castle, { ...run, status: 'finished', winnerGuildId, log: [...run.log, 'Р•РґРёРЅСЃС‚РІРµРЅРЅР°СЏ Р·Р°СЂРµРіРёСЃС‚СЂРёСЂРѕРІР°РЅРЅР°СЏ РіРёР»СЊРґРёСЏ Р·Р°Р±РёСЂР°РµС‚ Р·Р°РјРѕРє.'] }, winnerGuildId, rng);
  }

  const withRun = {
    ...server,
    currentSiegeRun: run,
    castles: (server.castles ?? DEFAULT_CASTLES).map((item) => item.id === castle.id ? { ...item, lastResolvedSiegeDay: server.serverDay } : item),
  };

  if (shouldAutoResolveSiege(withRun, run)) return autoResolveSiegeRun(withRun, castle, run, rng);

  return notifyOnce(
    withRun,
    `siege_started_${castle.id}_${server.serverDay}_${SIEGE_MINUTE}`,
    'Осада началась',
    castle.name,
    [`Замок: ${castle.name}`, `Участников: ${run.units.length}`, `Открой вкладку замков и нажми "Начать осаду".`],
  );
};

export const tickSieges = (server: ServerState, rng: Rng, _minutes = 0): ServerState => {
  let next = normalizeSiegeState(server);
  if (next.currentSiegeRun?.status === 'active') {
    const castle = (next.castles ?? DEFAULT_CASTLES).find((entry) => entry.id === next.currentSiegeRun?.castleId);
    if (castle && shouldAutoResolveSiege(next, next.currentSiegeRun)) return autoResolveSiegeRun(next, castle, next.currentSiegeRun, rng);
    return next;
  }

  const now = totalMinute(next.serverDay, next.currentMinute);
  for (const castle of [...(next.castles ?? [])]) {
    const due = totalMinute(castle.nextSiegeDay, castle.nextSiegeMinute);
    if (now < due) continue;
    if (castle.lastResolvedSiegeDay === next.serverDay) continue;
    next = registerGuildsForCastleNow(next, castle);
    const latestCastle = (next.castles ?? []).find((entry) => entry.id === castle.id) ?? castle;
    const rosters = (next.siegeRosters ?? []).filter((roster) => roster.castleId === castle.id);
    next = openDueSiege(next, latestCastle, rosters, rng);
  }
  return next;
};

export const startCurrentSiege = (server: ServerState): ServerState => {
  const run = server.currentSiegeRun;
  if (!run || run.status !== 'active') return server;
  if (run.log.some((line) => line.includes('Команда вышла на карту'))) return server;
  return {
    ...server,
    currentSiegeRun: {
      ...run,
      log: [...run.log, 'Команда вышла на карту. Выбери направление или авто-ход.'].slice(-80),
    },
  };
};

export const advanceCurrentSiege = (server: ServerState, rng: Rng, direction: SiegeMoveDirection = 'auto'): ServerState => {
  const run = server.currentSiegeRun;
  if (!run || run.status !== 'active') return server;
  const castle = (server.castles ?? DEFAULT_CASTLES).find((entry) => entry.id === run.castleId);
  if (!castle) return server;

  let nextRun = resolveSiegeTurn(run, rng, isPlayerSiegeCommander(server, run) ? server.player.guildId : undefined, direction);
  const aliveGuilds = new Set(nextRun.units.filter((unit) => unit.alive).map((unit) => unit.guildId));
  if (nextRun.turn > MAX_SIEGE_TURNS || aliveGuilds.size <= 1) {
    const winnerGuildId = chooseWinner(nextRun, castle);
    return finishSiege(server, castle, { ...nextRun, status: 'finished', winnerGuildId }, winnerGuildId, rng);
  }
  return { ...server, currentSiegeRun: nextRun };
};
