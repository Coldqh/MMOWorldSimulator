import { RAIDS, getZoneById } from '../../content/world';
import { useGameStore } from '../../state/gameStore';
import { getGearScore } from '../../systems/itemSystem';

export const RaidScreen = () => {
  const server = useGameStore((state) => state.server);
  const combat = useGameStore((state) => state.combat);
  const startDungeon = useGameStore((state) => state.startDungeon);
  const travelToZone = useGameStore((state) => state.travelToZone);
  const playerGear = getGearScore(server.player.equipment);
  const currentZoneId = server.location.zoneId;

  return (
    <div className="screen-stack">
      <section className="panel hero-panel premium-panel">
        <div className="section-title">🐉 Рейды</div>
        <h1>Рейдовый поиск</h1>
        <div className="stat-grid stat-grid-compact">
          <span>Lv. {server.player.level}</span>
          <span>Gear {playerGear}</span>
          <span>{server.location.mode === 'city' ? 'город' : getZoneById(currentZoneId ?? '')?.name ?? 'локация'}</span>
        </div>
      </section>

      <div className="card-grid">
        {RAIDS.map((raid) => {
          const zone = getZoneById(raid.zoneId);
          const wrongLocation = currentZoneId !== raid.zoneId;
          const lockedByLevel = server.player.level < 10 || server.player.level < raid.levelRange[0];
          return (
            <article key={raid.id} className={`content-card raid-card ${lockedByLevel || wrongLocation ? 'locked-card' : ''}`}>
              <strong>{raid.name}</strong>
              <span>{zone?.name ?? raid.zoneId}</span>
              <span>Lv. {raid.levelRange[0]}–{raid.levelRange[1]} · рейд {raid.partySize}</span>
              <span>{raid.floors.length} этажей · босс-лут</span>
              {wrongLocation ? (
                <button onClick={() => travelToZone(raid.zoneId)} disabled={Boolean(combat)}>В локацию</button>
              ) : (
                <button className="primary-button" onClick={() => startDungeon(raid.id)} disabled={Boolean(combat) || lockedByLevel}>
                  {lockedByLevel ? `Нужен ${Math.max(10, raid.levelRange[0])} уровень` : 'Собрать рейд'}
                </button>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
};
