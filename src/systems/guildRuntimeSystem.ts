import type {
  Guild,
  GuildApplication,
  GuildFocus,
  GuildWar,
  GuildWarKillRecord,
  GuildWarTopKiller,
  Id,
  NpcPlayer,
  ServerState,
} from '../types/game';
import type { Rng } from '../engine/rng';
import { createRng } from '../engine/rng';
import { getGuildRelationValue } from './guildRelationSystem';
import { guildFocusLabel, normalizeGuildFocus } from './guildIdentitySystem';

const SOLO_PREFIX = 'solo_pool_';
const APP_PREFIX = 'player_guild_app_';
const classIds = ['warrior', 'ranger', 'mage', 'priest'];
const raceIds = ['human', 'elf', 'dwarf', 'beastkin'];

const lowNames = ['Рик Травник','Миро Серый','Лана Фокс','Брен Клинок','Томми Лист','Элла Норт','Кайл Пыль','Нора Флинт','Дэн Крик','Сайна Рид','Финн Вест','Оли Рук','Марта Хилл','Гарри Лоу','Вика Шторм','Ронн Вейл','Лея Брик','Арт Кроу','Сэм Вулф','Ина Блейк'];
const midNames = ['Кай Ровен','Мел Тарн','Дора Вейн','Рей Оскар','Ник Стерн','Алис Морн','Глен Форс','Тея Крам','Бруно Вайт','Лисса Нокс','Корин Рив','Эрик Блейз','Майра Стоун','Дакс Элдер','Сара Кейн','Тони Раш','Фрей Лорн','Жан Хольт','Ирма Блэк','Крис Уорд'];
const highNames = ['Варн Дрейк','Селин Рук','Оскар Найт','Рина Грейв','Маркус Рейн','Эш Карвер','Ника Восс','Роланд Кейн','Джуна Вейл','Люк Фрост','Тара Блэйд','Феликс Орн','Мира Харт','Кроу Эймс','Леон Фир','Эдна Стил','Гаррет Винн','Соня Ривер','Барт Холл','Кира Нокс'];

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(value)));
const totalMinute = (day: number, minute: number) => (Math.max(1, day) - 1) * 1440 + Math.max(0, minute);
const npcPower = (npc: NpcPlayer) => Math.max(1, (npc.gearScore ?? 1) * (0.55 + clamp(npc.skill ?? 5, 1, 10) * 0.11));

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

const activeWarExists = (server: ServerState, a: string, b: string) =>
  (server.guildWars ?? []).some((war) =>
    war.status === 'active' &&
    ((war.attackerGuildId === a && war.defenderGuildId === b) ||
      (war.attackerGuildId === b && war.defenderGuildId === a)),
  );

const seedWar = (server: ServerState, attackerGuildId: string, defenderGuildId: string, index: number): GuildWar => ({
  id: `active_war_${server.seed}_${server.serverDay}_${server.currentMinute}_${attackerGuildId}_${defenderGuildId}_${index}`,
  attackerGuildId,
  defenderGuildId,
  status: 'active',
  declaredDay: server.serverDay,
  declaredMinute: server.currentMinute,
  startsDay: server.serverDay,
  startsMinute: server.currentMinute,
  endsDay: server.serverDay + 3,
  endsMinute: server.currentMinute,
  durationDays: 3,
  extensionCount: 0,
  attackerKills: 0,
  defenderKills: 0,
  killRecords: [],
  attackerTopKillers: [],
  defenderTopKillers: [],
  lastSimulatedDay: server.serverDay,
  lastSimulatedMinute: server.currentMinute,
});

