import type { Guild, GuildFocus, GuildType, NpcPlayer, NpcPlaystyle, ServerState } from '../types/game';
import type { Rng } from '../engine/rng';
import { SPOTS, ZONES } from '../content/world';
import { inferNpcSkill, clampNpcSkill } from './npcSkillSystem';
import { cleanGuildIdentity, normalizeGuildAndNpcIdentities, normalizeNpcPlaystyle, roleFocusToPlaystyle } from './guildIdentitySystem';
import { isPlayerCreatedGuild, protectPlayerCreatedGuilds } from './playerGuildProtection';

export const guildFocusFromType = (type?: GuildType | string, index = 0): GuildFocus =>
  cleanGuildIdentity({ id: 'tmp', name: 'tmp', type: (type as GuildType) ?? 'MIXED', level: 1, reputation: 0, memberIds: [], focus: '', raidProgress: 0, pvpRating: 0, stability: 0, recruitmentPolicy: 'open' }, index).guildFocus ?? 'hybrid';

export const normalizeGuildFocusDistribution = (guilds: Guild[]): Guild[] => guilds.map(cleanGuildIdentity);

export const playstyleForGuild = (guild: Guild | undefined, npc: NpcPlayer, _rng: Rng): NpcPlaystyle => {
  if (!guild) return normalizeNpcPlaystyle(npc.playstyle, roleFocusToPlaystyle(npc.roleFocus));
  if (guild.guildFocus === 'pvp') return 'pvp';
  if (guild.guildFocus === 'pve') return 'pve';
  return normalizeNpcPlaystyle(npc.playstyle, roleFocusToPlaystyle(npc.roleFocus));
};

const tierForNpcLevel = (level: number, rng: Rng): 'low' | 'mid' | 'high' | 'none' => {
  const roll = rng.next();
  if (level >= 20) {
    if (roll < 0.64) return 'high';
    if (roll < 0.72) return 'mid';
    if (roll < 0.80) return 'low';
    return 'none';
  }
  if (level >= 10) {
    if (roll < 0.64) return 'mid';
    if (roll < 0.80) return 'low';
    return 'none';
  }
  return roll < 0.80 ? 'low' : 'none';
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

const enforceMinimumUnguilded = (npcs: NpcPlayer[], guilds: Guild[], protectedGuildIds: Set<string>) => {
  const targetUnguilded = Math.ceil(npcs.length * 0.2);
  const currentUnguilded = npcs.filter((npc) => !npc.guildId).length;
  const need = Math.max(0, targetUnguilded - currentUnguilded);
  if (need <= 0) return npcs;

  const removable = [...npcs]
    .filter((npc) => npc.guildId && !protectedGuildIds.has(npc.guildId))
    .sort((a, b) => a.level - b.level || a.gearScore - b.gearScore || a.id.localeCompare(b.id))
    .slice(0, need)
    .map((npc) => npc.id);

  if (removable.length === 0) return npcs;
  const removeSet = new Set(removable);

  guilds.forEach((guild) => {
    if (protectedGuildIds.has(guild.id)) return;
    guild.memberIds = guild.memberIds.filter((id) => !removeSet.has(id));
    if (guild.leaderId && removeSet.has(guild.leaderId)) guild.leaderId = undefined;
    if (guild.deputyId && removeSet.has(guild.deputyId)) guild.deputyId = undefined;
    guild.officerIds = (guild.officerIds ?? []).filter((id) => !removeSet.has(id));
  });

  return npcs.map((npc) => removeSet.has(npc.id) ? { ...npc, guildId: undefined } : npc);
};

export const rebalanceGuildRoster = (server: ServerState, rng: Rng): ServerState => {
  const protectedBase = protectPlayerCreatedGuilds(server);
  const guilds = normalizeGuildFocusDistribution(protectedBase.guilds ?? []);
  const protectedGuildIds = new Set(guilds.filter(isPlayerCreatedGuild).map((guild) => guild.id));
  const assignableGuilds = guilds.filter((guild) => !protectedGuildIds.has(guild.id));
  const guildById = new Map(guilds.map((guild) => [guild.id, guild]));
  const groups = new Map<string, string[]>();
  assignableGuilds.forEach((guild) => groups.set(guild.id, []));
  const byTier = {
    low: assignableGuilds.filter((guild) => (guild.tier ?? 'low') === 'low'),
    mid: assignableGuilds.filter((guild) => (guild.tier ?? 'low') === 'mid'),
    high: assignableGuilds.filter((guild) => (guild.tier ?? 'low') === 'high'),
  };

  let npcs: NpcPlayer[] = [...(protectedBase.npcs ?? [])]
    .sort((a, b) => b.level - a.level || b.gearScore - a.gearScore || a.id.localeCompare(b.id))
    .map((npc): NpcPlayer => {
      const tier = tierForNpcLevel(npc.level, rng);
      const baseFocus = normalizeNpcPlaystyle(npc.playstyle, roleFocusToPlaystyle(npc.roleFocus));
      const next: NpcPlayer = { ...npc, roleFocus: baseFocus, playstyle: baseFocus };
      const pool = tier === 'high' ? byTier.high : tier === 'mid' ? byTier.mid : tier === 'low' ? byTier.low : [];

      if (next.guildId && protectedGuildIds.has(next.guildId)) {
        // Player-created guilds are filled only through accepted applications, not background balancing.
      } else if (tier === 'none') {
        next.guildId = undefined;
      } else {
        pushToSmallest(groups, pool.length ? pool : assignableGuilds, next);
      }

      const guild = next.guildId ? guildById.get(next.guildId) : undefined;
      const loc = next.locationMode ? { locationMode: next.locationMode, currentZoneId: next.currentZoneId, currentSpotId: next.currentSpotId } : pickLocation(next, rng);
      const forcedPlaystyle = playstyleForGuild(guild, next, rng);

      return {
        ...next,
        skill: clampNpcSkill(next.skill ?? inferNpcSkill(next, rng)),
        roleFocus: forcedPlaystyle,
        playstyle: forcedPlaystyle,
        ...loc,
        lastMovedDay: next.lastMovedDay ?? protectedBase.serverDay,
        lastMovedMinute: next.lastMovedMinute ?? protectedBase.currentMinute,
      };
    });

  npcs = enforceMinimumUnguilded(npcs, guilds, protectedGuildIds);

  const npcById = new Map(npcs.map((npc) => [npc.id, npc]));
  const nextGuilds = guilds.map((guild) => {
    if (protectedGuildIds.has(guild.id)) return guild;
    const members = (groups.get(guild.id) ?? []).filter((id) => npcById.has(id) && npcById.get(id)?.guildId === guild.id);
    const ranked = members.map((id) => npcById.get(id)!).sort((a, b) => b.gearScore - a.gearScore || b.arenaRating - a.arenaRating);
    const playerMember = protectedBase.player.guildId === guild.id ? [protectedBase.player.id] : [];
    return {
      ...guild,
      memberIds: [...new Set([...members, ...playerMember])],
      leaderId: guild.leaderId && members.includes(guild.leaderId) ? guild.leaderId : ranked[0]?.id,
      deputyId: guild.deputyId && members.includes(guild.deputyId) ? guild.deputyId : ranked[1]?.id,
      officerIds: (guild.officerIds ?? []).filter((id) => members.includes(id)).length ? (guild.officerIds ?? []).filter((id) => members.includes(id)).slice(0, 4) : ranked.slice(2, 6).map((npc) => npc.id),
    };
  });

  return protectPlayerCreatedGuilds(normalizeGuildAndNpcIdentities({ ...protectedBase, guilds: nextGuilds, npcs }));
};
