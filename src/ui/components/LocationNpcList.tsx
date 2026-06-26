import { useMemo, useState } from 'react';
import { useGameStore } from '../../state/gameStore';
import { getNpcPlayersInLocation, canPlayerAttackWarNpc } from '../../systems/npcLocationSystem';

const PAGE_SIZE = 10;

export const LocationNpcList = () => {
  const server = useGameStore((state) => state.server);
  const openNpcProfile = useGameStore((state) => state.openNpcProfile);
  const attackWarEnemyNpc = useGameStore((state) => state.attackWarEnemyNpc);
  const [page, setPage] = useState(0);

  const sortedPlayers = useMemo(() => {
    const all = getNpcPlayersInLocation(server);
    return [...all].sort((a, b) => {
      const aEnemy = canPlayerAttackWarNpc(server, a.id) ? 1 : 0;
      const bEnemy = canPlayerAttackWarNpc(server, b.id) ? 1 : 0;
      if (aEnemy !== bEnemy) return bEnemy - aEnemy;
      return b.level - a.level || (b.gearScore ?? 0) - (a.gearScore ?? 0) || a.name.localeCompare(b.name);
    });
  }, [server]);

  const pageCount = Math.max(1, Math.ceil(sortedPlayers.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const players = sortedPlayers.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  return (
    <section className="panel">
      <div className="section-title">Игроки рядом</div>
      <div className="list-lines scroll-list">
        <div className="list-line self-line">
          <span>{server.player.name}</span>
          <strong>ты · Lv. {server.player.level}</strong>
        </div>

        {players.length === 0 && <span className="muted">Пусто.</span>}

        {players.map((npc) => {
          const enemy = canPlayerAttackWarNpc(server, npc.id);
          return (
            <div key={npc.id} className={`list-line ${enemy ? 'danger-line' : ''}`}>
              <button className={`text-button ${enemy ? 'danger-text' : ''}`} onClick={() => openNpcProfile(npc.id)}>
                {npc.name}
              </button>
              <span>{enemy ? 'враг' : 'игрок'} · Lv. {npc.level}</span>
              {enemy && server.location.mode !== 'city' && (
                <button className="danger-button" onClick={() => attackWarEnemyNpc(npc.id)}>Напасть</button>
              )}
            </div>
          );
        })}
      </div>

      {sortedPlayers.length > PAGE_SIZE && (
        <div className="pager-row">
          <button disabled={safePage <= 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>←</button>
          <span>{safePage + 1}/{pageCount} · {sortedPlayers.length} игроков</span>
          <button disabled={safePage >= pageCount - 1} onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}>→</button>
        </div>
      )}
    </section>
  );
};