export const seedActiveGuildWarsIfEmpty = (server: ServerState): ServerState => {
  const next = normalizeGuildWarsRuntime(server);
  if (next.guildWars.some((war) => war.status === 'active')) return next;
  const guilds = next.guilds ?? [];
  if (guilds.length < 2) return next;

  const candidates: Array<{ a: string; b: string; score: number }> = [];
  guilds.forEach((a) => {
    guilds.forEach((b) => {
      if (a.id >= b.id) return;
      const af = normalizeGuildFocus(a.guildFocus ?? a.type ?? a.focus);
      const bf = normalizeGuildFocus(b.guildFocus ?? b.type ?? b.focus);
      const avg = Math.round((getGuildRelationValue(next, a.id, b.id) + getGuildRelationValue(next, b.id, a.id)) / 2);
      let score = -avg;
      if (af === 'pvp' && bf === 'pvp') score += 45;
      if (af === 'pvp' || bf === 'pvp') score += 15;
      if (af === 'pve' && bf === 'pve') score -= 25;
      if (score >= 25 || avg <= -25) candidates.push({ a: a.id, b: b.id, score });
    });
  });

  const selected = candidates.sort((a, b) => b.score - a.score).slice(0, Math.max(1, Math.min(3, Math.floor(guilds.length / 8) || 1)));
  if (selected.length === 0) {
    const pvp = guilds.filter((guild) => normalizeGuildFocus(guild.guildFocus ?? guild.type ?? guild.focus) === 'pvp');
    const pool = pvp.length >= 2 ? pvp : guilds;
    if (pool.length >= 2) selected.push({ a: pool[0].id, b: pool[1].id, score: 1 });
  }

  return {
    ...next,
    guildWars: [
      ...next.guildWars,
      ...selected
        .filter((entry) => !activeWarExists(next, entry.a, entry.b))
        .map((entry, index) => seedWar(next, entry.a, entry.b, index)),
    ],
  };
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
  let next = seedActiveGuildWarsIfEmpty(server);
  const now = totalMinute(next.serverDay, next.currentMinute);
  let changed = false;

  const guildWars = next.guildWars.map((war) => {
    if (war.status !== 'active') return war;
    const last = totalMinute(war.lastSimulatedDay ?? war.startsDay ?? war.declaredDay, war.lastSimulatedMinute ?? war.startsMinute ?? war.declaredMinute);
    const dueFromClock = Math.floor(Math.max(0, now - last) / 30);
    const dueFromAdvance = Math.floor(Math.max(0, minutesAdvanced) / 30);
    const due = Math.max(dueFromClock, dueFromAdvance);
    if (due <= 0) return war;

    changed = true;
    let current = war;
    for (let i = 0; i < Math.min(48, due); i += 1) current = resolveWarDuel(next, current, rng);
    return { ...current, lastSimulatedDay: next.serverDay, lastSimulatedMinute: next.currentMinute };
  });

  next = { ...next, guildWars };
  if (!changed) return next;

  return {
    ...next,
    rankings: {
      ...next.rankings,
      guildPvpTop: [...next.guilds]
        .sort((a, b) => {
          const ak = next.guildWars.reduce((sum, war) => sum + (war.attackerGuildId === a.id ? war.attackerKills : war.defenderGuildId === a.id ? war.defenderKills : 0), 0);
          const bk = next.guildWars.reduce((sum, war) => sum + (war.attackerGuildId === b.id ? war.attackerKills : war.defenderGuildId === b.id ? war.defenderKills : 0), 0);
          return bk - ak || (b.pvpRating ?? 0) - (a.pvpRating ?? 0);
        })
        .slice(0, 20)
        .map((guild) => guild.id),
    },
  };
};

const makeSoloNpc = (index: number, level: number, name: string, rng: Rng): NpcPlayer => {
  const classId = classIds[index % classIds.length];
  const raceId = raceIds[index % raceIds.length];
  return {
    id: `${SOLO_PREFIX}${index.toString().padStart(2, '0')}`,
    name,
    raceId,
    classId,
    level,
    xp: 0,
    gearScore: level * (42 + (index % 11) * 3) + rng.int(20, 160),
    gold: rng.int(level * 40, level * 160),
    roleFocus: 'CASUAL',
    currentGoal: 'Ищет гильдию',
    reputation: rng.int(0, 120),
    activityLevel: rng.int(3, 8),
    ambition: rng.int(3, 9),
    risk: rng.int(2, 8),
    socialWeight: rng.int(3, 9),
    inventory: [],
    equipment: {},
    arenaRating: 900 + level * 12 + rng.int(-80, 120),
    skill: clamp(2 + Math.floor(level / 3) + rng.int(0, 3), 1, 10),
    playstyle: 'solo',
    locationMode: rng.chance(0.35) ? 'city' : 'zone',
    currentZoneId: undefined,
    currentSpotId: undefined,
  };
};

export const ensureSoloNpcPool = (server: ServerState): ServerState => {
  const existing = new Set((server.npcs ?? []).map((npc) => npc.id));
  const rng = createRng((server.seed ?? 1) + 6014);
  const additions: NpcPlayer[] = [];
  const groups = [
    { names: lowNames, min: 1, max: 8, offset: 0 },
    { names: midNames, min: 9, max: 16, offset: 20 },
    { names: highNames, min: 17, max: 20, offset: 40 },
  ];
  groups.forEach((group) => {
    group.names.forEach((name, i) => {
      const index = group.offset + i;
      const id = `${SOLO_PREFIX}${index.toString().padStart(2, '0')}`;
      if (!existing.has(id)) additions.push(makeSoloNpc(index, rng.int(group.min, group.max), name, rng));
    });
  });
  return {
    ...server,
    npcs: [
      ...server.npcs.map((npc) => npc.id.startsWith(SOLO_PREFIX) && npc.guildId ? { ...npc, guildId: undefined, playstyle: 'solo' as const, roleFocus: 'CASUAL' as const } : npc),
      ...additions,
    ],
  };
};

