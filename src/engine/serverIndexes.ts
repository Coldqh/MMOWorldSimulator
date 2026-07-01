import type {
  Guild,
  GuildWar,
  Id,
  MarketListing,
  NpcPlayer,
  PartyFinderListing,
  ServerState,
  WorldLocationState,
} from '../types/game';

export interface ServerIndexes {
  npcById: Map<Id, NpcPlayer>;
  guildById: Map<Id, Guild>;
  npcsByGuildId: Map<Id, NpcPlayer[]>;
  guildsByTier: Map<string, Guild[]>;
  activeWarsByGuildId: Map<Id, GuildWar[]>;
  partyListingsByMemberId: Map<Id, PartyFinderListing[]>;
  marketListingsByItemId: Map<Id, MarketListing[]>;
  npcsByLocationKey: Map<string, NpcPlayer[]>;
}

const pushToMap = <T>(map: Map<string, T[]>, key: string | undefined, value: T) => {
  if (!key) return;
  const bucket = map.get(key) ?? [];
  bucket.push(value);
  map.set(key, bucket);
};

export const locationKeyFromWorldLocation = (location: WorldLocationState): string => {
  if (location.mode === 'spot') return `spot:${location.spotId ?? ''}`;
  if (location.mode === 'zone') return `zone:${location.zoneId ?? ''}`;
  return 'city';
};

export const locationKeyFromNpc = (npc: Pick<NpcPlayer, 'locationMode' | 'currentZoneId' | 'currentSpotId'>): string => {
  const mode = npc.locationMode ?? 'city';
  if (mode === 'spot') return `spot:${npc.currentSpotId ?? ''}`;
  if (mode === 'zone') return `zone:${npc.currentZoneId ?? ''}`;
  return 'city';
};

export const createServerIndexes = (server: ServerState): ServerIndexes => {
  const npcById = new Map<Id, NpcPlayer>();
  const guildById = new Map<Id, Guild>();
  const npcsByGuildId = new Map<Id, NpcPlayer[]>();
  const guildsByTier = new Map<string, Guild[]>();
  const activeWarsByGuildId = new Map<Id, GuildWar[]>();
  const partyListingsByMemberId = new Map<Id, PartyFinderListing[]>();
  const marketListingsByItemId = new Map<Id, MarketListing[]>();
  const npcsByLocationKey = new Map<string, NpcPlayer[]>();

  (server.npcs ?? []).forEach((npc) => {
    npcById.set(npc.id, npc);
    pushToMap(npcsByGuildId, npc.guildId, npc);
    pushToMap(npcsByLocationKey, locationKeyFromNpc(npc), npc);
  });

  (server.guilds ?? []).forEach((guild) => {
    guildById.set(guild.id, guild);
    pushToMap(guildsByTier, guild.tier, guild);
  });

  (server.guildWars ?? []).forEach((war) => {
    if (war.status !== 'active' && war.status !== 'scheduled') return;
    pushToMap(activeWarsByGuildId, war.attackerGuildId, war);
    pushToMap(activeWarsByGuildId, war.defenderGuildId, war);
  });

  (server.partyFinderListings ?? []).forEach((listing) => {
    listing.memberIds.forEach((id) => pushToMap(partyListingsByMemberId, id, listing));
  });

  (server.market ?? []).forEach((listing) => {
    pushToMap(marketListingsByItemId, listing.itemId, listing);
  });

  return {
    npcById,
    guildById,
    npcsByGuildId,
    guildsByTier,
    activeWarsByGuildId,
    partyListingsByMemberId,
    marketListingsByItemId,
    npcsByLocationKey,
  };
};
