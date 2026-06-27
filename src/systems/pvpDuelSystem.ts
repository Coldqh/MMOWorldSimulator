import type { CombatState, Combatant, NpcPlayer, PartyRoleMap, ServerState } from '../types/game';
import type { Rng } from '../engine/rng';
import { uid } from '../engine/rng';
import { getPlayerStats } from './itemSystem';
import { createPlayerCombatant } from './combatSystem';
import {
  canPlayerAttackWarNpc,
  getEnemyWarNpcsInPlayerLocation,
  getGuildmateNpcsInPlayerLocation,
  getWarAttackCooldownMinutes,
} from './npcLocationSystem';

const totalMinute = (day: number, minute: number) => (Math.max(1, day) - 1) * 1440 + Math.max(0, minute);

const classRole = (classId?: string) => {
  if (classId === 'warrior') return 'tank';
  if (classId === 'priest') return 'healer';
  if (classId === 'mage') return 'magicDps';
  return 'physicalDps';
};

const makePartyRoles = (playerId: string, partyNpcIds: string[], npcs: NpcPlayer[]): PartyRoleMap => {
  const tankCandidate = partyNpcIds.find((id) => classRole(npcs.find((npc) => npc.id === id)?.classId) === 'tank');
  const healerCandidate = partyNpcIds.find((id) => classRole(npcs.find((npc) => npc.id === id)?.classId) === 'healer');
  const dps = partyNpcIds.filter((id) => id !== tankCandidate && id !== healerCandidate);
  return {
    tankId: tankCandidate ?? playerId,
    ...(healerCandidate ? { healerId: healerCandidate } : {}),
    dpsIds: dps,
  };
};

const npcCombatant = (npc: NpcPlayer): Combatant => {
  const level = npc.level;
  const gear = npc.gearScore ?? 25;
  const role = classRole(npc.classId);
  const isCaster = npc.classId === 'mage' || npc.classId === 'priest';

  const maxHp = Math.round((90 + level * 15 + Math.floor(gear / 4)) * (role === 'tank' ? 1.18 : 1));
  const maxMana = isCaster ? 72 + level * 7 : 42 + level * 3;
  const attack = Math.round((8 + level * 2 + Math.floor(gear / 17)) * (role === 'tank' ? 0.98 : role === 'physicalDps' ? 1.08 : 1));
  const magic = Math.round((7 + level * 2 + Math.floor(gear / 19)) * (role === 'healer' ? 1.08 : role === 'magicDps' ? 1.12 : 1));
  const defense = Math.round((5 + Math.floor(level * 1.45) + Math.floor(gear / 28)) * (role === 'tank' ? 1.22 : 1));
  const speed = 6 + Math.floor(level / 3) + Math.floor((npc.skill ?? 5) / 2);

  return {
    id: npc.id,
    name: npc.name,
    level,
    classId: npc.classId,
    maxHp,
    hp: maxHp,
    maxMana,
    mana: maxMana,
    attack,
    magic,
    defense,
    speed,
    shield: 0,
    cooldowns: {},
    defending: false,
  };
};

const activeWarIdForGuilds = (server: ServerState, guildA?: string, guildB?: string) => {
  if (!guildA || !guildB) return 'guild_war_duel';
  return (server.guildWars ?? []).find((war) =>
    war.status === 'active' &&
    ((war.attackerGuildId === guildA && war.defenderGuildId === guildB) ||
      (war.defenderGuildId === guildA && war.attackerGuildId === guildB)),
  )?.id ?? 'guild_war_duel';
};

const aggregateEnemies = (enemies: NpcPlayer[]): Combatant => {
  const combatants = enemies.map(npcCombatant);
  const totalHp = combatants.reduce((sum, enemy) => sum + enemy.maxHp, 0);
  const avg = (getter: (enemy: Combatant) => number) => Math.max(1, Math.round(combatants.reduce((sum, enemy) => sum + getter(enemy), 0) / Math.max(1, combatants.length)));
  return {
    id: enemies.length === 1 ? enemies[0].id : `enemy_group_${enemies.map((npc) => npc.id).join('_')}`,
    name: enemies.length === 1 ? enemies[0].name : `Группа врагов · ${enemies.length}`,
    level: avg((enemy) => enemy.level),
    classId: enemies.length === 1 ? enemies[0].classId : 'ranger',
    maxHp: totalHp,
    hp: totalHp,
    maxMana: combatants.reduce((sum, enemy) => sum + enemy.maxMana, 0),
    mana: combatants.reduce((sum, enemy) => sum + enemy.maxMana, 0),
    attack: avg((enemy) => enemy.attack) + Math.max(0, enemies.length - 1) * 8,
    magic: avg((enemy) => enemy.magic) + Math.max(0, enemies.length - 1) * 5,
    defense: avg((enemy) => enemy.defense),
    speed: avg((enemy) => enemy.speed),
    shield: 0,
    cooldowns: {},
    defending: false,
  };
};

