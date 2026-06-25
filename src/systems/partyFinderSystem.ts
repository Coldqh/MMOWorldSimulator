import { DUNGEONS, RAIDS, getDungeonById } from '../content/world';
import { addNews } from '../engine/news';
import type { Rng } from '../engine/rng';
import { uid } from '../engine/rng';
import type {
  DungeonDefinition,
  NpcPlayer,
  PartyFinderListing,
  PartyListingStatus,
  PartyListingVisibility,
  PartyRequirement,
  PartyRole,
  PartyRoleMap,
  ServerState,
} from '../types/game';
import { getGearScore } from './itemSystem';

const ACTIVE_STATUSES: PartyListingStatus[] = ['forming', 'ready'];

const nowTotalMinutes = (server: Pick<ServerState, 'serverDay' | 'currentMinute'>) =>
  (server.serverDay - 1) * 1440 + server.currentMinute;

const listingExpiryTotal = (listing: Pick<PartyFinderListing, 'expiresDay' | 'expiresMinute'>) =>
  (listing.expiresDay - 1) * 1440 + listing.expiresMinute;

const addMinutes = (server: Pick<ServerState, 'serverDay' | 'currentMinute'>, minutes: number) => {
  const total = nowTotalMinutes(server) + minutes;
  return { day: Math.floor(total / 1440) + 1, minute: total % 1440 };
};

const unique = (ids: string[]) => [...new Set(ids)];

const totalRequired = (requirements: PartyRequirement) => requirements.tanks + requirements.healers + requirements.dps;

const allMembersKnown = (server: ServerState, ids: string[]) =>
  ids.every((id) => id === server.player.id || server.npcs.some((npc) => npc.id === id));

const npcById = (server: ServerState, id: string) => server.npcs.find((npc) => npc.id === id);

const guildById = (server: ServerState, id?: string) => id ? server.guilds.find((guild) => guild.id === id) : undefined;

const memberClassId = (server: ServerState, id: string) => id === server.player.id ? server.player.classId : npcById(server, id)?.classId;

const memberLevel = (server: ServerState, id: string) => id === server.player.id ? server.player.level : npcById(server, id)?.level ?? 0;

const memberGearScore = (server: ServerState, id: string) =>
  id === server.player.id ? getGearScore(server.player.equipment) : npcById(server, id)?.gearScore ?? 0;

export const getClassPartyRole = (classId: string): PartyRole => {
  if (classId === 'warrior') return 'tank';
  if (classId === 'priest') return 'healer';
  if (classId === 'mage') return 'magicDps';
  return 'physicalDps';
};

