import type { NpcPlayer, ServerState, WorldLocationState } from '../types/game';
import type { Rng } from '../engine/rng';
import { SPOTS, ZONES } from '../content/world';
import { getGearScore } from './itemSystem';

const sameLocation = (npc: NpcPlayer, location: WorldLocationState) => {
  if ((npc.locationMode ?? 'city') !== location.mode) return false;
  if (location.mode === 'city') return true;
  if (location.mode === 'zone') return npc.currentZoneId === location.zoneId && !npc.currentSpotId;
  if (location.mode === 'spot') return npc.currentSpotId === location.spotId;
  return false;
};

const pickNpcLocation = (npc: NpcPlayer, rng: Rng): Pick<NpcPlayer, 'locationMode' | 'currentZoneId' | 'currentSpotId'> => {
  if (rng.chance(0.26)) return { locationMode: 'city', currentZoneId: undefined, currentSpotId: undefined };
  const zones = ZONES.filter((zone) => npc.level >= zone.levelRange[0] - 2 && npc.level <= zone.levelRange[1] + 4);
  const zone = rng.pick(zones.length ? zones : ZONES);
  if (!zone) return { locationMode: 'city', currentZoneId: undefined, currentSpotId: undefined };
  if (rng.chance(0.52)) {
    const spots = SPOTS.filter((spot) => spot.zoneId === zone.id && npc.level >= spot.levelRange[0] - 2 && npc.level <= spot.levelRange[1] + 3);
    const spot = spots.length ? rng.pick(spots) : undefined;
    if (spot) return { locationMode: 'spot', currentZoneId: zone.id, currentSpotId: spot.id };
  }
  return { locationMode: 'zone', currentZoneId: zone.id, currentSpotId: undefined };
};

export const assignInitialNpcLocations = (server: ServerState, rng: Rng): ServerState => ({
  ...server,
  npcs: (server.npcs ?? []).map((npc) => npc.locationMode ? npc : { ...npc, ...pickNpcLocation(npc, rng), lastMovedDay: server.serverDay, lastMovedMinute: server.currentMinute }),
});

export const moveNpcPlayers = (server: ServerState, rng: Rng, minutes: number): ServerState => {
  if (minutes <= 0) return server;
  const shouldMove = minutes >= 30 || server.currentMinute % 30 === 0;
  if (!shouldMove) return server;
  return {
    ...server,
    npcs: (server.npcs ?? []).map((npc) => {
      const lastTotal = ((npc.lastMovedDay ?? 1) - 1) * 1440 + (npc.lastMovedMinute ?? 0);
      const nowTotal = (server.serverDay - 1) * 1440 + server.currentMinute;
      if (nowTotal - lastTotal < 30 && rng.chance(0.9)) return npc;
      if (!rng.chance(npc.playstyle === 'pvp' ? 0.34 : npc.playstyle === 'hybrid' ? 0.26 : 0.18)) return npc;
      return { ...npc, ...pickNpcLocation(npc, rng), lastMovedDay: server.serverDay, lastMovedMinute: server.currentMinute };
    }),
  };
};

export const getNpcPlayersInLocation = (server: ServerState, location: WorldLocationState = server.location) => (server.npcs ?? []).filter((npc) => sameLocation(npc, location));

export const getEnemyWarNpcsInPlayerLocation = (server: ServerState) => {
  if (!server.player.guildId || server.location.mode === 'city') return [];
  const enemyGuildIds = new Set((server.guildWars ?? []).filter((war) => war.status === 'active').flatMap((war) => {
    if (war.attackerGuildId === server.player.guildId) return [war.defenderGuildId];
    if (war.defenderGuildId === server.player.guildId) return [war.attackerGuildId];
    return [];
  }));
  return getNpcPlayersInLocation(server).filter((npc) => npc.guildId && enemyGuildIds.has(npc.guildId));
};

export const canPlayerAttackWarNpc = (server: ServerState, npcId: string): boolean => {
  if (server.location.mode === 'city' || !server.player.guildId) return false;
  const npc = server.npcs.find((entry) => entry.id === npcId);
  if (!npc?.guildId || npc.guildId === server.player.guildId) return false;
  if (!sameLocation(npc, server.location)) return false;
  return (server.guildWars ?? []).some((war) => war.status === 'active' && ((war.attackerGuildId === server.player.guildId && war.defenderGuildId === npc.guildId) || (war.defenderGuildId === server.player.guildId && war.attackerGuildId === npc.guildId)));
};

export const handleWarNpcEncountersOnPlayerLocationEnter = (server: ServerState, rng: Rng): ServerState => {
  if (server.location.mode === 'city') return server;
  const enemies = getEnemyWarNpcsInPlayerLocation(server);
  if (enemies.length === 0) return server;
  const playerGs = getGearScore(server.player.equipment);
  let npcs = server.npcs;
  const lines: string[] = [];
  enemies.slice(0, 10).forEach((npc) => {
    const guild = npc.guildId ? server.guilds.find((entry) => entry.id === npc.guildId) : undefined;
    const base = npc.playstyle === 'pvp' || guild?.guildFocus === 'pvp' ? 0.35 : npc.playstyle === 'hybrid' || guild?.guildFocus === 'hybrid' ? 0.18 : 0.08;
    const diff = (npc.gearScore ?? 0) - playerGs;
    const attackChance = Math.max(0.02, Math.min(0.7, base + Math.max(-0.25, Math.min(0.25, diff / 4000))));
    if (rng.chance(attackChance)) { lines.push(`${npc.name} готовится к нападению.`); return; }
    const fleeChance = diff < -800 ? 0.65 : diff < -300 ? 0.35 : diff > 300 ? 0.06 : 0.15;
    if (rng.chance(fleeChance)) {
      npcs = npcs.map((entry) => entry.id === npc.id ? { ...entry, locationMode: 'city', currentZoneId: undefined, currentSpotId: undefined } : entry);
      lines.push(`${npc.name} ушёл в город.`);
    }
  });
  return lines.length === 0 ? server : { ...server, npcs, notifications: [...(server.notifications ?? []), { id: `war_location_${server.serverDay}_${server.currentMinute}_${rng.int(1, 999999)}`, type: 'pvp', title: 'Враги рядом', text: 'Вражеские игроки в локации.', lines: lines.slice(0, 4) }] };
};

export const handleWarNpcEncountersAfterNpcMovement = handleWarNpcEncountersOnPlayerLocationEnter;
