import { useMemo, useState } from 'react';
import {
  CITY_NAME,
  DUNGEONS,
  SPOTS,
  ZONES,
  getDungeonsByZoneId,
  getMobById,
  getSpotById,
  getZoneById,
} from '../../content/world';
import { QUESTS } from '../../content/quests';
import { getQuestGiversByZoneId, getQuestGiverById } from '../../content/questGivers';
import { getQuestState } from '../../systems/questSystem';
import { useGameStore } from '../../state/gameStore';
import { getGearScore } from '../../systems/itemSystem';
import { formatRareSpawnTimeLeft, getRareSpawnRecommendedGear, rareSpawnKindLabel, sortRareSpawnsForPlayer } from '../../systems/rareSpawnSystem';
import { getWorldBossRaidSummary } from '../../systems/worldBossRaidSystem';
import type { RareSpawnState, ScreenId } from '../../types/game';
import { CombatPanel } from '../components/CombatPanel';
import { QuestGiverCard } from '../components/QuestGiverCard';
import { LocationNpcList } from '../components/LocationNpcList';

type WorldTab = 'overview' | 'players' | 'elites' | 'bosses';

const npcLocationWeight = (npcLevel: number, minLevel: number, maxLevel: number, hash: number) => {
  if (npcLevel >= minLevel && npcLevel <= maxLevel) return 1000 - (hash % 120);
  if (npcLevel > maxLevel && hash % 997 === 0) return 18 - Math.min(14, npcLevel - maxLevel);
  return -999;
};

const getLocationRange = (server: ReturnType<typeof useGameStore.getState>['server']) => {
  if (server.location.mode === 'spot') {
    const spot = getSpotById(server.location.spotId ?? '');
    return spot?.levelRange ?? [1, 20];
  }
  if (server.location.mode === 'zone') {
    const zone = getZoneById(server.location.zoneId ?? '');
    return zone?.levelRange ?? [1, 20];
  }
  return [1, 20];
};