export const createPlayerGuildRuntime = (
  server: ServerState,
  name: string,
  focus: GuildFocus,
  level: number,
): { server: ServerState; ok: boolean; message: string } => {
  const cleanName = name.trim().slice(0, 32);
  if (!cleanName) return { server, ok: false, message: 'Название пустое.' };
  if (server.player.guildId) return { server, ok: false, message: 'Ты уже в гильдии.' };
  if (server.player.gold < 50000) return { server, ok: false, message: 'Нужно 50 000 золота.' };
  if (server.guilds.some((guild) => guild.name.toLowerCase() === cleanName.toLowerCase())) return { server, ok: false, message: 'Гильдия с таким названием уже есть.' };

  const guildLevel = clamp(level, 1, Math.max(1, server.player.level));
  const guild: Guild = {
    id: `guild_player_${server.seed}_${server.serverDay}_${server.currentMinute}`,
    name: cleanName,
    type: focus === 'pvp' ? 'PVP' : focus === 'pve' ? 'PVE' : 'MIXED',
    guildFocus: focus,
    level: guildLevel,
    reputation: 0,
    memberIds: [server.player.id],
    leaderId: server.player.id,
    deputyId: undefined,
    officerIds: [],
    tier: guildLevel >= 17 ? 'high' : guildLevel >= 9 ? 'mid' : 'low',
    minLevel: 1,
    focus,
    raidProgress: 0,
    pvpRating: focus === 'pvp' ? 1000 : 800,
    stability: 100,
    recruitmentPolicy: 'open',
  };

  return {
    ok: true,
    message: `${cleanName} создана.`,
    server: ensureSoloNpcPool({
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

export const maybeGeneratePlayerGuildApplication = (server: ServerState, rng: Rng): ServerState => {
  const guildId = server.player.guildId;
  if (!guildId) return server;
  const guild = server.guilds.find((entry) => entry.id === guildId);
  if (!guild || guild.leaderId !== server.player.id) return server;

  const lastAppTotal = (server.guildApplications ?? [])
    .filter((app: any) => app.guildId === guildId && app.id.startsWith('player_guild_app_'))
    .reduce((max, app) => Math.max(max, totalMinute(app.createdDay, app.createdMinute)), 0);
  const now = totalMinute(server.serverDay, server.currentMinute);
  if (lastAppTotal > 0 && now - lastAppTotal < 720) return server;
  if ((server.guildApplications ?? []).some((app: any) => app.guildId === guildId && app.status === 'pending' && app.id.startsWith('player_guild_app_'))) return server;

  const eligible = ensureSoloNpcPool(server).npcs
    .filter((npc) => !npc.guildId)
    .filter((npc) => npc.playstyle === 'solo' || npc.id.startsWith(SOLO_PREFIX))
    .filter((npc) => npc.level <= Math.max(20, guild.level + 6));
  if (eligible.length === 0) return server;

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
    ...server,
    guildApplications: [...server.guildApplications, app],
    notifications: [
      ...(server.notifications ?? []),
      {
        id: `guild_app_notify_${app.id}`,
        type: 'guild',
        title: 'Новая заявка в гильдию',
        text: applicant.name,
        lines: [`Lv. ${applicant.level}`, `Gear ${applicant.gearScore}`, `Skill ${applicant.skill ?? 5}/10`],
      },
    ],
  };
};

export const acceptPlayerGuildApplication = (server: ServerState, applicationId: string): ServerState => {
  const app = (server.guildApplications ?? []).find((entry) => entry.id === applicationId);
  if (!app || app.status !== 'pending' || !app.applicantNpcId) return server;
  const guild = server.guilds.find((entry) => entry.id === app.guildId);
  const npc = server.npcs.find((entry) => entry.id === app.applicantNpcId);
  if (!guild || !npc || guild.leaderId !== server.player.id) return server;
  return {
    ...server,
    guildApplications: server.guildApplications.map((entry) => entry.id === applicationId ? { ...entry, status: 'accepted' as const, resultText: 'Принят.' } : entry),
    guilds: server.guilds.map((entry) => entry.id === guild.id ? { ...entry, memberIds: [...new Set([...entry.memberIds, npc.id])] } : entry),
    npcs: server.npcs.map((entry) => entry.id === npc.id ? { ...entry, guildId: guild.id, playstyle: guild.guildFocus === 'pvp' ? 'pvp' : guild.guildFocus === 'pve' ? 'pve' : entry.playstyle ?? 'solo', roleFocus: guild.guildFocus === 'pvp' ? 'PVP_PLAYER' : guild.guildFocus === 'pve' ? 'PVE_FARMER' : entry.roleFocus } : entry),
  };
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
