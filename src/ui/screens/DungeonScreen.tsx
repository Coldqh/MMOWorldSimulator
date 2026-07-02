import { DUNGEONS, getDungeonById, getMobById, getZoneById } from '../../content/world';
import type { DungeonDefinition, DungeonDifficulty } from '../../types/game';
import { useGameStore } from '../../state/gameStore';
import { getGearScore, getPlayerStats } from '../../systems/itemSystem';
import { DUNGEON_DIFFICULTIES, getDungeonDifficultyGearRequirement, getDungeonDifficultyLabel } from '../../systems/dungeonSystem';
import { CombatPanel } from '../components/CombatPanel';

const floorLabel: Record<string, string> = {
  mobs: 'Мобы',
  event: 'Событие',
  miniBoss: 'Мини-босс',
  boss: 'Босс',
};

const roleText = (role?: string) => role === 'tank' ? 'танк' : role === 'healer' ? 'хилл' : 'дд';

const difficultyHelp: Record<DungeonDifficulty, string> = {
  normal: 'базовый лут',
  hard: 'больше marks, сильнее мобы',
  mythic: 'лучший шанс наград, высокая сложность',
};

const sortInstancesForPlayer = (entries: DungeonDefinition[], playerLevel: number) =>
  [...entries].sort((a, b) => {
    const aAvailable = playerLevel >= a.levelRange[0];
    const bAvailable = playerLevel >= b.levelRange[0];
    if (aAvailable !== bAvailable) return aAvailable ? -1 : 1;
    return b.levelRange[0] - a.levelRange[0] || b.levelRange[1] - a.levelRange[1] || a.name.localeCompare(b.name);
  });

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
  const sortedDungeons = sortInstancesForPlayer(DUNGEONS, server.player.level);
  const lastResult = server.lastDungeonRunResult;
  const lastResultDungeon = lastResult ? getDungeonById(lastResult.dungeonId) : undefined;

  if (run && runDungeon && floor) {
    const role = run.partyRoles?.tankId === server.player.id ? 'tank' : run.partyRoles?.healerId === server.player.id ? 'healer' : 'dps';
    const totalEncounters = runDungeon.floors.reduce((sum, entry) => sum + entry.mobIds.length, 0);
    return (
      <div className="screen-stack dungeon-screen">
        {combat && <CombatPanel />}

        <section className="panel hero-panel dungeon-hero">
          <div className="section-title">⚔️ Данж</div>
          <h1>{runDungeon.name}</h1>
          <p className="muted">Сложность: {getDungeonDifficultyLabel(run.difficulty)} · этаж {run.currentFloor + 1}/{runDungeon.floors.length} · цель {encounterIndex + 1}/{floor.mobIds.length}</p>
          <div className="stat-grid">
            <span>HP {Math.min(server.player.hp, stats.hp)}/{stats.hp}</span>
            <span>Mana {Math.min(server.player.mana, stats.mana)}/{stats.mana}</span>
            <span>Пати {run.partyNpcIds.length + 1}/{runDungeon.partySize}</span>
            <span>Gear {playerGear}</span>
            <span>Wipes {run.deaths ?? 0}</span>
            <span>Progress {run.encountersCleared ?? 0}/{totalEncounters}</span>
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
                <div key={mob.id + '_' + index} className={'list-line ' + (index === encounterIndex ? 'active-encounter' : '')}>
                  <span>{index + 1}. {mob.name}</span>
                  <strong>Lv. {mob.level} · {state}</strong>
                </div>
              ) : null;
            })}
          </div>
          <div className="action-grid spaced-actions">
            <button className="primary-button" onClick={startDungeonFloor} disabled={Boolean(combat) || !currentMob}>
              {currentMob ? 'Бой: ' + currentMob.name : 'Этаж пройден'}
            </button>
            <button onClick={restDungeonParty} disabled={!canRest}>Отдых · ~{restMinutes} мин</button>
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
              <div key={entry.id} className={'list-line ' + (index === run.currentFloor ? 'self-line' : '')}>
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
        <h1>Dungeon Run 2.0</h1>
        <p className="muted">Выбирай сложность, собирай пати, закрывай ранги и копи Dungeon Marks.</p>
        <div className="stat-grid">
          <span>Dungeon Marks: {server.player.dungeonMarks ?? 0}</span>
          <span>Gear: {playerGear}</span>
          <span>Daily bonus: {server.player.lastDailyDungeonBonusDay === server.serverDay ? 'получен' : 'доступен'}</span>
          <span>Weekly chest: {server.player.lastWeeklyDungeonChestWeek === (server.serverWeek ?? 1) ? 'получен' : 'доступен'}</span>
        </div>
      </section>

      {lastResult && lastResultDungeon && (
        <section className="panel">
          <div className="section-title">Последний результат</div>
          <h2>{lastResultDungeon.name} · {getDungeonDifficultyLabel(lastResult.difficulty)} · Rank {lastResult.rank}</h2>
          <div className="stat-grid">
            <span>Marks +{lastResult.marks}</span>
            <span>Gold +{lastResult.gold}</span>
            <span>Deaths {lastResult.deaths}</span>
            <span>Time {lastResult.durationMinutes} мин</span>
          </div>
          <div className="list-lines compact-list">
            {lastResult.lines.map((line, index) => (
              <div key={index} className="list-line">
                <span>{index + 1}</span>
                <strong>{line}</strong>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="panel hero-panel">
        <div className="section-title">Поиск пати</div>
        <p className="muted">Место: {currentZoneId ? (getZoneById(currentZoneId)?.name ?? currentZoneId) : 'город'}</p>
      </section>

      <div className="card-grid">
        {sortedDungeons.map((dungeon) => {
          const zone = getZoneById(dungeon.zoneId);
          const wrongLocation = currentZoneId !== dungeon.zoneId;
          const lockedByLevel = server.player.level < dungeon.levelRange[0];
          return (
            <article key={dungeon.id} className={'content-card info-card ' + (lockedByLevel || wrongLocation ? 'locked-card' : '')}>
              <strong>{dungeon.name}</strong>
              <span>{zone?.name ?? dungeon.zoneId}</span>
              <span>Lv. {dungeon.levelRange[0]}–{dungeon.levelRange[1]} · пати {dungeon.partySize}</span>
              <span>{dungeon.floors.filter((floor) => floor.type === 'boss' || floor.type === 'miniBoss').length} босса · boss loot</span>
              {wrongLocation ? (
                <button onClick={() => travelToZone(dungeon.zoneId)} disabled={Boolean(combat)}>В локацию</button>
              ) : (
                <div className="action-grid">
                  {DUNGEON_DIFFICULTIES.map((difficulty) => {
                    const gearReq = getDungeonDifficultyGearRequirement(dungeon, difficulty);
                    const lockedByGear = gearReq > 0 && playerGear < gearReq;
                    const disabled = Boolean(combat) || lockedByLevel || lockedByGear;
                    return (
                      <button key={difficulty} onClick={() => startDungeon(dungeon.id, difficulty)} disabled={disabled} title={difficultyHelp[difficulty]}>
                        {lockedByLevel
                          ? 'Нужен Lv. ' + dungeon.levelRange[0]
                          : lockedByGear
                            ? getDungeonDifficultyLabel(difficulty) + ' · GS ' + gearReq
                            : getDungeonDifficultyLabel(difficulty)}
                      </button>
                    );
                  })}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
};
