import type { CombatState, Combatant, NpcPlayer, ServerState } from '../types/game';
import type { Rng } from '../engine/rng';
import { uid } from '../engine/rng';
import { getPlayerStats } from './itemSystem';
import { createPlayerCombatant } from './combatSystem';
import { canPlayerAttackWarNpc, getWarAttackCooldownMinutes } from './npcLocationSystem';

const npcCombatant = (npc: NpcPlayer): Combatant => {
  const level = npc.level;
  const gear = npc.gearScore ?? 25;
  const isCaster = npc.classId === 'mage' || npc.classId === 'priest';
  const isTank = npc.classId === 'warrior';
  const isHealer = npc.classId === 'priest';

  const maxHp = Math.round((90 + level * 15 + Math.floor(gear / 4)) * (isTank ? 1.12 : 1));
  const maxMana = isCaster ? 72 + level * 7 : 42 + level * 3;
  const attack = Math.round((8 + level * 2 + Math.floor(gear / 17)) * (isTank ? 0.95 : 1.05));
  const magic = Math.round((7 + level * 2 + Math.floor(gear / 19)) * (isHealer ? 1.08 : npc.classId === 'mage' ? 1.12 : 1));
  const defense = Math.round((5 + Math.floor(level * 1.45) + Math.floor(gear / 28)) * (isTank ? 1.18 : 1));
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

const activeWarIdForNpc = (server: ServerState, npc: NpcPlayer) => {
  if (!server.player.guildId || !npc.guildId) return 'guild_war_duel';
  return (server.guildWars ?? []).find((war) =>
    war.status === 'active' &&
    ((war.attackerGuildId === server.player.guildId && war.defenderGuildId === npc.guildId) ||
      (war.defenderGuildId === server.player.guildId && war.attackerGuildId === npc.guildId)),
  )?.id ?? 'guild_war_duel';
};

export const startWarNpcDuelCombat = (server: ServerState, npcId: string, rng: Rng): CombatState | null => {
  if (getWarAttackCooldownMinutes(server) > 0) return null;
  if (!canPlayerAttackWarNpc(server, npcId)) return null;

  const npc = server.npcs.find((entry) => entry.id === npcId);
  if (!npc) return null;

  const playerStats = getPlayerStats(server.player);
  const player = createPlayerCombatant(server);
  const enemy = npcCombatant(npc);

  return {
    id: uid('war_duel', rng),
    source: 'guild_war',
    sourceId: activeWarIdForNpc(server, npc),
    enemyNpcId: npc.id,
    player: {
      ...player,
      hp: Math.max(1, Math.min(server.player.hp, playerStats.hp)),
      mana: Math.max(0, Math.min(server.player.mana, playerStats.mana)),
    },
    enemy,
    partyNpcIds: [],
    turn: 1,
    log: [`Дуэль войны гильдий. Противник: ${npc.name} · Lv. ${npc.level} · Gear ${npc.gearScore}.`],
    status: 'active',
  };
};
