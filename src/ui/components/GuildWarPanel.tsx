import { useMemo, useState } from 'react';
import { useGameStore } from '../../state/gameStore';

type WarTab = 'active' | 'declare' | 'votes' | 'history';

const minutesText = (minute?: number) => {
  const value = minute ?? 0;
  return `${Math.floor(value / 60).toString().padStart(2, '0')}:${(value % 60).toString().padStart(2, '0')}`;
};

export const GuildWarPanel = () => {
  const server = useGameStore((state) => state.server);
  const voteGuildWar = useGameStore((state) => state.voteGuildWar);
  const declareGuildWar = useGameStore((state) => state.declareGuildWar);
  const openGuildProfile = useGameStore((state) => state.openGuildProfile);
  const [tab, setTab] = useState<WarTab>('active');

  const playerGuildId = server.player.guildId;
  const playerGuild = server.guilds.find((guild) => guild.id === playerGuildId);
  const guildName = (id?: string) => server.guilds.find((guild) => guild.id === id)?.name ?? id ?? '???';

  const relevantWars = useMemo(() => (server.guildWars ?? []).filter((war) =>
    !playerGuildId || war.attackerGuildId === playerGuildId || war.defenderGuildId === playerGuildId,
  ), [server.guildWars, playerGuildId]);

  const activeWars = relevantWars.filter((war) => war.status === 'active');
  const historyWars = relevantWars.filter((war) => war.status !== 'active');
  const votes = (server.guildWarVotes ?? []).filter((vote) =>
    !playerGuildId || vote.proposerGuildId === playerGuildId || vote.targetGuildId === playerGuildId || vote.guildId === playerGuildId,
  );

  const enemyCandidates = server.guilds
    .filter((guild) => guild.id !== playerGuildId)
    .filter((guild) => !(server.guildWars ?? []).some((war) =>
      war.status === 'active' &&
      ((war.attackerGuildId === playerGuildId && war.defenderGuildId === guild.id) ||
        (war.defenderGuildId === playerGuildId && war.attackerGuildId === guild.id)),
    ))
    .sort((a, b) => {
      const aRel = playerGuildId ? server.guildRelations.find((rel) => rel.fromGuildId === playerGuildId && rel.toGuildId === a.id)?.value ?? 0 : 0;
      const bRel = playerGuildId ? server.guildRelations.find((rel) => rel.fromGuildId === playerGuildId && rel.toGuildId === b.id)?.value ?? 0 : 0;
      return aRel - bRel || (b.pvpRating ?? 0) - (a.pvpRating ?? 0);
    })
    .slice(0, 20);

  return (
    <section className="panel">
      <div className="section-title">Войны гильдии</div>
      <div className="tab-row">
        <button className={tab === 'active' ? 'active' : ''} onClick={() => setTab('active')}>Активные</button>
        <button className={tab === 'declare' ? 'active' : ''} onClick={() => setTab('declare')}>Объявить войну</button>
        <button className={tab === 'votes' ? 'active' : ''} onClick={() => setTab('votes')}>Голосования</button>
        <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>История</button>
      </div>

      {tab === 'active' && (
        <div className="list-lines">
          {activeWars.length === 0 && <span className="muted">Активных войн нет.</span>}
          {activeWars.map((war) => (
            <div key={war.id} className="list-line danger-line">
              <span>
                <button className="text-button danger-text" onClick={() => openGuildProfile(war.attackerGuildId)}>{guildName(war.attackerGuildId)}</button>
                {' '}vs{' '}
                <button className="text-button danger-text" onClick={() => openGuildProfile(war.defenderGuildId)}>{guildName(war.defenderGuildId)}</button>
                <small>День {war.startsDay ?? war.declaredDay} · до дня {war.endsDay}</small>
              </span>
              <strong>{war.attackerKills}:{war.defenderKills}</strong>
            </div>
          ))}
        </div>
      )}

      {tab === 'declare' && (
        <div className="list-lines">
          {!playerGuild && <span className="muted">Сначала вступи в гильдию или создай свою.</span>}
          {playerGuild && playerGuild.leaderId !== server.player.id && <span className="muted">Войну объявляет только ГМ.</span>}
          {playerGuild && playerGuild.leaderId === server.player.id && enemyCandidates.map((guild) => {
            const rel = server.guildRelations.find((entry) => entry.fromGuildId === playerGuild.id && entry.toGuildId === guild.id)?.value ?? 0;
            return (
              <div key={guild.id} className="list-line">
                <button className="text-button" onClick={() => openGuildProfile(guild.id)}>{guild.name}</button>
                <strong>отношение {rel} · PvP {guild.pvpRating}</strong>
                <button className="danger-button" onClick={() => declareGuildWar(guild.id)}>Объявить</button>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'votes' && (
        <div className="list-lines">
          {votes.length === 0 && <span className="muted">Голосований нет.</span>}
          {votes.map((vote) => (
            <div key={vote.id} className="list-line">
              <span>
                <strong>{guildName(vote.proposerGuildId)} → {guildName(vote.targetGuildId)}</strong>
                <small>Да: {vote.yesNpcIds?.length ?? 0} · Нет: {vote.noNpcIds?.length ?? 0} · до {minutesText(vote.endsMinute)}</small>
              </span>
              {playerGuild && (vote.proposerGuildId === playerGuild.id || vote.guildId === playerGuild.id) && (
                <span className="action-grid compact-actions">
                  <button onClick={() => voteGuildWar(vote.id, 'yes')}>За</button>
                  <button onClick={() => voteGuildWar(vote.id, 'no')}>Против</button>
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'history' && (
        <div className="list-lines">
          {historyWars.length === 0 && <span className="muted">Истории войн нет.</span>}
          {historyWars.slice(0, 20).map((war) => (
            <div key={war.id} className="list-line">
              <span>{guildName(war.attackerGuildId)} vs {guildName(war.defenderGuildId)}</span>
              <strong>{war.attackerKills}:{war.defenderKills} · {war.status}</strong>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export const ServerGuildWarList = () => {
  const server = useGameStore((state) => state.server);
  const openGuildProfile = useGameStore((state) => state.openGuildProfile);
  const activeWars = (server.guildWars ?? []).filter((war) => war.status === 'active');
  const guildName = (id?: string) => server.guilds.find((guild) => guild.id === id)?.name ?? id ?? '???';

  return (
    <section className="panel">
      <div className="section-title">Войны сервера</div>
      <div className="list-lines">
        {activeWars.length === 0 && <span className="muted">Активных войн нет.</span>}
        {activeWars.slice(0, 12).map((war) => (
          <div key={war.id} className="list-line danger-line">
            <span>
              <button className="text-button danger-text" onClick={() => openGuildProfile(war.attackerGuildId)}>{guildName(war.attackerGuildId)}</button>
              {' '}vs{' '}
              <button className="text-button danger-text" onClick={() => openGuildProfile(war.defenderGuildId)}>{guildName(war.defenderGuildId)}</button>
            </span>
            <strong>{war.attackerKills}:{war.defenderKills}</strong>
          </div>
        ))}
      </div>
    </section>
  );
};
