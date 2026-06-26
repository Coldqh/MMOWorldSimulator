import { useGameStore } from '../../state/gameStore';
import { getNpcPlayersInLocation, canPlayerAttackWarNpc } from '../../systems/npcLocationSystem';

export const LocationNpcList = () => {
  const server = useGameStore((state) => state.server);
  const openNpcProfile = useGameStore((state) => state.openNpcProfile);
  const attackWarEnemyNpc = useGameStore((state) => state.attackWarEnemyNpc);

  const players = getNpcPlayersInLocation(server).slice(0, 80);

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
    </section>
  );
};
