import { ITEMS, getItemById, normalizeLegacyItemId } from "../content/items";
import { calculateItemPrice } from "../balance";
import type { Rng } from "../engine/rng";
import { uid } from "../engine/rng";
import type { ItemDefinition, ServerState } from "../types/game";
import { addInventoryItem, removeInventoryItem } from "./itemSystem";

export const estimateItemPrice = (item: ItemDefinition): number => calculateItemPrice(item);

export const getSellPrice = (item: ItemDefinition): number =>
  Math.max(1, Math.round(estimateItemPrice(item) * 0.55));


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
  const basePrice = estimateItemPrice(item);
  const percent = rng.int(0, 200);
  const amount = item.type === "consumable" || item.type === "material" ? rng.int(1, 12) : 1;
  return {
    id: uid("listing", rng),
    sellerId: rng.pick(sellerIds),
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
  const pool = ITEMS.filter(
    (item) =>
      item.tradeable && item.rarity !== "unique" && item.type !== "quest",
  );

  return pool.flatMap((item) =>
    Array.from({ length: targetSellerCount(item, rng) }, () =>
      createListing(item, sellerIds, rng, server.serverDay),
    ),
  );
};

export const normalizeMarketListings = (
  server: ServerState,
  rng: Rng,
): ServerState => {
  const sellerIds = server.npcs.length > 0 ? server.npcs.map((npc) => npc.id) : ["npc_market"];
  const normalized = server.market
    .map((listing) => {
      const itemId = normalizeLegacyItemId(listing.itemId);
      const item = getItemById(itemId);
      if (
        !item ||
        !item.tradeable ||
        item.rarity === "unique" ||
        item.type === "quest"
      )
        return null;
      const basePrice = estimateItemPrice(item);
      const pricePercent = Math.max(0, Number.isFinite(listing.pricePercent) ? listing.pricePercent : Math.round(((listing.price || basePrice) / basePrice - 1) * 100));
      return {
        ...listing,
        itemId,
        basePrice,
        pricePercent,
        price: Math.max(1, Math.round((basePrice * (100 + pricePercent)) / 100)),
        amount: Math.max(1, listing.amount ?? 1),
        enhancement: listing.enhancement ?? 0,
      };
    })
    .filter(Boolean) as ServerState["market"];

  const byItem = new Map<string, ServerState["market"]>();
  normalized.forEach((listing) => {
    const list = byItem.get(listing.itemId) ?? [];
    list.push(listing);
    byItem.set(listing.itemId, list);
  });

  const fill = ITEMS.filter(
    (item) =>
      item.tradeable &&
      item.rarity !== "unique" &&
      item.type !== "quest",
  ).flatMap((item) => {
    const current = byItem.get(item.id)?.length ?? 0;
    const target = targetSellerCount(item, rng);
    const missing = Math.max(0, target - current);
    return Array.from({ length: missing }, () => createListing(item, sellerIds, rng, server.serverDay));
  });

  return { ...server, market: [...normalized, ...fill] };
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

  const basePrice = estimateItemPrice(item);
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
