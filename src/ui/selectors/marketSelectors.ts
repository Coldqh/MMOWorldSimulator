import { getItemById, rarityScore } from "../../content/items";
import { estimateItemPrice, getMarketDiagnostics, isSystemMarketSeller } from "../../systems/marketSystem";
import type { EquipmentSlot, ServerState } from "../../types/game";

export type MarketCategory = "all" | "equipment" | "consumable" | "material" | "card";
export type MarketLevelBand = "all" | "low" | "mid" | "high" | "max";

export type MarketFilters = {
  category: MarketCategory;
  classFilter: string;
  slotFilter: EquipmentSlot | "";
  visibleLimit: number;
  levelBand?: MarketLevelBand;
};

type MarketListing = ServerState["market"][number];

export type MarketSellerRow = {
  id: string;
  sellerId: string;
  sellerLabel: string;
  price: number;
  amount: number;
  pricePercent: number;
  isSystemSeller: boolean;
  canAfford: boolean;
};

export type MarketGroupViewModel = {
  key: string;
  itemId: string;
  enhancement: number;
  cardIds: string[];
  amount: number;
  sellerCount: number;
  bestPrice: number;
  basePrice: number;
  sellerRows: MarketSellerRow[];
};

const systemSellerLabel: Record<string, string> = {
  system_market_general: "Системный рынок",
  system_market_equipment: "Снаряжение",
  system_market_materials: "Материалы",
  system_market_cards: "Карточный рынок",
};

const marketBandForLevelReq = (levelReq = 1): MarketLevelBand => {
  if (levelReq >= 60) return "max";
  if (levelReq >= 41) return "high";
  if (levelReq >= 21) return "mid";
  return "low";
};

const marketLevelSort = (playerLevel: number, levelA: number, levelB: number) => {
  const aUsable = levelA <= playerLevel;
  const bUsable = levelB <= playerLevel;
  if (aUsable !== bUsable) return aUsable ? -1 : 1;
  if (aUsable && bUsable) return levelB - levelA;
  return levelA - levelB;
};

const marketGroupKey = (listing: MarketListing) =>
  `${listing.itemId}|${listing.enhancement ?? 0}|${(listing.cardIds ?? []).join(",")}`;

const passesMarketFilter = (listing: MarketListing, server: ServerState, filters: MarketFilters) => {
  if (listing.sellerId === server.player.id) return false;
  const item = getItemById(listing.itemId);
  if (!item) return false;

  if (filters.levelBand && filters.levelBand !== "all" && marketBandForLevelReq(item.levelReq ?? 1) !== filters.levelBand) return false;

  if (filters.category === "all") return true;
  if (filters.category === "consumable") return item.type === "consumable";
  if (filters.category === "material") return item.type === "material";
  if (filters.category === "card") return item.type === "card";

  if (filters.category === "equipment") {
    if (!item.slot || !["weapon", "armor", "accessory"].includes(item.type)) return false;
    if (filters.slotFilter && item.slot !== filters.slotFilter) return false;
    if (filters.classFilter !== "all") {
      if (item.slot === "weapon" && !item.classTags.includes(filters.classFilter)) return false;
      if (item.slot !== "weapon" && item.classTags.length > 0 && !item.classTags.includes(filters.classFilter)) return false;
    }
    return true;
  }

  return true;
};

export const buildMarketViewModel = (server: ServerState, filters: MarketFilters) => {
  const npcNameById = new Map(server.npcs.map((npc) => [npc.id, npc.name]));
  const grouped = new Map<string, { key: string; itemId: string; enhancement: number; cardIds: string[]; listings: MarketListing[] }>();

  for (const listing of server.market) {
    if (!passesMarketFilter(listing, server, filters)) continue;
    const key = marketGroupKey(listing);
    const existing = grouped.get(key);
    if (existing) existing.listings.push(listing);
    else grouped.set(key, {
      key,
      itemId: listing.itemId,
      enhancement: listing.enhancement ?? 0,
      cardIds: listing.cardIds ?? [],
      listings: [listing],
    });
  }

  const allGroups = [...grouped.values()]
    .map((group) => ({ ...group, listings: [...group.listings].sort((a, b) => a.price - b.price) }))
    .sort((a, b) => {
      const itemA = getItemById(a.itemId);
      const itemB = getItemById(b.itemId);
      const levelSort = marketLevelSort(server.player.level, itemA?.levelReq ?? 1, itemB?.levelReq ?? 1);
      if (levelSort !== 0) return levelSort;
      const raritySort = (rarityScore[itemB?.rarity ?? "common"] ?? 0) - (rarityScore[itemA?.rarity ?? "common"] ?? 0);
      if (raritySort !== 0) return raritySort;
      return a.listings[0].price - b.listings[0].price;
    });

  const visibleGroups: MarketGroupViewModel[] = allGroups.slice(0, filters.visibleLimit).map((group) => {
    const best = group.listings[0];
    const item = getItemById(group.itemId);
    return {
      key: group.key,
      itemId: group.itemId,
      enhancement: group.enhancement,
      cardIds: group.cardIds,
      amount: group.listings.reduce((sum, listing) => sum + listing.amount, 0),
      sellerCount: group.listings.length,
      bestPrice: best.price,
      basePrice: best.basePrice ?? (item ? estimateItemPrice(item) : best.price),
      sellerRows: group.listings.slice(0, 3).map((listing) => {
        const isSystemSeller = isSystemMarketSeller(listing.sellerId);
        return {
          id: listing.id,
          sellerId: listing.sellerId,
          sellerLabel: isSystemSeller ? systemSellerLabel[listing.sellerId] ?? listing.sellerId : npcNameById.get(listing.sellerId) ?? listing.sellerId,
          price: listing.price,
          amount: listing.amount,
          pricePercent: listing.pricePercent ?? 0,
          isSystemSeller,
          canAfford: server.player.gold >= listing.price && Boolean(item),
        };
      }),
    };
  });

  const diagnostics = getMarketDiagnostics(server);

  return {
    groups: visibleGroups,
    totalGroups: allGroups.length,
    hasMore: allGroups.length > filters.visibleLimit,
    diagnostics: {
      ...diagnostics,
      visibleGroups: allGroups.length,
    },
    shouldRepair: diagnostics.brokenReasons.length > 0,
  };
};
