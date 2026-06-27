import { addNews } from '../engine/news';
import type { CombatState, CombatantV2, GuildWar, GuildWarKillRecord, GuildWarTopKiller, NpcPlayer, RewardSummary, ServerState } from '../types/game';
import type { Rng } from '../engine/rng';

const updateTopKillers = (list: GuildWarTopKiller[] = [], characterId: string, guildId: string) => {
  const map = new Map(list.map((entry) => [entry.characterId, { ...entry }]));
  const current = map.get(characterId) ?? { characterId, guildId, kills: 0 };
  current.kills += 1;
  map.set(characterId, current);
  return [...map.values()].sort((a, b) => b.kills - a.kills || a.characterId.localeCompare(b.characterId)).slice(0, 10);
};

const locationIdForGuildWarDuel = (server: ServerState) =>
  server.location.mode === 'spot'
    ? server.location.spotId
    : server.location.mode === 'zone'
      ? server.location.zoneId
      : undefined;

const findNpc = (server: ServerState, id?: string) => id ? server.npcs.find((npc) => npc.id === id) : undefined;

const sourceGuildId = (server: ServerState, combat: CombatState, unit: CombatantV2) => {
  if (unit.controller === 'player') return server.player.guildId;
  return findNpc(server, unit.sourceId)?.guildId;
};

const applyKillToWar = (
  server: ServerState,
  combat: CombatState,
  killerGuildId: string | undefined,
  victimGuildId: string | undefined,
  killerId: string,
  victimId: string,
  source: 'player_attack' | 'npc_attack_player',
): ServerState => {
  if (!killerGuildId || !victimGuildId) return server;
  const record: GuildWarKillRecord = {
    id: `war_kill_${server.serverDay}_${server.currentMinute}_${killerId}_${victimId}_${combat.turn}_${Math.random().toString(16).slice(2)}`,
    day: server.serverDay,
    minute: server.currentMinute,
    killerId,
    killerGuildId,
    victimId,
    victimGuildId,
    locationId: locationIdForGuildWarDuel(server),
    source,
  };

  return {
    ...server,
    guildWars: (server.guildWars ?? []).map((war: GuildWar) => {
      const related = war.status === 'active' &&
        ((war.attackerGuildId === killerGuildId && war.defenderGuildId === victimGuildId) ||
          (war.defenderGuildId === killerGuildId && war.attackerGuildId === victimGuildId) ||
          war.id === combat.sourceId);
      if (!related) return war;
      const attackerScored = war.attackerGuildId === killerGuildId;
      return {
        ...war,
        attackerKills: war.attackerKills + (attackerScored ? 1 : 0),
        defenderKills: war.defenderKills + (attackerScored ? 0 : 1),
        killRecords: [...war.killRecords, record].slice(-250),
        attackerTopKillers: attackerScored ? updateTopKillers(war.attackerTopKillers, killerId, killerGuildId) : war.attackerTopKillers,
        defenderTopKillers: attackerScored ? war.defenderTopKillers : updateTopKillers(war.defenderTopKillers, killerId, killerGuildId),
      };
    }),
  };
};

const deadNpcIdsFromTeam = (team?: { members: CombatantV2[] }) =>
  (team?.members ?? [])
    .filter((unit) => unit.controller === 'npc' && (!unit.alive || unit.hp <= 0))
    .map((unit) => unit.sourceId);

const allocateTeamKills = (
  server: ServerState,
  combat: CombatState,
  killerTeam: CombatantV2[],
  victimTeam: CombatantV2[],
  defaultKillerId: string,
  defaultKillerGuildId: string | undefined,
  source: 'player_attack' | 'npc_attack_player',
) => {
  let next = server;
  const victims = victimTeam.filter((unit) => unit.controller === 'npc' || unit.controller === 'player');
  let victimIndex = 0;

  const killers = killerTeam
    .filter((unit) => unit.kills > 0)
    .flatMap((unit) => Array.from({ length: unit.kills }, () => unit));

  const safeKillers = killers.length > 0
    ? killers
    : victims.length > 0
      ? [{ sourceId: defaultKillerId, controller: defaultKillerId === server.player.id ? 'player' : 'npc' } as CombatantV2]
      : [];

  safeKillers.forEach((killer) => {
    const victim = victims[victimIndex % Math.max(1, victims.length)];
    victimIndex += 1;
    if (!victim) return;
    const killerGuildId = sourceGuildId(server, combat, killer) ?? defaultKillerGuildId;
    const victimGuildId = sourceGuildId(server, combat, victim);
    next = applyKillToWar(next, combat, killerGuildId, victimGuildId, killer.sourceId, victim.sourceId, source);
  });

  return next;
};

