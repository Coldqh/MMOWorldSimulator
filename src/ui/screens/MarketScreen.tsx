import { useEffect, useMemo, useState } from "react";
import { CLASSES } from "../../content/classes";
import { getItemById, rarityScore } from "../../content/items";
import { useGameStore } from "../../state/gameStore";
import { estimateItemPrice, getMarketDiagnostics, getSellPrice, isSystemMarketSeller } from "../../systems/marketSystem";
import type { EquipmentSlot } from "../../types/game";
import { ItemLine } from "../components/ItemLine";

const priceMark = (percent: number) =>
  percent === 0 ? "0%" : percent > 0 ? `+${percent}%` : `${percent}%`;

const slots: Array<EquipmentSlot> = ["weapon", "head", "chest", "legs", "boots", "ring", "amulet"];

const slotLabel: Record<string, string> = {
  weapon: "оружие",
  head: "голова",
  chest: "тело",
  legs: "ноги",
  boots: "ботинки",
  ring: "кольцо",
  amulet: "амулет",
};

const systemSellerLabel: Record<string, string> = {
  system_market_general: "Системный рынок",
  system_market_equipment: "Снаряжение",
  system_market_materials: "Материалы",
  system_market_cards: "Карточный рынок",
};

type MarketCategory = "all" | "equipment" | "consumable" | "material" | "card";

type ListingGroup = {
  key: string;
  itemId: string;
  enhancement: number;
  listings: ReturnType<typeof useGameStore.getState>["server"]["market"];
};

const marketLevelSort = (playerLevel: number, levelA: number, levelB: number) => {
  const aUsable = levelA <= playerLevel;
  const bUsable = levelB <= playerLevel;
  if (aUsable !== bUsable) return aUsable ? -1 : 1;
  if (aUsable && bUsable) return levelB - levelA;
  return levelA - levelB;
};

const categoryLabel: Record<MarketCategory, string> = {
  all: "Все",
  equipment: "Снаряжение",
  consumable: "Расходники",
  material: "Материалы",
  card: "Карты",
};