const pickGuildmateAssistants = (server: ServerState, rng: Rng, maxCount = 2) => {
  const mates = getGuildmateNpcsInPlayerLocation(server)
    .filter((npc) => npc.level >= Math.max(1, server.player.level - 5))
    .sort((a, b) => (b.gearScore ?? 0) - (a.gearScore ?? 0));
  const picked: NpcPlayer[] = [];
  const pool = [...mates];
  while (picked.length < maxCount && pool.length > 0) {
    const npc = rng.pick(pool);
    picked.push(npc);
    pool.splice(pool.findIndex((entry) => entry.id === npc.id), 1);
  }
  return picked;
};

const buildWarDuelCombat = (server: ServerState, enemies: NpcPlayer[], allies: NpcPlayer[], rng: Rng, startedBy: 'player' | 'npc'): CombatState | null => {
  if (enemies.length === 0) return null;
  const playerStats = getPlayerStats(server.player);
  const player = createPlayerCombatant(server);
  const enemy = aggregateEnemies(enemies);
  const enemyGuildId = enemies.find((npc) => npc.guildId)?.guildId;
  const allyIds = allies.map((npc) => npc.id);
  const enemyIds = enemies.map((npc) => npc.id);

  return {
    id: uid(startedBy === 'player' ? 'war_duel' : 'war_ambush', rng),
    source: 'guild_war',
    sourceId: activeWarIdForGuilds(server, server.player.guildId, enemyGuildId),
    enemyNpcId: enemies[0].id,
    enemyNpcIds: enemyIds,
    allyNpcIds: allyIds,
    player: {
      ...player,
      hp: Math.max(1, Math.min(server.player.hp, playerStats.hp)),
      mana: Math.max(0, Math.min(server.player.mana, playerStats.mana)),
    },
    enemy,
    partyNpcIds: allyIds,
    partyRoles: allyIds.length > 0 ? makePartyRoles(server.player.id, allyIds, server.npcs) : undefined,
    turn: 1,
    log: [
      startedBy === 'player'
        ? `Дуэль войны гильдий. Противники: ${enemies.map((npc) => npc.name).join(', ')}.`
        : `Засада войны гильдий. Нападают: ${enemies.map((npc) => npc.name).join(', ')}.`,
      allies.length > 0 ? `На помощь пришли: ${allies.map((npc) => npc.name).join(', ')}.` : 'Союзников рядом нет.',
    ],
    status: 'active',
  };
};

export const startWarNpcDuelCombat = (server: ServerState, npcId: string, rng: Rng): CombatState | null => {
  if (getWarAttackCooldownMinutes(server) > 0) return null;
  if (!canPlayerAttackWarNpc(server, npcId)) return null;
  const first = server.npcs.find((entry) => entry.id === npcId);
  if (!first) return null;
  const sameGuildEnemies = getEnemyWarNpcsInPlayerLocation(server)
    .filter((npc) => npc.id === first.id || npc.guildId === first.guildId)
    .slice(0, 4);
  const allies = pickGuildmateAssistants(server, rng, rng.chance(0.45) ? 2 : 1);
  return buildWarDuelCombat(server, sameGuildEnemies, allies, rng, 'player');
};

