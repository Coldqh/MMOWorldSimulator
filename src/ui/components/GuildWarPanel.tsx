import { useMemo, useState } from 'react';
import { useGameStore } from '../../state/gameStore';

type WarTab = 'active' | 'declare' | 'history';
type ServerTab = 'active' | 'history';

const timeText = (day?: number, minute?: number) => {
  const value = minute ?? 0;
  return `День ${day ?? '?'} · ${Math.floor(value / 60).toString().padStart(2, '0')}:${(value % 60).toString().padStart(2, '0')}`;
};

export const GuildWarPanel = () => {
  const server = useGameStore((state) => state.server);
  const declareGuildWar = useGameStore((state) => state.declareGuildWar);
  const openGuildProfile = useGameStore((state) => state.openGuildProfile);
  const openGuildWarProfile = useGameStore((state) => state.openGuildWarProfile);
  const [tab, setTab] = useState<WarTab>('active');

  const playerGuildId = server.player.guildId;
  const playerGuild = server.guilds.find((guild) => guild.id === playerGuildId);
  const isLeader = Boolean(playerGuild && playerGuild.leaderId === server.player.id);
  const guildName = (id?: string) => server.guilds.find((guild) => guild.id === id)?.name ?? id ?? '???';

  const relevantWars = useMemo(() => (server.guildWars ?? []).filter((war) =>
    playerGuildId && (war.attackerGuildId === playerGuildId || war.defenderGuildId === playerGuildId),
  ), [server.guildWars, playerGuildId]);

  const activeWars = relevantWars.filter((war) => war.status === 'active');
  const historyWars = relevantWars.filter((war) => war.status !== 'active');

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
    });

  return (
    <section className="panel">
      <div className="section-title">Войны твоей гильдии</div>
      <div className="tab-row">
        <button className={tab === 'active' ? 'active' : ''} onClick={() => setTab('active')}>Активные</button>
        {isLeader && <button className={tab === 'declare' ? 'active' : ''} onClick={() => setTab('declare')}>Объявить войну</button>}
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
                <small>конец: {timeText(war.endsDay, war.endsMinute)}</small>
              </span>
              <strong>{war.attackerKills}:{war.defenderKills}</strong>
              <button onClick={() => openGuildWarProfile(war.id)}>Профиль</button>
            </div>
          ))}
        </div>
      )}

      {tab === 'declare' && isLeader && playerGuild && (
        <div className="list-lines">
          {enemyCandidates.map((guild) => {
            const rel = server.guildRelations.find((entry) => entry.fromGuildId === playerGuild.id && entry.toGuildId === guild.id)?.value ?? 0;
            return (
              <div key={guild.id} className="list-line">
                <button className="text-button" onClick={() => openGuildProfile(guild.id)}>{guild.name}</button>
                <strong>отношение {rel}</strong>
                <button className="danger-button" onClick={() => declareGuildWar(guild.id)}>Объявить войну</button>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'history' && (
        <div className="list-lines">
          {historyWars.length === 0 && <span className="muted">Истории войн нет.</span>}
          {historyWars.slice(0, 40).map((war) => (
            <div key={war.id} className="list-line">
              <span>
                {guildName(war.attackerGuildId)} vs {guildName(war.defenderGuildId)}
                <small>конец: {timeText(war.endsDay, war.endsMinute)}</small>
              </span>
              <strong>{war.attackerKills}:{war.defenderKills} · {war.status}</strong>
              <button onClick={() => openGuildWarProfile(war.id)}>Профиль</button>
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
  const openGuildWarProfile = useGameStore((state) => state.openGuildWarProfile);
  const [tab, setTab] = useState<ServerTab>('active');

  const activeWars = (server.guildWars ?? []).filter((war) => war.status === 'active');
  const historyWars = (server.guildWars ?? []).filter((war) => war.status !== 'active');
  const wars = tab === 'active' ? activeWars : historyWars;
  const guildName = (id?: string) => server.guilds.find((guild) => guild.id === id)?.name ?? id ?? '???';

  return (
    <section className="panel">
      <div className="section-title">Войны сервера</div>
      <div className="tab-row">
        <button className={tab === 'active' ? 'active' : ''} onClick={() => setTab('active')}>Активные</button>
        <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>История</button>
      </div>
      <div className="list-lines">
        {wars.length === 0 && <span className="muted">{tab === 'active' ? 'Активных войн нет.' : 'Истории войн нет.'}</span>}
        {wars.slice(0, 60).map((war) => (
          <div key={war.id} className={war.status === 'active' ? 'list-line danger-line' : 'list-line'}>
            <span>
              <button className="text-button danger-text" onClick={() => openGuildProfile(war.attackerGuildId)}>{guildName(war.attackerGuildId)}</button>
              {' '}vs{' '}
              <button className="text-button danger-text" onClick={() => openGuildProfile(war.defenderGuildId)}>{guildName(war.defenderGuildId)}</button>
              <small>конец: {timeText(war.endsDay, war.endsMinute)}</small>
            </span>
            <strong>{war.attackerKills}:{war.defenderKills}{war.status !== 'active' ? ` · ${war.status}` : ''}</strong>
            <button onClick={() => openGuildWarProfile(war.id)}>Профиль</button>
          </div>
        ))}
      </div>
    </section>
  );
};
