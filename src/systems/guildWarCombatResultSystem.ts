import { addNews } from '../engine/news';
import type { CombatState, GuildWar, GuildWarKillRecord, GuildWarTopKiller, RewardSummary, ServerState } from '../types/game';
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
    id: `war_kill_${server.serverDay}_${server.currentMinute}_${killerId}_${victimId}_${combat.turn}`,
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

export const finishGuildWarVictoryV2 = (server: ServerState, combat: CombatState, rng: Rng): { server: ServerState; combat: CombatState } => {
  const enemyIds = (combat.enemyNpcIds && combat.enemyNpcIds.length > 0)
    ? combat.enemyNpcIds
    : combat.enemyNpcId
      ? [combat.enemyNpcId]
      : [];
  const enemies = enemyIds.map((id) => server.npcs.find((entry) => entry.id === id)).filter(Boolean);
  let nextServer: ServerState = {
    ...server,
    player: { ...server.player, hp: Math.max(1, combat.player.hp), mana: Math.max(0, combat.player.mana) },
    npcs: server.npcs.map((npc) => enemyIds.includes(npc.id) ? { ...npc, locationMode: 'city', currentZoneId: undefined, currentSpotId: undefined } : npc),
  };

  enemies.forEach((npc) => {
    if (!npc) return;
    nextServer = applyKillToWar(nextServer, combat, server.player.guildId, npc.guildId, server.player.id, npc.id, 'player_attack');
  });

  nextServer = addNews(
    nextServer,
    rng,
    'pvp',
    `${server.player.name} победил в дуэли войны. Убийств: ${Math.max(1, enemies.length)}.`,
    true,
  );

  const reward: RewardSummary = {
    xp: 0,
    gold: 0,
    items: [],
    lines: [
      'Дуэль войны гильдий: победа.',
      `Побеждено врагов: ${Math.max(1, enemies.length)}.`,
      enemies.length > 0 ? `В город отправлены: ${enemies.map((npc) => npc?.name).join(', ')}.` : `${combat.enemy.name} отправлен в город.`,
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
      log: [...combat.log, `Победа. Убийств в счёт войны: ${Math.max(1, enemies.length)}.`].slice(-40),
    },
  };
};

export const finishGuildWarDefeatV2 = (server: ServerState, combat: CombatState, rng: Rng): { server: ServerState; combat: CombatState } => {
  const enemyIds = (combat.enemyNpcIds && combat.enemyNpcIds.length > 0)
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

  if (killer) {
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