const getLocationPlayers = (server: ReturnType<typeof useGameStore.getState>['server']) => {
  const key = server.location.mode === 'city'
    ? 'city'
    : server.location.mode === 'spot'
      ? (server.location.spotId ?? 'spot')
      : (server.location.zoneId ?? 'zone');

  const [minLevel, maxLevel] = getLocationRange(server);
  const locationFocus = server.location.mode === 'spot'
    ? ['PVE_FARMER', 'RAIDER', 'COLLECTOR', 'HARDCORE', 'GUILD_PLAYER']
    : ['PVE_FARMER', 'RAIDER', 'GUILD_PLAYER', 'CASUAL', 'HARDCORE'];

  return server.npcs
    .map((npc) => {
      const hash = [...`${npc.id}_${key}_${server.serverDay}`].reduce((sum, char) => sum + char.charCodeAt(0), 0);
      let score = 0;
      if (server.location.mode === 'city') {
        score = hash % 4 === 0 ? 300 - (hash % 100) : -999;
      } else {
        const focusOk = locationFocus.includes(npc.roleFocus);
        const presenceOk = server.location.mode === 'spot' ? hash % 5 === 0 : hash % 4 === 0;
        score = presenceOk && focusOk ? npcLocationWeight(npc.level, minLevel, maxLevel, hash) : -999;
      }
      return { npc, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || b.npc.gearScore - a.npc.gearScore)
    .slice(0, 18)
    .map((entry) => entry.npc);
};

const placeStatus = (server: ReturnType<typeof useGameStore.getState>['server']) => {
  if (server.location.mode === 'city') return 'Город';
  if (server.location.mode === 'spot') return 'Спот';
  return 'Локация';
};

const sortDungeonsForPlayer = (entries: typeof DUNGEONS, level: number) =>
  [...entries].sort((a, b) => {
    const aAvailable = level >= a.levelRange[0];
    const bAvailable = level >= b.levelRange[0];
    if (aAvailable !== bAvailable) return aAvailable ? -1 : 1;
    return b.levelRange[0] - a.levelRange[0] || b.levelRange[1] - a.levelRange[1] || a.name.localeCompare(b.name);
  });

const availableZonesForPlayer = (level: number) =>
  [...ZONES]
    .filter((zone) => level >= zone.levelRange[0])
    .sort((a, b) => b.levelRange[0] - a.levelRange[0] || b.levelRange[1] - a.levelRange[1] || a.name.localeCompare(b.name));

const findUnlockQuestForTarget = (server: ReturnType<typeof useGameStore.getState>['server'], targetId: string) =>
  QUESTS
    .filter((quest) => quest.importance === 'unlock' && quest.unlockTargetId === targetId)
    .sort((a, b) => {
      const order = { readyToTurnIn: 0, active: 1, available: 2, locked: 3, completed: 4 } as const;
      return order[getQuestState(server, a.id).status] - order[getQuestState(server, b.id).status] || b.levelReq - a.levelReq;
    })[0];

const spotLevelText = (mobIds: string[]) => {
  const levels = mobIds.map((mobId) => getMobById(mobId)?.level).filter((level): level is number => typeof level === 'number');
  if (levels.length === 0) return 'Lv. ?';
  const min = Math.min(...levels);
  const max = Math.max(...levels);
  return min === max ? `Lv. ${min}` : `Lv. ${min}–${max}`;
};

const worldBossTypeLabel = (spawn: RareSpawnState) =>
  spawn?.summonSource === 'guild'
    ? `гильдейский призыв${spawn.summonedByGuildName ? ` · ${spawn.summonedByGuildName}` : ''}`
    : 'рейдовый мировой босс';

export const WorldScreen = () => {
  const server = useGameStore((state) => state.server);
  const combat = useGameStore((state) => state.combat);
  const setScreen = useGameStore((state) => state.setScreen);
  const travelToCity = useGameStore((state) => state.travelToCity);
  const travelToZone = useGameStore((state) => state.travelToZone);
  const enterSpot = useGameStore((state) => state.enterSpot);
  const leaveSpot = useGameStore((state) => state.leaveSpot);
  const startFarm = useGameStore((state) => state.startFarm);
  const attackRareSpawn = useGameStore((state) => state.attackRareSpawn);
  const joinWorldBossRaid = useGameStore((state) => state.joinWorldBossRaid);
  const attackWorldBossRaid = useGameStore((state) => state.attackWorldBossRaid);
  const startDungeon = useGameStore((state) => state.startDungeon);
  const openNpcProfile = useGameStore((state) => state.openNpcProfile);
  const [tab, setTab] = useState<WorldTab>('overview');
  const [travelOpen, setTravelOpen] = useState(false);

  const currentZone = server.location.zoneId ? getZoneById(server.location.zoneId) : undefined;
  const currentSpot = server.location.spotId ? getSpotById(server.location.spotId) : undefined;
  const zoneDungeons = currentZone ? sortDungeonsForPlayer(getDungeonsByZoneId(currentZone.id), server.player.level) : [];
  const locationPlayers = useMemo(() => getLocationPlayers(server), [server]);
  const playerGear = getGearScore(server.player.equipment);
  const questGiverZoneId = server.location.mode === 'city'
    ? 'starting_city'
    : server.location.zoneId ?? currentSpot?.zoneId ?? '';
  const questGivers = getQuestGiversByZoneId(questGiverZoneId);
  const travelZones = availableZonesForPlayer(server.player.level);
  const currentZoneId = server.location.mode === 'spot'
    ? currentSpot?.zoneId
    : server.location.mode === 'zone'
      ? server.location.zoneId
      : undefined;
  const activeRareSpawns = server.activeRareSpawns ?? [];
  const sortedRareSpawns = sortRareSpawnsForPlayer(activeRareSpawns, server.player.level);
  const worldBossTabSpawns = sortedRareSpawns.filter((spawn) => spawn.kind === 'world_boss');
  const eliteSpawns = sortedRareSpawns.filter((spawn) => spawn.kind === 'rare_elite');
  const localRareSpawns = eliteSpawns
    .filter((spawn) => currentZoneId && spawn.zoneId === currentZoneId)
    .filter((spawn) => server.location.mode !== 'spot' || !spawn.spotId || spawn.spotId === server.location.spotId);
  const visibleRareSpawns = [...worldBossTabSpawns, ...localRareSpawns];
  const placeTitle = server.location.mode === 'city'
    ? CITY_NAME
    : server.location.mode === 'spot' && currentSpot
      ? currentSpot.name
      : (currentZone?.name ?? 'Локация');

  const placeInfo = server.location.mode === 'city'
    ? `${server.market.length} лотов · ${locationPlayers.length + 1} игроков рядом`
    : server.location.mode === 'spot' && currentSpot && currentZone
      ? `${currentZone.name} · Lv. ${currentSpot.levelRange[0]}–${currentSpot.levelRange[1]} · риск ${currentSpot.risk}`
      : currentZone
        ? `Lv. ${currentZone.levelRange[0]}–${currentZone.levelRange[1]}`
        : '';

  const openScreen = (screen: ScreenId) => setScreen(screen);

  return (
    <div className="screen-stack">
      {combat && <CombatPanel />}

      <section className="panel hero-panel">
        <div className="section-title">{placeStatus(server)}</div>
        <h1>{placeTitle}</h1>
        <p className="muted">{placeInfo}</p>
        <div className="tab-row">
          <button className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}>Обзор</button>
          <button className={tab === 'players' ? 'active' : ''} onClick={() => setTab('players')}>Игроки</button>
          <button className={tab === 'elites' ? 'active' : ''} onClick={() => setTab('elites')}>Элитные противники{eliteSpawns.length > 0 ? ` · ${eliteSpawns.length}` : ''}</button>
          <button className={tab === 'bosses' ? 'active' : ''} onClick={() => setTab('bosses')}>Мировые боссы{worldBossTabSpawns.length > 0 ? ` · ${worldBossTabSpawns.length}` : ''}</button>
        </div>
      </section>

      {tab === 'players' && <LocationNpcList />}

      {tab === 'elites' && (
        <section className="panel rare-threat-panel">
          <div className="section-title">⚠ Элитные противники</div>
          {eliteSpawns.length === 0 ? (
            <p className="muted">Сейчас нет активных редких элиток. Пропусти время или проверь позже.</p>
          ) : (
            <div className="list-lines">
              {eliteSpawns.map((spawn) => {
                const zone = getZoneById(spawn.zoneId);
                const spot = spawn.spotId ? getSpotById(spawn.spotId) : undefined;
                const isNear = server.location.mode !== 'city' && currentZoneId === spawn.zoneId && (server.location.mode !== 'spot' || !spawn.spotId || spawn.spotId === server.location.spotId);
                const locationText = spot && zone ? `${zone.name} · ${spot.name}` : zone?.name ?? 'неизвестная зона';
                return (
                  <div key={spawn.id} className="list-line rare-threat-line">
                    <span>
                      <strong>⚠ {spawn.name}</strong>
                      <small> · {rareSpawnKindLabel(spawn.kind)} · Lv. {spawn.level} · {locationText} · осталось {formatRareSpawnTimeLeft(server, spawn)} · рек. Gear {getRareSpawnRecommendedGear(spawn)} · {isNear ? 'рядом' : 'далеко'}</small>
                    </span>
                    <span className="inline-actions">
                      {!isNear && zone && <button onClick={() => travelToZone(spawn.zoneId)} disabled={Boolean(combat) || server.location.zoneId === spawn.zoneId}>К локации</button>}
                      <button onClick={() => attackRareSpawn(spawn.id)} disabled={Boolean(combat) || !isNear}>Атаковать</button>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {tab === 'bosses' && (
        <section className="panel rare-threat-panel boss-threat-panel">
          <div className="section-title">☠ Мировые боссы</div>
          {worldBossTabSpawns.length === 0 ? (
            <p className="muted">Сейчас нет активных мировых боссов. Пропусти время или проверь позже.</p>
          ) : (
            <div className="list-lines">
              {worldBossTabSpawns.map((spawn) => {
                const zone = getZoneById(spawn.zoneId);
                const spot = spawn.spotId ? getSpotById(spawn.spotId) : undefined;
                const isNear = server.location.mode !== 'city' && currentZoneId === spawn.zoneId;
                const locationText = spot && zone ? `${zone.name} · ${spot.name}` : zone?.name ?? 'неизвестная зона';
                const raid = getWorldBossRaidSummary(server, spawn);
                const raidFull = raid.participantCount >= raid.maxParticipants && !raid.playerJoined;
                return (
                  <div key={spawn.id} className="list-line rare-threat-line boss-threat">
                    <span>
                      <strong>☠ {spawn.name}</strong>
                      <small> · {worldBossTypeLabel(spawn)} · Lv. {spawn.level} · {locationText} · HP {raid.hpPercent}% · участники {raid.participantCount}/{raid.maxParticipants} · ход {raid.round} · твой урон {raid.playerDamage}{raid.playerRank ? ` · место #${raid.playerRank}` : ''} · осталось {formatRareSpawnTimeLeft(server, spawn)} · {isNear ? 'рядом' : 'далеко'}</small>
                    </span>
                    <span className="inline-actions">
                      {!isNear && zone && <button onClick={() => travelToZone(spawn.zoneId)} disabled={Boolean(combat) || server.location.zoneId === spawn.zoneId}>К локации</button>}
                      {!raid.playerJoined
                        ? <button onClick={() => joinWorldBossRaid(spawn.id)} disabled={Boolean(combat) || !isNear || raidFull}>{raidFull ? 'Рейд заполнен' : 'Присоединиться'}</button>
                        : <button onClick={() => attackWorldBossRaid(spawn.id)} disabled={Boolean(combat) || !isNear}>Атаковать</button>}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {tab === 'overview' && visibleRareSpawns.length > 0 && (
        <section className="panel rare-threat-panel">
          <div className="section-title">⚠ Редкие угрозы</div>
          <div className="list-lines">
            {visibleRareSpawns.map((spawn) => {
              const zone = getZoneById(spawn.zoneId);
              const spot = spawn.spotId ? getSpotById(spawn.spotId) : undefined;
              const isNear = server.location.mode !== 'city' && currentZoneId === spawn.zoneId && (server.location.mode !== 'spot' || spawn.kind === 'world_boss' || !spawn.spotId || spawn.spotId === server.location.spotId);
              const raid = spawn.kind === 'world_boss' ? getWorldBossRaidSummary(server, spawn) : undefined;
              const raidFull = raid ? raid.participantCount >= raid.maxParticipants && !raid.playerJoined : false;
              return (
                <div key={spawn.id} className={`list-line rare-threat-line ${spawn.kind === 'world_boss' ? 'boss-threat' : ''}`}>
                  <span>
                    <strong>{spawn.kind === 'world_boss' ? '☠ ' : ''}{spawn.name}</strong>
                    <small> · {spawn.kind === 'world_boss' && raid ? `${worldBossTypeLabel(spawn)} · HP ${raid.hpPercent}% · ${raid.participantCount}/${raid.maxParticipants} участников · твой урон ${raid.playerDamage}` : rareSpawnKindLabel(spawn.kind)} · Lv. {spawn.level} · {spot?.name ?? zone?.name ?? 'зона'} · осталось {formatRareSpawnTimeLeft(server, spawn)} · рек. Gear {getRareSpawnRecommendedGear(spawn)}</small>
                  </span>
                  <span className="inline-actions">
                    {!isNear && zone && <button onClick={() => travelToZone(spawn.zoneId)} disabled={Boolean(combat) || server.location.zoneId === spawn.zoneId}>К локации</button>}
                    {spawn.kind === 'world_boss' && raid
                      ? (!raid.playerJoined
                          ? <button onClick={() => joinWorldBossRaid(spawn.id)} disabled={Boolean(combat) || !isNear || raidFull}>{raidFull ? 'Рейд заполнен' : 'Присоединиться'}</button>
                          : <button onClick={() => attackWorldBossRaid(spawn.id)} disabled={Boolean(combat) || !isNear}>Атаковать</button>)
                      : <button onClick={() => attackRareSpawn(spawn.id)} disabled={Boolean(combat) || !isNear}>Атаковать</button>}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {tab === 'overview' && questGivers.length > 0 && (
        <section className="panel">
          <div className="section-title">NPC в зоне</div>
          <div className="card-grid">
            {questGivers.map((giver) => <QuestGiverCard key={giver.id} giver={giver} />)}
          </div>
        </section>
      )}

      {tab === 'overview' && server.location.mode === 'city' && (
        <section className="panel">
          <div className="section-title">Город</div>
          <div className="action-grid">
            <button onClick={() => openScreen('market')}>Рынок</button>
            <button onClick={() => openScreen('arena')}>Арена</button>
            <button onClick={() => openScreen('enhance')}>Заточка шмоток</button>
          </div>
          <div className="list-lines mt-small">
            <div className="list-line"><span>Рынок</span><strong>{server.market.length} лотов</strong></div>
            <div className="list-line"><span>Игроки рядом</span><strong>{locationPlayers.length + 1}</strong></div>
          </div>
        </section>
      )}

      {tab === 'overview' && server.location.mode === 'zone' && currentZone && (
        <>
          <section className="panel">
            <div className="section-title">Споты</div>
            <div className="card-grid">
              {currentZone.spotIds.map((spotId) => {
                const spot = SPOTS.find((entry) => entry.id === spotId);
                if (!spot) return null;
                return (
                  <button key={spot.id} className="content-card" onClick={() => enterSpot(spot.id)} disabled={Boolean(combat)}>
                    <strong>{spot.name}</strong>
                    <span>{spotLevelText(spot.mobIds)}</span>
                    <span>{spot.timeCostMinutes} мин · риск {spot.risk}</span>
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
                const lockedByLevel = server.player.level < dungeon.levelRange[0];
                const lockedByQuest = !(server.unlockedContent ?? []).includes(dungeon.id);
                const unlockQuest = findUnlockQuestForTarget(server, dungeon.id);
                const unlockGiver = unlockQuest ? getQuestGiverById(unlockQuest.giverId) : undefined;
                return (
                  <article key={dungeon.id} className={`content-card info-card ${lockedByLevel || lockedByQuest ? 'locked-card' : ''}`}>
                    <strong>{dungeon.name}</strong>
                    <span>Lv. {dungeon.levelRange[0]}–{dungeon.levelRange[1]} · пати {dungeon.partySize}</span>
                    <span>{dungeon.floors.length} этажей</span>
                    {lockedByQuest && <span className="quest-unlock-hint">🛡️ ! {unlockQuest?.title ?? 'Квест открытия'} · {unlockGiver?.name ?? 'NPC зоны'}</span>}
                    <button onClick={() => startDungeon(dungeon.id)} disabled={Boolean(combat) || lockedByLevel || lockedByQuest}>
                      {lockedByLevel ? `Нужен ${dungeon.levelRange[0]} уровень` : lockedByQuest ? 'Закрыто: ! ветка' : 'Поиск пати'}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        </>
      )}

      {tab === 'overview' && server.location.mode === 'spot' && currentSpot && (
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
                    <button onClick={() => startFarm(currentSpot.id, mob.id)} disabled={Boolean(combat)}>Напасть</button>
                  </div>
                ) : null;
              })}
            </div>
          </section>

          <section className="panel">
            <div className="section-title">Спот</div>
            <div className="list-lines">
              <div className="list-line"><span>Время фарма</span><strong>{currentSpot.timeCostMinutes} мин</strong></div>
              <div className="list-line"><span>Риск</span><strong>{currentSpot.risk}</strong></div>
              <div className="list-line"><span>Игроки рядом</span><strong>{locationPlayers.length + 1}</strong></div>
            </div>
          </section>
        </>
      )}

      <section className="panel">
        <div className="section-title">Перемещение</div>
        <div className="action-grid">
          {server.location.mode === 'spot' && (
            <button onClick={leaveSpot} disabled={Boolean(combat) || Boolean(server.currentDungeonRun)}>Покинуть спот</button>
          )}
          {server.location.mode !== 'city' && (
            <button onClick={travelToCity} disabled={Boolean(combat) || Boolean(server.currentDungeonRun)}>В город</button>
          )}
          <button onClick={() => setTravelOpen(true)} disabled={Boolean(combat)}>Сменить локацию</button>
        </div>
      </section>

      {travelOpen && (
        <div className="modal-backdrop travel-modal-backdrop" onClick={() => setTravelOpen(false)}>
          <section className="result-modal travel-modal full-window-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header-line">
              <div>
                <div className="section-title">Перемещение</div>
                <h2>Доступные локации</h2>
              </div>
              <button className="small-close" onClick={() => setTravelOpen(false)}>×</button>
            </div>
            <p className="muted modal-subtitle">Показаны только локации, доступные по уровню. Сначала высокий уровень.</p>
            <div className="card-grid">
              {travelZones.map((zone) => (
                <button
                  key={zone.id}
                  className="content-card"
                  onClick={() => {
                    travelToZone(zone.id);
                    setTravelOpen(false);
                  }}
                  disabled={Boolean(combat) || server.location.zoneId === zone.id}
                >
                  <strong>{zone.name}</strong>
                  <span>Lv. {zone.levelRange[0]}–{zone.levelRange[1]}</span>
                  {zone.description && <span>{zone.description}</span>}
                </button>
              ))}
            </div>
            <button className="wide-button" onClick={() => setTravelOpen(false)}>Закрыть</button>
          </section>
        </div>
      )}
    </div>
  );
};
