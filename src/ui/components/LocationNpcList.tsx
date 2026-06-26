import { useGameStore } from '../../state/gameStore';
import { getNpcPlayersInLocation, canPlayerAttackWarNpc } from '../../systems/npcLocationSystem';

const guildName = (server: ReturnType<typeof useGameStore.getState>['server'], id?: string) => id ? server.guilds.find((guild) => guild.id === id)?.name ?? id : 'без гильдии';

export const LocationNpcList = () => {
  const server = useGameStore((state) => state.server);
  const openNpcProfile = useGameStore((state) => state.openNpcProfile);
  const attackWarEnemyNpc = useGameStore((state) => state.attackWarEnemyNpc);
  const npcs = getNpcPlayersInLocation(server).slice(0, 60);
  return (
    <section className="panel">
      <div className="section-title">Игроки рядом</div>
      <div className="list-lines" style={{ maxHeight: 420, overflowY: 'auto' }}>
        <div className="list-line self-line"><span>{server.player.name}</span><strong>ты · Lv. {server.player.level}</strong></div>
        {npcs.length === 0 && <span className="muted">Пусто.</span>}
        {npcs.map((npc) => {
          const enemy = canPlayerAttackWarNpc(server, npc.id);
          const guild = server.guilds.find((entry) => entry.id === npc.guildId);
          return (
            <div key={npc.id} className={`list-line ${enemy ? 'danger-line' : ''}`}>
              <button className="text-button" onClick={() => openNpcProfile(npc.id)}>{enemy ? '🔴 ' : ''}{npc.name}</button>
              <strong>Lv. {npc.level} · GS {npc.gearScore} · skill {npc.skill ?? 5} · {npc.playstyle ?? 'hybrid'} · {guildName(server, npc.guildId)} · {guild?.guildFocus ?? 'hybrid'}</strong>
              {enemy && server.location.mode !== 'city' && <button className="danger-button" onClick={() => attackWarEnemyNpc(npc.id)}>Напасть</button>}
            </div>
          );
        })}
      </div>
    </section>
  );
};
