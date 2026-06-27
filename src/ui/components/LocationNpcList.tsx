import { useMemo, useState } from 'react';
import { useGameStore } from '../../state/gameStore';
import {
  canPlayerAttackWarNpc,
  formatWarAttackCooldown,
  getNpcPlayersInLocation,
  getWarAttackCooldownMinutes,
  isGuildmateNpcInLocation,
  isWarEnemyNpcInLocation,
} from '../../systems/npcLocationSystem';

const PAGE_SIZE = 10;

export const LocationNpcList = () => {
  const server = useGameStore((state) => state.server);
  const combat = useGameStore((state) => state.combat);
  const openNpcProfile = useGameStore((state) => state.openNpcProfile);
  const attackWarEnemyNpc = useGameStore((state) => state.attackWarEnemyNpc);
  const [page, setPage] = useState(0);

  const cooldown = getWarAttackCooldownMinutes(server);
  const cooldownText = formatWarAttackCooldown(cooldown);

  const sortedPlayers = useMemo(() => {
    const all = getNpcPlayersInLocation(server);
    return [...all].sort((a, b) => {
      const aEnemy = isWarEnemyNpcInLocation(server, a.id) ? 1 : 0;
      const bEnemy = isWarEnemyNpcInLocation(server, b.id) ? 1 : 0;
      if (aEnemy !== bEnemy) return bEnemy - aEnemy;
      const aMate = isGuildmateNpcInLocation(server, a.id) ? 1 : 0;
      const bMate = isGuildmateNpcInLocation(server, b.id) ? 1 : 0;
      if (aMate !== bMate) return bMate - aMate;
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
          const enemy = isWarEnemyNpcInLocation(server, npc.id);
          const guildmate = isGuildmateNpcInLocation(server, npc.id);
          const canAttack = canPlayerAttackWarNpc(server, npc.id) && !combat;
          return (
            <div key={npc.id} className={`list-line ${enemy ? 'danger-line' : guildmate ? 'ready-line' : ''}`}>
              <button
                className={`text-button ${enemy ? 'danger-text' : guildmate ? 'success-text ally-name' : ''}`}
                onClick={() => openNpcProfile(npc.id)}
              >
                {npc.name}
              </button>
              <span>{enemy ? 'враг' : guildmate ? 'согильдиец' : 'игрок'} · Lv. {npc.level}</span>
              {enemy && server.location.mode !== 'city' && (
                <button className="danger-button" disabled={!canAttack} onClick={() => attackWarEnemyNpc(npc.id)}>
                  {canAttack ? 'Напасть' : `КД ${cooldownText}`}
                </button>
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
