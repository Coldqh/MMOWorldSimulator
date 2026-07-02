import { ITEMS, getItemById, normalizeLegacyItemId } from "../content/items";
import { calculateItemPrice, MAX_LEVEL } from "../balance";
import { createRng, type Rng, uid } from "../engine/rng";
import type { Id, ItemDefinition, MarketListing, ServerState } from "../types/game";
import { addInventoryItem, removeInventoryItem } from "./itemSystem";

export const SYSTEM_MARKET_SELLER_IDS = [
  "system_market_general",
  "system_market_equipment",
  "system_market_materials",
  "system_market_cards",
] as const;

export const MARKET_MIN_LISTINGS = 620;
export const MARKET_MIN_ITEM_GROUPS = 210;
export const MARKET_MIN_EQUIPMENT_LISTINGS = 260;
export const MARKET_MIN_CONSUMABLE_MATERIAL_LISTINGS = 120;
export const MARKET_MIN_PLAYER_LEVEL_LISTINGS = 100;
export const MARKET_MIN_MID_PLUS_GROUPS = 90;
export const MARKET_MIN_HIGH_PLUS_GROUPS = 45;
export const MARKET_MIN_MAX_GROUPS = 20;
export const MARKET_MIN_ENHANCEMENT_STONE_GROUPS = 20;

export const estimateItemPrice = (item: ItemDefinition): number => calculateItemPrice(item);

export const getSellPrice = (item: ItemDefinition): number =>
  Math.max(1, Math.round(estimateItemPrice(item) * 0.55));

const isMarketTradeableItem = (item: ItemDefinition) =>
  item.tradeable && item.rarity !== "unique" && item.type !== "quest";

const isEquipmentMarketItem = (item: ItemDefinition) =>
  item.type === "weapon" || item.type === "armor" || item.type === "accessory";

const isConsumableMaterialMarketItem = (item: ItemDefinition) =>
  item.type === "consumable" || item.type === "material";

const isPlayerLevelItem = (item: ItemDefinition, playerLevel: number) =>
  (item.levelReq ?? 1) <= Math.max(1, playerLevel + 2);

const isEnhancementStone = (item: ItemDefinition) =>
  ((item.type === "material" && item.id.includes("enhance_stone")) || item.id === "sharpening_stone");

export const isSystemMarketSeller = (sellerId: Id) =>
  (SYSTEM_MARKET_SELLER_IDS as readonly string[]).includes(sellerId);

const validSellerIdsFor = (server: Pick<ServerState, "npcs">) =>
  new Set<string>([
    ...SYSTEM_MARKET_SELLER_IDS,
    ...(server.npcs ?? []).map((npc) => npc.id),
  ]);

const sellerPoolForItem = (item: ItemDefinition, npcSellerIds: string[]) => {
  if (item.type === "card") return ["system_market_cards", ...npcSellerIds];
  if (isEquipmentMarketItem(item)) return ["system_market_equipment", ...npcSellerIds];
  if (isConsumableMaterialMarketItem(item)) return ["system_market_materials", "system_market_general", ...npcSellerIds];
  return ["system_market_general", ...npcSellerIds];
};

const createListing = (
  item: ItemDefinition,
  sellerIds: string[],
  rng: Rng,
  serverDay: number,
  priceShiftMin = 0,
  priceShiftMax = 160,
): MarketListing => {
  const basePrice = estimateItemPrice(item);
  const pricePercent = rng.int(priceShiftMin, priceShiftMax);
  const amount = isConsumableMaterialMarketItem(item) ? rng.int(2, 18) : item.type === "card" ? rng.int(1, 3) : 1;

  return {
    id: uid("listing", rng),
    sellerId: rng.pick(sellerIds.length > 0 ? sellerIds : [...SYSTEM_MARKET_SELLER_IDS]),
    itemId: item.id,
    basePrice,
    pricePercent,
    price: Math.max(1, Math.round((basePrice * (100 + pricePercent)) / 100)),
    amount,
    enhancement: 0,
    cardIds: [],
    createdDay: serverDay,
  };
};

const addListingsForPool = (
  out: MarketListing[],
  items: ItemDefinition[],
  npcSellerIds: string[],
  rng: Rng,
  serverDay: number,
  countPerItem: number,
  priceShiftMin = 0,
  priceShiftMax = 160,
) => {
  items.forEach((item) => {
    const sellers = sellerPoolForItem(item, npcSellerIds);
    for (let i = 0; i < countPerItem; i += 1) {
      out.push(createListing(item, sellers, rng, serverDay, priceShiftMin, priceShiftMax));
    }
  });
};

