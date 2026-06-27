import { DEFAULT_CASTLES, SIEGE_MAPS, getSiegeMapById } from '../content/castles';
import { addNews } from '../engine/news';
import type { Rng } from '../engine/rng';
import { uid } from '../engine/rng';
import type { Castle, CastleHistoryEntry, Guild, Id, ServerState, SiegeCell, SiegeRoster, SiegeRun, SiegeUnit } from '../types/game';
import { getPlayerStats } from './itemSystem';
import { getNpcEffectiveGearScore, getNpcPlayerEquivalentStats } from './pvpStatSystem';

const MAX_SIEGE_TURNS = 200;
const SIEGE_INTERVAL_DAYS = 7;

const totalMinute = (day: number, minute: number) => (Math.max(1, day) - 1) * 1440 + Math.max(0, minute);

const classRole = (classId?: string) => {
  if (classId === 'warrior') return 'tank' as const;
  if (classId === 'priest') return 'healer' as const;
  if (classId === 'mage') return 'magicDps' as const;
  return 'physicalDps' as const;
};

const castleTierAllowed = (guild: Guild | undefined, castle: Castle) => {
  if (!guild) return false;
  if (castle.tier === 'mid') return guild.level >= 10 && guild.level <= 19;
  if (castle.tier === 'high') return guild.level >= 20;
  return false;
};

const isOfficerOrLeader = (guild: Guild | undefined, id: Id) =>
  Boolean(guild && (guild.leaderId === id || guild.deputyId === id || (guild.officerIds ?? []).includes(id)));

const normalizeCastles = (server: ServerState): Castle[] => {
  const existing = new Map((server.castles ?? []).map((castle) => [castle.id, castle]));
  return DEFAULT_CASTLES.map((base) => {
    const old = existing.get(base.id);
    return {
      ...base,
      ...old,
      registeredGuildIds: Array.from(new Set([...(old?.registeredGuildIds ?? [])])).filter((id) => server.guilds.some((guild) => guild.id === id)),
      history: old?.history ?? [],
    };
  });
};

export const normalizeSiegeState = (server: ServerState): ServerState => {
  const castles = normalizeCastles(server);
  const castleIds = new Set(castles.map((castle) => castle.id));
  const guildIds = new Set(server.guilds.map((guild) => guild.id));
  const memberIds = new Set([server.player.id, ...server.npcs.map((npc) => npc.id)]);
  const siegeRosters = (server.siegeRosters ?? [])
    .filter((roster) => castleIds.has(roster.castleId) && guildIds.has(roster.guildId))
    .map((roster) => ({
      ...roster,
      memberIds: Array.from(new Set(roster.memberIds)).filter((id) => memberIds.has(id)).slice(0, 10),
    }))
    .filter((roster) => roster.memberIds.length >= 5 && roster.memberIds.length <= 10);
  const registeredByCastle = new Map<string, Set<string>>();
  siegeRosters.forEach((roster) => {
    if (!registeredByCastle.has(roster.castleId)) registeredByCastle.set(roster.castleId, new Set());
    registeredByCastle.get(roster.castleId)!.add(roster.guildId);
  });

  return {
    ...server,
    castles: castles.map((castle) => ({
      ...castle,
      registeredGuildIds: Array.from(registeredByCastle.get(castle.id) ?? new Set(castle.registeredGuildIds ?? [])),
    })),
    siegeRosters,
    siegeHistory: server.siegeHistory ?? [],
    currentSiegeRun: server.currentSiegeRun?.status === 'active' ? server.currentSiegeRun : undefined,
  };
};

const chooseRosterMembers = (server: ServerState, guild: Guild, maxCount = 10): Id[] => {
  const members = guild.memberIds
    .map((id) => id === server.player.id ? server.player : server.npcs.find((npc) => npc.id === id))
    .filter(Boolean)
    .sort((a: any, b: any) => {
      const ga = a.id === server.player.id ? 999999 : getNpcEffectiveGearScore(a);
      const gb = b.id === server.player.id ? 999999 : getNpcEffectiveGearScore(b);
      return gb - ga || b.level - a.level;
    });
  return members.slice(0, maxCount).map((member: any) => member.id);
};

