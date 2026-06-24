import { useGameStore } from '../../state/gameStore';
import { NewsList } from '../components/NewsList';
import { arenaRankIcon, arenaRankName } from '../../systems/progressionSystem';
import { getGearScore } from '../../systems/itemSystem';

export const ServerScreen = () => {
  const server = useGameStore((state) => state.server);
  const openNpcProfile = useGameStore((state) => state.openNpcProfile);
  const openGuildProfile = useGameStore((state) => state.openGuildProfile);
  const npcsById = new Map(server.npcs.map((npc) => [npc.id, npc]));
  const guildsById = new Map(server.guilds.map((guild) => [guild.id, guild]));
  const playerGear = getGearScore(server.player.equipment);

  const ratingFor = (id: string) => id === server.player.id ? server.player.arenaRating : npcsById.get(id)?.arenaRating ?? 0;
  const gearFor = (id: string) => id === server.player.id ? playerGear : npcsById.get(id)?.gearScore ?? 0;
  const goldFor = (id: string) => id === server.player.id ? server.player.gold : npcsById.get(id)?.gold ?? 0;
  const playerButton = (id: string) => {
    if (id === server.player.id) return <strong>{server.player.name} · ты</strong>;
    const npc = npcsById.get(id);
    return <button className="text-button" onClick={() => openNpcProfile(id)}>{npc?.name ?? id}</button>;
  };
  const guildButton = (id: string) => {
    const guild = guildsById.get(id);
    return <button className="text-button" onClick={() => openGuildProfile(id)}>{guild?.name ?? id}</button>;
  };

  return (
    <div className="screen-stack">
      <section className="panel hero-panel">
        <div className="section-title">Состояние сервера</div>
        <div className="stat-grid stat-grid-compact">
          <span>Неделя {server.serverWeek ?? Math.max(1, Math.ceil(server.serverDay / 7))}</span>
          <span>Патч {server.contentPatch ?? 1}</span>
          <span>{server.metaTag ?? 'fresh_start'}</span>
        </div>
      </section>

      <section className="panel">
        <div className="section-title">Рейтинги игроков</div>
        <div className="rank-columns rank-columns-wide">
          <div>
            <strong>Арена</strong>
            {server.rankings.arenaTop.slice(0, 8).map((id, index) => { const rating = ratingFor(id); return <p key={id}>{index + 1}. {playerButton(id)} · {arenaRankIcon(rating)} {arenaRankName(rating)} · {rating}</p>; })}
          </div>
          <div>
            <strong>Gear Score</strong>
            {(server.rankings.gearTop ?? []).slice(0, 8).map((id, index) => <p key={id}>{index + 1}. {playerButton(id)} · Gear {gearFor(id)}</p>)}
          </div>
          <div>
            <strong>Богачи</strong>
            {server.rankings.wealthTop.slice(0, 8).map((id, index) => <p key={id}>{index + 1}. {playerButton(id)} · {goldFor(id)}g</p>)}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="section-title">Рейтинги гильдий</div>
        <div className="rank-columns">
          <div>
            <strong>PvP гильдий</strong>
            {(server.rankings.guildPvpTop ?? []).slice(0, 8).map((id, index) => { const guild = guildsById.get(id); const rating = guild?.pvpRating ?? 0; return <p key={id}>{index + 1}. {guildButton(id)} · Lv. {guild?.level ?? 1} · {arenaRankIcon(rating / Math.max(1, guild?.memberIds.length ?? 1))} {arenaRankName(rating / Math.max(1, guild?.memberIds.length ?? 1))} · {rating}</p>; })}
          </div>
          <div>
            <strong>Репутация гильдий</strong>
            {(server.rankings.guildReputationTop ?? []).slice(0, 8).map((id, index) => { const guild = guildsById.get(id); return <p key={id}>{index + 1}. {guildButton(id)} · Lv. {guild?.level ?? 1} · Rep {guild?.reputation ?? 0}</p>; })}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="section-title">Серверная лента</div>
        <NewsList items={server.worldNews} limit={60} />
      </section>
    </div>
  );
};
