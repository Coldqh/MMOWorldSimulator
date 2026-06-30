import { useMemo } from 'react';
import { SIEGE_MAPS } from '../../content/castles';
import { useGameStore } from '../../state/gameStore';
import { canRegisterPlayerGuildForCastle, canUnregisterPlayerGuildFromCastle, isPlayerSiegeCommander } from '../../systems/siegeSystem';
import type { Castle, SiegeRun, SiegeUnit } from '../../types/game';

const timeText = (day?: number, minute?: number) => {
  const value = minute ?? 0;
  return `День ${day ?? '?'} · ${Math.floor(value / 60).toString().padStart(2, '0')}:${(value % 60).toString().padStart(2, '0')}`;
};

const tierText = (tier: Castle['tier']) => tier === 'high' ? 'High · 20' : 'Mid · 10–19';

const unitClass = (unit?: SiegeUnit) => {
  if (!unit) return 'siege-cell';
  if (!unit.alive) return 'siege-cell unit dead';
  return `siege-cell unit guild-${Math.abs(unit.guildId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)) % 6}`;
};

const SiegeMapView = ({ run }: { run?: SiegeRun }) => {
  if (!run) return <p className="muted">Активной осады нет.</p>;
  const map = SIEGE_MAPS.find((entry) => entry.id === run.mapId) ?? SIEGE_MAPS[0];
  return (
    <div className="siege-map">
      {map.cells.map((cell) => {
        const unit = run.units.find((entry) => entry.x === cell.x && entry.y === cell.y);
        return (
          <div key={`${cell.x}_${cell.y}`} className={`${unitClass(unit)} ${cell.type}`}>
            {unit ? unit.name.slice(0, 2).toUpperCase() : ''}
          </div>
        );
      })}
    </div>
  );
};

