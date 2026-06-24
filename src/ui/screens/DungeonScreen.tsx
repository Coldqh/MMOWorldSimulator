import { DUNGEONS, getDungeonById, getMobById, getZoneById } from '../../content/world';
import { useGameStore } from '../../state/gameStore';
import { getGearScore, getPlayerStats } from '../../systems/itemSystem';
import { CombatPanel } from '../components/CombatPanel';

const floorLabel: Record<string, string> = {
  mobs: 'Мобы',
  event: 'Событие',
  miniBoss: 'Мини-босс',
  boss: 'Босс',
};

const roleText = (role?: string) => role === 'tank' ? 'танк' : role === 'healer' ? 'хилл' : 'дд';

export const DungeonScreen = () => {
  const server = useGameStore((state) => state.server);
  const combat = useGameStore((state) => state.combat);
  const startDungeon = useGameStore((state) => state.startDungeon);
  const startDungeonFloor = useGameStore((state) => state.startDungeonFloor);
  const restDungeonParty = useGameStore((state) => state.restDungeonParty);
  const leaveDungeonRun = useGameStore((state) => state.leaveDungeonRun);
  const travelToZone = useGameStore((state) => state.travelToZone);
  const openNpcProfile = useGameStore((state) => state.openNpcProfile);
  const currentZoneId = server.location.zoneId;
  const run = server.currentDungeonRun;
  const runDungeon = run ? getDungeonById(run.dungeonId) : undefined;
  const floor = runDungeon?.floors[run?.currentFloor ?? 0];
  const encounterIndex = run?.currentEncounterIndex ?? 0;
  const currentMobId = floor?.mobIds[encounterIndex];
  const currentMob = currentMobId ? getMobById(currentMobId) : undefined;
  const stats = getPlayerStats(server.player);
  const playerGear = getGearScore(server.player.equipment);
  const missingHp = Math.max(0, stats.hp - Math.min(server.player.hp, stats.hp));
  const missingMana = Math.max(0, stats.mana - Math.min(server.player.mana, stats.mana));
  const restMinutes = Math.max(8, Math.ceil(missingHp / 5) + Math.ceil(missingMana / 10));
  const canRest = Boolean(run && !combat);

  if (run && runDungeon && floor) {
    const role = run.partyRoles?.tankId === server.player.id ? 'tank' : run.partyRoles?.healerId === server.player.id ? 'healer' : 'dps';
    return (
      <div className="screen-stack dungeon-screen">
        {combat && <CombatPanel />}

        <section className="panel hero-panel dungeon-hero">
          <div className="section-title">⚔️ Данж</div>
          <h1>{runDungeon.name}</h1>
          <p className="muted">Этаж {run.currentFloor + 1}/{runDungeon.floors.length} · {floorLabel[floor.type]} · цель {encounterIndex + 1}/{floor.mobIds.length}</p>
          <div className="stat-grid">
            <span>HP {Math.min(server.player.hp, stats.hp)}/{stats.hp}</span>
            <span>Mana {Math.min(server.player.mana, stats.mana)}/{stats.mana}</span>
            <span>Пати {run.partyNpcIds.length + 1}/{runDungeon.partySize}</span>
            <span>Gear {playerGear}</span>
          </div>
        </section>

        <section className="panel current-floor-panel">
          <div className="section-title">Текущий этаж</div>
          <div className="list-lines compact-list">
            <div className="list-line self-line">
              <span>{floor.name}</span>
              <strong>{floorLabel[floor.type]}</strong>
            </div>
            {floor.mobIds.map((mobId, index) => {
              const mob = getMobById(mobId);
              const state = index < encounterIndex ? 'убит' : index === encounterIndex ? 'сейчас' : 'дальше';
              return mob ? (
                <div key={`${mob.id}_${index}`} className={`list-line ${index === encounterIndex ? 'active-encounter' : ''}`}>
                  <span>{index + 1}. {mob.name}</span>
                  <strong>Lv. {mob.level} · {state}</strong>
                </div>
              ) : null;
            })}
          </div>
          <div className="action-grid spaced-actions">
            <button className="primary-button" onClick={startDungeonFloor} disabled={Boolean(combat) || !currentMob}>
              {currentMob ? `Бой: ${currentMob.name}` : 'Этаж пройден'}
            </button>
            <button onClick={restDungeonParty} disabled={!canRest}>Отдых</button>
            <button className="danger-button" onClick={leaveDungeonRun} disabled={Boolean(combat)}>Покинуть</button>
          </div>
          
        </section>

        <section className="panel">
          <div className="section-title">Пати</div>
          <div className="list-lines">
            <div className="list-line self-line">
              <span>{server.player.name}</span>
              <strong>ты · {roleText(role)} · Lv. {server.player.level} · Gear {playerGear}</strong>
            </div>
            {run.partyNpcIds.map((id) => {
              const npc = server.npcs.find((entry) => entry.id === id);
              return npc ? (
                <div key={npc.id} className="list-line">
                  <button className="text-button" onClick={() => openNpcProfile(npc.id)}>{npc.name}</button>
                  <strong>{roleText(run.partyRoles?.tankId === npc.id ? 'tank' : run.partyRoles?.healerId === npc.id ? 'healer' : 'dps')} · Lv. {npc.level} · Gear {npc.gearScore}</strong>
                </div>
              ) : null;
            })}
          </div>
        </section>

        <section className="panel">
          <div className="section-title">Маршрут</div>
          <div className="list-lines compact-list">
            {runDungeon.floors.map((entry, index) => (
              <div key={entry.id} className={`list-line ${index === run.currentFloor ? 'self-line' : ''}`}>
                <span>{index + 1}. {entry.name}</span>
                <strong>{index < run.currentFloor ? 'пройден' : floorLabel[entry.type]}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="screen-stack">
      {combat && <CombatPanel />}

      <section className="panel hero-panel">
        <div className="section-title">⚔️ Данжи</div>
        <h1>Поиск пати</h1>
        <p className="muted">Доступ с 5 уровня. Нужна локация данжа.</p>
        <p className="muted">Место: {currentZoneId ? (getZoneById(currentZoneId)?.name ?? currentZoneId) : 'город'}</p>
      </section>

      <div className="card-grid">
        {DUNGEONS.map((dungeon) => {
          const zone = getZoneById(dungeon.zoneId);
          const wrongLocation = currentZoneId !== dungeon.zoneId;
          const lockedByLevel = server.player.level < 5 || server.player.level < dungeon.levelRange[0];
          return (
            <article key={dungeon.id} className={`content-card info-card ${lockedByLevel || wrongLocation ? 'locked-card' : ''}`}>
              <strong>{dungeon.name}</strong>
              <span>{zone?.name ?? dungeon.zoneId}</span>
              <span>Lv. {dungeon.levelRange[0]}–{dungeon.levelRange[1]} · пати {dungeon.partySize}</span>
              <span>{dungeon.floors.length} этажей · босс-лут</span>
              {wrongLocation ? (
                <button onClick={() => travelToZone(dungeon.zoneId)} disabled={Boolean(combat)}>В локацию</button>
              ) : (
                <button onClick={() => startDungeon(dungeon.id)} disabled={Boolean(combat) || lockedByLevel}>
                  {lockedByLevel ? `Нужен ${Math.max(5, dungeon.levelRange[0])} уровень` : 'Искать NPC-пати'}
                </button>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
};