export const startWarNpcAmbushCombat = (server: ServerState, rng: Rng): CombatState | null => {
  if (getWarAttackCooldownMinutes(server) > 0) return null;
  const enemies = getEnemyWarNpcsInPlayerLocation(server);
  if (enemies.length === 0) return null;
  const attackers = enemies.filter((npc) => {
    const diff = (npc.gearScore ?? 0) - Math.max(1, Object.values(server.player.equipment ?? {}).length * 100);
    const base = npc.playstyle === 'pvp' ? 0.3 : 0.16;
    return rng.chance(Math.max(0.04, Math.min(0.62, base + diff / 10000)));
  });
  if (attackers.length === 0) return null;
  const allies = pickGuildmateAssistants(server, rng, rng.chance(0.55) ? 2 : 1);
  return buildWarDuelCombat(server, attackers.slice(0, 4), allies, rng, 'npc');
};

const combatLocationKey = (server: ServerState) =>
  server.location.mode === 'spot'
    ? server.location.spotId
    : server.location.mode === 'zone'
      ? server.location.zoneId
      : 'city';

const notAlreadyInCombat = (combat: CombatState, npc: NpcPlayer) =>
  !(combat.partyNpcIds ?? []).includes(npc.id) && !(combat.enemyNpcIds ?? []).includes(npc.id) && combat.enemyNpcId !== npc.id;

export const maybeAddWarDuelReinforcements = (server: ServerState, combat: CombatState, rng: Rng): CombatState => {
  if (combat.source !== 'guild_war' || combat.status !== 'active') return combat;
  if (server.location.mode === 'city') return combat;

  let next = { ...combat };
  const log = [...next.log];
  const playerGuildId = server.player.guildId;
  const currentEnemyIds = next.enemyNpcIds && next.enemyNpcIds.length > 0
    ? next.enemyNpcIds
    : next.enemyNpcId
      ? [next.enemyNpcId]
      : [];
  const enemyGuildIds = new Set(
    currentEnemyIds
      .map((id) => server.npcs.find((npc) => npc.id === id)?.guildId)
      .filter((id): id is string => Boolean(id)),
  );

  if (playerGuildId && rng.chance(0.18)) {
    const ally = getGuildmateNpcsInPlayerLocation(server)
      .filter((npc) => notAlreadyInCombat(next, npc))
      .sort((a, b) => (b.gearScore ?? 0) - (a.gearScore ?? 0))[0];
    if (ally) {
      const allyIds = [...(next.partyNpcIds ?? []), ally.id];
      next = {
        ...next,
        partyNpcIds: allyIds,
        allyNpcIds: [...(next.allyNpcIds ?? []), ally.id],
        partyRoles: makePartyRoles(server.player.id, allyIds, server.npcs),
        log,
      };
      log.push(`${ally.name} пришёл на помощь.`);
    }
  }

  if (rng.chance(0.2)) {
    const enemy = getEnemyWarNpcsInPlayerLocation(server)
      .filter((npc) => notAlreadyInCombat(next, npc))
      .filter((npc) => !enemyGuildIds.size || enemyGuildIds.has(npc.guildId ?? ''))
      .sort((a, b) => (b.gearScore ?? 0) - (a.gearScore ?? 0))[0];
    if (enemy) {
      const enemyCombatant = npcCombatant(enemy);
      next = {
        ...next,
        enemyNpcIds: [...currentEnemyIds, enemy.id],
        enemy: {
          ...next.enemy,
          name: next.enemy.name.startsWith('Группа врагов') ? `Группа врагов · ${(next.enemyNpcIds?.length ?? 1) + 1}` : `Группа врагов · ${(next.enemyNpcIds?.length ?? 1) + 1}`,
          maxHp: next.enemy.maxHp + enemyCombatant.maxHp,
          hp: next.enemy.hp + enemyCombatant.maxHp,
          maxMana: next.enemy.maxMana + enemyCombatant.maxMana,
          mana: next.enemy.mana + enemyCombatant.maxMana,
          attack: next.enemy.attack + Math.max(3, Math.round(enemyCombatant.attack * 0.42)),
          magic: next.enemy.magic + Math.max(1, Math.round(enemyCombatant.magic * 0.28)),
          defense: Math.max(next.enemy.defense, enemyCombatant.defense),
          speed: Math.max(next.enemy.speed, enemyCombatant.speed),
        },
        log,
      };
      log.push(`${enemy.name} врывается в бой.`);
    }
  }

  return { ...next, log: log.slice(-40) };
};

export const markWarAttackCooldown = (server: ServerState): ServerState => ({
  ...server,
  player: { ...server.player, lastWarAttackDay: server.serverDay, lastWarAttackMinute: server.currentMinute },
});
