import type {
  DungeonDefinition,
  NpcPlayer,
  PartyFinderListing,
  PartyRequirement,
  PartyRole,
  PartyRoleMap,
  ServerState,
} from '../types/game';
import { getGearScore } from './itemSystem';

export const getClassPartyRole = (classId: string): PartyRole => {
  if (classId === 'warrior') return 'tank';
  if (classId === 'priest') return 'healer';
  if (classId === 'mage') return 'magicDps';
  return 'physicalDps';
};

export const isTankRole = (role: PartyRole) => role === 'tank';
export const isHealerRole = (role: PartyRole) => role === 'healer';
export const isDpsRole = (role: PartyRole) => role === 'physicalDps' || role === 'magicDps';

export const getRoleLabel = (role: PartyRole) => {
  if (role === 'tank') return 'Танк';
  if (role === 'healer') return 'Хил';
  if (role === 'magicDps') return 'Magic DPS';
  return 'Physical DPS';
};

export const totalPartyRequired = (requirements: PartyRequirement) =>
  requirements.tanks + requirements.healers + requirements.dps;

export const getPartyRequirementForDungeon = (dungeon: DungeonDefinition): PartyRequirement => {
  const contentType = dungeon.contentType ?? 'dungeon';
  const size = contentType === 'raid' ? Math.max(10, dungeon.partySize) : Math.max(5, dungeon.partySize);
  const tanks = contentType === 'raid' ? 2 : 1;
  const healers = contentType === 'raid' ? 2 : 1;
  const dps = Math.max(1, size - tanks - healers);
  const minLevel = dungeon.levelRange[0];
  const maxLevel = Math.max(dungeon.levelRange[1], minLevel);
  const minGearScore = contentType === 'raid'
    ? Math.max(1500, minLevel * 88)
    : minLevel >= 16
      ? minLevel * 55
      : minLevel >= 10
        ? minLevel * 42
        : undefined;

  return { tanks, healers, dps, minLevel, maxLevel, minGearScore };
};

const npcById = (server: ServerState, id: string) => server.npcs.find((npc) => npc.id === id);

export const memberClassId = (server: ServerState, id: string) =>
  id === server.player.id ? server.player.classId : npcById(server, id)?.classId;

export const memberLevel = (server: ServerState, id: string) =>
  id === server.player.id ? server.player.level : npcById(server, id)?.level ?? 0;

export const memberGearScore = (server: ServerState, id: string) =>
  id === server.player.id ? getGearScore(server.player.equipment) : npcById(server, id)?.gearScore ?? 0;

export const buildListingRolesFromMembers = (
  server: ServerState,
  memberIds: string[],
): PartyFinderListing['roles'] => {
  const roles: PartyFinderListing['roles'] = { tankIds: [], healerIds: [], dpsIds: [] };
  [...new Set(memberIds)].forEach((id) => {
    const classId = memberClassId(server, id);
    if (!classId) return;
    const role = getClassPartyRole(classId);
    if (isTankRole(role)) roles.tankIds.push(id);
    else if (isHealerRole(role)) roles.healerIds.push(id);
    else roles.dpsIds.push(id);
  });
  return roles;
};

export const buildPartyRolesFromMembers = (
  server: ServerState,
  memberIds: string[],
): PartyRoleMap | null => {
  const roles = buildListingRolesFromMembers(server, memberIds);
  const tankId = roles.tankIds[0];
  const healerId = roles.healerIds[0];
  if (!tankId || !healerId) return null;
  return { tankId, healerId, dpsIds: roles.dpsIds };
};

export const countPartyRoles = (server: ServerState, memberIds: string[]) => {
  const roles = buildListingRolesFromMembers(server, memberIds);
  return {
    tanks: roles.tankIds.length,
    healers: roles.healerIds.length,
    dps: roles.dpsIds.length,
  };
};

export const hasRoleSlot = (listing: PartyFinderListing, role: PartyRole) => {
  if (isTankRole(role)) return listing.roles.tankIds.length < listing.requirements.tanks;
  if (isHealerRole(role)) return listing.roles.healerIds.length < listing.requirements.healers;
  return listing.roles.dpsIds.length < listing.requirements.dps;
};

export const canMemberFillNeededRole = (
  member: Pick<NpcPlayer, 'id' | 'classId'> | { id: string; classId: string },
  listing: PartyFinderListing,
  _server: ServerState,
) => hasRoleSlot(listing, getClassPartyRole(member.classId));