export const canRegisterPlayerGuildForCastle = (server: ServerState, castleId: Id): { ok: boolean; reason?: string } => {
  const castle = (server.castles ?? DEFAULT_CASTLES).find((entry) => entry.id === castleId);
  const guild = server.guilds.find((entry) => entry.id === server.player.guildId);
  if (!castle) return { ok: false, reason: 'Замок не найден.' };
  if (!guild) return { ok: false, reason: 'Нет гильдии.' };
  if (!isOfficerOrLeader(guild, server.player.id)) return { ok: false, reason: 'Нужен ГМ, зам или офицер.' };
  if (!castleTierAllowed(guild, castle)) return { ok: false, reason: castle.tier === 'mid' ? 'Нужна гильдия 10–19 уровня.' : 'Нужна гильдия 20 уровня.' };
  if ((server.siegeRosters ?? []).some((roster) => roster.castleId === castleId && roster.guildId === guild.id)) return { ok: false, reason: 'Гильдия уже зарегистрирована.' };
  const roster = chooseRosterMembers(server, guild, 10);
  if (roster.length < 5) return { ok: false, reason: 'Нужно минимум 5 участников.' };
  return { ok: true };
};

export const registerPlayerGuildForCastle = (server: ServerState, castleId: Id): ServerState => {
  const normalized = normalizeSiegeState(server);
  const check = canRegisterPlayerGuildForCastle(normalized, castleId);
  if (!check.ok) return { ...normalized, notifications: [...(normalized.notifications ?? []), { id: `siege_register_fail_${castleId}_${normalized.serverDay}_${normalized.currentMinute}`, type: 'guild', title: 'Осада недоступна', text: check.reason ?? 'Регистрация невозможна.', lines: [check.reason ?? 'Регистрация невозможна.'] }] };
  const guild = normalized.guilds.find((entry) => entry.id === normalized.player.guildId)!;
  const memberIds = chooseRosterMembers(normalized, guild, 10);
  const roster: SiegeRoster = {
    castleId,
    guildId: guild.id,
    memberIds,
    registeredDay: normalized.serverDay,
    registeredMinute: normalized.currentMinute,
  };
  return {
    ...normalized,
    castles: normalized.castles!.map((castle) => castle.id === castleId ? { ...castle, registeredGuildIds: Array.from(new Set([...(castle.registeredGuildIds ?? []), guild.id])) } : castle),
    siegeRosters: [...(normalized.siegeRosters ?? []).filter((entry) => !(entry.castleId === castleId && entry.guildId === guild.id)), roster],
    notifications: [...(normalized.notifications ?? []), { id: `siege_register_${castleId}_${normalized.serverDay}_${normalized.currentMinute}`, type: 'guild', title: 'Состав зарегистрирован', text: guild.name, lines: [`Замок: ${normalized.castles!.find((castle) => castle.id === castleId)?.name ?? castleId}`, `Участников: ${memberIds.length}/10`] }],
  };
};

