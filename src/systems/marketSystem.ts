import { ITEMS, getItemById, normalizeLegacyItemId } from "../content/items";
import { calculateItemPrice } from "../balance";
import { createRng, type Rng, uid } from "../engine/rng";
import type { Id, ItemDefinition, MarketListing, ServerState } from "../types/game";
import { addInventoryItem, removeInventoryItem } from "./itemSystem";

export const SYSTEM_MARKET_SELLER_IDS = [
  "system_market_general",
  "system_market_equipment",
  "system_market_materials",
  "system_market_cards",
] as const;

export const MARKET_MIN_LISTINGS = 200;
export const MARKET_MIN_ITEM_GROUPS = 60;
export const MARKET_MIN_EQUIPMENT_LISTINGS = 100;
export const MARKET_MIN_CONSUMABLE_MATERIAL_LISTINGS = 30;
export const MARKET_MIN_PLAYER_LEVEL_LISTINGS = 30;

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

  const playerLevel = Math.max(1, server.player?.level ?? 1);
  const playerBandEquipment = equipment.filter((item) => {
    const level = item.levelReq ?? 1;
    return level >= Math.max(1, playerLevel - 4) && level <= Math.min(20, playerLevel + 4);
  });

  const starterEquipment = equipment.filter((item) => (item.levelReq ?? 1) <= 5);
  const generalEquipment = equipment.filter((item) => !String(item.id).includes('raid') && !String(item.id).includes('thorn'));
  const dungeonEquipment = equipment.filter((item) =>
    String(item.id).includes('old_lantern') ||
    String(item.id).includes('blackroot') ||
    String(item.id).includes('mire_depths') ||
    String(item.id).includes('frost_vault') ||
    String(item.id).includes('glass_catacomb'),
  );

  const out: MarketListing[] = [];

  addListingsForPool(out, uniqueById([...starterEquipment, ...playerBandEquipment, ...generalEquipment.slice(0, 80)]), npcSellerIds, rng, server.serverDay, 2, 0, 120);
  addListingsForPool(out, uniqueById(dungeonEquipment.slice(0, 80)), npcSellerIds, rng, server.serverDay, 1, 30, 220);
  addListingsForPool(out, consumablesMaterials, npcSellerIds, rng, server.serverDay, 5, 0, 90);
  addListingsForPool(out, cards.slice(0, 50), npcSellerIds, rng, server.serverDay, 1, 80, 260);

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
  });

  const brokenReasons: string[] = [];
  if ((server.market ?? []).length < MARKET_MIN_LISTINGS) brokenReasons.push("too_few_listings");
  if (groups.size < MARKET_MIN_ITEM_GROUPS) brokenReasons.push("too_few_item_groups");
  if (equipment < MARKET_MIN_EQUIPMENT_LISTINGS) brokenReasons.push("too_few_equipment");
  if (consumableMaterial < MARKET_MIN_CONSUMABLE_MATERIAL_LISTINGS) brokenReasons.push("too_few_consumable_material");
  if (playerLevelListings < MARKET_MIN_PLAYER_LEVEL_LISTINGS) brokenReasons.push("too_few_player_level_listings");
  if (invalidItemRefs > 0) brokenReasons.push("invalid_item_refs");
  if (invalidSellerRefs > 0) brokenReasons.push("invalid_seller_refs");

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