const uniqueById = (items: ItemDefinition[]) => {
  const map = new Map<string, ItemDefinition>();
  items.forEach((item) => map.set(item.id, item));
  return [...map.values()];
};

export const generateFullMarket = (
  server: Pick<ServerState, "seed" | "serverDay" | "npcs"> & { player?: ServerState["player"] },
  rng: Rng,
): MarketListing[] => {
  const npcSellerIds = (server.npcs ?? []).map((npc) => npc.id);
  const tradeable = ITEMS.filter(isMarketTradeableItem);
  const equipment = tradeable.filter(isEquipmentMarketItem);
  const consumablesMaterials = tradeable.filter(isConsumableMaterialMarketItem);
  const cards = tradeable.filter((item) => item.type === "card");
  const enhancementStones = tradeable.filter(isEnhancementStone);
  const midPlusItems = tradeable.filter((item) => (item.levelReq ?? 1) >= 21);
  const highPlusItems = tradeable.filter((item) => (item.levelReq ?? 1) >= 41);
  const maxItems = tradeable.filter((item) => (item.levelReq ?? 1) >= 60);

  const playerLevel = Math.max(1, server.player?.level ?? 1);
  const playerBandEquipment = equipment.filter((item) => {
    const level = item.levelReq ?? 1;
    return level >= Math.max(1, playerLevel - 4) && level <= Math.min(MAX_LEVEL, playerLevel + 4);
  });

  const starterEquipment = equipment.filter((item) => (item.levelReq ?? 1) <= 5);
  const generalEquipment = equipment.filter((item) => item.sourceType === undefined || item.sourceType === 'general' || item.sourceType === 'world');
  const dungeonEquipment = equipment.filter((item) => item.sourceType === 'dungeon');
  const raidEquipment = equipment.filter((item) => item.sourceType === 'raid');

  const out: MarketListing[] = [];

  addListingsForPool(out, uniqueById([...starterEquipment, ...playerBandEquipment, ...generalEquipment]), npcSellerIds, rng, server.serverDay, 2, 0, 120);
  addListingsForPool(out, uniqueById(dungeonEquipment), npcSellerIds, rng, server.serverDay, 1, 30, 220);
  addListingsForPool(out, uniqueById(raidEquipment), npcSellerIds, rng, server.serverDay, 1, 80, 260);
  addListingsForPool(out, consumablesMaterials, npcSellerIds, rng, server.serverDay, 5, 0, 90);
  addListingsForPool(out, cards, npcSellerIds, rng, server.serverDay, 1, 80, 260);

  const playerLevelItems = tradeable.filter((item) => isPlayerLevelItem(item, playerLevel));
  let guard = 0;
  while (out.filter((listing) => {
    const item = getItemById(listing.itemId);
    return item ? isPlayerLevelItem(item, playerLevel) : false;
  }).length < MARKET_MIN_PLAYER_LEVEL_LISTINGS && playerLevelItems.length > 0 && guard < 400) {
    const item = rng.pick(playerLevelItems);
    out.push(createListing(item, sellerPoolForItem(item, npcSellerIds), rng, server.serverDay));
    guard += 1;
  }

  while (out.length < MARKET_MIN_LISTINGS && tradeable.length > 0 && guard < 1000) {
    const item = rng.pick(tradeable);
    out.push(createListing(item, sellerPoolForItem(item, npcSellerIds), rng, server.serverDay));
    guard += 1;
  }

  return out;
};

export type MarketDiagnostics = {
  listings: number;
  validListings: number;
  itemGroups: number;
  visibleGroups?: number;
  equipment: number;
  consumableMaterial: number;
  cards: number;
  invalidItemRefs: number;
  invalidSellerRefs: number;
  playerLevelListings: number;
  midPlusGroups: number;
  highPlusGroups: number;
  maxGroups: number;
  enhancementStoneGroups: number;
  brokenReasons: string[];
};

