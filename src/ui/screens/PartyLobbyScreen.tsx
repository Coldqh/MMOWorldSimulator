import { getDungeonById } from '../../content/world';
import { useGameStore } from '../../state/gameStore';
import type { PartyFinderListing, ServerState } from '../../types/game';
import { getClassPartyRole, getStartPartyListingBlockReason, isPartyListingReady, totalPartyRequired } from '../../systems/partyFinderSystem';
import { getGearScore } from '../../systems/itemSystem';

const roleLabel: Record<string, string> = {
  tank: 'танк',
  healer: 'хил',
  physicalDps: 'дд',
  magicDps: 'дд',
};

const visibilityLabel: Record<string, string> = {
  public: 'публичная',
  guild_internal: 'гильдия',
  static: 'статик',
};

const typeLabel: Record<string, string> = {
  dungeon: 'данж',
  raid: 'рейд',
};

const memberName = (server: ServerState, id: string) => id === server.player.id
  ? server.player.name
  : server.npcs.find((npc) => npc.id === id)?.name ?? id;

const memberLevel = (server: ServerState, id: string) => id === server.player.id
  ? server.player.level
  : server.npcs.find((npc) => npc.id === id)?.level ?? 0;

const memberGear = (server: ServerState, id: string) => id === server.player.id
  ? getGearScore(server.player.equipment)
  : server.npcs.find((npc) => npc.id === id)?.gearScore ?? 0;

const memberRole = (server: ServerState, id: string) => {
  const classId = id === server.player.id ? server.player.classId : server.npcs.find((npc) => npc.id === id)?.classId ?? 'ranger';
  return getClassPartyRole(classId);
};

const lobbyStatus = (listing: PartyFinderListing) => {
  if (isPartyListingReady(listing)) return 'готова';
  const total = totalPartyRequired(listing.requirements);
  return listing.memberIds.length >= total - 1 ? 'почти готова' : 'формируется';
};

export const PartyLobbyScreen = () => {
  const server = useGameStore((state) => state.server);
  const waitPartyListing = useGameStore((state) => state.waitPartyListing);
  const leavePartyListing = useGameStore((state) => state.leavePartyListing);
  const startPartyListing = useGameStore((state) => state.startPartyListing);
  const acceptPartyApplicant = useGameStore((state) => state.acceptPartyApplicant);
  const rejectPartyApplicant = useGameStore((state) => state.rejectPartyApplicant);
  const setScreen = useGameStore((state) => state.setScreen);
  const listing = (server.partyFinderListings ?? []).find((entry) => entry.id === server.currentPartyListingId);
  const dungeon = listing ? getDungeonById(listing.dungeonId) : undefined;

  if (!listing || !dungeon) {
    return (
      <div className="screen-stack">
        <section className="panel hero-panel">
          <div className="section-title">👥 Лобби группы</div>
          <h1>Группа не найдена</h1>
          <p className="muted">Заявка устарела или была закрыта.</p>
          <div className="action-grid">
            <button onClick={() => setScreen('partyFinder')}>К поиску пати</button>
          </div>
        </section>
      </div>
    );
  }

  const total = totalPartyRequired(listing.requirements);
  const isMember = listing.memberIds.includes(server.player.id);
  const isLeader = listing.leaderId === server.player.id;
  const startBlock = getStartPartyListingBlockReason(server, listing);
  const ready = !startBlock;
  const leaderLine = `${memberName(server, listing.leaderId)} · ${listing.leaderType === 'player' ? 'ты лидер' : 'NPC-лидер'}`;

  return (
    <div className="screen-stack party-lobby-screen">
      <section className="panel hero-panel">
        <div className="section-title">👥 Лобби группы</div>
        <h1>{dungeon.name}</h1>
        <p className="muted">{typeLabel[listing.contentType]} · {visibilityLabel[listing.visibility]} · {lobbyStatus(listing)} · {listing.memberIds.length}/{total} · заявок: {listing.applicantIds.length}</p>
        <div className="stat-grid stat-grid-compact">
          <span>Лидер: {leaderLine}</span>
          <span>{isLeader ? 'Ты лидер группы' : 'Ты участник группы'}</span>
          <span>Lv. {listing.requirements.minLevel}-{listing.requirements.maxLevel}</span>
          <span>{listing.requirements.minGearScore ? `GS ${listing.requirements.minGearScore}+` : 'GS свободный'}</span>
        </div>
      </section>

      <section className="panel">
        <div className="section-title">Роли</div>
        <div className="stat-grid stat-grid-compact">
          <span>Танк {listing.roles.tankIds.length}/{listing.requirements.tanks}</span>
          <span>Хил {listing.roles.healerIds.length}/{listing.requirements.healers}</span>
          <span>DPS {listing.roles.dpsIds.length}/{listing.requirements.dps}</span>
          <span>Ожидания: {listing.waitAttempts ?? 0}/3</span>
        </div>
      </section>

      <section className="panel">
        <div className="section-title">Участники</div>
        <div className="list-lines">
          {listing.memberIds.map((id) => (
            <div key={id} className={`list-line ${id === server.player.id ? 'self-line' : ''}`}>
              <span>{memberName(server, id)}{id === listing.leaderId ? ' · лидер' : ''}{id === server.player.id ? ' · ты' : ''}</span>
              <strong>{roleLabel[memberRole(server, id)]} · Lv. {memberLevel(server, id)} · Gear {memberGear(server, id)}</strong>
            </div>
          ))}
        </div>
      </section>

      {isLeader && (
        <section className="panel">
          <div className="section-title">Заявки</div>
          <div className="list-lines compact-list">
            {listing.applicantIds.length === 0 && <span className="muted">Заявок пока нет.</span>}
            {listing.applicantIds.map((id) => (
              <div key={id} className="list-line">
                <span>{memberName(server, id)}</span>
                <strong>{roleLabel[memberRole(server, id)]} · Lv. {memberLevel(server, id)} · Gear {memberGear(server, id)}</strong>
                <span className="action-grid compact-actions">
                  <button className="primary-button" onClick={() => acceptPartyApplicant(listing.id, id)}>Принять</button>
                  <button onClick={() => rejectPartyApplicant(listing.id, id)}>Отказать</button>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="panel action-panel">
        <div className="section-title">Действия</div>
        <div className="action-grid">
          {isMember && <button onClick={() => waitPartyListing(listing.id)} disabled={ready}>Подождать</button>}
          {isMember && <button className="primary-button" onClick={() => startPartyListing(listing.id)} disabled={!ready}>{ready ? 'Начать данж' : startBlock}</button>}
          {isMember && <button className="danger-button" onClick={() => leavePartyListing(listing.id)}>Покинуть группу</button>}
          {!isMember && <button onClick={() => setScreen('partyFinder')}>К поиску пати</button>}
        </div>
      </section>
    </div>
  );
};