export const finishGuildWarVictoryV2 = (server: ServerState, combat: CombatState, rng: Rng): { server: ServerState; combat: CombatState } => {
  const enemyIds = combat.teamB ? deadNpcIdsFromTeam(combat.teamB) : (combat.enemyNpcIds && combat.enemyNpcIds.length > 0)
    ? combat.enemyNpcIds
    : combat.enemyNpcId
      ? [combat.enemyNpcId]
      : [];
  const enemies = enemyIds.map((id) => server.npcs.find((entry) => entry.id === id)).filter((npc): npc is NpcPlayer => Boolean(npc));

  let nextServer: ServerState = {
    ...server,
    player: { ...server.player, hp: Math.max(1, combat.player.hp), mana: Math.max(0, combat.player.mana) },
    npcs: server.npcs.map((npc) => enemyIds.includes(npc.id) ? { ...npc, locationMode: 'city', currentZoneId: undefined, currentSpotId: undefined } : npc),
  };

  if (combat.teamA && combat.teamB) {
    nextServer = allocateTeamKills(
      nextServer,
      combat,
      combat.teamA.members,
      combat.teamB.members.filter((unit) => unit.controller === 'npc' && enemyIds.includes(unit.sourceId)),
      server.player.id,
      server.player.guildId,
      'player_attack',
    );
  } else {
    enemies.forEach((npc) => {
      nextServer = applyKillToWar(nextServer, combat, server.player.guildId, npc.guildId, server.player.id, npc.id, 'player_attack');
    });
  }

  nextServer = addNews(nextServer, rng, 'pvp', `${server.player.name} победил в дуэли войны. Убийств: ${Math.max(1, enemies.length)}.`, true);

  const reward: RewardSummary = {
    xp: 0,
    gold: 0,
    items: [],
    lines: [
      'Дуэль войны гильдий: победа.',
      `Побеждено врагов: ${Math.max(1, enemies.length)}.`,
      enemies.length > 0 ? `В город отправлены: ${enemies.map((npc) => npc.name).join(', ')}.` : `${combat.enemy.name} отправлен в город.`,
      `HP: ${Math.max(1, combat.player.hp)}/${combat.player.maxHp}.`,
      `Mana: ${Math.max(0, combat.player.mana)}/${combat.player.maxMana}.`,
    ],
  };

  return {
    server: nextServer,
    combat: {
      ...combat,
      status: 'victory',
      reward,
      log: [...combat.log, `Победа. Убийства засчитаны последним ударившим.`].slice(-40),
    },
  };
};

export const finishGuildWarDefeatV2 = (server: ServerState, combat: CombatState, rng: Rng): { server: ServerState; combat: CombatState } => {
  const enemyIds = combat.enemyNpcIds && combat.enemyNpcIds.length > 0
    ? combat.enemyNpcIds
    : combat.enemyNpcId
      ? [combat.enemyNpcId]
      : [];
  const killer = enemyIds.map((id) => server.npcs.find((entry) => entry.id === id)).find(Boolean);

  let nextServer: ServerState = {
    ...server,
    location: { mode: 'city' },
    player: { ...server.player, hp: 1, mana: 0 },
  };

  if (combat.teamA && combat.teamB) {
    nextServer = allocateTeamKills(
      nextServer,
      combat,
      combat.teamB.members,
      combat.teamA.members.filter((unit) => unit.controller === 'player' || unit.controller === 'npc'),
      killer?.id ?? enemyIds[0] ?? 'enemy',
      killer?.guildId,
      'npc_attack_player',
    );
  } else if (killer) {
    nextServer = applyKillToWar(nextServer, combat, killer.guildId, server.player.guildId, killer.id, server.player.id, 'npc_attack_player');
  }

  nextServer = addNews(nextServer, rng, 'pvp', `${server.player.name}: смерть в дуэли войны. Город.`, true);

  return {
    server: nextServer,
    combat: {
      ...combat,
      status: 'defeat',
      log: [...combat.log, `Поражение. ${server.player.name} умер и отправлен в город.`].slice(-40),
      defeatLines: [
        'Дуэль войны гильдий: поражение.',
        killer ? `Убийца: ${killer.name}.` : 'Убийца: враг.',
        'Ты умер и отправлен в город.',
        'HP: 1.',
        'Mana: 0.',
      ],
    },
  };
};
