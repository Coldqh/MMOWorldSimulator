import { useMemo, useState } from "react";
import {
  CITY_NAME,
  DUNGEONS,
  SPOTS,
  ZONES,
  getDungeonsByZoneId,
  getMobById,
  getSpotById,
  getZoneById,
} from "../../content/world";
import { useGameStore } from "../../state/gameStore";
import { CombatPanel } from "../components/CombatPanel";
import { getGearScore } from "../../systems/itemSystem";
import type { ScreenId } from "../../types/game";

type WorldTab = "overview" | "players";

const getLocationPlayers = (
  server: ReturnType<typeof useGameStore.getState>["server"],
) => {
  const key =
    server.location.mode === "city"
      ? "city"
      : server.location.mode === "spot"
        ? (server.location.spotId ?? "spot")
        : (server.location.zoneId ?? "zone");

  return server.npcs
    .filter((npc) => {
      const hash = [...`${npc.id}_${key}_${server.serverDay}`].reduce(
        (sum, char) => sum + char.charCodeAt(0),
        0,
      );
      if (server.location.mode === "city") return hash % 4 === 0;
      if (server.location.mode === "spot") return ['PVE_FARMER', 'RAIDER', 'COLLECTOR', 'HARDCORE', 'GUILD_PLAYER'].includes(npc.roleFocus) && hash % 6 === 0;
      return ['PVE_FARMER', 'RAIDER', 'GUILD_PLAYER', 'CASUAL', 'HARDCORE'].includes(npc.roleFocus) && hash % 5 === 0;
    })
    .sort((a, b) => b.level + b.gearScore / 50 - (a.level + a.gearScore / 50))
    .slice(0, 18);
};

const placeStatus = (
  server: ReturnType<typeof useGameStore.getState>["server"],
) => {
  if (server.location.mode === "city") return "Город";
  if (server.location.mode === "spot") return "Спот";
  return "Локация";
};