export const unregisterPlayerGuildFromCastle = (server: ServerState, castleId: Id): ServerState => {
  const normalized = normalizeSiegeState(server);
  const guildId = normalized.player.guildId;
  if (!guildId) return normalized;
  return {
    ...normalized,
    castles: normalized.castles!.map((castle) => castle.id === castleId ? { ...castle, registeredGuildIds: (castle.registeredGuildIds ?? []).filter((id) => id !== guildId) } : castle),
    siegeRosters: (normalized.siegeRosters ?? []).filter((roster) => !(roster.castleId === castleId && roster.guildId === guildId)),
  };
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
  const spawns = spawnPoints(castle.mapId);
  const units: SiegeUnit[] = [];
  rosters.slice(0, 4).forEach((roster, rosterIndex) => {
    roster.memberIds.slice(0, 10).forEach((memberId, memberIndex) => {
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
    participatingGuildIds: rosters.map((roster) => roster.guildId),
    units,
    turn: 1,
    log: [`Осада началась: ${castle.name}. Участников: ${units.length}.`],
  };
};

const nearestEnemy = (unit: SiegeUnit, units: SiegeUnit[]) =>
  units.filter((other) => other.alive && other.guildId !== unit.guildId).sort((a, b) => distance(unit, a) - distance(unit, b) || (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];

const woundedAlly = (unit: SiegeUnit, units: SiegeUnit[]) =>
  units.filter((other) => other.alive && other.guildId === unit.guildId && other.hp < other.maxHp && distance(unit, other) <= 2).sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];

const moveToward = (run: SiegeRun, unit: SiegeUnit, target: SiegeUnit): SiegeUnit => {
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

const resolveSiegeTurn = (run: SiegeRun, rng: Rng): SiegeRun => {
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

    const moved = moveToward({ ...run, units }, actor, target);
    if (moved.x !== actor.x || moved.y !== actor.y) {
      units[actorIndex] = moved;
      log.push(`${actor.name} двигается к ${target.name}.`);
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
  const nextSiegeDay = server.serverDay + SIEGE_INTERVAL_DAYS;
  const updatedCastle: Castle = {
    ...castle,
    ownerGuildId: winnerGuildId,
    nextSiegeDay,
    nextSiegeMinute: castle.nextSiegeMinute,
    registeredGuildIds: [],
    history: [entry, ...(castle.history ?? [])].slice(0, 20),
    lastSiegeRunId: run.id,
    lastResolvedSiegeDay: server.serverDay,
  };

  const aliveWinnerIds = new Set(run.units.filter((unit) => unit.alive && unit.guildId === winnerGuildId).map((unit) => unit.sourceId));
  let next: ServerState = {
    ...server,
    castles: (server.castles ?? DEFAULT_CASTLES).map((item) => item.id === castle.id ? updatedCastle : item),
    siegeRosters: (server.siegeRosters ?? []).filter((roster) => roster.castleId !== castle.id),
    currentSiegeRun: { ...run, status: 'finished', winnerGuildId },
    siegeHistory: [entry, ...(server.siegeHistory ?? [])].slice(0, 60),
    guilds: server.guilds.map((guild) => {
      if (guild.id !== winnerGuildId) return guild;
      const reward = castle.tier === 'high' ? 25000 : 10000;
      return { ...guild, castleControl: castle.id, treasuryGold: (guild.treasuryGold ?? 0) + reward, reputation: guild.reputation + (castle.tier === 'high' ? 500 : 200) };
    }),
    npcs: server.npcs.map((npc) => {
      if (aliveWinnerIds.has(npc.id)) {
        const unit = run.units.find((siegeUnit) => siegeUnit.sourceId === npc.id);
        return { ...npc, locationMode: 'city', currentZoneId: undefined, currentSpotId: undefined };
      }
      if (run.units.some((unit) => unit.sourceId === npc.id)) return { ...npc, locationMode: 'city', currentZoneId: undefined, currentSpotId: undefined };
      return npc;
    }),
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

const resolveSiege = (server: ServerState, castle: Castle, rosters: SiegeRoster[], rng: Rng): ServerState => {
  if (rosters.length <= 0) {
    return {
      ...server,
      castles: (server.castles ?? DEFAULT_CASTLES).map((item) => item.id === castle.id
        ? { ...item, nextSiegeDay: server.serverDay + SIEGE_INTERVAL_DAYS, registeredGuildIds: [], lastResolvedSiegeDay: server.serverDay }
        : item),
      siegeRosters: (server.siegeRosters ?? []).filter((roster) => roster.castleId !== castle.id),
    };
  }
  if (rosters.length === 1) {
    const winnerGuildId = rosters[0].guildId;
    const run = createSiegeRun(server, castle, rosters, rng);
    return finishSiege(server, castle, { ...run, status: 'finished', winnerGuildId }, winnerGuildId, rng);
  }

  let run = createSiegeRun(server, castle, rosters, rng);
  while (run.turn <= MAX_SIEGE_TURNS && new Set(run.units.filter((unit) => unit.alive).map((unit) => unit.guildId)).size > 1) {
    run = resolveSiegeTurn(run, rng);
  }
  const winnerGuildId = chooseWinner(run, castle);
  return finishSiege(server, castle, { ...run, status: 'finished', winnerGuildId }, winnerGuildId, rng);
};

export const tickSieges = (server: ServerState, rng: Rng, _minutes = 0): ServerState => {
  let next = normalizeSiegeState(server);
  const now = totalMinute(next.serverDay, next.currentMinute);
  for (const castle of [...(next.castles ?? [])]) {
    const due = totalMinute(castle.nextSiegeDay, castle.nextSiegeMinute);
    if (now < due) continue;
    if (castle.lastResolvedSiegeDay === next.serverDay) continue;
    const rosters = (next.siegeRosters ?? []).filter((roster) => roster.castleId === castle.id);
    next = resolveSiege(next, castle, rosters, rng);
  }
  return next;
};
