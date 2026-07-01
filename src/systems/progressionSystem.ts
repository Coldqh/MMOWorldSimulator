import type { MobDefinition, Player, ServerState } from '../types/game';
import { calculateNpcArenaRating, calculateNpcWealth, calculateXpForNextLevel, calculateXpRewardForMob, MAX_LEVEL } from '../balance';
import { getGearScore } from './itemSystem';
import { arenaRankIcon, arenaRankName, arenaRankOrder, getArenaBracketIdForPlayer, getArenaLadder, getGuildPvpRankIcon, getGuildPvpRankName } from './arenaBracketSystem';

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

export { arenaRankIcon, arenaRankName, getGuildPvpRankIcon, getGuildPvpRankName };

export const getPlayerArenaRank = (server: ServerState) => {
  const bracket = getArenaBracketIdForPlayer(server);
  return getArenaLadder(server, bracket).findIndex((entry) => entry.id === server.player.id) + 1;
};

export const updateGuildDerivedStats = (server: ServerState): ServerState => {
  const npcsById = new Map(server.npcs.map((npc) => [npc.id, npc]));
  const playerGear = getGearScore(server.player.equipment);
  const getMemberGear = (id: string) => id === server.player.id ? playerGear : (npcsById.get(id)?.gearScore ?? 0);
  const getMemberPvp = (id: string) => id === server.player.id ? server.player.arenaRating : (npcsById.get(id)?.arenaRating ?? 0);
  const guilds = server.guilds.map((guild) => {
    const reputation = guild.memberIds.reduce((sum, id) => sum + getMemberGear(id), 0);
    const memberRatings = guild.memberIds.map(getMemberPvp).filter((rating) => rating > 0);
    const pvpRating = memberRatings.length > 0
      ? Math.round(memberRatings.reduce((sum, rating) => sum + rating, 0) / memberRatings.length)
      : 1000;
    const level = Math.max(1, Math.min(MAX_LEVEL, Math.floor(reputation / 6500) + 1));
    return { ...guild, reputation, pvpRating, level };
  });
  return { ...server, guilds };
};

export const updateRankings = (server: ServerState): ServerState => {
  const npcsByGear = [...server.npcs].sort((a, b) => b.gearScore - a.gearScore);
  const npcsByArena = [...server.npcs].sort((a, b) => b.arenaRating - a.arenaRating || arenaRankOrder(b.arenaRating) - arenaRankOrder(a.arenaRating));
  const npcsByGold = [...server.npcs].sort((a, b) => b.gold - a.gold);
  const ranked = updateGuildDerivedStats({ ...server });
  return {
    ...ranked,
    rankings: {
      arenaTop: npcsByArena.slice(0, 30).map((npc) => npc.id),
      raidRaceTop: [...server.npcs].sort((a, b) => b.gearScore + b.level * 100 - (a.gearScore + a.level * 100)).slice(0, 20).map((npc) => npc.id),
      wealthTop: npcsByGold.slice(0, 30).map((npc) => npc.id),
      gearTop: npcsByGear.slice(0, 30).map((npc) => npc.id),
      guildPvpTop: [...ranked.guilds]
        .sort((a, b) => b.pvpRating - a.pvpRating || arenaRankOrder(b.pvpRating) - arenaRankOrder(a.pvpRating))
        .slice(0, 20)
        .map((guild) => guild.id),
      guildReputationTop: [...ranked.guilds].sort((a, b) => b.reputation - a.reputation).slice(0, 20).map((guild) => guild.id),
    }
  };
};