export const getDungeonPartyRequirement = (dungeon: DungeonDefinition): PartyRequirement => {
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

export const buildPartyRolesFromListing = (server: ServerState, listing: PartyFinderListing): PartyRoleMap | null => {
  const roles = rolesForMembers(server, listing.memberIds);
  const tankId = roles.tankIds[0];
  const healerId = roles.healerIds[0];
  if (!tankId || !healerId) return null;
  return { tankId, healerId, dpsIds: [...roles.tankIds.slice(1), ...roles.healerIds.slice(1), ...roles.dpsIds] };
};

const rolesForMembers = (server: ServerState, memberIds: string[]): PartyFinderListing['roles'] => {
  const roles: PartyFinderListing['roles'] = { tankIds: [], healerIds: [], dpsIds: [] };
  unique(memberIds).forEach((id) => {
    const classId = memberClassId(server, id);
    if (!classId) return;
    const role = getClassPartyRole(classId);
    if (role === 'tank') roles.tankIds.push(id);
    else if (role === 'healer') roles.healerIds.push(id);
    else roles.dpsIds.push(id);
  });
  return roles;
};

const hasRoleSlot = (listing: PartyFinderListing, role: PartyRole) => {
  if (role === 'tank') return listing.roles.tankIds.length < listing.requirements.tanks;
  if (role === 'healer') return listing.roles.healerIds.length < listing.requirements.healers;
  return listing.roles.dpsIds.length < listing.requirements.dps;
};

const listingReady = (listing: PartyFinderListing) =>
  listing.roles.tankIds.length >= listing.requirements.tanks &&
  listing.roles.healerIds.length >= listing.requirements.healers &&
  listing.roles.dpsIds.length >= listing.requirements.dps &&
  listing.memberIds.length >= totalRequired(listing.requirements);

const withRebuiltRoles = (server: ServerState, listing: PartyFinderListing): PartyFinderListing => {
  const roles = rolesForMembers(server, listing.memberIds);
  const status: PartyListingStatus = listingReady({ ...listing, roles }) ? 'ready' : listing.status === 'ready' ? 'forming' : listing.status;
  return { ...listing, roles, status };
};

const canSeeListing = (server: ServerState, listing: PartyFinderListing) => {
  if (listing.visibility === 'public') return true;
  if (listing.visibility === 'guild_internal' || listing.visibility === 'static') return Boolean(listing.guildId && server.player.guildId === listing.guildId);
  return true;
};

const hasHighGuild = (server: ServerState, npc: NpcPlayer) => guildById(server, npc.guildId)?.tier === 'high';

const isPublicListingCreator = (npc: NpcPlayer) => {
  if (['PVP_PLAYER', 'LEADER'].includes(npc.roleFocus)) return false;
  if (['TRADER', 'DRAMA'].includes(npc.roleFocus)) return npc.activityLevel >= 7;
  return ['CASUAL', 'PVE_FARMER', 'GUILD_PLAYER', 'RAIDER', 'COLLECTOR', 'HARDCORE'].includes(npc.roleFocus);
};

export const canNpcJoinListing = (npc: NpcPlayer, listing: PartyFinderListing, dungeon: DungeonDefinition, server: ServerState) => {
  if (!ACTIVE_STATUSES.includes(listing.status)) return false;
  if (listing.memberIds.includes(npc.id) || listing.rejectedIds?.includes(npc.id)) return false;
  if (listing.memberIds.length >= totalRequired(listing.requirements)) return false;
  if (npc.level < listing.requirements.minLevel || npc.level > listing.requirements.maxLevel + 1) return false;
  if (listing.requirements.minGearScore && npc.gearScore < listing.requirements.minGearScore) return false;

  if (listing.visibility === 'public' && hasHighGuild(server, npc)) return false;
  if ((listing.visibility === 'guild_internal' || listing.visibility === 'static') && (!listing.guildId || npc.guildId !== listing.guildId)) return false;
  if (dungeon.contentType === 'raid' && !['RAIDER', 'HARDCORE', 'GUILD_PLAYER', 'LEADER'].includes(npc.roleFocus)) return false;

  return hasRoleSlot(listing, getClassPartyRole(npc.classId));
};

export const canPlayerJoinListing = (server: ServerState, listing: PartyFinderListing) =>
  getPlayerListingBlockReason(server, listing) === '';

export const getPlayerListingBlockReason = (server: ServerState, listing: PartyFinderListing) => {
  const dungeon = getDungeonById(listing.dungeonId);
  if (!dungeon) return 'Контент не найден';
  if (!ACTIVE_STATUSES.includes(listing.status)) return 'Группа закрыта';
  if (listing.memberIds.includes(server.player.id)) return '';
  if (!canSeeListing(server, listing)) return 'Закрытая группа';
  if (listing.visibility === 'static') return 'Статик';
  if (listing.memberIds.length >= totalRequired(listing.requirements)) return 'Группа полная';
  if (server.player.level < listing.requirements.minLevel) return 'Слабый уровень';
  if (server.player.level > listing.requirements.maxLevel + 1) return 'Уровень выше окна';
  const gear = getGearScore(server.player.equipment);
  if (listing.requirements.minGearScore && gear < listing.requirements.minGearScore) return 'Слабый GS';
  if (!hasRoleSlot(listing, getClassPartyRole(server.player.classId))) return 'Нужна другая роль';
  if ((listing.visibility === 'guild_internal') && listing.guildId !== server.player.guildId) return 'Гильдия';
  return '';
};

const chooseContentForNpc = (server: ServerState, npc: NpcPlayer, rng: Rng, contentType?: 'dungeon' | 'raid') => {
  const all = [...DUNGEONS, ...RAIDS].filter((dungeon) => {
    const type = dungeon.contentType ?? 'dungeon';
    if (contentType && type !== contentType) return false;
    if (!server.unlockedContent.includes(dungeon.zoneId)) return false;
    if (npc.level < dungeon.levelRange[0] - 1) return false;
    if (npc.level > dungeon.levelRange[1] + 2 && type !== 'raid') return false;
    if (type === 'raid' && npc.level < 20) return false;
    return true;
  });
  if (all.length === 0) return undefined;
  return rng.pick(all.sort((a, b) => Math.abs(npc.level - a.levelRange[0]) - Math.abs(npc.level - b.levelRange[0])).slice(0, 4));
};

const makeListing = (
  server: ServerState,
  rng: Rng,
  dungeon: DungeonDefinition,
  leaderId: string,
  leaderType: 'player' | 'npc',
  visibility: PartyListingVisibility,
  guildId?: string,
  note?: string,
): PartyFinderListing => {
  const expires = addMinutes(server, visibility === 'public' ? rng.int(90, 240) : rng.int(160, 420));
  const requirements = getDungeonPartyRequirement(dungeon);
  const listing: PartyFinderListing = {
    id: uid('party', rng),
    dungeonId: dungeon.id,
    contentType: (dungeon.contentType ?? 'dungeon') as 'dungeon' | 'raid',
    visibility,
    leaderId,
    leaderType,
    guildId,
    memberIds: [leaderId],
    applicantIds: [],
    rejectedIds: [],
    roles: { tankIds: [], healerIds: [], dpsIds: [] },
    requirements,
    status: 'forming',
    createdDay: server.serverDay,
    createdMinute: server.currentMinute,
    expiresDay: expires.day,
    expiresMinute: expires.minute,
    note,
  };
  return withRebuiltRoles(server, listing);
};

export const createPartyFinderListing = makeListing;

const fillListing = (server: ServerState, listing: PartyFinderListing, rng: Rng, targetFill?: number) => {
  const dungeon = getDungeonById(listing.dungeonId);
  if (!dungeon) return listing;
  let next = withRebuiltRoles(server, { ...listing, memberIds: unique(listing.memberIds.filter((id) => allMembersKnown(server, [id]))) });
  const target = Math.min(totalRequired(next.requirements), targetFill ?? rng.int(1, totalRequired(next.requirements)));

  const candidates = server.npcs
    .filter((npc) => canNpcJoinListing(npc, next, dungeon, server))
    .sort((a, b) => {
      const roleA = getClassPartyRole(a.classId);
      const roleB = getClassPartyRole(b.classId);
      const needA = hasRoleSlot(next, roleA) ? 1 : 0;
      const needB = hasRoleSlot(next, roleB) ? 1 : 0;
      return needB - needA || b.activityLevel + b.gearScore / 100 - (a.activityLevel + a.gearScore / 100) || rng.next() - 0.5;
    });

  for (const npc of candidates) {
    if (next.memberIds.length >= target) break;
    if (!canNpcJoinListing(npc, next, dungeon, server)) continue;
    next = withRebuiltRoles(server, { ...next, memberIds: unique([...next.memberIds, npc.id]) });
  }

  return next;
};

export const generateNpcPartyFinderListings = (server: ServerState, rng: Rng): PartyFinderListing[] => {
  const listings: PartyFinderListing[] = [];

  const publicLeaders = server.npcs
    .filter((npc) => isPublicListingCreator(npc))
    .filter((npc) => !hasHighGuild(server, npc))
    .sort((a, b) => b.activityLevel + b.socialWeight - (a.activityLevel + a.socialWeight))
    .slice(0, 80);

  const publicCount = rng.int(5, 12);
  for (let i = 0; i < publicCount && publicLeaders.length > 0; i += 1) {
    const leader = rng.pick(publicLeaders);
    const dungeon = chooseContentForNpc(server, leader, rng);
    if (!dungeon) continue;
    let listing = makeListing(server, rng, dungeon, leader.id, 'npc', 'public', leader.guildId, rng.pick(['Нужен хил.', 'Рандомная пачка.', 'Берём по уровню.', 'Быстрый заход.']));
    listing = fillListing(server, listing, rng, rng.int(1, Math.max(1, totalRequired(listing.requirements) - 1)));
    listings.push(listing);
  }

  const guilds = server.guilds.filter((guild) => (guild.tier === 'high' || guild.tier === 'mid') && guild.memberIds.length >= 5);
  const guildCount = Math.min(guilds.length, rng.int(4, 10));
  for (let i = 0; i < guildCount; i += 1) {
    const guild = guilds[i];
    const members = guild.memberIds.map((id) => npcById(server, id)).filter(Boolean) as NpcPlayer[];
    const leader = members.find((npc) => npc.id === guild.leaderId) ?? members[0];
    if (!leader) continue;
    const preferRaid = guild.tier === 'high' && rng.chance(0.55);
    const dungeon = chooseContentForNpc(server, leader, rng, preferRaid ? 'raid' : undefined);
    if (!dungeon) continue;
    const visibility: PartyListingVisibility = guild.tier === 'high' && rng.chance(0.38) ? 'static' : 'guild_internal';
    let listing = makeListing(server, rng, dungeon, leader.id, 'npc', visibility, guild.id, visibility === 'static' ? 'Закрытая группа.' : 'Гильдейский забег.');
    listing = fillListing(server, listing, rng, rng.int(Math.max(1, totalRequired(listing.requirements) - 2), totalRequired(listing.requirements)));
    listings.push(listing);
  }

  return listings;
};

const normalizeListings = (server: ServerState) => {
  const now = nowTotalMinutes(server);
  return (server.partyFinderListings ?? [])
    .filter((listing) => listing.status !== 'started' && listing.status !== 'cancelled')
    .filter((listing) => listingExpiryTotal(listing) > now)
    .filter((listing) => Boolean(getDungeonById(listing.dungeonId)))
    .map((listing) => withRebuiltRoles(server, { ...listing, memberIds: unique(listing.memberIds.filter((id) => allMembersKnown(server, [id]))) }))
    .slice(-40);
};

export const refreshPartyFinderListings = (server: ServerState, rng: Rng): ServerState => {
  let listings = normalizeListings(server);
  const target = Math.min(40, Math.max(8, 10 + Math.floor((server.npcs.length || 0) / 80)));

  listings = listings.map((listing) => {
    if (listing.leaderType === 'player' && listing.status === 'forming' && rng.chance(0.55)) {
      return fillListing(server, listing, rng, Math.min(totalRequired(listing.requirements), listing.memberIds.length + rng.int(1, 2)));
    }
    if (listing.leaderType === 'npc' && listing.status === 'forming' && rng.chance(0.22)) {
      return fillListing(server, listing, rng, Math.min(totalRequired(listing.requirements), listing.memberIds.length + 1));
    }
    return listing;
  });

  if (listings.length < target) {
    const existingKeys = new Set(listings.map((listing) => `${listing.visibility}:${listing.leaderId}:${listing.dungeonId}`));
    const generated = generateNpcPartyFinderListings({ ...server, partyFinderListings: listings }, rng)
      .filter((listing) => !existingKeys.has(`${listing.visibility}:${listing.leaderId}:${listing.dungeonId}`));
    listings = [...listings, ...generated].slice(0, target);
  }

  return { ...server, partyFinderListings: listings.map((listing) => withRebuiltRoles(server, listing)) };
};

export const createPlayerPartyListing = (server: ServerState, dungeonId: string, rng: Rng, visibility: PartyListingVisibility = 'public') => {
  const dungeon = getDungeonById(dungeonId);
  if (!dungeon) {
    return { server, modal: { id: uid('party_error', rng), type: 'system' as const, title: 'Поиск пати', text: 'Контент не найден.', lines: [] } };
  }
  if (server.currentDungeonRun) {
    return { server, modal: { id: uid('party_busy', rng), type: 'system' as const, title: 'Поиск пати', text: 'Уже открыт инстанс.', lines: [] } };
  }
  const guild = guildById(server, server.player.guildId);
  const finalVisibility: PartyListingVisibility = visibility === 'guild_internal' && guild ? 'guild_internal' : 'public';
  let listing = makeListing(server, rng, dungeon, server.player.id, 'player', finalVisibility, finalVisibility === 'guild_internal' ? guild?.id : server.player.guildId, finalVisibility === 'guild_internal' ? 'Гильдейский забег.' : 'Группа игрока.');
  listing = fillListing(server, listing, rng, rng.int(1, Math.max(1, totalRequired(listing.requirements) - 1)));
  const next = refreshPartyFinderListings({ ...server, partyFinderListings: [...(server.partyFinderListings ?? []).filter((entry) => entry.leaderId !== server.player.id), listing] }, rng);
  return {
    server: addNews(next, rng, 'dungeon', `${server.player.name} создал заявку: ${dungeon.name}.`, false),
    modal: { id: uid('party_created', rng), type: 'system' as const, title: 'Заявка создана', text: dungeon.name, lines: [`Состав: ${listing.memberIds.length}/${totalRequired(listing.requirements)}`] },
  };
};

export const joinPartyListing = (server: ServerState, listingId: string, rng: Rng) => {
  let modal = { id: uid('party_join_fail', rng), type: 'system' as const, title: 'Поиск пати', text: 'Заявка недоступна.', lines: [] as string[] };
  const listings = (server.partyFinderListings ?? []).map((listing) => {
    if (listing.id !== listingId) return listing;
    const reason = getPlayerListingBlockReason(server, listing);
    if (reason) {
      modal = { ...modal, text: reason };
      return listing;
    }
    const nextListing = withRebuiltRoles(server, { ...listing, memberIds: unique([...listing.memberIds, server.player.id]) });
    const dungeon = getDungeonById(listing.dungeonId);
    modal = { id: uid('party_joined', rng), type: 'system' as const, title: 'Ты вступил в группу', text: dungeon?.name ?? listing.dungeonId, lines: [`Состав: ${nextListing.memberIds.length}/${totalRequired(nextListing.requirements)}`] };
    return nextListing;
  });
  return { server: { ...server, partyFinderListings: listings }, modal };
};

export const leavePartyListing = (server: ServerState, listingId: string) => ({
  ...server,
  partyFinderListings: (server.partyFinderListings ?? []).map((listing) => {
    if (listing.id !== listingId || !listing.memberIds.includes(server.player.id)) return listing;
    if (listing.leaderId === server.player.id) return { ...listing, status: 'cancelled' as PartyListingStatus };
    return withRebuiltRoles(server, { ...listing, memberIds: listing.memberIds.filter((id) => id !== server.player.id) });
  }),
});

export const cancelPartyListing = (server: ServerState, listingId: string) => ({
  ...server,
  partyFinderListings: (server.partyFinderListings ?? []).map((listing) =>
    listing.id === listingId && listing.leaderId === server.player.id ? { ...listing, status: 'cancelled' as PartyListingStatus } : listing,
  ),
});

export const startPartyFromListing = (server: ServerState, listingId: string, rng: Rng) => {
  const listing = (server.partyFinderListings ?? []).find((entry) => entry.id === listingId);
  const dungeon = listing ? getDungeonById(listing.dungeonId) : undefined;
  if (!listing || !dungeon) {
    return { server, modal: { id: uid('party_start_fail', rng), type: 'system' as const, title: 'Старт группы', text: 'Заявка не найдена.', lines: [] } };
  }
  if (!listing.memberIds.includes(server.player.id)) {
    return { server, modal: { id: uid('party_start_not_member', rng), type: 'system' as const, title: 'Старт группы', text: 'Ты не в группе.', lines: [] } };
  }
  const ready = withRebuiltRoles(server, listing);
  if (!listingReady(ready)) {
    return { server, modal: { id: uid('party_start_not_ready', rng), type: 'system' as const, title: 'Группа не готова', text: dungeon.name, lines: [`Состав: ${ready.memberIds.length}/${totalRequired(ready.requirements)}`] } };
  }
  const partyRoles = buildPartyRolesFromListing(server, ready);
  if (!partyRoles) {
    return { server, modal: { id: uid('party_start_roles', rng), type: 'system' as const, title: 'Роли не собраны', text: dungeon.name, lines: [] } };
  }
  const partyNpcIds = ready.memberIds.filter((id) => id !== server.player.id);
  const run = {
    id: uid('dungeon_run', rng),
    dungeonId: dungeon.id,
    partyNpcIds,
    partyRoles,
    currentFloor: 0,
    currentEncounterIndex: 0,
    status: 'betweenFloors' as const,
    startedDay: server.serverDay,
    startedMinute: server.currentMinute,
    contentType: (dungeon.contentType ?? 'dungeon') as 'dungeon' | 'raid',
  };
  const next = {
    ...server,
    currentDungeonRun: run,
    partyFinderListings: (server.partyFinderListings ?? []).map((entry) => entry.id === listing.id ? { ...entry, status: 'started' as PartyListingStatus } : entry),
  };
  return {
    server: addNews(next, rng, dungeon.contentType === 'raid' ? 'raid' : 'dungeon', `${server.player.name} стартовал группу: ${dungeon.name}.`, false),
    modal: { id: uid('party_started', rng), type: 'dungeon' as const, title: 'Инстанс начат', text: dungeon.name, lines: [`Пати: ${partyNpcIds.length + 1}.`] },
  };
};

export const visiblePartyListings = (server: ServerState) =>
  (server.partyFinderListings ?? []).filter((listing) => canSeeListing(server, listing));