export const WorldScreen = () => {
  const server = useGameStore((state) => state.server);
  const combat = useGameStore((state) => state.combat);
  const setScreen = useGameStore((state) => state.setScreen);
  const travelToCity = useGameStore((state) => state.travelToCity);
  const travelToZone = useGameStore((state) => state.travelToZone);
  const enterSpot = useGameStore((state) => state.enterSpot);
  const leaveSpot = useGameStore((state) => state.leaveSpot);
  const startFarm = useGameStore((state) => state.startFarm);
  const startDungeon = useGameStore((state) => state.startDungeon);
  const openNpcProfile = useGameStore((state) => state.openNpcProfile);
  const [tab, setTab] = useState<WorldTab>("overview");
  const [travelOpen, setTravelOpen] = useState(false);

  const currentZone = server.location.zoneId
    ? getZoneById(server.location.zoneId)
    : undefined;
  const currentSpot = server.location.spotId
    ? getSpotById(server.location.spotId)
    : undefined;
  const zoneDungeons = currentZone ? getDungeonsByZoneId(currentZone.id) : [];
  const locationPlayers = useMemo(() => getLocationPlayers(server), [server]);

  const placeTitle =
    server.location.mode === "city"
      ? CITY_NAME
      : server.location.mode === "spot" && currentSpot
        ? currentSpot.name
        : (currentZone?.name ?? "Локация");

  const placeInfo =
    server.location.mode === "city"
      ? `${server.market.length} лотов · ${locationPlayers.length + 1} игроков рядом`
      : server.location.mode === "spot" && currentSpot && currentZone
        ? `${currentZone.name} · Lv. ${currentSpot.levelRange[0]}–${currentSpot.levelRange[1]} · риск ${currentSpot.risk}`
        : currentZone
          ? currentZone.description
          : "";

  const openScreen = (screen: ScreenId) => setScreen(screen);
  const playerGear = getGearScore(server.player.equipment);

  return (
    <div className="screen-stack">
      {combat && <CombatPanel />}

      <section className="panel hero-panel">
        <div className="section-title">{placeStatus(server)}</div>
        <h1>{placeTitle}</h1>
        <p className="muted">{placeInfo}</p>
        <div className="tab-row">
          <button
            className={tab === "overview" ? "active" : ""}
            onClick={() => setTab("overview")}
          >
            Обзор
          </button>
          <button
            className={tab === "players" ? "active" : ""}
            onClick={() => setTab("players")}
          >
            Игроки
          </button>
        </div>
      </section>

      {tab === "players" && (
        <section className="panel">
          <div className="section-title">Игроки рядом</div>
          <div className="list-lines">
            <div className="list-line self-line">
              <span>{server.player.name}</span>
              <strong>ты · Lv. {server.player.level} · Gear {playerGear}</strong>
            </div>
            {locationPlayers.length === 0 && (
              <span className="muted">Пусто.</span>
            )}
            {locationPlayers.map((npc) => (
              <div key={npc.id} className="list-line">
                <button
                  className="text-button"
                  onClick={() => openNpcProfile(npc.id)}
                >
                  {npc.name}
                </button>
                <strong>
                  Lv. {npc.level} · Gear {npc.gearScore}
                </strong>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === "overview" && server.location.mode === "city" && (
        <section className="panel">
          <div className="section-title">Город</div>
          <div className="action-grid">
            <button onClick={() => openScreen("market")}>Рынок</button>
            <button onClick={() => openScreen("arena")}>Арена</button>
            <button onClick={() => openScreen("enhance")}>
              Заточка шмоток
            </button>
          </div>
          <div className="list-lines mt-small">
            <div className="list-line">
              <span>Рынок</span>
              <strong>{server.market.length} лотов</strong>
            </div>
            <div className="list-line">
              <span>Игроки рядом</span>
              <strong>{locationPlayers.length + 1}</strong>
            </div>
          </div>
        </section>
      )}

      {tab === "overview" && server.location.mode === "zone" && currentZone && (
        <>
          <section className="panel">
            <div className="section-title">Споты</div>
            <div className="card-grid">
              {currentZone.spotIds.map((spotId) => {
                const spot = SPOTS.find((entry) => entry.id === spotId);
                if (!spot) return null;
                return (
                  <button
                    key={spot.id}
                    className="content-card"
                    onClick={() => enterSpot(spot.id)}
                    disabled={Boolean(combat)}
                  >
                    <strong>{spot.name}</strong>
                    <span>
                      Lv. {spot.levelRange[0]}–{spot.levelRange[1]}
                    </span>
                    <span>
                      {spot.timeCostMinutes} мин · риск {spot.risk}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="panel">
            <div className="section-title">Данжи</div>
            {zoneDungeons.length === 0 && <p className="muted">Нет данжей.</p>}
            <div className="card-grid">
              {zoneDungeons.map((dungeon) => {
                const lockedByLevel =
                  server.player.level < 5 ||
                  server.player.level < dungeon.levelRange[0];
                return (
                  <article
                    key={dungeon.id}
                    className={`content-card info-card ${lockedByLevel ? "locked-card" : ""}`}
                  >
                    <strong>{dungeon.name}</strong>
                    <span>
                      Lv. {dungeon.levelRange[0]}–{dungeon.levelRange[1]} · пати{" "}
                      {dungeon.partySize}
                    </span>
                    <span>{dungeon.timeCostMinutes} мин</span>
                    <button
                      onClick={() => startDungeon(dungeon.id)}
                      disabled={Boolean(combat) || lockedByLevel}
                    >
                      {lockedByLevel
                        ? `Нужен ${Math.max(5, dungeon.levelRange[0])} уровень`
                        : "Искать NPC-пати"}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        </>
      )}

      {tab === "overview" && server.location.mode === "spot" && currentSpot && (
        <>
          <section className="panel">
            <div className="section-title">Мобы</div>
            <div className="list-lines">
              {currentSpot.mobIds.map((mobId) => {
                const mob = getMobById(mobId);
                return mob ? (
                  <div key={mob.id} className="list-line">
                    <span>{mob.name}</span>
                    <strong>Lv. {mob.level}</strong>
                  </div>
                ) : null;
              })}
            </div>
            <button
              className="primary-button wide-button"
              onClick={() => startFarm(currentSpot.id)}
              disabled={Boolean(combat)}
            >
              Напасть на моба
            </button>
          </section>

          <section className="panel">
            <div className="section-title">Спот</div>
            <div className="list-lines">
              <div className="list-line">
                <span>Время фарма</span>
                <strong>{currentSpot.timeCostMinutes} мин</strong>
              </div>
              <div className="list-line">
                <span>Риск</span>
                <strong>{currentSpot.risk}</strong>
              </div>
              <div className="list-line">
                <span>Игроки рядом</span>
                <strong>{locationPlayers.length + 1}</strong>
              </div>
            </div>
          </section>
        </>
      )}

      <section className="panel">
        <div className="section-title">Перемещение</div>
        <div className="action-grid">
          {server.location.mode === "spot" && (
            <button
              onClick={leaveSpot}
              disabled={Boolean(combat) || Boolean(server.currentDungeonRun)}
            >
              Покинуть спот
            </button>
          )}
          {server.location.mode !== "city" && (
            <button
              onClick={travelToCity}
              disabled={Boolean(combat) || Boolean(server.currentDungeonRun)}
            >
              В город
            </button>
          )}
          <button
            onClick={() => setTravelOpen((value) => !value)}
            disabled={Boolean(combat)}
          >
            Сменить локацию
          </button>
        </div>
      </section>

      {travelOpen && (
        <section className="panel">
          <div className="section-title">Выбор локации</div>
          <div className="card-grid">
            {ZONES.map((zone) => {
              const dungeons = DUNGEONS.filter(
                (dungeon) => dungeon.zoneId === zone.id,
              );
              return (
                <button
                  key={zone.id}
                  className="content-card"
                  onClick={() => {
                    travelToZone(zone.id);
                    setTravelOpen(false);
                  }}
                  disabled={Boolean(combat)}
                >
                  <strong>{zone.name}</strong>
                  <span>
                    Lv. {zone.levelRange[0]}–{zone.levelRange[1]}
                  </span>
                  <span>
                    {zone.spotIds.length} спота · данжей {dungeons.length}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

    </div>
  );
};