export const getMarketDiagnostics = (server: ServerState): MarketDiagnostics => {
  const validSellerIds = validSellerIdsFor(server);
  const groups = new Set<string>();
  let validListings = 0;
  let equipment = 0;
  let consumableMaterial = 0;
  let cards = 0;
  let invalidItemRefs = 0;
  let invalidSellerRefs = 0;
  let playerLevelListings = 0;
  const midPlusGroups = new Set<string>();
  const highPlusGroups = new Set<string>();
  const maxGroups = new Set<string>();
  const enhancementStoneGroups = new Set<string>();

  (server.market ?? []).forEach((listing) => {
    const itemId = normalizeLegacyItemId(listing.itemId);
    const item = getItemById(itemId);
    if (!item || !isMarketTradeableItem(item)) {
      invalidItemRefs += 1;
      return;
    }
    if (!validSellerIds.has(listing.sellerId)) {
      invalidSellerRefs += 1;
      return;
    }

    validListings += 1;
    groups.add(`${item.id}|${listing.enhancement ?? 0}|${(listing.cardIds ?? []).join(",")}`);
    if (isEquipmentMarketItem(item)) equipment += 1;
    if (isConsumableMaterialMarketItem(item)) consumableMaterial += 1;
    if (item.type === "card") cards += 1;
    if (isPlayerLevelItem(item, server.player.level)) playerLevelListings += 1;
  
    if ((item.levelReq ?? 1) >= 21) midPlusGroups.add(item.id);
    if ((item.levelReq ?? 1) >= 41) highPlusGroups.add(item.id);
    if ((item.levelReq ?? 1) >= 60) maxGroups.add(item.id);
    if (isEnhancementStone(item)) enhancementStoneGroups.add(item.id);
});

  const availableMarketCoverage = ITEMS.filter(isMarketTradeableItem);
  const availableMidPlusGroups = new Set(availableMarketCoverage.filter((item) => (item.levelReq ?? 1) >= 21).map((item) => item.id)).size;
  const availableHighPlusGroups = new Set(availableMarketCoverage.filter((item) => (item.levelReq ?? 1) >= 41).map((item) => item.id)).size;
  const availableMaxGroups = new Set(availableMarketCoverage.filter((item) => (item.levelReq ?? 1) >= 60).map((item) => item.id)).size;
  const availableEnhancementStoneGroups = new Set(availableMarketCoverage.filter(isEnhancementStone).map((item) => item.id)).size;

  const minMidPlusGroups = Math.min(MARKET_MIN_MID_PLUS_GROUPS, availableMidPlusGroups);
  const minHighPlusGroups = Math.min(MARKET_MIN_HIGH_PLUS_GROUPS, availableHighPlusGroups);
  const minMaxGroups = Math.min(MARKET_MIN_MAX_GROUPS, availableMaxGroups);
  const minEnhancementStoneGroups = Math.min(MARKET_MIN_ENHANCEMENT_STONE_GROUPS, availableEnhancementStoneGroups);

  const brokenReasons: string[] = [];
  if ((server.market ?? []).length < MARKET_MIN_LISTINGS) brokenReasons.push("too_few_listings");
  if (groups.size < MARKET_MIN_ITEM_GROUPS) brokenReasons.push("too_few_item_groups");
  if (equipment < MARKET_MIN_EQUIPMENT_LISTINGS) brokenReasons.push("too_few_equipment");
  if (consumableMaterial < MARKET_MIN_CONSUMABLE_MATERIAL_LISTINGS) brokenReasons.push("too_few_consumable_material");
  if (playerLevelListings < MARKET_MIN_PLAYER_LEVEL_LISTINGS) brokenReasons.push("too_few_player_level_listings");
  if (invalidItemRefs > 0) brokenReasons.push("invalid_item_refs");
  if (invalidSellerRefs > 0) brokenReasons.push("invalid_seller_refs");
  if (midPlusGroups.size < minMidPlusGroups) brokenReasons.push("too_few_mid_plus_groups");
  if (highPlusGroups.size < minHighPlusGroups) brokenReasons.push("too_few_high_plus_groups");
  if (maxGroups.size < minMaxGroups) brokenReasons.push("too_few_max_groups");
  if (enhancementStoneGroups.size < minEnhancementStoneGroups) brokenReasons.push("too_few_enhancement_stones");

  return {
    listings: (server.market ?? []).length,
    validListings,
    itemGroups: groups.size,
    equipment,
    consumableMaterial,
    cards,
    invalidItemRefs,
    invalidSellerRefs,
    playerLevelListings,
    midPlusGroups: midPlusGroups.size,
    highPlusGroups: highPlusGroups.size,
    maxGroups: maxGroups.size,
    enhancementStoneGroups: enhancementStoneGroups.size,
    brokenReasons,
  };
};

