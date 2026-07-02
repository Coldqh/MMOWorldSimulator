import { DUNGEONS, RAIDS, getDungeonById } from '../content/world';
import { LEVEL_BANDS } from '../balance';
import { addNews } from '../engine/news';
import { advanceServerClock } from '../engine/time';
import type { Rng } from '../engine/rng';
import { uid } from '../engine/rng';
import type {
  DungeonDefinition,
  DungeonDifficulty,
  GameModal,
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
import {
  buildListingRolesFromMembers,
  buildPartyRolesFromMembers,
  canMemberFillNeededRole,
  getClassPartyRole,
  getPartyRequirementForDungeon,
  hasRoleSlot,
  totalPartyRequired as totalPartyRequiredForRoles,
} from './partyRoleSystem';

export { getClassPartyRole } from './partyRoleSystem';
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

export const totalPartyRequired = totalPartyRequiredForRoles;

const allMembersKnown = (server: ServerState, ids: string[]) =>
  ids.every((id) => id === server.player.id || server.npcs.some((npc) => npc.id === id));

const npcById = (server: ServerState, id: string) => server.npcs.find((npc) => npc.id === id);

const guildById = (server: ServerState, id?: string) => id ? server.guilds.find((guild) => guild.id === id) : undefined;

const memberClassId = (server: ServerState, id: string) => id === server.player.id ? server.player.classId : npcById(server, id)?.classId;

const memberLevel = (server: ServerState, id: string) => id === server.player.id ? server.player.level : npcById(server, id)?.level ?? 0;

const memberGearScore = (server: ServerState, id: string) =>
  id === server.player.id ? getGearScore(server.player.equipment) : npcById(server, id)?.gearScore ?? 0;

const listingMemberLimit = (listing: PartyFinderListing) => totalPartyRequired(listing.requirements);

export const getDungeonPartyRequirement = getPartyRequirementForDungeon;

const rolesForMembers = buildListingRolesFromMembers;

export const buildPartyRolesFromListing = (server: ServerState, listing: PartyFinderListing): PartyRoleMap | null =>
  buildPartyRolesFromMembers(server, listing.memberIds);

const missingRoleText = (listing: PartyFinderListing) => {
  if (listing.roles.tankIds.length < listing.requirements.tanks) return 'Не хватает танка';
  if (listing.roles.healerIds.length < listing.requirements.healers) return 'Не хватает хила';
  if (listing.roles.dpsIds.length < listing.requirements.dps) return 'Не хватает DPS';
  return 'Группа не собрана';
};

export const isPartyListingReady = (listing: PartyFinderListing) =>
  listing.roles.tankIds.length >= listing.requirements.tanks &&
  listing.roles.healerIds.length >= listing.requirements.healers &&
  listing.roles.dpsIds.length >= listing.requirements.dps &&
  listing.memberIds.length >= listingMemberLimit(listing);

const withRebuiltRoles = (server: ServerState, listing: PartyFinderListing): PartyFinderListing => {
  const memberIds = unique(listing.memberIds).slice(0, listingMemberLimit(listing));
  const roles = rolesForMembers(server, memberIds);
  const status: PartyListingStatus = isPartyListingReady({ ...listing, memberIds, roles }) ? 'ready' : listing.status === 'ready' ? 'forming' : listing.status;
  return {
    ...listing,
    memberIds,
    applicantIds: unique(listing.applicantIds ?? []),
    rejectedIds: unique(listing.rejectedIds ?? []),
    roles,
    status,
    waitAttempts: listing.waitAttempts ?? 0,
    log: (listing.log ?? []).slice(-12),
  };
};

const canSeeListing = (server: ServerState, listing: PartyFinderListing) => {
  if (listing.visibility === 'public') return true;
  if (listing.visibility === 'guild_internal' || listing.visibility === 'static') return Boolean(listing.guildId && server.player.guildId === listing.guildId);
  return true;
};

const hasHighGuild = (server: ServerState, npc: NpcPlayer) => guildById(server, npc.guildId)?.tier === 'high';

const isPublicListingCreator = (npc: NpcPlayer) => {
  if (npc.roleFocus === 'pvp') return npc.activityLevel >= 7 && npc.socialWeight >= 5;
  if (npc.roleFocus === 'mixed') return npc.activityLevel >= 5;
  return npc.activityLevel >= 4;
};

const roleFocusWeight = (npc: NpcPlayer) => {
  if (npc.roleFocus === 'pve') return 8;
  if (npc.roleFocus === 'mixed') return 6;
  if (npc.roleFocus === 'pvp') return 3;
  return 4;
};

const isNpcBusyInActiveListing = (server: ServerState, npcId: string, exceptListingId?: string) =>
  (server.partyFinderListings ?? []).some((listing) =>
    listing.id !== exceptListingId &&
    ACTIVE_STATUSES.includes(listing.status) &&
    listing.memberIds.includes(npcId),
  );

export const canNpcJoinListing = (npc: NpcPlayer, listing: PartyFinderListing, dungeon: DungeonDefinition, server: ServerState) => {
  if (!ACTIVE_STATUSES.includes(listing.status)) return false;
  if (listing.memberIds.includes(npc.id) || listing.applicantIds?.includes(npc.id) || listing.rejectedIds?.includes(npc.id)) return false;
  if (listing.memberIds.length >= listingMemberLimit(listing)) return false;
  if (npc.level < listing.requirements.minLevel || npc.level > listing.requirements.maxLevel + 1) return false;
  if (listing.requirements.minGearScore && npc.gearScore < listing.requirements.minGearScore) return false;
  if (isNpcBusyInActiveListing(server, npc.id, listing.id)) return false;

  if (listing.visibility === 'public' && hasHighGuild(server, npc)) return false;
  if ((listing.visibility === 'guild_internal' || listing.visibility === 'static') && (!listing.guildId || npc.guildId !== listing.guildId)) return false;

  return canMemberFillNeededRole(npc, listing, server);
};

export const getPlayerListingBlockReason = (server: ServerState, listing: PartyFinderListing) => {
  const dungeon = getDungeonById(listing.dungeonId);
  if (!dungeon) return 'Контент не найден';
  if (!server.unlockedContent.includes(dungeon.id)) return 'Нужна ветка открытия';
  if (!ACTIVE_STATUSES.includes(listing.status)) return 'Группа закрыта';
  if (listing.memberIds.includes(server.player.id)) return '';
  if (!canSeeListing(server, listing)) return 'Закрытая группа';
  if (listing.visibility === 'static') return 'Закрытая группа';
  if (listing.memberIds.length >= listingMemberLimit(listing)) return 'Группа уже заполнена';
  if (server.player.level < listing.requirements.minLevel || server.player.level < dungeon.levelRange[0]) return `Нужен Lv. ${Math.max(listing.requirements.minLevel, dungeon.levelRange[0])}`;
  const gear = getGearScore(server.player.equipment);
  if (listing.requirements.minGearScore && gear < listing.requirements.minGearScore) return `Нужен GS ${listing.requirements.minGearScore}`;
  if (!hasRoleSlot(listing, getClassPartyRole(server.player.classId))) return 'Ваша роль уже занята';
  if ((listing.visibility === 'guild_internal') && listing.guildId !== server.player.guildId) return 'Гильдия';
  return '';
};

export const canPlayerJoinListing = (server: ServerState, listing: PartyFinderListing) =>
  getPlayerListingBlockReason(server, listing) === '';

export const getCreatePartyListingBlockReason = (server: ServerState, dungeonId: string, visibility: PartyListingVisibility = 'public') => {
  const dungeon = getDungeonById(dungeonId);
  if (!dungeon) return 'Контент не найден';
  if (!server.unlockedContent.includes(dungeon.id)) return 'Нужна ветка открытия';
  if (server.currentDungeonRun) return 'Уже открыт инстанс';
  if (server.player.level < dungeon.levelRange[0]) return `Нужен Lv. ${dungeon.levelRange[0]}`;
  if (visibility === 'guild_internal' && !server.player.guildId) return 'Нужна гильдия';
  const req = getDungeonPartyRequirement(dungeon);
  const gear = getGearScore(server.player.equipment);
  if (req.minGearScore && gear < req.minGearScore) return `Нужен GS ${req.minGearScore}`;
  return '';
};

export const getStartPartyListingBlockReason = (server: ServerState, listing: PartyFinderListing) => {
  const dungeon = getDungeonById(listing.dungeonId);
  if (!dungeon) return 'Контент не найден';
  if (server.currentDungeonRun) return 'Уже открыт инстанс';
  if (!listing.memberIds.includes(server.player.id)) return 'Ты не в группе';
  if (server.player.level < listing.requirements.minLevel || server.player.level < dungeon.levelRange[0]) return `Нужен Lv. ${Math.max(listing.requirements.minLevel, dungeon.levelRange[0])}`;
  const gear = getGearScore(server.player.equipment);
  if (listing.requirements.minGearScore && gear < listing.requirements.minGearScore) return `Нужен GS ${listing.requirements.minGearScore}`;
  const ready = withRebuiltRoles(server, listing);
  if (!isPartyListingReady(ready)) return missingRoleText(ready);
  if (!buildPartyRolesFromListing(server, ready)) return 'Роли не собраны';
  return '';
};

const chooseContentForNpc = (server: ServerState, npc: NpcPlayer, rng: Rng, contentType?: 'dungeon' | 'raid') => {
  const all = [...DUNGEONS, ...RAIDS].filter((dungeon) => {
    const type = dungeon.contentType ?? 'dungeon';
    if (contentType && type !== contentType) return false;
    if (!server.unlockedContent.includes(dungeon.zoneId)) return false;
    if (npc.level < dungeon.levelRange[0]) return false;
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
  difficulty: DungeonDifficulty = 'normal',
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
    difficulty,
    waitAttempts: 0,
    log: leaderType === 'player' ? ['Группа создана. Ждём отклики.'] : ['Группа появилась в поиске.'],
  };
  return withRebuiltRoles(server, listing);
};

export const createPartyFinderListing = makeListing;


const isNpcBusyInBlockingListingForPlayerRequest = (server: ServerState, npcId: string, exceptListingId?: string) =>
  (server.partyFinderListings ?? []).some((other) =>
    other.id !== exceptListingId &&
    ACTIVE_STATUSES.includes(other.status) &&
    other.memberIds.includes(npcId) &&
    (
      other.leaderType === 'player' ||
      other.visibility === 'static' ||
      other.visibility === 'guild_internal'
    ),
  );

const pickNpcApplicantForPlayerListing = (server: ServerState, listing: PartyFinderListing, rng: Rng) => {
  const dungeon = getDungeonById(listing.dungeonId);
  if (!dungeon) return undefined;
  if (!ACTIVE_STATUSES.includes(listing.status)) return undefined;
  if (listing.memberIds.length >= listingMemberLimit(listing)) return undefined;

  const isRaid = dungeon.contentType === 'raid';
  const relaxed = (listing.waitAttempts ?? 0) >= 2;
  const minLevel = dungeon.levelRange[0];
  const maxLevel = dungeon.levelRange[1] + (isRaid ? 2 : 1);
  const targetLevel = Math.round((dungeon.levelRange[0] + dungeon.levelRange[1]) / 2);
  const minGs = listing.requirements.minGearScore ?? 0;
  const allowedGs = isRaid && relaxed ? Math.floor(minGs * 0.85) : minGs;

  let best: NpcPlayer | undefined;
  let bestScore = -Infinity;

  for (const npc of server.npcs) {
    const focus = npc.roleFocus ?? npc.playstyle ?? 'mixed';

    if (listing.memberIds.includes(npc.id)) continue;
    if ((listing.applicantIds ?? []).includes(npc.id)) continue;
    if ((listing.rejectedIds ?? []).includes(npc.id)) continue;
    if (npc.level < minLevel || npc.level > maxLevel) continue;
    if (allowedGs && npc.gearScore < allowedGs) continue;
    if (isNpcBusyInBlockingListingForPlayerRequest(server, npc.id, listing.id)) continue;
    if (isRaid && !relaxed && focus === 'pvp') continue;
    if (!canMemberFillNeededRole(npc, listing, server)) continue;

    const role = getClassPartyRole(npc.classId);
    const need = hasRoleSlot(listing, role) ? 30 : 0;
    const levelFit = Math.max(0, 26 - Math.abs(npc.level - targetLevel) * 5);
    const gearBonus = Math.min(7, npc.gearScore / 420);
    const focusBonus = focus === 'pve' ? 5 : focus === 'mixed' ? 3 : isRaid ? -4 : 0;
    const score = need + levelFit + gearBonus + focusBonus + npc.activityLevel * 0.35 + npc.socialWeight * 0.2 + rng.next() * 2;

    if (score > bestScore) {
      best = npc;
      bestScore = score;
    }
  }

  return best;
};

const explainNoPlayerApplicant = (server: ServerState, listing: PartyFinderListing) => {
  const dungeon = getDungeonById(listing.dungeonId);
  if (!dungeon) return 'Контент не найден';

  const isRaid = dungeon.contentType === 'raid';
  const relaxed = (listing.waitAttempts ?? 0) >= 2;
  const minLevel = dungeon.levelRange[0];
  const maxLevel = dungeon.levelRange[1] + (isRaid ? 2 : 1);
  const minGs = listing.requirements.minGearScore ?? 0;
  const allowedGs = isRaid && relaxed ? Math.floor(minGs * 0.85) : minGs;

  const available = server.npcs.filter((npc) =>
    !listing.memberIds.includes(npc.id) &&
    !(listing.applicantIds ?? []).includes(npc.id) &&
    !(listing.rejectedIds ?? []).includes(npc.id) &&
    !isNpcBusyInBlockingListingForPlayerRequest(server, npc.id, listing.id),
  );

  const byLevel = available.filter((npc) => npc.level >= minLevel && npc.level <= maxLevel);
  if (byLevel.length === 0) return 'Нет NPC по уровню';

  const byGs = byLevel.filter((npc) => !allowedGs || npc.gearScore >= allowedGs);
  if (byGs.length === 0) return 'Нет NPC по GS';

  const needsTank = listing.roles.tankIds.length < listing.requirements.tanks;
  const needsHealer = listing.roles.healerIds.length < listing.requirements.healers;

  const hasRole = byGs.some((npc) => {
    const role = getClassPartyRole(npc.classId);
    if (needsTank) return role === 'tank';
    if (needsHealer) return role === 'healer';
    return role === 'physicalDps' || role === 'magicDps';
  });

  if (!hasRole) {
    if (needsTank) return 'Нет подходящего танка';
    if (needsHealer) return 'Нет подходящего хила';
    return 'Нет подходящего DPS';
  }

  return 'Новых заявок нет';
};

const pickNpcForListing = (server: ServerState, listing: PartyFinderListing, rng: Rng) => {
  const dungeon = getDungeonById(listing.dungeonId);
  if (!dungeon) return undefined;

  const candidates = server.npcs
    .filter((npc) => canNpcJoinListing(npc, listing, dungeon, server))
    .map((npc) => {
      const role = getClassPartyRole(npc.classId);
      const need = hasRoleSlot(listing, role) ? 8 : 0;
      const guildBoost = listing.guildId && npc.guildId === listing.guildId ? 5 : 0;
      const score = need + guildBoost + roleFocusWeight(npc) + npc.activityLevel * 0.6 + npc.socialWeight * 0.25 + npc.gearScore / 220 + rng.next() * 4;
      return { npc, score };
    })
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.npc;
};

const fillListingForNpcGeneration = (server: ServerState, listing: PartyFinderListing, rng: Rng, targetFill?: number) => {
  let next = withRebuiltRoles(server, { ...listing, memberIds: unique(listing.memberIds.filter((id) => allMembersKnown(server, [id]))) });
  const target = Math.min(listingMemberLimit(next), targetFill ?? rng.int(1, Math.max(1, listingMemberLimit(next) - 1)));

  while (next.memberIds.length < target) {
    const npc = pickNpcForListing(server, next, rng);
    if (!npc) break;
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
    listing = fillListingForNpcGeneration(server, listing, rng, rng.int(1, Math.max(1, listingMemberLimit(listing) - 1)));
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
    listing = fillListingForNpcGeneration(server, listing, rng, rng.int(Math.max(1, listingMemberLimit(listing) - 2), Math.max(1, listingMemberLimit(listing) - 1)));
    listings.push(listing);
  }

  return listings;
};

const leaderExistsAndIsMember = (server: ServerState, listing: PartyFinderListing) => {
  if (!listing.memberIds.includes(listing.leaderId)) return false;
  if (listing.leaderType === 'player') return listing.leaderId === server.player.id;
  if (listing.leaderType === 'npc') return Boolean(npcById(server, listing.leaderId));
  return false;
};

const normalizeListings = (server: ServerState) => {
  const now = nowTotalMinutes(server);
  return (server.partyFinderListings ?? [])
    .filter((listing) => listing.status !== 'started' && listing.status !== 'cancelled')
    .filter((listing) => listingExpiryTotal(listing) > now)
    .filter((listing) => Boolean(getDungeonById(listing.dungeonId)))
    .map((listing) => withRebuiltRoles(server, { ...listing, memberIds: unique(listing.memberIds.filter((id) => allMembersKnown(server, [id]))) }))
    .filter((listing) => leaderExistsAndIsMember(server, listing))
    .filter((listing) => listing.memberIds.length <= listingMemberLimit(listing))
    .slice(-40);
};

export const refreshPartyFinderListings = (server: ServerState, rng: Rng): ServerState => {
  let listings = normalizeListings(server);
  const target = Math.min(40, Math.max(8, 10 + Math.floor((server.npcs.length || 0) / 80)));

  // Only NPC-led groups progress passively. Player groups fill through the Lobby "Подождать" button.
  listings = listings.map((listing) => {
    if (listing.leaderType === 'npc' && !listing.memberIds.includes(server.player.id) && listing.status === 'forming' && rng.chance(0.18)) {
      const npc = pickNpcForListing({ ...server, partyFinderListings: listings }, listing, rng);
      return npc ? withRebuiltRoles(server, { ...listing, memberIds: unique([...listing.memberIds, npc.id]), log: [...(listing.log ?? []), `${npc.name} присоединился.`] }) : listing;
    }
    return listing;
  });

  if (listings.length < target) {
    const existingKeys = new Set(listings.map((listing) => `${listing.visibility}:${listing.leaderId}:${listing.dungeonId}`));
    const generated = generateNpcPartyFinderListings({ ...server, partyFinderListings: listings }, rng)
      .filter((listing) => !existingKeys.has(`${listing.visibility}:${listing.leaderId}:${listing.dungeonId}`));
    listings = [...listings, ...generated].slice(0, target);
  }

  const nextCurrent = server.currentPartyListingId && listings.some((listing) => listing.id === server.currentPartyListingId && listing.memberIds.includes(server.player.id))
    ? server.currentPartyListingId
    : undefined;

  return { ...server, currentPartyListingId: nextCurrent, partyFinderListings: listings.map((listing) => withRebuiltRoles(server, listing)) };
};

const modal = (rng: Rng, title: string, text: string, lines: string[] = []): GameModal => ({
  id: uid('party_modal', rng),
  type: 'system',
  title,
  text,
  lines,
});

export const createPlayerPartyListing = (server: ServerState, dungeonId: string, rng: Rng, visibility: PartyListingVisibility = 'public', difficulty: DungeonDifficulty = 'normal') => {
  const dungeon = getDungeonById(dungeonId);
  if (!dungeon) return { server, modal: modal(rng, 'Поиск пати', 'Контент не найден.') };

  const block = getCreatePartyListingBlockReason(server, dungeonId, visibility);
  if (block) return { server, modal: modal(rng, 'Поиск пати', block) };

  const guild = guildById(server, server.player.guildId);
  const finalVisibility: PartyListingVisibility = visibility === 'guild_internal' && guild ? 'guild_internal' : 'public';
  const listing = makeListing(server, rng, dungeon, server.player.id, 'player', finalVisibility, finalVisibility === 'guild_internal' ? guild?.id : server.player.guildId, finalVisibility === 'guild_internal' ? 'Гильдейский забег.' : 'Группа игрока.', difficulty);

  const withoutOldPlayerListings = (server.partyFinderListings ?? []).filter((entry) => entry.leaderId !== server.player.id && !entry.memberIds.includes(server.player.id));
  const next = {
    ...server,
    currentPartyListingId: listing.id,
    partyFinderListings: [...withoutOldPlayerListings, listing],
  };

  return {
    server: addNews(next, rng, 'dungeon', `${server.player.name} создал заявку: ${dungeon.name}.`, false),
    modal: modal(rng, 'Заявка создана', dungeon.name, ['Открой лобби и нажми "Подождать", чтобы искать людей.']),
  };
};

export const joinPartyListing = (server: ServerState, listingId: string, rng: Rng) => {
  let joined = false;
  let resultModal = modal(rng, 'Поиск пати', 'Заявка недоступна.');
  const listings = (server.partyFinderListings ?? []).map((listing) => {
    if (listing.id !== listingId) return listing;
    const reason = getPlayerListingBlockReason(server, listing);
    if (reason) {
      resultModal = modal(rng, 'Поиск пати', reason);
      return listing;
    }
    const nextListing = withRebuiltRoles(server, {
      ...listing,
      memberIds: unique([...listing.memberIds, server.player.id]),
      log: [...(listing.log ?? []), `${server.player.name} вступил в группу.`],
      waitAttempts: 0,
    });
    const dungeon = getDungeonById(listing.dungeonId);
    joined = true;
    resultModal = modal(rng, 'Ты вступил в группу', dungeon?.name ?? listing.dungeonId, ['Ожидай добор группы в лобби.']);
    return nextListing;
  });
  return { server: { ...server, currentPartyListingId: joined ? listingId : server.currentPartyListingId, partyFinderListings: listings }, modal: resultModal };
};

export const waitPartyListing = (server: ServerState, listingId: string, rng: Rng) => {
  let nextServer = advanceServerClock(server, 8);
  let resultModal: GameModal | undefined;
  let targetListing: PartyFinderListing | undefined;

  const listings = (nextServer.partyFinderListings ?? []).map((rawListing) => {
    if (rawListing.id !== listingId) return rawListing;

    const listing = withRebuiltRoles(nextServer, rawListing);
    targetListing = listing;
    const dungeon = getDungeonById(listing.dungeonId);

    if (!dungeon || !listing.memberIds.includes(nextServer.player.id) || isPartyListingReady(listing)) {
      return {
        ...listing,
        log: [...(listing.log ?? []), 'Новых заявок нет'].slice(-12),
      };
    }

    const playerLed = listing.leaderType === 'player' && listing.leaderId === nextServer.player.id;
    const candidate = playerLed
      ? pickNpcApplicantForPlayerListing(nextServer, listing, rng)
      : pickNpcForListing({ ...nextServer, partyFinderListings: nextServer.partyFinderListings ?? [] }, listing, rng);

    const forceJoin = (listing.waitAttempts ?? 0) >= 2;
    const shouldApply = Boolean(candidate) && (forceJoin || rng.chance(0.72));

    if (candidate && shouldApply && playerLed) {
      const line = `${candidate.name} отправил заявку`;
      const nextListing = withRebuiltRoles(nextServer, {
        ...listing,
        applicantIds: unique([...(listing.applicantIds ?? []), candidate.id]),
        waitAttempts: 0,
        log: [...(listing.log ?? []), line].slice(-12),
      });
      resultModal = modal(rng, 'Ожидание группы', line);
      return nextListing;
    }

    if (candidate && shouldApply && listing.leaderType === 'npc') {
      const line = `${candidate.name} присоединился`;
      return withRebuiltRoles(nextServer, {
        ...listing,
        memberIds: unique([...listing.memberIds, candidate.id]),
        waitAttempts: 0,
        log: [...(listing.log ?? []), line].slice(-12),
      });
    }

    const reason = playerLed ? explainNoPlayerApplicant(nextServer, listing) : candidate ? 'Ждём ответа от игроков.' : 'Новых заявок нет';
    return {
      ...listing,
      waitAttempts: (listing.waitAttempts ?? 0) + 1,
      log: [...(listing.log ?? []), reason].slice(-12),
    };
  });

  const ownsPlayerListing = listings.some((listing) =>
    listing.id === listingId &&
    listing.leaderType === 'player' &&
    listing.leaderId === nextServer.player.id &&
    listing.memberIds.includes(nextServer.player.id),
  );

  if (ownsPlayerListing) {
    const keptListings = listings.map((listing) => listing.id === listingId ? withRebuiltRoles(nextServer, listing) : listing);
    nextServer = {
      ...nextServer,
      partyFinderListings: keptListings,
      currentPartyListingId: keptListings.some((listing) => listing.id === listingId && listing.memberIds.includes(nextServer.player.id)) ? listingId : undefined,
    };
  } else {
    const normalized = refreshPartyFinderListings({ ...nextServer, partyFinderListings: listings, currentPartyListingId: targetListing ? listingId : nextServer.currentPartyListingId }, rng);
    nextServer = {
      ...normalized,
      currentPartyListingId: normalized.partyFinderListings.some((listing) => listing.id === listingId && listing.memberIds.includes(normalized.player.id)) ? listingId : undefined,
    };
  }

  return { server: nextServer, modal: resultModal };
};

export const leavePartyListing = (server: ServerState, listingId: string) => {
  const listings = (server.partyFinderListings ?? []).map((listing) => {
    if (listing.id !== listingId || !listing.memberIds.includes(server.player.id)) return listing;
    if (listing.leaderId === server.player.id) {
      return { ...listing, status: 'cancelled' as PartyListingStatus, log: [...(listing.log ?? []), 'Лидер распустил группу.'] };
    }
    return withRebuiltRoles(server, {
      ...listing,
      memberIds: listing.memberIds.filter((id) => id !== server.player.id),
      log: [...(listing.log ?? []), `${server.player.name} покинул группу.`],
    });
  });

  return { ...server, currentPartyListingId: server.currentPartyListingId === listingId ? undefined : server.currentPartyListingId, partyFinderListings: listings };
};

export const cancelPartyListing = (server: ServerState, listingId: string) => ({
  ...server,
  currentPartyListingId: server.currentPartyListingId === listingId ? undefined : server.currentPartyListingId,
  partyFinderListings: (server.partyFinderListings ?? []).map((listing) =>
    listing.id === listingId && listing.leaderId === server.player.id ? { ...listing, status: 'cancelled' as PartyListingStatus, log: [...(listing.log ?? []), 'Группа отменена.'] } : listing,
  ),
});

export const acceptPartyApplicant = (server: ServerState, listingId: string, npcId: string, rng: Rng) => {
  let accepted = false;
  let acceptedName = npcById(server, npcId)?.name ?? npcId;

  const listings = (server.partyFinderListings ?? []).map((listing) => {
    if (listing.id !== listingId) return listing;
    if (listing.leaderId !== server.player.id || listing.leaderType !== 'player') return listing;
    if (!(listing.applicantIds ?? []).includes(npcId)) return listing;

    const npc = npcById(server, npcId);
    const dungeon = getDungeonById(listing.dungeonId);
    if (!npc || !dungeon) {
      return { ...listing, applicantIds: (listing.applicantIds ?? []).filter((id) => id !== npcId) };
    }

    acceptedName = npc.name;
    const candidateListing = { ...listing, applicantIds: (listing.applicantIds ?? []).filter((id) => id !== npcId) };
    const canJoin =
      ACTIVE_STATUSES.includes(candidateListing.status) &&
      candidateListing.memberIds.length < listingMemberLimit(candidateListing) &&
      !candidateListing.memberIds.includes(npc.id) &&
      npc.level >= candidateListing.requirements.minLevel &&
      npc.level <= candidateListing.requirements.maxLevel + 1 &&
      (!candidateListing.requirements.minGearScore || npc.gearScore >= candidateListing.requirements.minGearScore) &&
      !isNpcBusyInBlockingListingForPlayerRequest(server, npc.id, candidateListing.id) &&
      canMemberFillNeededRole(npc, candidateListing, server);

    if (!canJoin) {
      return {
        ...candidateListing,
        rejectedIds: unique([...(listing.rejectedIds ?? []), npcId]),
        log: [...(listing.log ?? []), `${npc.name} больше не подходит.`].slice(-12),
      };
    }

    accepted = true;
    return withRebuiltRoles(server, {
      ...candidateListing,
      memberIds: unique([...listing.memberIds, npcId]),
      waitAttempts: 0,
      log: [...(listing.log ?? []), `${npc.name} принят в группу.`].slice(-12),
    });
  });

  const cleanedListings = accepted
    ? listings.map((listing) => {
        if (listing.id === listingId) return listing;
        if (listing.leaderType !== 'npc' || listing.visibility !== 'public' || !listing.memberIds.includes(npcId)) return listing;
        if (listing.leaderId === npcId) {
          return {
            ...listing,
            status: 'cancelled' as PartyListingStatus,
            memberIds: [],
            applicantIds: [],
            log: [...(listing.log ?? []), `${acceptedName} ушёл в группу игрока.`].slice(-12),
          };
        }
        return withRebuiltRoles(server, {
          ...listing,
          memberIds: listing.memberIds.filter((id) => id !== npcId),
          log: [...(listing.log ?? []), `${acceptedName} ушёл в группу игрока.`].slice(-12),
        });
      })
    : listings;

  return {
    server: { ...server, partyFinderListings: cleanedListings },
    modal: accepted ? modal(rng, 'Заявка принята', acceptedName) : modal(rng, 'Заявка не принята', acceptedName),
  };
};

export const rejectPartyApplicant = (server: ServerState, listingId: string, npcId: string, rng: Rng) => {
  const listings = (server.partyFinderListings ?? []).map((listing) => {
    if (listing.id !== listingId) return listing;
    if (listing.leaderId !== server.player.id || listing.leaderType !== 'player') return listing;
    if (!listing.applicantIds.includes(npcId)) return listing;

    const npcName = npcById(server, npcId)?.name ?? npcId;
    return {
      ...listing,
      applicantIds: listing.applicantIds.filter((id) => id !== npcId),
      rejectedIds: unique([...(listing.rejectedIds ?? []), npcId]),
      log: [...(listing.log ?? []), `${npcName} отклонён.`].slice(-12),
    };
  });

  return {
    server: { ...server, partyFinderListings: listings },
    modal: modal(rng, 'Заявка отклонена', npcById(server, npcId)?.name ?? npcId),
  };
};

export const startPartyFromListing = (server: ServerState, listingId: string, rng: Rng) => {
  const listing = (server.partyFinderListings ?? []).find((entry) => entry.id === listingId);
  const dungeon = listing ? getDungeonById(listing.dungeonId) : undefined;
  if (!listing || !dungeon) return { server, modal: modal(rng, 'Старт группы', 'Заявка не найдена.') };

  const reason = getStartPartyListingBlockReason(server, listing);
  if (reason) return { server, modal: modal(rng, 'Группа не готова', reason, [`Состав: ${listing.memberIds.length}/${listingMemberLimit(listing)}.`]) };

  const ready = withRebuiltRoles(server, listing);
  const partyRoles = buildPartyRolesFromListing(server, ready);
  if (!partyRoles) return { server, modal: modal(rng, 'Роли не собраны', dungeon.name) };

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
    difficulty: listing.difficulty ?? 'normal',
    encountersCleared: 0,
    deaths: 0,
  };

  const next = {
    ...server,
    currentDungeonRun: run,
    currentPartyListingId: undefined,
    partyFinderListings: (server.partyFinderListings ?? []).map((entry) => entry.id === listing.id ? { ...entry, status: 'started' as PartyListingStatus } : entry),
  };

  return {
    server: addNews(next, rng, dungeon.contentType === 'raid' ? 'raid' : 'dungeon', `${server.player.name} стартовал группу: ${dungeon.name}.`, false),
    modal: { id: uid('party_started', rng), type: 'dungeon' as const, title: 'Инстанс начат', text: dungeon.name, lines: [`Пати: ${partyNpcIds.length + 1}.`] },
  };
};

export const visiblePartyListings = (server: ServerState) =>
  (server.partyFinderListings ?? []).filter((listing) => canSeeListing(server, listing));
