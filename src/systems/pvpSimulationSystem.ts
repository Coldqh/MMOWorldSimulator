import type { GuildWarKillRecord, Id, NpcPlayer, Player, ServerState } from '../types/game';
import type { Rng } from '../engine/rng';
import { getGearScore } from './itemSystem';
import { getNpcSkillModifier, increaseNpcSkill } from './npcSkillSystem';

export const getPlayerPvpSkillModifier = (_player: Player) => getNpcSkillModifier(5);
export const getNpcEffectivePower = (npc: NpcPlayer) => Math.max(1, (npc.gearScore ?? 1) * getNpcSkillModifier(npc.skill ?? 5));
export const getPlayerEffectivePower = (player: Player) => Math.max(1, getGearScore(player.equipment) * getPlayerPvpSkillModifier(player));
export const tierPowerStep = (tier?: 'low' | 'mid' | 'high') => tier === 'high' ? 200 : tier === 'mid' ? 100 : 50;

export const resolveNpcDuel = (npcA: NpcPlayer, npcB: NpcPlayer, tier: 'low' | 'mid' | 'high', rng: Rng) => {
  const powerA = getNpcEffectivePower(npcA);
  const powerB = getNpcEffectivePower(npcB);
  const chanceA = Math.max(0.15, Math.min(0.85, 0.5 + Math.max(-0.35, Math.min(0.35, ((powerA - powerB) / tierPowerStep(tier)) * 0.08))));
  const aWins = rng.chance(chanceA);
  return { winner: aWins ? npcA : npcB, loser: aWins ? npcB : npcA, chanceA, powerA, powerB };
};

export const resolvePlayerNpcDuel = (server: ServerState, npc: NpcPlayer, rng: Rng) => {
  const playerPower = getPlayerEffectivePower(server.player);
  const npcPower = getNpcEffectivePower(npc);
  const step = tierPowerStep(server.guilds.find((guild) => guild.id === npc.guildId)?.tier ?? 'low');
  const playerChance = Math.max(0.15, Math.min(0.85, 0.5 + Math.max(-0.35, Math.min(0.35, ((playerPower - npcPower) / step) * 0.08))));
  return { playerWon: rng.chance(playerChance), playerPower, npcPower, playerChance };
};

export const makeKillRecord = (server: ServerState, killerId: Id, killerGuildId: Id, victimId: Id, victimGuildId: Id, source: GuildWarKillRecord['source']): GuildWarKillRecord => ({
  id: `war_kill_${server.serverDay}_${server.currentMinute}_${killerId}_${victimId}_${Math.abs((killerId + victimId).length * 7919)}`,
  day: server.serverDay,
  minute: server.currentMinute,
  killerId,
  killerGuildId,
  victimId,
  victimGuildId,
  locationId: server.location.spotId ?? server.location.zoneId,
  source,
});

export const growNpcAfterDuel = (npc: NpcPlayer, won: boolean, rng: Rng) => increaseNpcSkill(npc, won ? 'pvp_win' : 'pvp_loss', rng);
