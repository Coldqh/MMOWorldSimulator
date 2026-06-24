import { useMemo, useState } from "react";
import { CLASSES } from "../../content/classes";
import { getItemById, rarityScore } from "../../content/items";
import { useGameStore } from "../../state/gameStore";
import { estimateItemPrice, getSellPrice } from "../../systems/marketSystem";
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

const categoryLabel = {
  equipment: "Снаряжение",
  consumable: "Предметы",
} as const;

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

export const MarketScreen = () => {
  const server = useGameStore((state) => state.server);
  const buy = useGameStore((state) => state.buyMarketListing);
  const sell = useGameStore((state) => state.sellItem);
  const setScreen = useGameStore((state) => state.setScreen);
  const openNpcProfile = useGameStore((state) => state.openNpcProfile);
  const openItemProfile = useGameStore((state) => state.openItemProfile);
  const [mode, setMode] = useState<"buy" | "sell">("buy");
  const [category, setCategory] = useState<"equipment" | "consumable" | "">("");
  const [consumableType, setConsumableType] = useState<"potion" | "material" | "card" | "">("");
  const [classFilter, setClassFilter] = useState("");
  const [slotFilter, setSlotFilter] = useState<EquipmentSlot | "">("");
  const [searched, setSearched] = useState(false);
  const inCity = server.location.mode === "city";

  const canSearch = category === "equipment"
    ? Boolean(classFilter && slotFilter)
    : category === "consumable"
      ? Boolean(consumableType)
      : false;

  const listingGroups = useMemo<ListingGroup[]>(() => {
    if (!searched || !canSearch) return [];
    const filtered = server.market.filter((listing) => {
      if (listing.sellerId === server.player.id) return false;
      const item = getItemById(listing.itemId);
      if (!item) return false;

      if (category === "equipment") {
        if (!item.slot || !["weapon", "armor", "accessory"].includes(item.type)) return false;
        if (item.slot !== slotFilter) return false;
        if (classFilter !== "all") {
          if (item.slot === "weapon" && !item.classTags.includes(classFilter)) return false;
          if (item.slot !== "weapon" && item.classTags.length > 0 && !item.classTags.includes(classFilter)) return false;
        }
        return true;
      }

      if (category === "consumable") {
        if (consumableType === "potion") return item.type === "consumable";
        if (consumableType === "material") return item.type === "material";
        if (consumableType === "card") return item.type === "card";
        return false;
      }

      return false;
    });

    const grouped = new Map<string, ListingGroup>();
    filtered.forEach((listing) => {
      const key = `${listing.itemId}|${listing.enhancement ?? 0}|${(listing.cardIds ?? []).join(',')}`;
      const existing = grouped.get(key);
      if (existing) existing.listings.push(listing);
      else grouped.set(key, { key, itemId: listing.itemId, enhancement: listing.enhancement ?? 0, listings: [listing] });
    });

    return [...grouped.values()].map((group) => ({ ...group, listings: [...group.listings].sort((a, b) => a.price - b.price) }))
      .sort((a, b) => {
        const itemA = getItemById(a.itemId);
        const itemB = getItemById(b.itemId);
        const levelSort = marketLevelSort(server.player.level, itemA?.levelReq ?? 1, itemB?.levelReq ?? 1);
        if (levelSort !== 0) return levelSort;
        const raritySort = (rarityScore[itemB?.rarity ?? "common"] ?? 0) - (rarityScore[itemA?.rarity ?? "common"] ?? 0);
        if (raritySort !== 0) return raritySort;
        return a.listings[0].price - b.listings[0].price;
      });
  }, [server.market, server.player.id, server.player.level, category, consumableType, classFilter, slotFilter, searched, canSearch]);

  const changeCategory = (next: typeof category) => {
    setCategory(next);
    setSearched(false);
    setConsumableType("");
    setClassFilter("");
    setSlotFilter("");
  };

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

      {mode === "buy" && (
        <>
          <section className="panel filter-panel">
            <div className="section-title">Фильтры</div>
            <div className="chip-row">
              {(["equipment", "consumable"] as const).map((id) => (
                <button key={id} className={category === id ? "active" : ""} onClick={() => changeCategory(id)}>{categoryLabel[id]}</button>
              ))}
            </div>

            {category === "consumable" && (
              <div className="chip-row">
                {(["potion", "material", "card"] as const).map((id) => (
                  <button key={id} className={consumableType === id ? "active" : ""} onClick={() => { setConsumableType(id); setSearched(false); }}>
                    {id === "potion" ? "зелья" : id === "material" ? "материалы" : "карты"}
                  </button>
                ))}
              </div>
            )}

            {category === "equipment" && (
              <>
                <div className="chip-row">
                  <button className={classFilter === "all" ? "active" : ""} onClick={() => { setClassFilter("all"); setSearched(false); }}>любой класс</button>
                  {CLASSES.map((cls) => (
                    <button key={cls.id} className={classFilter === cls.id ? "active" : ""} onClick={() => { setClassFilter(cls.id); setSearched(false); }}>{cls.name}</button>
                  ))}
                </div>
                <div className="chip-row">
                  {slots.map((slot) => (
                    <button key={slot} className={slotFilter === slot ? "active" : ""} onClick={() => { setSlotFilter(slot); setSearched(false); }}>{slotLabel[slot]}</button>
                  ))}
                </div>
              </>
            )}

            <button disabled={!canSearch} onClick={() => setSearched(true)}>Поиск</button>
            {!canSearch && <p className="muted">Выбери тип и все фильтры.</p>}
          </section>

          <section className="panel">
            <div className="section-title">Товары · {searched ? listingGroups.length : 0}</div>
            {!searched && <p className="muted">Лоты появятся после поиска.</p>}
            {searched && listingGroups.length === 0 && <p className="muted">Ничего не найдено.</p>}
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
                      {group.listings.slice(0, 8).map((listing) => (
                        <div key={listing.id} className="seller-row">
                          <span>
                            <button className="text-button inline-button" onClick={() => openNpcProfile(listing.sellerId)}>{server.npcs.find((npc) => npc.id === listing.sellerId)?.name ?? listing.sellerId}</button>
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
