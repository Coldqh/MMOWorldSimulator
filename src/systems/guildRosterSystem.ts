import type { Guild, GuildFocus, GuildType, NpcPlayer, NpcPlaystyle, ServerState } from '../types/game';
import type { Rng } from '../engine/rng';
import { SPOTS, ZONES } from '../content/world';
import { inferNpcSkill, clampNpcSkill } from './npcSkillSystem';

const focusOrder: GuildFocus[] = ['pvp', 'pve', 'hybrid'];

export const guildFocusFromType = (type?: GuildType | string, index = 0): GuildFocus => {
  if (type === 'PVP' || type === 'HARDCORE') return 'pvp';
  if (type === 'PVE' || type === 'NEWBIE' || type === 'CASUAL') return 'pve';
  if (type === 'TRADE' || type === 'MIXED') return 'hybrid';
  return focusOrder[index % focusOrder.length];
};

export const normalizeGuildFocusDistribution = (guilds: Guild[]): Guild[] => {
  const count = guilds.length;
  const base = Math.floor(count / 3);
  const targets: Record<GuildFocus, number> = { pvp: base, pve: base, hybrid: base + (count % 3) };
  const sorted = [...guilds].sort((a, b) => a.id.localeCompare(b.id));
  const assigned = new Map<string, GuildFocus>();
  focusOrder.forEach((focus) => {
    sorted.filter((guild) => !assigned.has(guild.id)).filter((guild, index) => guildFocusFromType(guild.type, index) === focus).slice(0, targets[focus]).forEach((guild) => assigned.set(guild.id, focus));
  });
  focusOrder.forEach((focus) => {
    while ([...assigned.values()].filter((entry) => entry === focus).length < targets[focus]) {
      const guild = sorted.find((entry) => !assigned.has(entry.id));
      if (!guild) break;
      assigned.set(guild.id, focus);
    }
  });
  return guilds.map((guild, index) => ({ ...guild, guildFocus: assigned.get(guild.id) ?? guild.guildFocus ?? guildFocusFromType(guild.type, index) }));
};

export const playstyleForGuild = (guild: Guild | undefined, npc: NpcPlayer, rng: Rng): NpcPlaystyle => {
  if (guild?.guildFocus === 'pvp') return 'pvp';
  if (guild?.guildFocus === 'pve') return 'pve';
  if (guild?.guildFocus === 'hybrid') {
    const roll = rng.next();
    if (roll < 0.34) return 'pvp';
    if (roll < 0.68) return 'pve';
    return 'hybrid';
  }
  if (npc.roleFocus === 'PVP_PLAYER') return 'pvp';
  if (npc.roleFocus === 'RAIDER' || npc.roleFocus === 'PVE_FARMER') return 'pve';
  return 'hybrid';
};

const tierForNpcLevel = (level: number, rng: Rng): 'low' | 'mid' | 'high' | 'none' => {
  const roll = rng.next();
  if (level >= 20) {
    if (roll < 0.85) return 'high';
    if (roll < 0.90) return 'mid';
    if (roll < 0.95) return 'low';
    return 'none';
  }
  if (level >= 10) {
    if (roll < 0.80) return 'mid';
    if (roll < 0.95) return 'low';
    return 'none';
  }
  return roll < 0.95 ? 'low' : 'none';
};

const pickLocation = (npc: NpcPlayer, rng: Rng): Pick<NpcPlayer, 'locationMode' | 'currentZoneId' | 'currentSpotId'> => {
  if (rng.chance(0.28)) return { locationMode: 'city', currentZoneId: undefined, currentSpotId: undefined };
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

const pushToSmallest = (groups: Map<string, string[]>, guilds: Guild[], npc: NpcPlayer) => {
  if (guilds.length === 0) { npc.guildId = undefined; return; }
  const guild = [...guilds].sort((a, b) => (groups.get(a.id)?.length ?? 0) - (groups.get(b.id)?.length ?? 0))[0];
  npc.guildId = guild.id;
  groups.get(guild.id)?.push(npc.id);
};

export const rebalanceGuildRoster = (server: ServerState, rng: Rng): ServerState => {
  const guilds = normalizeGuildFocusDistribution(server.guilds ?? []);
  const guildById = new Map(guilds.map((guild) => [guild.id, guild]));
  const groups = new Map<string, string[]>();
  guilds.forEach((guild) => groups.set(guild.id, []));
  const byTier = {
    low: guilds.filter((guild) => (guild.tier ?? 'low') === 'low'),
    mid: guilds.filter((guild) => (guild.tier ?? 'low') === 'mid'),
    high: guilds.filter((guild) => (guild.tier ?? 'low') === 'high'),
  };
  const npcs = [...(server.npcs ?? [])].sort((a, b) => b.level - a.level || b.gearScore - a.gearScore || a.id.localeCompare(b.id)).map((npc) => {
    const tier = tierForNpcLevel(npc.level, rng);
    const next: NpcPlayer = { ...npc };
    const pool = tier === 'high' ? byTier.high : tier === 'mid' ? byTier.mid : tier === 'low' ? byTier.low : [];
    if (tier === 'none') next.guildId = undefined;
    else pushToSmallest(groups, pool.length ? pool : guilds, next);
    const guild = next.guildId ? guildById.get(next.guildId) : undefined;
    const loc = next.locationMode ? { locationMode: next.locationMode, currentZoneId: next.currentZoneId, currentSpotId: next.currentSpotId } : pickLocation(next, rng);
    const forcedPlaystyle = guild?.guildFocus === 'pvp' ? 'pvp' : guild?.guildFocus === 'pve' ? 'pve' : next.playstyle ?? playstyleForGuild(guild, next, rng);
    return { ...next, skill: clampNpcSkill(next.skill ?? inferNpcSkill(next, rng)), playstyle: forcedPlaystyle, ...loc, lastMovedDay: next.lastMovedDay ?? server.serverDay, lastMovedMinute: next.lastMovedMinute ?? server.currentMinute };
  });
  const npcById = new Map(npcs.map((npc) => [npc.id, npc]));
  const nextGuilds = guilds.map((guild) => {
    const members = (groups.get(guild.id) ?? []).filter((id) => npcById.has(id));
    const ranked = members.map((id) => npcById.get(id)!).sort((a, b) => b.gearScore - a.gearScore || b.arenaRating - a.arenaRating);
    const playerMember = server.player.guildId === guild.id ? [server.player.id] : [];
    return { ...guild, memberIds: [...new Set([...members, ...playerMember])], leaderId: guild.leaderId && members.includes(guild.leaderId) ? guild.leaderId : ranked[0]?.id, deputyId: guild.deputyId && members.includes(guild.deputyId) ? guild.deputyId : ranked[1]?.id, officerIds: (guild.officerIds ?? []).filter((id) => members.includes(id)).length ? (guild.officerIds ?? []).filter((id) => members.includes(id)).slice(0, 4) : ranked.slice(2, 6).map((npc) => npc.id) };
  });
  return { ...server, guilds: nextGuilds, npcs };
};
