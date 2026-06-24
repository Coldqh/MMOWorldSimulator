import type { MobDefinition, Player, ServerState } from '../types/game';
import { getGearScore } from './itemSystem';

export const xpForNextLevel = (level: number) => Math.max(100, level * 100);

export const xpRewardForMob = (mob: MobDefinition, playerLevel: number) => {
  const levelDiff = mob.level - playerLevel;
  const levelFactor = Math.max(0.25, Math.min(1.75, 1 + levelDiff * 0.12));
  const bossFactor = mob.tags.includes('raid') && mob.tags.includes('boss')
    ? 3.5
    : mob.tags.includes('boss')
      ? 2.4
      : mob.tags.includes('mini-boss')
        ? 1.6
        : 1;
  return Math.max(1, Math.round(10 * levelFactor * bossFactor));
};

export const addPlayerXp = (player: Player, amount: number): Player => {
  let next = { ...player, xp: player.xp + Math.max(0, Math.floor(amount)) };

  while (next.level < 20 && next.xp >= xpForNextLevel(next.level)) {
    next = {
      ...next,
      xp: next.xp - xpForNextLevel(next.level),
      level: Math.min(20, next.level + 1),
      hp: next.hp + 20,
      mana: next.mana + 8
    };
  }

  return next;
};


export const estimateArenaRatingValue = (level: number, gearScore: number, focus?: string) => {
  const pvpBonus = focus === 'PVP_PLAYER' ? 1.2 : focus === 'HARDCORE' ? 1.16 : focus === 'GUILD_PLAYER' ? 1.1 : focus === 'LEADER' ? 1.08 : 1;
  return Math.round((720 + level * 34 + gearScore * 0.72) * pvpBonus);
};

export const estimateWealthValue = (level: number, gearScore: number, focus?: string) => {
  const focusBonus = focus === 'TRADER' ? 1.45 : focus === 'HARDCORE' ? 1.22 : focus === 'RAIDER' ? 1.18 : focus === 'PVP_PLAYER' ? 1.12 : 1;
  return Math.round((120 + level * level * 72 + gearScore * 10) * focusBonus);
};

export const arenaRankName = (rating: number) => {
  if (rating >= 1800) return 'Mythic';
  if (rating >= 1550) return 'Diamond';
  if (rating >= 1300) return 'Gold';
  if (rating >= 1050) return 'Silver';
  return 'Bronze';
};

export const arenaRankIcon = (rating: number) => {
  if (rating >= 1800) return '🔮';
  if (rating >= 1550) return '💎';
  if (rating >= 1300) return '🥇';
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
  const getMember = (id: string) => id === server.player.id
    ? { id: server.player.id, gold: server.player.gold, activityLevel: 8, reputation: server.player.reputation, arenaRating: server.player.arenaRating, gearScore: playerGear, roleFocus: 'PLAYER', level: server.player.level }
    : npcsById.get(id);

  return {
    ...server,
    guilds: server.guilds.map((guild) => {
      const members = guild.memberIds.map((id) => getMember(id)).filter(Boolean) as Array<any>;
      const leader = [...members].sort((a, b) => {
        const scoreA = (a.gold ?? 0) + (a.activityLevel ?? 0) * 260 + (a.reputation ?? 0) * 25 + (a.gearScore ?? 0) * 0.7 + (a.arenaRating ?? 0) * 0.25;
        const scoreB = (b.gold ?? 0) + (b.activityLevel ?? 0) * 260 + (b.reputation ?? 0) * 25 + (b.gearScore ?? 0) * 0.7 + (b.arenaRating ?? 0) * 0.25;
        return scoreB - scoreA;
      })[0];
      const sortedForOfficers = [...members].filter((m) => m.id !== leader?.id).sort((a, b) => {
        const guildIsPvp = guild.type === 'PVP' || guild.type === 'HARDCORE';
        const valueA = guildIsPvp ? (a.arenaRating ?? 0) : (a.gearScore ?? 0);
        const valueB = guildIsPvp ? (b.arenaRating ?? 0) : (b.gearScore ?? 0);
        return valueB - valueA;
      });
      const pvpRating = Math.round(members.reduce((sum, npc) => sum + (npc?.arenaRating ?? 0), 0));
      const reputation = Math.round(members.reduce((sum, npc) => sum + (npc?.gearScore ?? 0), 0));
      const nextLevel = Math.max(1, Math.min(20, Math.floor(reputation / 2500) + 1));
      const raidProgress = Math.min(100, Math.round(members.reduce((sum, npc) => sum + ((npc?.roleFocus === 'RAIDER' || npc?.roleFocus === 'HARDCORE') ? 2.2 : 0.45) + (npc?.level ?? 1) / 12, 0)));
      const stabilityBase = 50 + members.filter((npc) => npc?.roleFocus !== 'DRAMA').length * 0.55 - members.filter((npc) => npc?.roleFocus === 'DRAMA').length * 2.6;
      return {
        ...guild,
        leaderId: leader?.id ?? guild.leaderId,
        deputyId: sortedForOfficers[0]?.id,
        officerIds: sortedForOfficers.slice(1, 5).map((member) => member.id),
        level: nextLevel,
        pvpRating,
        reputation,
        raidProgress,
        stability: Math.max(5, Math.min(100, Math.round(stabilityBase))),
      };
    }),
  };
};

export const updateRankings = (server: ServerState): ServerState => {
  const derivedServer = updateGuildDerivedStats(server);
  const arenaCandidates = [derivedServer.player, ...derivedServer.npcs.filter((npc) => ['PVP_PLAYER', 'HARDCORE', 'GUILD_PLAYER', 'LEADER'].includes(npc.roleFocus))];
  const arenaTop = arenaCandidates
    .sort((a, b) => b.arenaRating - a.arenaRating)
    .slice(0, 10)
    .map((entry) => entry.id);

  const wealthTop = [derivedServer.player, ...derivedServer.npcs]
    .map((entry: any) => ({ ...entry, wealthValue: Number(entry.gold) || 0 }))
    .sort((a, b) => b.wealthValue - a.wealthValue)
    .slice(0, 10)
    .map((entry) => entry.id);

  const playerGear = getGearScore(derivedServer.player.equipment);
  const gearTop = [{ id: derivedServer.player.id, gearScore: playerGear }, ...derivedServer.npcs.map((npc) => ({ id: npc.id, gearScore: npc.gearScore }))]
    .sort((a, b) => b.gearScore - a.gearScore)
    .slice(0, 10)
    .map((entry) => entry.id);

  const guildPvpTop = [...derivedServer.guilds]
    .sort((a, b) => {
      const avgA = a.pvpRating / Math.max(1, a.memberIds.length);
      const avgB = b.pvpRating / Math.max(1, b.memberIds.length);
      return (avgB - avgA) || (b.pvpRating - a.pvpRating);
    })
    .slice(0, 10)
    .map((guild) => guild.id);

  const guildReputationTop = [...derivedServer.guilds]
    .sort((a, b) => b.reputation - a.reputation)
    .slice(0, 10)
    .map((guild) => guild.id);

  const raidRaceTop = [...derivedServer.npcs]
    .filter((npc) => ['RAIDER', 'HARDCORE', 'GUILD_PLAYER', 'LEADER'].includes(npc.roleFocus))
    .sort((a, b) => b.gearScore + b.level * 10 - (a.gearScore + a.level * 10))
    .slice(0, 10)
    .map((npc) => npc.id);

  return {
    ...derivedServer,
    rankings: { arenaTop, wealthTop, raidRaceTop, gearTop, guildPvpTop, guildReputationTop }
  };
};
