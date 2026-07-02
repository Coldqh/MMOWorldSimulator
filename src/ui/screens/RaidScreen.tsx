import { RAIDS, getZoneById } from '../../content/world';
import { QUESTS } from '../../content/quests';
import { getQuestGiverById } from '../../content/questGivers';
import { useGameStore } from '../../state/gameStore';
import { getGearScore } from '../../systems/itemSystem';
import { getQuestState } from '../../systems/questSystem';

const findUnlockQuestForTarget = (server: ReturnType<typeof useGameStore.getState>['server'], targetId: string) =>
  QUESTS
    .filter((quest) => quest.importance === 'unlock' && quest.unlockTargetId === targetId)
    .sort((a, b) => {
      const order = { readyToTurnIn: 0, active: 1, available: 2, locked: 3, completed: 4 } as const;
      return order[getQuestState(server, a.id).status] - order[getQuestState(server, b.id).status] || b.levelReq - a.levelReq;
    })[0];

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
          const lockedByQuest = !(server.unlockedContent ?? []).includes(raid.id);
          const unlockQuest = findUnlockQuestForTarget(server, raid.id);
          const unlockGiver = unlockQuest ? getQuestGiverById(unlockQuest.giverId) : undefined;

          return (
            <article key={raid.id} className={`content-card raid-card ${lockedByLevel || lockedByQuest || wrongLocation ? 'locked-card' : ''}`}>
              <strong>{raid.name}</strong>
              <span>{zone?.name ?? raid.zoneId}</span>
              <span>Lv. {raid.levelRange[0]}–{raid.levelRange[1]} · рейд {raid.partySize}</span>
              <span>{raid.floors.length} этажей · босс-лут</span>
              {lockedByQuest && (
                <span className="quest-unlock-hint">🛡️ ! Нужна ветка: {unlockQuest?.title ?? 'квест открытия'} · {unlockGiver?.name ?? 'квестодатель зоны'}</span>
              )}

              {wrongLocation ? (
                <button onClick={() => travelToZone(raid.zoneId)} disabled={Boolean(combat)}>В локацию</button>
              ) : (
                <button className="primary-button" onClick={() => startDungeon(raid.id)} disabled={Boolean(combat) || lockedByLevel || lockedByQuest}>
                  {lockedByLevel
                    ? `Нужен ${Math.max(10, raid.levelRange[0])} уровень`
                    : lockedByQuest
                      ? 'Закрыто: ! ветка'
                      : 'Собрать рейд'}
                </button>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
};
