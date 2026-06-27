import { useMemo } from 'react';
import { CLASSES } from '../../content/classes';
import { useGameStore } from '../../state/gameStore';
import { getGearScore } from '../../systems/itemSystem';
import { arenaRankIcon, arenaRankName, getPlayerArenaRank } from '../../systems/progressionSystem';
import { CombatPanel } from '../components/CombatPanel';

const className = (id?: string) => CLASSES.find((entry) => entry.id === id)?.name ?? id ?? '—';

export const ArenaScreen = () => {
  const server = useGameStore((state) => state.server);
  const combat = useGameStore((state) => state.combat);
  const startArena = useGameStore((state) => state.startArena);
  const startArena3v3 = useGameStore((state) => state.startArena3v3);
  const setScreen = useGameStore((state) => state.setScreen);
  const openNpcProfile = useGameStore((state) => state.openNpcProfile);
  const playerRank = getPlayerArenaRank(server);
  const inCity = server.location.mode === 'city';
  const playerGear = getGearScore(server.player.equipment);
  const npcsById = new Map(server.npcs.map((npc) => [npc.id, npc]));

  const rivals = useMemo(() => {
    return [...server.npcs]
      .filter((npc) => ['PVP_PLAYER', 'HARDCORE', 'GUILD_PLAYER', 'LEADER'].includes(npc.roleFocus))
      .filter((npc) => Math.abs(npc.level - server.player.level) <= 4)
      .sort((a, b) => Math.abs(a.arenaRating - server.player.arenaRating) - Math.abs(b.arenaRating - server.player.arenaRating))
      .slice(0, 5);
  }, [server.npcs, server.player.level, server.player.arenaRating]);

  if (!inCity && !combat) {
    return (
      <div className="screen-stack">
        <section className="panel hero-panel">
          <div className="section-title">🏟️ Арена</div>
          <h1>Нужен город</h1>
          <p className="muted">Арена открывается из города.</p>
          <button onClick={() => setScreen('world')}>В мир</button>
        </section>
      </div>
    );
  }

  return (
    <div className="screen-stack arena-screen">
      {combat && <CombatPanel />}
      <section className="panel hero-panel arena-hero">
        <div className="section-title">🏟️ Арена v2</div>
        <h1>{arenaRankIcon(server.player.arenaRating)} {arenaRankName(server.player.arenaRating)} · #{playerRank}</h1>
        <div className="arena-score-card">
          <span>Рейтинг</span><strong>{server.player.arenaRating}</strong>
          <span>Gear</span><strong>{playerGear}</strong>
          <span>Lv.</span><strong>{server.player.level}</strong>
        </div>
        <div className="action-grid combat-actions">
          <button className="primary-button" onClick={startArena} disabled={Boolean(combat)}>Найти бой 1v1</button>
          <button className="primary-button" onClick={startArena3v3} disabled={Boolean(combat)}>Найти бой 3v3</button>
        </div>
      </section>

      <section className="panel">
        <div className="section-title">Ближайшие соперники</div>
        <div className="list-lines compact-list">
          {rivals.map((npc) => (
            <div key={npc.id} className="list-line">
              <button className="text-button" onClick={() => openNpcProfile(npc.id)}>{npc.name}</button>
              <strong>Lv. {npc.level} · Gear {npc.gearScore} · {className(npc.classId)} · {arenaRankIcon(npc.arenaRating)} {arenaRankName(npc.arenaRating)} · {npc.arenaRating}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-title">Топ арены</div>
        <div className="list-lines compact-list">
          {server.rankings.arenaTop.slice(0, 10).map((id, index) => {
            const isPlayer = id === server.player.id;
            const npc = npcsById.get(id);
            return (
              <div key={id} className={`list-line ${isPlayer ? 'self-line' : ''}`}>
                {isPlayer ? <span>{index + 1}. {server.player.name} · ты</span> : <button className="text-button" onClick={() => openNpcProfile(id)}>{index + 1}. {npc?.name ?? id}</button>}
                <strong>{arenaRankIcon(isPlayer ? server.player.arenaRating : npc?.arenaRating ?? 0)} {arenaRankName(isPlayer ? server.player.arenaRating : npc?.arenaRating ?? 0)} · {isPlayer ? server.player.arenaRating : npc?.arenaRating ?? 0}</strong>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
