import { useEffect, useMemo, useState } from "react";
import { CLASSES } from "../../content/classes";
import { getItemById } from "../../content/items";
import { useGameStore } from "../../state/gameStore";
import { getSellPrice, estimateItemPrice } from "../../systems/marketSystem";
import type { EquipmentSlot } from "../../types/game";
import { ItemLine } from "../components/ItemLine";
import { buildMarketViewModel, type MarketCategory, type MarketLevelBand } from "../selectors/marketSelectors";

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

const categoryLabel: Record<MarketCategory, string> = {
  all: "Все",
  equipment: "Снаряжение",
  consumable: "Расходники",
  material: "Материалы",
  card: "Карты",
};

const levelBandLabel: Record<MarketLevelBand, string> = {
  all: "Все уровни",
  low: "Low 1–20",
  mid: "Mid 21–40",
  high: "High 41–59",
  max: "Max 60",
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
  const [visibleLimit, setVisibleLimit] = useState(160);
  const [levelBand, setLevelBand] = useState<MarketLevelBand>("all");
  const inCity = server.location.mode === "city";

  useEffect(() => {
    setVisibleLimit(160);
  }, [category, classFilter, slotFilter, levelBand]);

  const marketView = useMemo(
    () => buildMarketViewModel(server, { category, classFilter, slotFilter, visibleLimit, levelBand }),
    [server, category, classFilter, slotFilter, visibleLimit, levelBand],
  );

  useEffect(() => {
    if (inCity && marketView.shouldRepair) repairMarket();
  }, [inCity, marketView.shouldRepair, repairMarket]);

  const marketDiagnostics = marketView.diagnostics;

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
            <div className="list-line"><span>rendered</span><strong>{marketView.groups.length}</strong></div>
            <div className="list-line"><span>equipment</span><strong>{marketDiagnostics.equipment}</strong></div>
            <div className="list-line"><span>materials</span><strong>{marketDiagnostics.consumableMaterial}</strong></div>
            <div className="list-line"><span>cards</span><strong>{marketDiagnostics.cards}</strong></div>
            <div className="list-line"><span>playerLevelListings</span><strong>{marketDiagnostics.playerLevelListings}</strong></div>
            <div className="list-line"><span>midPlusGroups</span><strong>{marketDiagnostics.midPlusGroups}</strong></div>
            <div className="list-line"><span>highPlusGroups</span><strong>{marketDiagnostics.highPlusGroups}</strong></div>
            <div className="list-line"><span>maxGroups</span><strong>{marketDiagnostics.maxGroups}</strong></div>
            <div className="list-line"><span>stoneGroups</span><strong>{marketDiagnostics.enhancementStoneGroups}</strong></div>
            <div className="list-line"><span>filter</span><strong>{category} / {levelBand} / {classFilter} / {slotFilter || "all"}</strong></div>
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
            <div className="section-title">Товары · {marketView.totalGroups}</div>
            {marketView.totalGroups === 0 && <p className="muted">Ничего не найдено.</p>}
            <div className="list-lines">
              {marketView.groups.map((group) => {
                const item = getItemById(group.itemId);
                return (
                  <div key={group.key} className="market-group-card">
                    <div className="market-group-head">
                      <button className="text-button" onClick={() => openItemProfile(group.itemId, "market", group.enhancement)}>
                        <ItemLine itemId={group.itemId} amount={group.amount} enhancement={group.enhancement} showLevel />
                      </button>
                      <strong>от {group.bestPrice}g</strong>
                    </div>
                    <small>база {group.basePrice}g · продавцов {group.sellerCount}</small>
                    <div className="seller-list">
                      {group.sellerRows.map((listing) => (
                        <div key={listing.id} className="seller-row">
                          <span>
                            {listing.isSystemSeller ? (
                              <strong>{listing.sellerLabel}</strong>
                            ) : (
                              <button className="text-button inline-button" onClick={() => openNpcProfile(listing.sellerId)}>{listing.sellerLabel}</button>
                            )}
                            <small> · {priceMark(listing.pricePercent)} · ×{listing.amount}</small>
                          </span>
                          <button onClick={() => buy(listing.id)} disabled={!listing.canAfford || !item}>Купить {listing.price}g</button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            {marketView.hasMore && (
              <button className="wide-button" onClick={() => setVisibleLimit((value) => value + 160)}>
                Показать ещё 160
              </button>
            )}
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