export const MarketScreen = () => {
  const server = useGameStore((state) => state.server);
  const buy = useGameStore((state) => state.buyMarketListing);
  const sell = useGameStore((state) => state.sellItem);
  const repairMarket = useGameStore((state) => state.repairMarket);
  const setScreen = useGameStore((state) => state.setScreen);
  const openNpcProfile = useGameStore((state) => state.openNpcProfile);
  const openItemProfile = useGameStore((state) => state.openItemProfile);
  const [mode, setMode] = useState<"buy" | "sell">("buy");
  const [category, setCategory] = useState<MarketCategory>("all");
  const [classFilter, setClassFilter] = useState("all");
  const [slotFilter, setSlotFilter] = useState<EquipmentSlot | "">("");
  const inCity = server.location.mode === "city";

  useEffect(() => {
    if (inCity) repairMarket();
  }, [inCity, repairMarket]);

  const listingGroups = useMemo<ListingGroup[]>(() => {
    const filtered = server.market.filter((listing) => {
      if (listing.sellerId === server.player.id) return false;
      const item = getItemById(listing.itemId);
      if (!item) return false;

      if (category === "all") return true;
      if (category === "consumable") return item.type === "consumable";
      if (category === "material") return item.type === "material";
      if (category === "card") return item.type === "card";

      if (category === "equipment") {
        if (!item.slot || !["weapon", "armor", "accessory"].includes(item.type)) return false;
        if (slotFilter && item.slot !== slotFilter) return false;
        if (classFilter !== "all") {
          if (item.slot === "weapon" && !item.classTags.includes(classFilter)) return false;
          if (item.slot !== "weapon" && item.classTags.length > 0 && !item.classTags.includes(classFilter)) return false;
        }
        return true;
      }

      return true;
    });

    const grouped = new Map<string, ListingGroup>();
    filtered.forEach((listing) => {
      const key = `${listing.itemId}|${listing.enhancement ?? 0}|${(listing.cardIds ?? []).join(',')}`;
      const existing = grouped.get(key);
      if (existing) existing.listings.push(listing);
      else grouped.set(key, { key, itemId: listing.itemId, enhancement: listing.enhancement ?? 0, listings: [listing] });
    });

    return [...grouped.values()]
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
  }, [server.market, server.player.id, server.player.level, category, classFilter, slotFilter]);

  const marketDiagnostics = useMemo(() => ({
    ...getMarketDiagnostics(server),
    visibleGroups: listingGroups.length,
  }), [server, listingGroups.length]);

  if (!inCity) {
    return (
      <div className="screen-stack">
        <section className="panel hero-panel">
          <div className="section-title">🛒 Рынок</div>
          <h1>Нужен город</h1>
          <p className="muted">Торговать можно только в городе.</p>
          <button onClick={() => setScreen("world")}>В мир</button>
        </section>
      </div>
    );
  }

  return (
    <div className="screen-stack">
      <section className="panel hero-panel premium-panel">
        <div className="section-title">🛒 Рынок</div>
        <h1>{mode === "buy" ? "Покупка" : "Продажа"}</h1>
        <div className="tab-row">
          <button className={mode === "buy" ? "active" : ""} onClick={() => setMode("buy")}>Покупка</button>
          <button className={mode === "sell" ? "active" : ""} onClick={() => setMode("sell")}>Продажа</button>
        </div>
      </section>

      {import.meta.env.DEV && (
        <section className="panel">
          <div className="section-title">Market debug</div>
          <div className="list-lines">
            <div className="list-line"><span>listings</span><strong>{marketDiagnostics.listings}</strong></div>
            <div className="list-line"><span>valid listings</span><strong>{marketDiagnostics.validListings}</strong></div>
            <div className="list-line"><span>groups</span><strong>{marketDiagnostics.itemGroups}</strong></div>
            <div className="list-line"><span>visibleGroups</span><strong>{marketDiagnostics.visibleGroups}</strong></div>
            <div className="list-line"><span>equipment</span><strong>{marketDiagnostics.equipment}</strong></div>
            <div className="list-line"><span>materials</span><strong>{marketDiagnostics.consumableMaterial}</strong></div>
            <div className="list-line"><span>cards</span><strong>{marketDiagnostics.cards}</strong></div>
            <div className="list-line"><span>playerLevelListings</span><strong>{marketDiagnostics.playerLevelListings}</strong></div>
            <div className="list-line"><span>filter</span><strong>{category} / {classFilter} / {slotFilter || "all"}</strong></div>
            <div className="list-line"><span>broken</span><strong>{marketDiagnostics.brokenReasons.join(", ") || "no"}</strong></div>
          </div>
        </section>
      )}

      {mode === "buy" && (
        <>
          <section className="panel filter-panel">
            <div className="section-title">Фильтры</div>
            <div className="chip-row">
              {(["all", "equipment", "consumable", "material", "card"] as const).map((id) => (
                <button key={id} className={category === id ? "active" : ""} onClick={() => setCategory(id)}>{categoryLabel[id]}</button>
              ))}
            </div>

            {category === "equipment" && (
              <>
                <div className="chip-row">
                  <button className={classFilter === "all" ? "active" : ""} onClick={() => setClassFilter("all")}>любой класс</button>
                  {CLASSES.map((cls) => (
                    <button key={cls.id} className={classFilter === cls.id ? "active" : ""} onClick={() => setClassFilter(cls.id)}>{cls.name}</button>
                  ))}
                </div>
                <div className="chip-row">
                  <button className={slotFilter === "" ? "active" : ""} onClick={() => setSlotFilter("")}>любой слот</button>
                  {slots.map((slot) => (
                    <button key={slot} className={slotFilter === slot ? "active" : ""} onClick={() => setSlotFilter(slot)}>{slotLabel[slot]}</button>
                  ))}
                </div>
              </>
            )}
          </section>

          <section className="panel">
            <div className="section-title">Товары · {listingGroups.length}</div>
            {listingGroups.length === 0 && <p className="muted">Ничего не найдено.</p>}
            <div className="list-lines">
              {listingGroups.map((group) => {
                const item = getItemById(group.itemId);
                const best = group.listings[0];
                return (
                  <div key={group.key} className="market-group-card">
                    <div className="market-group-head">
                      <button className="text-button" onClick={() => openItemProfile(group.itemId, "market", group.enhancement)}>
                        <ItemLine itemId={group.itemId} amount={group.listings.reduce((sum, listing) => sum + listing.amount, 0)} enhancement={group.enhancement} showLevel />
                      </button>
                      <strong>от {best.price}g</strong>
                    </div>
                    <small>база {best.basePrice ?? (item ? estimateItemPrice(item) : best.price)}g · продавцов {group.listings.length}</small>
                    <div className="seller-list">
                      {group.listings.slice(0, 3).map((listing) => (
                        <div key={listing.id} className="seller-row">
                          <span>
                            {isSystemMarketSeller(listing.sellerId) ? (
                              <strong>{systemSellerLabel[listing.sellerId] ?? listing.sellerId}</strong>
                            ) : (
                              <button className="text-button inline-button" onClick={() => openNpcProfile(listing.sellerId)}>{server.npcs.find((npc) => npc.id === listing.sellerId)?.name ?? listing.sellerId}</button>
                            )}
                            <small> · {priceMark(listing.pricePercent ?? 0)} · ×{listing.amount}</small>
                          </span>
                          <button onClick={() => buy(listing.id)} disabled={server.player.gold < listing.price || !item}>Купить {listing.price}g</button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}

      {mode === "sell" && (
        <section className="panel">
          <div className="section-title">Продажа</div>
          <div className="list-lines">
            {server.player.inventory.length === 0 && <span className="muted">Пусто.</span>}
            {server.player.inventory.map((entry) => {
              const item = getItemById(entry.itemId);
              const price = item ? getSellPrice(item) : 0;
              return (
                <div key={`${entry.itemId}_${entry.enhancement ?? 0}_${(entry.cardIds ?? []).join('_')}`} className="list-line market-line">
                  <span>
                    <button className="text-button" onClick={() => openItemProfile(entry.itemId, "inventory", entry.enhancement ?? 0, entry.cardIds ?? [])}>
                      <ItemLine itemId={entry.itemId} amount={entry.amount} enhancement={entry.enhancement ?? 0} cardIds={entry.cardIds ?? []} showLevel />
                    </button>
                    {item && <small>продажа {price}g · база {estimateItemPrice(item)}g</small>}
                  </span>
                  <button disabled={!item?.tradeable} onClick={() => sell(entry.itemId, entry.enhancement ?? 0, entry.cardIds ?? [])}>Продать {price}g</button>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