export const CastlePanel = ({ onBack }: { onBack?: () => void } = {}) => {
  const server = useGameStore((state) => state.server);
  const setScreen = useGameStore((state) => state.setScreen);
  const registerSiegeRoster = useGameStore((state) => state.registerSiegeRoster);
  const unregisterSiegeRoster = useGameStore((state) => state.unregisterSiegeRoster);
  const startSiege = useGameStore((state) => state.startSiege);
  const siegeStep = useGameStore((state) => state.siegeStep);
  const openGuildProfile = useGameStore((state) => state.openGuildProfile);
  const openNpcProfile = useGameStore((state) => state.openNpcProfile);

  const playerGuild = server.guilds.find((guild) => guild.id === server.player.guildId);
  const guildName = (id?: string) => server.guilds.find((guild) => guild.id === id)?.name ?? id ?? 'нет';
  const npcName = (id?: string) => id === server.player.id ? server.player.name : server.npcs.find((npc) => npc.id === id)?.name ?? id ?? 'нет';
  const currentRun = server.currentSiegeRun?.status === 'active' ? server.currentSiegeRun : undefined;
  const playerCommander = isPlayerSiegeCommander(server, currentRun);
  const siegeStarted = Boolean(currentRun?.log.some((line) => line.includes('Команда вышла на карту')));

  const castles = useMemo(() => [...(server.castles ?? [])].sort((a, b) => a.nextSiegeDay - b.nextSiegeDay || a.name.localeCompare(b.name)), [server.castles]);

  return (
    <div className="screen-stack">
      <section className="panel hero-panel">
        <div className="title-row"><div className="section-title">🏰 Замки</div><button onClick={onBack ?? (() => setScreen('guild'))}>Назад</button></div>
        <h1>Осады замков</h1>
        <p className="muted">За 3 дня до осады хай-гильдии выставляют 10 сильнейших. Если ты в топ-10 своей гильдии, тебе придёт уведомление.</p>
      </section>

      {currentRun && (
        <section className="panel">
          <div className="section-title">Осада активна</div>
          <div className="title-row">
            <h2>{castles.find((castle) => castle.id === currentRun.castleId)?.name ?? currentRun.castleId}</h2>
            <strong>Ход {currentRun.turn}</strong>
          </div>
          <SiegeMapView run={currentRun} />
          <div className="action-grid combat-actions">
            {!siegeStarted && <button className="primary-button" onClick={startSiege}>Начать осаду</button>}
            {siegeStarted && playerCommander && (
              <>
                <button onClick={() => siegeStep('up')}>Идти вверх</button>
                <button onClick={() => siegeStep('down')}>Идти вниз</button>
                <button onClick={() => siegeStep('left')}>Идти влево</button>
                <button onClick={() => siegeStep('right')}>Идти вправо</button>
                <button onClick={() => siegeStep('auto')}>Авто-ход</button>
              </>
            )}
            {siegeStarted && !playerCommander && <button onClick={() => siegeStep('auto')}>Следующий ход</button>}
          </div>
          <div className="list-lines compact-list">
            {currentRun.units.slice(0, 40).map((unit) => (
              <div key={unit.id} className={`list-line ${unit.alive ? '' : 'danger-line'}`}>
                <span>{unit.name} · {guildName(unit.guildId)} · {unit.x}:{unit.y}</span>
                <strong>HP {unit.hp}/{unit.maxHp} · K {unit.kills} · DMG {unit.damageDealt}</strong>
              </div>
            ))}
          </div>
          <div className="combat-log">{currentRun.log.slice(-14).map((line, index) => <div key={`${line}_${index}`}>{line}</div>)}</div>
        </section>
      )}

      <section className="panel">
        <div className="section-title">Список замков</div>
        <div className="card-grid">
          {castles.map((castle) => {
            const roster = (server.siegeRosters ?? []).find((entry) => entry.castleId === castle.id && entry.guildId === playerGuild?.id);
            const check = canRegisterPlayerGuildForCastle(server, castle.id);
            const unregisterCheck = canUnregisterPlayerGuildFromCastle(server, castle.id);
            const allRosters = (server.siegeRosters ?? []).filter((entry) => entry.castleId === castle.id);
            const last = castle.history?.[0];
            return (
              <article key={castle.id} className="content-card guild-card">
                <div className="title-row">
                  <strong>{castle.name}</strong>
                  <span>{tierText(castle.tier)}</span>
                </div>
                <span>Владелец: {castle.ownerGuildId ? <button className="text-button inline-button" onClick={() => openGuildProfile(castle.ownerGuildId!)}>{guildName(castle.ownerGuildId)}</button> : 'нет'}</span>
                <span>Осада: {timeText(castle.nextSiegeDay, castle.nextSiegeMinute)}</span>
                <span>Составы: {allRosters.length}</span>
                {roster && <span className="ready-line">Твой состав: {roster.memberIds.length}/10{roster.memberIds.includes(server.player.id) ? ' · ты в составе' : ''}</span>}
                <div className="action-grid compact-actions">
                  {roster
                    ? (unregisterCheck.ok
                      ? <button onClick={() => unregisterSiegeRoster(castle.id)}>Снять регистрацию</button>
                      : <button disabled>Гильдия зарегистрирована</button>)
                    : <button disabled={!check.ok} onClick={() => registerSiegeRoster(castle.id)}>{check.ok ? 'Зарегистрировать топ-10' : check.reason}</button>}
                </div>
                {allRosters.length > 0 && (
                  <div className="list-lines compact-list">
                    {allRosters.map((entry) => (
                      <div key={`${entry.castleId}_${entry.guildId}`} className="list-line">
                        <button className="text-button" onClick={() => openGuildProfile(entry.guildId)}>{guildName(entry.guildId)}</button>
                        <strong>{entry.memberIds.length}/10</strong>
                      </div>
                    ))}
                  </div>
                )}
                {roster && (
                  <div className="list-lines compact-list">
                    {roster.memberIds.map((id) => <div key={id} className="list-line"><button className="text-button" onClick={() => id === server.player.id ? undefined : openNpcProfile(id)}>{npcName(id)}</button></div>)}
                  </div>
                )}
                {last && (
                  <div className="war-history-result">
                    <strong className={last.winnerGuildId === playerGuild?.id ? 'victory-text' : 'muted'}>Последний победитель: {guildName(last.winnerGuildId)}</strong>
                    <small>MVP: {last.mvpId ? <button className="text-button inline-button" onClick={() => last.mvpId === server.player.id ? undefined : openNpcProfile(last.mvpId!)}>{npcName(last.mvpId)}</button> : 'нет'}</small>
                    <small>{last.scoreSummary}</small>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
};