export const isMarketBroken = (server: ServerState) =>
  getMarketDiagnostics(server).brokenReasons.length > 0;

const normalizeOneListing = (
  listing: MarketListing,
  validSellerIds: Set<string>,
): MarketListing | null => {
  const itemId = normalizeLegacyItemId(listing.itemId);
  const item = getItemById(itemId);
  if (!item || !isMarketTradeableItem(item)) return null;
  if (!validSellerIds.has(listing.sellerId)) return null;

  const basePrice = estimateItemPrice(item);
  const pricePercent = Number.isFinite(listing.pricePercent) ? listing.pricePercent : 0;
  return {
    ...listing,
    itemId,
    basePrice,
    pricePercent,
    price: Math.max(1, Math.round((basePrice * (100 + pricePercent)) / 100)),
    amount: Math.max(1, listing.amount ?? 1),
    enhancement: listing.enhancement ?? 0,
    cardIds: listing.cardIds ?? [],
  };
};

export const repairMarketIfBroken = (
  server: ServerState,
  rng: Rng,
  reason = "auto",
): ServerState => {
  const validSellerIds = validSellerIdsFor(server);
  const cleaned = (server.market ?? [])
    .map((listing) => normalizeOneListing(listing, validSellerIds))
    .filter((listing): listing is MarketListing => Boolean(listing));

  const cleanedServer: ServerState = {
    ...server,
    market: cleaned,
  };

  const diagnostics = getMarketDiagnostics(cleanedServer);
  if (diagnostics.brokenReasons.length === 0) return cleanedServer;

  const rebuilt: ServerState = {
    ...server,
    market: generateFullMarket(server, rng),
  };

  const rebuiltDiagnostics = getMarketDiagnostics(rebuilt);
  if (import.meta.env.DEV && rebuiltDiagnostics.brokenReasons.length > 0) {
    console.error("[MMOWS] full market rebuild failed", { reason, rebuiltDiagnostics });
  }

  return rebuilt;
};

export const normalizeMarketListings = (
  server: ServerState,
  rng: Rng,
): ServerState => repairMarketIfBroken(server, rng, "normalize");

export const generateMarketListings = (
  server: Pick<ServerState, "seed" | "serverDay" | "npcs"> & { player?: ServerState["player"] },
  rng: Rng,
): MarketListing[] => generateFullMarket(server, rng);

export const buyListing = (
  server: ServerState,
  listingId: string,
): ServerState => {
  if (server.location.mode !== "city") return server;
  const listing = server.market.find((entry) => entry.id === listingId);
  if (!listing) return server;
  const totalPrice = listing.price;
  if (server.player.gold < totalPrice) return server;

  const itemId = normalizeLegacyItemId(listing.itemId);
  return repairMarketIfBroken({
    ...server,
    player: {
      ...server.player,
      gold: server.player.gold - totalPrice,
      inventory: addInventoryItem(server.player.inventory, itemId, 1, listing.enhancement ?? 0, listing.cardIds ?? []),
    },
    npcs: server.npcs.map((npc) => npc.id === listing.sellerId ? { ...npc, gold: npc.gold + totalPrice } : npc),
    market: server.market
      .map((entry) =>
        entry.id === listingId ? { ...entry, amount: entry.amount - 1 } : entry,
      )
      .filter((entry) => entry.amount > 0),
  }, createRng(server.seed + server.serverDay * 5100 + server.currentMinute), "after_buy");
};

export const sellInventoryItem = (
  server: ServerState,
  itemId: string,
  rng: Rng,
  enhancement = 0,
  cardIds: string[] = [],
): ServerState => {
  if (server.location.mode !== "city") return server;
  itemId = normalizeLegacyItemId(itemId);
  const item = getItemById(itemId);
  const stack = server.player.inventory.find(
    (entry) =>
      normalizeLegacyItemId(entry.itemId) === itemId && (entry.enhancement ?? 0) === enhancement && [...(entry.cardIds ?? [])].sort().join('|') === [...cardIds].sort().join('|'),
  );
  if (!item || !stack || stack.amount <= 0 || !item.tradeable) return server;

  const sellPrice = getSellPrice(item);
  return repairMarketIfBroken({
    ...server,
    player: {
      ...server.player,
      gold: server.player.gold + sellPrice,
      inventory: removeInventoryItem(
        server.player.inventory,
        itemId,
        1,
        enhancement,
        cardIds,
      ),
    },
    market: server.market,
  }, rng, "after_sell");
};
