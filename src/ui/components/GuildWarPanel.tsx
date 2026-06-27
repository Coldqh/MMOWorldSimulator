import { useMemo, useState } from 'react';
import { useGameStore } from '../../state/gameStore';

type WarTab = 'active' | 'declare' | 'history';

const timeText = (day?: number, minute?: number) => {
  const value = minute ?? 0;
  return `День ${day ?? '?'} · ${Math.floor(value / 60).toString().padStart(2, '0')}:${(value % 60).toString().padStart(2, '0')}`;
};

export const GuildWarPanel = () => {
  const server = useGameStore((state) => state.server);
  const declareGuildWar = useGameStore((state) => state.declareGuildWar);
  const openGuildProfile = useGameStore((state) => state.openGuildProfile);
  const openNpcProfile = useGameStore((state) => state.openNpcProfile);
  const [tab, setTab] = useState<WarTab>('active');
  const [selectedWarId, setSelectedWarId] = useState<string | null>(null);

  const playerGuildId = server.player.guildId;
  const playerGuild = server.guilds.find((guild) => guild.id === playerGuildId);
  const guildName = (id?: string) => server.guilds.find((guild) => guild.id === id)?.name ?? id ?? '???';
  const npcName = (id?: string) => server.npcs.find((npc) => npc.id === id)?.name ?? id ?? '???';

  const relevantWars = useMemo(() => (server.guildWars ?? []).filter((war) =>
    !playerGuildId || war.attackerGuildId === playerGuildId || war.defenderGuildId === playerGuildId,
  ), [server.guildWars, playerGuildId]);

  const activeWars = relevantWars.filter((war) => war.status === 'active');
  const historyWars = relevantWars.filter((war) => war.status !== 'active');
  const selectedWar = (server.guildWars ?? []).find((war) => war.id === selectedWarId) ?? activeWars[0];

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

  const topList = (warId: string, guildId: string) => {
    const war = server.guildWars.find((entry) => entry.id === warId);
    if (!war) return [];
    const map = new Map<string, number>();
    war.killRecords
      .filter((record) => record.killerGuildId === guildId)
      .forEach((record) => map.set(record.killerId, (map.get(record.killerId) ?? 0) + 1));
    return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5);
  };

  return (
    <section className="panel">
      <div className="section-title">Войны гильдии</div>
      <div className="tab-row">
        <button className={tab === 'active' ? 'active' : ''} onClick={() => setTab('active')}>Активные</button>
        <button className={tab === 'declare' ? 'active' : ''} onClick={() => setTab('declare')}>Объявить войну</button>
        <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>История</button>
      </div>

      {tab === 'active' && (
        <div className="grid-two">
          <div className="list-lines">
            {activeWars.length === 0 && <span className="muted">Активных войн нет.</span>}
            {activeWars.map((war) => (
              <div key={war.id} className={`list-line danger-line ${selectedWar?.id === war.id ? 'active' : ''}`}>
                <span>
                  <button className="text-button danger-text" onClick={() => openGuildProfile(war.attackerGuildId)}>{guildName(war.attackerGuildId)}</button>
                  {' '}vs{' '}
                  <button className="text-button danger-text" onClick={() => openGuildProfile(war.defenderGuildId)}>{guildName(war.defenderGuildId)}</button>
                  <small>конец: {timeText(war.endsDay, war.endsMinute)}</small>
                </span>
                <strong>{war.attackerKills}:{war.defenderKills}</strong>
                <button onClick={() => setSelectedWarId(war.id)}>Профиль</button>
              </div>
            ))}
          </div>

          {selectedWar && (
            <section className="panel nested-panel">
              <div className="section-title">Профиль войны</div>
              <h3>{guildName(selectedWar.attackerGuildId)} vs {guildName(selectedWar.defenderGuildId)}</h3>
              <p className="muted">Счёт {selectedWar.attackerKills}:{selectedWar.defenderKills} · завершение: {timeText(selectedWar.endsDay, selectedWar.endsMinute)}</p>
              <div className="grid-two">
                <div>
                  <div className="section-title">{guildName(selectedWar.attackerGuildId)} · топ-5</div>
                  <div className="list-lines">
                    {topList(selectedWar.id, selectedWar.attackerGuildId).length === 0 && <span className="muted">Убийств нет.</span>}
                    {topList(selectedWar.id, selectedWar.attackerGuildId).map(([id, kills], index) => (
                      <div key={id} className="list-line">
                        <button className="text-button" onClick={() => openNpcProfile(id)}>{index + 1}. {npcName(id)}</button>
                        <strong>{kills}</strong>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="section-title">{guildName(selectedWar.defenderGuildId)} · топ-5</div>
                  <div className="list-lines">
                    {topList(selectedWar.id, selectedWar.defenderGuildId).length === 0 && <span className="muted">Убийств нет.</span>}
                    {topList(selectedWar.id, selectedWar.defenderGuildId).map(([id, kills], index) => (
                      <div key={id} className="list-line">
                        <button className="text-button" onClick={() => openNpcProfile(id)}>{index + 1}. {npcName(id)}</button>
                        <strong>{kills}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}
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
  const openNpcProfile = useGameStore((state) => state.openNpcProfile);
  const [selectedWarId, setSelectedWarId] = useState<string | null>(null);
  const activeWars = (server.guildWars ?? []).filter((war) => war.status === 'active');
  const selectedWar = (server.guildWars ?? []).find((war) => war.id === selectedWarId) ?? activeWars[0];
  const guildName = (id?: string) => server.guilds.find((guild) => guild.id === id)?.name ?? id ?? '???';
  const npcName = (id?: string) => server.npcs.find((npc) => npc.id === id)?.name ?? id ?? '???';
  const topList = (warId: string, guildId: string) => {
    const war = server.guildWars.find((entry) => entry.id === warId);
    if (!war) return [];
    const map = new Map<string, number>();
    war.killRecords.filter((record) => record.killerGuildId === guildId).forEach((record) => map.set(record.killerId, (map.get(record.killerId) ?? 0) + 1));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  };

  return (
    <section className="panel">
      <div className="section-title">Войны сервера</div>
      <div className="grid-two">
        <div className="list-lines">
          {activeWars.length === 0 && <span className="muted">Активных войн нет.</span>}
          {activeWars.slice(0, 24).map((war) => (
            <div key={war.id} className="list-line danger-line">
              <span>
                <button className="text-button danger-text" onClick={() => openGuildProfile(war.attackerGuildId)}>{guildName(war.attackerGuildId)}</button>
                {' '}vs{' '}
                <button className="text-button danger-text" onClick={() => openGuildProfile(war.defenderGuildId)}>{guildName(war.defenderGuildId)}</button>
                <small>конец: {timeText(war.endsDay, war.endsMinute)}</small>
              </span>
              <strong>{war.attackerKills}:{war.defenderKills}</strong>
              <button onClick={() => setSelectedWarId(war.id)}>Профиль</button>
            </div>
          ))}
        </div>
        {selectedWar && (
          <section className="panel nested-panel">
            <div className="section-title">Профиль войны</div>
            <h3>{guildName(selectedWar.attackerGuildId)} vs {guildName(selectedWar.defenderGuildId)}</h3>
            <p className="muted">Счёт {selectedWar.attackerKills}:{selectedWar.defenderKills} · завершение: {timeText(selectedWar.endsDay, selectedWar.endsMinute)}</p>
            <div className="grid-two">
              {[selectedWar.attackerGuildId, selectedWar.defenderGuildId].map((guildId) => (
                <div key={guildId}>
                  <div className="section-title">{guildName(guildId)} · топ-5</div>
                  <div className="list-lines">
                    {topList(selectedWar.id, guildId).length === 0 && <span className="muted">Убийств нет.</span>}
                    {topList(selectedWar.id, guildId).map(([id, kills], index) => (
                      <div key={id} className="list-line">
                        <button className="text-button" onClick={() => openNpcProfile(id)}>{index + 1}. {npcName(id)}</button>
                        <strong>{kills}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </section>
  );
};
