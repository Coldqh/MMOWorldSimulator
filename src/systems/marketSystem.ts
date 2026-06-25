import { ITEMS, getItemById, normalizeLegacyItemId } from "../content/items";
import { calculateItemPrice } from "../balance";
import type { Rng } from "../engine/rng";
import { uid } from "../engine/rng";
import type { ItemDefinition, ServerState } from "../types/game";
import { addInventoryItem, removeInventoryItem } from "./itemSystem";

export const MARKET_MIN_LISTINGS = 80;
export const MARKET_MIN_ITEM_GROUPS = 25;
export const MARKET_MIN_EQUIPMENT_LISTINGS = 40;
export const MARKET_MIN_CONSUMABLE_MATERIAL_LISTINGS = 10;

export const estimateItemPrice = (item: ItemDefinition): number => calculateItemPrice(item);

export const getSellPrice = (item: ItemDefinition): number =>
  Math.max(1, Math.round(estimateItemPrice(item) * 0.55));

const isMarketTradeableItem = (item: ItemDefinition) =>
  item.tradeable && item.rarity !== "unique" && item.type !== "quest";

const isEquipmentMarketItem = (item: ItemDefinition) =>
  item.type === "weapon" || item.type === "armor" || item.type === "accessory";

const isConsumableMaterialMarketItem = (item: ItemDefinition) =>
  item.type === "consumable" || item.type === "material";

const targetSellerCount = (item: ItemDefinition, rng?: Rng) => {
  if (item.rarity === "legendary") return rng ? rng.int(2, 3) : 3;
  if (item.rarity === "epic") return 10;
  if (item.rarity === "rare") return 20;
  if (item.rarity === "uncommon") return 50;
  return 100;
};

const createListing = (
  item: ItemDefinition,
  sellerIds: string[],
  rng: Rng,
  serverDay: number,
) => {
  const safeSellerIds = sellerIds.length > 0 ? sellerIds : ["npc_market"];
  const basePrice = estimateItemPrice(item);
  const percent = rng.int(0, 200);
  const amount = item.type === "consumable" || item.type === "material" ? rng.int(1, 12) : 1;
  return {
    id: uid("listing", rng),
    sellerId: rng.pick(safeSellerIds),
    itemId: item.id,
    basePrice,
    pricePercent: percent,
    price: Math.max(1, Math.round((basePrice * (100 + percent)) / 100)),
    amount,
    enhancement: 0,
    createdDay: serverDay,
  };
};

export const generateMarketListings = (
  server: Pick<ServerState, "seed" | "serverDay" | "npcs">,
  rng: Rng,
) => {
  const sellerIds =
    server.npcs.length > 0 ? server.npcs.map((npc) => npc.id) : ["npc_market"];
  const pool = ITEMS.filter(isMarketTradeableItem);

  return pool.flatMap((item) =>
    Array.from({ length: targetSellerCount(item, rng) }, () =>
      createListing(item, sellerIds, rng, server.serverDay),
    ),
  );
};

export type MarketDiagnostics = {
  listings: number;
  validListings: number;
  itemGroups: number;
  equipment: number;
  consumableMaterial: number;
  cards: number;
  invalidItemRefs: number;
  invalidSellerRefs: number;
  playerLevelListings: number;
  brokenReasons: string[];
};

export const getMarketDiagnostics = (server: ServerState): MarketDiagnostics => {
  const sellerIds = new Set((server.npcs ?? []).map((npc) => npc.id));
  const groups = new Set<string>();
  let validListings = 0;
  let equipment = 0;
  let consumableMaterial = 0;
  let cards = 0;
  let invalidItemRefs = 0;
  let invalidSellerRefs = 0;
  let playerLevelListings = 0;

  (server.market ?? []).forEach((listing) => {
    const itemId = normalizeLegacyItemId(listing.itemId);
    const item = getItemById(itemId);
    const sellerValid = sellerIds.has(listing.sellerId);
    if (!item || !isMarketTradeableItem(item)) {
      invalidItemRefs += 1;
      return;
    }
    if (!sellerValid) {
      invalidSellerRefs += 1;
      return;
    }

    validListings += 1;
    groups.add(`${item.id}|${listing.enhancement ?? 0}|${(listing.cardIds ?? []).join(",")}`);
    if (isEquipmentMarketItem(item)) equipment += 1;
    if (isConsumableMaterialMarketItem(item)) consumableMaterial += 1;
    if (item.type === "card") cards += 1;
    if ((item.levelReq ?? 1) <= server.player.level) playerLevelListings += 1;
  });

  const brokenReasons: string[] = [];
  if ((server.market ?? []).length < MARKET_MIN_LISTINGS) brokenReasons.push("too_few_listings");
  if (groups.size < MARKET_MIN_ITEM_GROUPS) brokenReasons.push("too_few_item_groups");
  if (equipment < MARKET_MIN_EQUIPMENT_LISTINGS) brokenReasons.push("too_few_equipment");
  if (consumableMaterial < MARKET_MIN_CONSUMABLE_MATERIAL_LISTINGS) brokenReasons.push("too_few_consumable_material");
  if (invalidItemRefs > 0) brokenReasons.push("invalid_item_refs");
  if (invalidSellerRefs > 0) brokenReasons.push("invalid_seller_refs");
  if (playerLevelListings <= 0) brokenReasons.push("no_player_level_listings");

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
    brokenReasons,
  };
};

