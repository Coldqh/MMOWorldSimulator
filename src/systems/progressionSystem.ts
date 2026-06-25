import type { MobDefinition, Player, ServerState } from '../types/game';
import { calculateNpcArenaRating, calculateNpcWealth, calculateXpForNextLevel, calculateXpRewardForMob, MAX_LEVEL } from '../balance';
import { getGearScore } from './itemSystem';

export const xpForNextLevel = (level: number) => calculateXpForNextLevel(level);

export const xpRewardForMob = (mob: MobDefinition, playerLevel: number) => calculateXpRewardForMob(mob, playerLevel);

export const addPlayerXp = (player: Player, amount: number): Player => {
  let next = { ...player, xp: player.xp + Math.max(0, Math.floor(amount)) };

  while (next.level < MAX_LEVEL && next.xp >= xpForNextLevel(next.level)) {
    next = {
      ...next,
      xp: next.xp - xpForNextLevel(next.level),
      level: Math.min(MAX_LEVEL, next.level + 1),
      hp: next.hp + 20,
      mana: next.mana + 8
    };
  }

  if (next.level >= MAX_LEVEL) next = { ...next, level: MAX_LEVEL, xp: Math.max(0, Math.min(next.xp, xpForNextLevel(MAX_LEVEL - 1))) };
  return next;
};

export const estimateArenaRatingValue = (level: number, gearScore: number, focus?: string) =>
  calculateNpcArenaRating(level, gearScore, focus);

export const estimateWealthValue = (level: number, gearScore: number, focus?: string) =>
  calculateNpcWealth(level, gearScore, focus);

export const arenaRankName = (rating: number) => {
  if (rating >= 2200) return 'Mythic';
  if (rating >= 1750) return 'Diamond';
  if (rating >= 1325) return 'Gold';
  if (rating >= 1050) return 'Silver';
  return 'Bronze';
};

export const arenaRankIcon = (rating: number) => {
  if (rating >= 2200) return '🔮';
  if (rating >= 1750) return '💎';
  if (rating >= 1325) return '🥇';
  if (rating >= 1050) return '🥈';
  return '🥉';
};

export const getPlayerArenaRank = (server: ServerState) => {
  const allRatings = [
    { id: server.player.id, rating: server.player.arenaRating, focus: 'PLAYER' },
    ...server.npcs.map((npc) => ({ id: npc.id, rating: npc.arenaRating, focus: npc.roleFocus }))
  ].sort((a, b) => b.rating - a.rating);

  return allRatings.findIndex((entry) => entry.id === server.player.id) + 1;
};

export const updateGuildDerivedStats = (server: ServerState): ServerState => {
  const npcsById = new Map(server.npcs.map((npc) => [npc.id, npc]));
  const playerGear = getGearScore(server.player.equipment);
  const getMemberGear = (id: string) => id === server.player.id ? playerGear : (npcsById.get(id)?.gearScore ?? 0);
  const getMemberPvp = (id: string) => id === server.player.id ? server.player.arenaRating : (npcsById.get(id)?.arenaRating ?? 0);
  const guilds = server.guilds.map((guild) => {
    const reputation = guild.memberIds.reduce((sum, id) => sum + getMemberGear(id), 0);
    const pvpRating = guild.memberIds.reduce((sum, id) => sum + getMemberPvp(id), 0);
    const level = Math.max(1, Math.min(20, Math.floor(reputation / 6500) + 1));
    return { ...guild, reputation, pvpRating, level };
  });
  return { ...server, guilds };
};

export const updateRankings = (server: ServerState): ServerState => {
  const npcsByGear = [...server.npcs].sort((a, b) => b.gearScore - a.gearScore);
  const npcsByArena = [...server.npcs].sort((a, b) => b.arenaRating - a.arenaRating);
  const npcsByGold = [...server.npcs].sort((a, b) => b.gold - a.gold);
  const ranked = updateGuildDerivedStats({ ...server });
  return {
    ...ranked,
    rankings: {
      arenaTop: npcsByArena.slice(0, 30).map((npc) => npc.id),
      raidRaceTop: [...server.npcs].sort((a, b) => b.gearScore + b.level * 100 - (a.gearScore + a.level * 100)).slice(0, 20).map((npc) => npc.id),
      wealthTop: npcsByGold.slice(0, 30).map((npc) => npc.id),
      gearTop: npcsByGear.slice(0, 30).map((npc) => npc.id),
      guildPvpTop: [...ranked.guilds].sort((a, b) => b.pvpRating - a.pvpRating).slice(0, 20).map((guild) => guild.id),
      guildReputationTop: [...ranked.guilds].sort((a, b) => b.reputation - a.reputation).slice(0, 20).map((guild) => guild.id),
    }
  };
};
