import { DUNGEONS, RAIDS } from "../../content/world";
import type { DungeonDefinition, PartyFinderListing, PartyListingVisibility, ServerState } from "../../types/game";
import { getGearScore } from "../../systems/itemSystem";
import {
  getClassPartyRole,
  getCreatePartyListingBlockReason,
  getPlayerListingBlockReason,
  totalPartyRequired,
} from "../../systems/partyFinderSystem";

export type PartyFinderFilter = "all" | "dungeon" | "raid" | "public" | "guild" | "available" | "role";

export type PartyFinderViewOptions = {
  filter: PartyFinderFilter;
  selectedId: string;
  visibility: PartyListingVisibility;
};

export type PartyFinderListingView = {
  listing: PartyFinderListing;
  dungeonName: string;
  typeLabel: string;
  visibilityLabel: string;
  leaderName: string;
  guildName: string;
  memberCount: number;
  maxMembers: number;
  reason: string;
  isMember: boolean;
  levelText: string;
  roleText: string;
};

const typeLabel: Record<string, string> = {
  dungeon: "Данж",
  raid: "Рейд",
};

const visibilityLabel: Record<string, string> = {
  public: "Публичная",
  guild_internal: "Гильдия",
  static: "Статик",
};

export const partyRoleLabel: Record<string, string> = {
  tank: "танк",
  healer: "хил",
  physicalDps: "дд",
  magicDps: "дд",
};

const sortInstancesForPlayer = (entries: DungeonDefinition[], playerLevel: number) =>
  [...entries].sort((a, b) => {
    const aAvailable = playerLevel >= a.levelRange[0];
    const bAvailable = playerLevel >= b.levelRange[0];
    if (aAvailable !== bAvailable) return aAvailable ? -1 : 1;
    return b.levelRange[0] - a.levelRange[0] || b.levelRange[1] - a.levelRange[1] || a.name.localeCompare(b.name);
  });

const listingLevel = (dungeonById: Map<string, DungeonDefinition>, listing: PartyFinderListing) =>
  dungeonById.get(listing.dungeonId)?.levelRange[0] ?? listing.requirements.minLevel;

export const partyFinderTimeLabel = (day: number, minute: number) => {
  const hh = Math.floor(minute / 60).toString().padStart(2, "0");
  const mm = (minute % 60).toString().padStart(2, "0");
  return `День ${day} · ${hh}:${mm}`;
};

export const buildPartyFinderViewModel = (server: ServerState, options: PartyFinderViewOptions) => {
  const instances = sortInstancesForPlayer([...DUNGEONS, ...RAIDS], server.player.level);
  const dungeonById = new Map(instances.map((dungeon) => [dungeon.id, dungeon]));
  const npcNameById = new Map(server.npcs.map((npc) => [npc.id, npc.name]));
  const guildNameById = new Map(server.guilds.map((guild) => [guild.id, guild.name]));
  const playerRole = getClassPartyRole(server.player.classId);
  const playerGear = getGearScore(server.player.equipment);

  const listings = (server.partyFinderListings ?? [])
    .filter((listing) => {
      const dungeon = dungeonById.get(listing.dungeonId);
      if (!dungeon) return false;
      if (listing.visibility !== "public" && listing.guildId !== server.player.guildId) return options.filter === "all" ? false : listing.guildId === server.player.guildId;
      if (options.filter === "dungeon") return listing.contentType === "dungeon";
      if (options.filter === "raid") return listing.contentType === "raid";
      if (options.filter === "public") return listing.visibility === "public";
      if (options.filter === "guild") return listing.visibility === "guild_internal" || listing.visibility === "static";
      if (options.filter === "available") return getPlayerListingBlockReason(server, listing) === "";
      if (options.filter === "role") {
        if (listing.memberIds.includes(server.player.id)) return true;
        if (playerRole === "tank") return listing.roles.tankIds.length < listing.requirements.tanks;
        if (playerRole === "healer") return listing.roles.healerIds.length < listing.requirements.healers;
        return listing.roles.dpsIds.length < listing.requirements.dps;
      }
      return true;
    })
    .sort((a, b) => {
      const aAvailable = server.player.level >= listingLevel(dungeonById, a);
      const bAvailable = server.player.level >= listingLevel(dungeonById, b);
      if (aAvailable !== bAvailable) return aAvailable ? -1 : 1;
      return listingLevel(dungeonById, b) - listingLevel(dungeonById, a) || a.id.localeCompare(b.id);
    })
    .map<PartyFinderListingView>((listing) => {
      const dungeon = dungeonById.get(listing.dungeonId);
      const memberCount = listing.memberIds.length;
      const maxMembers = totalPartyRequired(listing.requirements);
      const leaderName = listing.leaderId === server.player.id ? server.player.name : npcNameById.get(listing.leaderId) ?? listing.leaderId;
      const guildName = listing.guildId ? guildNameById.get(listing.guildId) ?? listing.guildId : "нет";
      return {
        listing,
        dungeonName: dungeon?.name ?? listing.dungeonId,
        typeLabel: typeLabel[listing.contentType] ?? listing.contentType,
        visibilityLabel: visibilityLabel[listing.visibility] ?? listing.visibility,
        leaderName,
        guildName,
        memberCount,
        maxMembers,
        reason: getPlayerListingBlockReason(server, listing),
        isMember: listing.memberIds.includes(server.player.id),
        levelText: `Lv. ${listing.requirements.minLevel}-${listing.requirements.maxLevel}${listing.requirements.minGearScore ? ` · GS ${listing.requirements.minGearScore}+` : ""}${listing.note ? ` · ${listing.note}` : ""}`,
        roleText: `танки ${listing.roles.tankIds.length}/${listing.requirements.tanks} · хилы ${listing.roles.healerIds.length}/${listing.requirements.healers} · дд ${listing.roles.dpsIds.length}/${listing.requirements.dps}`,
      };
    });

  const highestAvailable = instances.find((dungeon) => server.player.level >= dungeon.levelRange[0]) ?? instances[0];
  const createReason = options.selectedId ? getCreatePartyListingBlockReason(server, options.selectedId, options.visibility) : "Контент не найден";

  return {
    instances,
    listings,
    highestAvailableId: highestAvailable?.id ?? "",
    playerRole,
    playerRoleLabel: partyRoleLabel[playerRole],
    playerGear,
    createReason,
    guildName: server.player.guildId ? guildNameById.get(server.player.guildId) ?? server.player.guildId : "",
  };
};
