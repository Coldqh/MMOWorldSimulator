import { useMemo, useState } from 'react';
import { useGameStore } from '../../state/gameStore';
import type { GuildWar } from '../../types/game';

type WarTab = 'active' | 'declare' | 'history';
type ServerTab = 'active' | 'history';

const timeText = (day?: number, minute?: number) => {
  const value = minute ?? 0;
  return `День ${day ?? '?'} · ${Math.floor(value / 60).toString().padStart(2, '0')}:${(value % 60).toString().padStart(2, '0')}`;
};

const getWarMvpId = (war: GuildWar) => {
  const map = new Map<string, number>();
  war.killRecords.forEach((record) => map.set(record.killerId, (map.get(record.killerId) ?? 0) + 1));
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
};

const getWarWinnerGuildId = (war: GuildWar) => {
  if (war.attackerKills === war.defenderKills) return undefined;
  return war.attackerKills > war.defenderKills ? war.attackerGuildId : war.defenderGuildId;
};

export const GuildWarPanel = () => {
  const server = useGameStore((state) => state.server);
  const declareGuildWar = useGameStore((state) => state.declareGuildWar);
  const openGuildProfile = useGameStore((state) => state.openGuildProfile);
  const openGuildWarProfile = useGameStore((state) => state.openGuildWarProfile);
  const openNpcProfile = useGameStore((state) => state.openNpcProfile);
  const [tab, setTab] = useState<WarTab>('active');

  const playerGuildId = server.player.guildId;
  const playerGuild = server.guilds.find((guild) => guild.id === playerGuildId);
  const isLeader = Boolean(playerGuild && playerGuild.leaderId === server.player.id);
  const guildName = (id?: string) => server.guilds.find((guild) => guild.id === id)?.name ?? id ?? '???';
  const npcName = (id?: string) => server.npcs.find((npc) => npc.id === id)?.name ?? id ?? '???';

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

  const renderHistoryResult = (war: GuildWar) => {
    const winnerGuildId = getWarWinnerGuildId(war);
    const isDraw = !winnerGuildId;
    const playerWon = winnerGuildId === playerGuildId;
    const [mvpId, mvpKills] = getWarMvpId(war) ?? [];
    return (
      <span className="war-history-result">
        <strong className={isDraw ? 'muted' : playerWon ? 'victory-text' : 'defeat-text'}>
          {isDraw ? 'Ничья' : playerWon ? 'Победа' : 'Поражение'}
        </strong>
        <small>
          победитель: {winnerGuildId ? guildName(winnerGuildId) : 'нет'} · MVP:{' '}
          {mvpId ? <button className="text-button inline-button" onClick={() => openNpcProfile(mvpId)}>{npcName(mvpId)} · {mvpKills}</button> : 'нет'}
        </small>
      </span>
    );
  };

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
            <div key={war.id} className="list-line war-history-line">
              <span>
                {guildName(war.attackerGuildId)} vs {guildName(war.defenderGuildId)}
                <small>конец: {timeText(war.endsDay, war.endsMinute)} · счёт {war.attackerKills}:{war.defenderKills}</small>
                {renderHistoryResult(war)}
              </span>
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
  const openNpcProfile = useGameStore((state) => state.openNpcProfile);
  const [tab, setTab] = useState<ServerTab>('active');

  const activeWars = (server.guildWars ?? []).filter((war) => war.status === 'active');
  const historyWars = (server.guildWars ?? []).filter((war) => war.status !== 'active');
  const wars = tab === 'active' ? activeWars : historyWars;
  const guildName = (id?: string) => server.guilds.find((guild) => guild.id === id)?.name ?? id ?? '???';
  const npcName = (id?: string) => server.npcs.find((npc) => npc.id === id)?.name ?? id ?? '???';

  const renderServerHistoryResult = (war: GuildWar) => {
    const winnerGuildId = getWarWinnerGuildId(war);
    const [mvpId, mvpKills] = getWarMvpId(war) ?? [];
    return (
      <small>
        {winnerGuildId ? <span className="victory-text">Победитель: {guildName(winnerGuildId)}</span> : <span className="muted">Ничья</span>}
        {' '}· MVP:{' '}
        {mvpId ? <button className="text-button inline-button" onClick={() => openNpcProfile(mvpId)}>{npcName(mvpId)} · {mvpKills}</button> : 'нет'}
      </small>
    );
  };

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
          <div key={war.id} className={war.status === 'active' ? 'list-line danger-line' : 'list-line war-history-line'}>
            <span>
              <button className="text-button danger-text" onClick={() => openGuildProfile(war.attackerGuildId)}>{guildName(war.attackerGuildId)}</button>
              {' '}vs{' '}
              <button className="text-button danger-text" onClick={() => openGuildProfile(war.defenderGuildId)}>{guildName(war.defenderGuildId)}</button>
              <small>конец: {timeText(war.endsDay, war.endsMinute)} · счёт {war.attackerKills}:{war.defenderKills}</small>
              {war.status !== 'active' && renderServerHistoryResult(war)}
            </span>
            <button onClick={() => openGuildWarProfile(war.id)}>Профиль</button>
          </div>
        ))}
      </div>
    </section>
  );
};
