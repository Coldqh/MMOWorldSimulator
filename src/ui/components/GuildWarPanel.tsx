import { useMemo, useState } from 'react';
import { useGameStore } from '../../state/gameStore';

type WarTab = 'active' | 'votes' | 'history';

const minutesText = (minute?: number) => {
  const value = minute ?? 0;
  const hh = Math.floor(value / 60).toString().padStart(2, '0');
  const mm = (value % 60).toString().padStart(2, '0');
  return `${hh}:${mm}`;
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

  const relevantWars = useMemo(() => (server.guildWars ?? []).filter((war: any) =>
    !playerGuildId || war.attackerGuildId === playerGuildId || war.defenderGuildId === playerGuildId,
  ), [server.guildWars, playerGuildId]);

  const activeWars = relevantWars.filter((war: any) => war.status === 'active');
  const historyWars = relevantWars.filter((war: any) => war.status !== 'active');
  const votes = (server.guildWarVotes ?? []).filter((vote: any) =>
    !playerGuildId || vote.proposerGuildId === playerGuildId || vote.targetGuildId === playerGuildId || vote.guildId === playerGuildId,
  );

  const enemyCandidates = server.guilds
    .filter((guild) => guild.id !== playerGuildId)
    .filter((guild) => !(server.guildWars ?? []).some((war: any) =>
      war.status === 'active' &&
      ((war.attackerGuildId === playerGuildId && war.defenderGuildId === guild.id) ||
        (war.defenderGuildId === playerGuildId && war.attackerGuildId === guild.id)),
    ))
    .slice(0, 8);

  return (
    <section className="panel">
      <div className="section-title">Войны гильдии</div>
      <div className="tab-row">
        <button className={tab === 'active' ? 'active' : ''} onClick={() => setTab('active')}>Активные</button>
        <button className={tab === 'votes' ? 'active' : ''} onClick={() => setTab('votes')}>Голосования</button>
        <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>История</button>
      </div>

      {tab === 'active' && (
        <div className="list-lines">
          {activeWars.length === 0 && <span className="muted">Активных войн нет.</span>}
          {activeWars.map((war: any) => {
            const attackerScore = war.attackerScore ?? war.attackerKills ?? 0;
            const defenderScore = war.defenderScore ?? war.defenderKills ?? 0;
            return (
              <div key={war.id} className="list-line danger-line">
                <span>
                  <button className="text-button danger-text" onClick={() => openGuildProfile(war.attackerGuildId)}>{guildName(war.attackerGuildId)}</button>
                  {' '}vs{' '}
                  <button className="text-button danger-text" onClick={() => openGuildProfile(war.defenderGuildId)}>{guildName(war.defenderGuildId)}</button>
                  <small>День {war.startedDay ?? war.declaredDay ?? server.serverDay} · до дня {war.endDay ?? '?'}</small>
                </span>
                <strong>{attackerScore}:{defenderScore}</strong>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'votes' && (
        <div className="list-lines">
          {votes.length === 0 && <span className="muted">Голосований нет.</span>}
          {votes.map((vote: any) => (
            <div key={vote.id} className="list-line">
              <span>
                <strong>{guildName(vote.proposerGuildId ?? vote.guildId)} → {guildName(vote.targetGuildId)}</strong>
                <small>Да: {vote.yesVotes ?? vote.yes ?? 0} · Нет: {vote.noVotes ?? vote.no ?? 0} · до {minutesText(vote.endsMinute ?? vote.endMinute)}</small>
              </span>
              {playerGuild && (vote.proposerGuildId === playerGuild.id || vote.guildId === playerGuild.id) && (
                <span className="action-grid compact-actions">
                  <button onClick={() => voteGuildWar(vote.id, 'yes')}>За</button>
                  <button onClick={() => voteGuildWar(vote.id, 'no')}>Против</button>
                </span>
              )}
            </div>
          ))}

          {playerGuild && enemyCandidates.length > 0 && (
            <div className="modal-section">
              <div className="section-title">Объявить войну</div>
              <div className="chip-row">
                {enemyCandidates.map((guild) => (
                  <button key={guild.id} onClick={() => declareGuildWar(guild.id)}>{guild.name}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="list-lines">
          {historyWars.length === 0 && <span className="muted">Истории войн нет.</span>}
          {historyWars.slice(0, 20).map((war: any) => (
            <div key={war.id} className="list-line">
              <span>{guildName(war.attackerGuildId)} vs {guildName(war.defenderGuildId)}</span>
              <strong>{war.status}</strong>
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
  const activeWars = (server.guildWars ?? []).filter((war: any) => war.status === 'active');
  const guildName = (id?: string) => server.guilds.find((guild) => guild.id === id)?.name ?? id ?? '???';

  return (
    <section className="panel">
      <div className="section-title">Войны сервера</div>
      <div className="list-lines">
        {activeWars.length === 0 && <span className="muted">Активных войн нет.</span>}
        {activeWars.slice(0, 12).map((war: any) => (
          <div key={war.id} className="list-line danger-line">
            <span>
              <button className="text-button danger-text" onClick={() => openGuildProfile(war.attackerGuildId)}>{guildName(war.attackerGuildId)}</button>
              {' '}vs{' '}
              <button className="text-button danger-text" onClick={() => openGuildProfile(war.defenderGuildId)}>{guildName(war.defenderGuildId)}</button>
            </span>
            <strong>{war.attackerScore ?? 0}:{war.defenderScore ?? 0}</strong>
          </div>
        ))}
      </div>
    </section>
  );
};