export const isMarketBroken = (server: ServerState) =>
  getMarketDiagnostics(server).brokenReasons.length > 0;

const normalizeOneListing = (
  listing: ServerState["market"][number],
  sellerIds: Set<string>,
) => {
  const itemId = normalizeLegacyItemId(listing.itemId);
  const item = getItemById(itemId);
  if (!item || !isMarketTradeableItem(item)) return null;
  if (!sellerIds.has(listing.sellerId)) return null;

  const basePrice = estimateItemPrice(item);
  const rawPercent = Number.isFinite(listing.pricePercent)
    ? listing.pricePercent
    : Math.round(((listing.price || basePrice) / basePrice - 1) * 100);
  const pricePercent = Math.max(0, rawPercent);
  return {
    ...listing,
    itemId,
    basePrice,
    pricePercent,
    price: Math.max(1, Math.round((basePrice * (100 + pricePercent)) / 100)),
    amount: Math.max(1, listing.amount ?? 1),
    enhancement: listing.enhancement ?? 0,
  };
};

export const normalizeMarketListings = (
  server: ServerState,
  rng: Rng,
): ServerState => {
  const sellerIdsArray = server.npcs.length > 0 ? server.npcs.map((npc) => npc.id) : [];
  const sellerIds = new Set(sellerIdsArray);
  const normalized = (server.market ?? [])
    .map((listing) => normalizeOneListing(listing, sellerIds))
    .filter(Boolean) as ServerState["market"];

  const byItem = new Map<string, ServerState["market"]>();
  normalized.forEach((listing) => {
    const list = byItem.get(listing.itemId) ?? [];
    list.push(listing);
    byItem.set(listing.itemId, list);
  });

  const fill = ITEMS.filter(isMarketTradeableItem).flatMap((item) => {
    const current = byItem.get(item.id)?.length ?? 0;
    const target = targetSellerCount(item, rng);
    const missing = Math.max(0, target - current);
    return Array.from({ length: missing }, () => createListing(item, sellerIdsArray, rng, server.serverDay));
  });

  return repairMarketIfBroken({ ...server, market: [...normalized, ...fill] }, rng, "normalize");
};

export const repairMarketIfBroken = (
  server: ServerState,
  rng: Rng,
  reason = "auto",
): ServerState => {
  const sellerIdsArray = server.npcs.length > 0 ? server.npcs.map((npc) => npc.id) : [];
  const sellerIds = new Set(sellerIdsArray);

  const cleaned = (server.market ?? [])
    .map((listing) => normalizeOneListing(listing, sellerIds))
    .filter(Boolean) as ServerState["market"];

  let nextServer: ServerState = {
    ...server,
    market: cleaned,
  };

  let diagnostics = getMarketDiagnostics(nextServer);
  if (diagnostics.brokenReasons.length === 0) return nextServer;

  const regenerated = generateMarketListings(
    { seed: server.seed, serverDay: server.serverDay, npcs: server.npcs },
    rng,
  ).filter((listing) => {
    const item = getItemById(normalizeLegacyItemId(listing.itemId));
    return Boolean(item && isMarketTradeableItem(item) && sellerIds.has(listing.sellerId));
  });

  nextServer = {
    ...server,
    market: regenerated,
  };

  diagnostics = getMarketDiagnostics(nextServer);

  if (diagnostics.brokenReasons.length > 0) {
    const itemPool = ITEMS.filter(isMarketTradeableItem);
    const fallback = [...regenerated];
    while (fallback.length < MARKET_MIN_LISTINGS && itemPool.length > 0 && sellerIdsArray.length > 0) {
      fallback.push(createListing(rng.pick(itemPool), sellerIdsArray, rng, server.serverDay));
    }
    nextServer = { ...nextServer, market: fallback };
    diagnostics = getMarketDiagnostics(nextServer);
  }

  if (import.meta.env.DEV && diagnostics.brokenReasons.length > 0) {
    console.error("[MMOWS] market repair failed", { reason, diagnostics });
  }

  return nextServer;
};

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
  return {
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
  };
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
  return {
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
  };
};
