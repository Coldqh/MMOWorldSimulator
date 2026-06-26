import type { GuildWar, GuildWarVote, ServerState } from '../../types/game';
import { useGameStore } from '../../state/gameStore';

const guildName = (server: ServerState, id: string) => server.guilds.find((guild) => guild.id === id)?.name ?? id;
const charName = (server: ServerState, id: string) => id === server.player.id ? server.player.name : server.npcs.find((npc) => npc.id === id)?.name ?? id;

const WarCard = ({ server, war }: { server: ServerState; war: GuildWar }) => {
  const enemyId = server.player.guildId === war.attackerGuildId ? war.defenderGuildId : war.attackerGuildId;
  const enemy = guildName(server, enemyId);
  const leader = war.attackerKills === war.defenderKills ? 'ничья' : war.attackerKills > war.defenderKills ? guildName(server, war.attackerGuildId) : guildName(server, war.defenderGuildId);
  const top = [...war.attackerTopKillers, ...war.defenderTopKillers].sort((a, b) => b.kills - a.kills).slice(0, 4);
  return (
    <article className="content-card">
      <strong>Война с {enemy}</strong>
      <span>Статус: {war.status}</span>
      <span>День {war.declaredDay} → {war.endsDay}</span>
      <span>Счёт: {war.attackerKills} — {war.defenderKills}</span>
      <span>Лидер: {leader}</span>
      {top.length > 0 && <small>Лучшие: {top.map((killer) => `${charName(server, killer.characterId)} ${killer.kills}`).join(' · ')}</small>}
    </article>
  );
};

const VoteCard = ({ server, vote }: { server: ServerState; vote: GuildWarVote }) => {
  const voteGuildWar = useGameStore((state) => state.voteGuildWar);
  const target = guildName(server, vote.targetGuildId);
  const kind = vote.kind === 'accept' ? 'Принять войну' : vote.kind === 'extend' ? 'Продлить войну' : 'Объявить войну';
  return (
    <article className="content-card">
      <strong>{kind}: {target}</strong>
      <span>До дня {vote.endsDay}, {String(Math.floor(vote.endsMinute / 60)).padStart(2, '0')}:{String(vote.endsMinute % 60).padStart(2, '0')}</span>
      <span>За: {vote.yesNpcIds.length} · Против: {vote.noNpcIds.length}</span>
      {vote.playerVote ? <small>Твой голос: {vote.playerVote === 'yes' ? 'за' : 'против'}</small> : (
        <div className="action-grid compact-actions">
          <button className="primary-button" onClick={() => voteGuildWar(vote.id, 'yes')}>Принять</button>
          <button onClick={() => voteGuildWar(vote.id, 'no')}>Отказаться</button>
        </div>
      )}
    </article>
  );
};

export const GuildWarPanel = () => {
  const server = useGameStore((state) => state.server);
  const declareGuildWar = useGameStore((state) => state.declareGuildWar);
  const playerGuildId = server.player.guildId;
  const playerGuild = server.guilds.find((guild) => guild.id === playerGuildId);
  if (!playerGuildId || !playerGuild) return null;

  const votes = (server.guildWarVotes ?? []).filter((vote) => vote.guildId === playerGuildId && vote.status === 'active');
  const wars = (server.guildWars ?? []).filter((war) => war.attackerGuildId === playerGuildId || war.defenderGuildId === playerGuildId).sort((a, b) => b.declaredDay - a.declaredDay).slice(0, 8);
  const relations = (server.guildRelations ?? []).filter((relation) => relation.fromGuildId === playerGuildId).sort((a, b) => a.value - b.value).slice(0, 8);
  const isGm = playerGuild.leaderId === server.player.id;
  const possibleTargets = server.guilds.filter((guild) => guild.id !== playerGuildId && (guild.tier ?? 'low') === (playerGuild.tier ?? 'low')).slice(0, 5);

  return (
    <section className="panel">
      <div className="section-title">Войны гильдии</div>
      {votes.length === 0 && wars.length === 0 && <p className="muted">Нет активных войн.</p>}
      {votes.length > 0 && <div className="card-grid">{votes.map((vote) => <VoteCard key={vote.id} server={server} vote={vote} />)}</div>}
      {wars.length > 0 && <div className="card-grid">{wars.map((war) => <WarCard key={war.id} server={server} war={war} />)}</div>}
      {isGm && (
        <div className="mt-small">
          <div className="section-title">Объявить войну</div>
          <div className="chip-row">
            {possibleTargets.map((guild) => <button key={guild.id} onClick={() => declareGuildWar(guild.id)}>{guild.name}</button>)}
          </div>
        </div>
      )}
      <div className="list-lines mt-small">
        {relations.map((relation) => <div key={`${relation.fromGuildId}_${relation.toGuildId}`} className="list-line"><span>{guildName(server, relation.toGuildId)}</span><strong>{relation.value}</strong></div>)}
      </div>
    </section>
  );
};

export const ServerGuildWarList = () => {
  const server = useGameStore((state) => state.server);
  const wars = (server.guildWars ?? []).filter((war) => war.status === 'active').slice(0, 20);
  return (
    <section className="panel">
      <div className="section-title">Войны гильдий</div>
      {wars.length === 0 && <p className="muted">Активных войн нет.</p>}
      <div className="list-lines">
        {wars.map((war) => <div key={war.id} className="list-line"><span>{guildName(server, war.attackerGuildId)} vs {guildName(server, war.defenderGuildId)}</span><strong>{war.attackerKills} — {war.defenderKills}</strong></div>)}
      </div>
    </section>
  );
};
