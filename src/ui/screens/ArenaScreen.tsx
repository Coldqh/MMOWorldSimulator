import { useMemo, useState } from 'react';
import { CLASSES } from '../../content/classes';
import { useGameStore } from '../../state/gameStore';
import { getGearScore } from '../../systems/itemSystem';
import {
  ARENA_BRACKETS,
  ArenaBracketId,
  arenaRankIcon,
  arenaRankName,
  formatArenaRank,
  getArenaBracketIdForPlayer,
  getArenaBracketOpponentPool,
  getArenaLadder,
  getPlayerArenaRankInBracket,
} from '../../systems/arenaBracketSystem';
import { CombatPanel } from '../components/CombatPanel';

const className = (id?: string) => CLASSES.find((entry) => entry.id === id)?.name ?? id ?? '—';

export const ArenaScreen = () => {
  const server = useGameStore((state) => state.server);
  const combat = useGameStore((state) => state.combat);
  const startArena = useGameStore((state) => state.startArena);
  const startArena3v3 = useGameStore((state) => state.startArena3v3);
  const setScreen = useGameStore((state) => state.setScreen);
  const openNpcProfile = useGameStore((state) => state.openNpcProfile);
  const [bracketId, setBracketId] = useState<ArenaBracketId>(getArenaBracketIdForPlayer(server));

  const inCity = server.location.mode === 'city';
  const playerGear = getGearScore(server.player.equipment);
  const ladder = useMemo(() => getArenaLadder(server, bracketId), [server, bracketId]);
  const opponents = useMemo(() => getArenaBracketOpponentPool(server, bracketId).slice(0, 8), [server, bracketId]);
  const playerRank = getPlayerArenaRankInBracket(server, getArenaBracketIdForPlayer(server));
  const activeBracket = ARENA_BRACKETS.find((bracket) => bracket.id === bracketId) ?? ARENA_BRACKETS[0];
  const playerInActiveBracket = server.player.level >= activeBracket.levelRange[0] && server.player.level <= activeBracket.levelRange[1];

  if (!inCity && !combat) {
    return (
      <div className="screen-stack">
        <section className="panel hero-panel">
          <div className="section-title">🏟️ Арена</div>
          <h1>Нужен город</h1>
          <p className="muted">Арена открывается из города.</p>
          <button onClick={() => setScreen('world')}>В мир</button>
        </section>
      </div>
    );
  }

  return (
    <div className="screen-stack arena-screen">
      {combat && <CombatPanel />}
      <section className="panel hero-panel arena-hero">
        <div className="section-title">🏟️ Арена</div>
        <h1>{arenaRankIcon(server.player.arenaRating)} {arenaRankName(server.player.arenaRating)} · #{playerRank || '—'}</h1>
        <div className="arena-score-card">
          <span>Брекет</span><strong>{ARENA_BRACKETS.find((bracket) => bracket.id === getArenaBracketIdForPlayer(server))?.name}</strong>
          <span>Рейтинг</span><strong>{server.player.arenaRating}</strong>
          <span>Gear</span><strong>{playerGear}</strong>
          <span>Lv.</span><strong>{server.player.level}</strong>
        </div>
        <div className="tab-row">
          {ARENA_BRACKETS.map((bracket) => (
            <button key={bracket.id} className={bracketId === bracket.id ? 'active' : ''} onClick={() => setBracketId(bracket.id)}>
              {bracket.name} · {bracket.levelRange[0]}-{bracket.levelRange[1]}
            </button>
          ))}
        </div>
        <div className="action-grid combat-actions">
          <button className="primary-button" onClick={startArena} disabled={Boolean(combat) || !playerInActiveBracket}>Найти бой 1v1</button>
          <button className="primary-button" onClick={startArena3v3} disabled={Boolean(combat) || !playerInActiveBracket}>Найти бой 3v3</button>
        </div>
        {!playerInActiveBracket && <p className="muted">Твой персонаж не относится к выбранному брекету. Бои доступны только в своём брекете.</p>}
      </section>

      <section className="panel">
        <div className="section-title">Ладдер · {activeBracket.name}</div>
        <div className="list-lines compact-list">
          {ladder.slice(0, 30).map((entry, index) => (
            <div key={entry.id} className={`list-line ${entry.isPlayer ? 'self-line' : ''}`}>
              {entry.isPlayer ? <span>{index + 1}. {entry.name} · ты</span> : <button className="text-button" onClick={() => openNpcProfile(entry.id)}>{index + 1}. {entry.name}</button>}
              <strong>Lv. {entry.level} · {formatArenaRank(entry.rating)}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-title">Ближайшие соперники · {activeBracket.name}</div>
        <div className="list-lines compact-list">
          {opponents.map((npc) => (
            <div key={npc.id} className="list-line">
              <button className="text-button" onClick={() => openNpcProfile(npc.id)}>{npc.name}</button>
              <strong>Lv. {npc.level} · Gear {npc.gearScore} · {className(npc.classId)} · {formatArenaRank(npc.arenaRating)}</strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
