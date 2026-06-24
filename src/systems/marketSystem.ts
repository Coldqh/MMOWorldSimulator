import { ITEMS, getItemById, normalizeLegacyItemId, rarityScore } from "../content/items";
import type { Rng } from "../engine/rng";
import { uid } from "../engine/rng";
import type { ItemDefinition, ServerState } from "../types/game";
import { addInventoryItem, removeInventoryItem } from "./itemSystem";

const typeMultiplier: Record<string, number> = {
  weapon: 1.35,
  armor: 1.15,
  accessory: 1.25,
  card: 45,
  consumable: 0.85,
  material: 1,
  mount: 3.5,
  pet: 2.5,
  cosmetic: 1.8,
  quest: 0,
};

export const estimateItemPrice = (item: ItemDefinition): number => {
  if (!item.tradeable || item.type === "quest") return 0;
  const statPower = Object.values(item.stats).reduce(
    (sum, value) => sum + Math.max(0, Number(value) || 0),
    0,
  );
  const rarity = rarityScore[item.rarity] ?? 1;
  const level = Math.max(1, item.levelReq);
  const socketBonus = item.socketSlots * 18;
  const base = 6 + level * level * 5 + statPower * 7 + socketBonus;
  const typed = base * (typeMultiplier[item.type] ?? 1);
  const rarityPrice = typed * (0.75 + rarity * 0.42);
  return Math.max(1, Math.round(Math.max(item.price, rarityPrice)));
};

export const getSellPrice = (item: ItemDefinition): number =>
  Math.max(1, Math.round(estimateItemPrice(item) * 0.55));

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

  return pool.flatMap((item) => {
    const basePrice = estimateItemPrice(item);
    const rollCount =
      item.type === "consumable" || item.type === "material" ? 2 : 1;
    return Array.from({ length: rollCount }, () => {
      const percent = rng.int(-20, 200);
      const amount =
        item.type === "consumable" || item.type === "material"
          ? rng.int(3, 18)
          : 1;
      return {
        id: uid("listing", rng),
        sellerId: rng.pick(sellerIds),
        itemId: item.id,
        basePrice,
        pricePercent: percent,
        price: Math.max(1, Math.round((basePrice * (100 + percent)) / 100)),
        amount,
        enhancement: 0,
        createdDay: server.serverDay,
      };
    });
  });
};

export const normalizeMarketListings = (
  server: ServerState,
  rng: Rng,
): ServerState => {
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
      const basePrice =
        Number.isFinite(listing.basePrice) && listing.basePrice > 0
          ? listing.basePrice
          : estimateItemPrice(item);
      const price =
        Number.isFinite(listing.price) && listing.price > 0
          ? listing.price
          : basePrice;
      const pricePercent = Number.isFinite(listing.pricePercent)
        ? listing.pricePercent
        : Math.round((price / basePrice - 1) * 100);
      return {
        ...listing,
        itemId,
        basePrice,
        pricePercent,
        price,
        amount: Math.max(1, listing.amount ?? 1),
        enhancement: listing.enhancement ?? 0,
      };
    })
    .filter(Boolean) as ServerState["market"];

  const existing = new Set(normalized.map((entry) => entry.itemId));
  const missing = ITEMS.filter(
    (item) =>
      item.tradeable &&
      item.rarity !== "unique" &&
      item.type !== "quest" &&
      !existing.has(item.id),
  );
  const fill = missing.flatMap((item) => {
    const basePrice = estimateItemPrice(item);
    const percent = rng.int(-20, 200);
    return [
      {
        id: uid("listing", rng),
        sellerId: rng.pick(
          server.npcs.length > 0
            ? server.npcs.map((npc) => npc.id)
            : ["npc_market"],
        ),
        itemId: item.id,
        basePrice,
        pricePercent: percent,
        price: Math.max(1, Math.round((basePrice * (100 + percent)) / 100)),
        amount:
          item.type === "consumable" || item.type === "material"
            ? rng.int(3, 16)
            : 1,
        enhancement: 0,
        createdDay: server.serverDay,
      },
    ];
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
