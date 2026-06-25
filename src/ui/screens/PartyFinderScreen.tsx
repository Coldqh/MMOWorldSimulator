import { useEffect, useMemo, useState } from 'react';
import { DUNGEONS, RAIDS, getDungeonById } from '../../content/world';
import { useGameStore } from '../../state/gameStore';
import type { PartyFinderListing, ServerState } from '../../types/game';
import { getCreatePartyListingBlockReason, getPlayerListingBlockReason, getClassPartyRole, totalPartyRequired } from '../../systems/partyFinderSystem';
import { getGearScore } from '../../systems/itemSystem';

const typeLabel: Record<string, string> = {
  dungeon: 'Данж',
  raid: 'Рейд',
};

const visibilityLabel: Record<string, string> = {
  public: 'Публичная',
  guild_internal: 'Гильдия',
  static: 'Статик',
};

const roleLabel: Record<string, string> = {
  tank: 'танк',
  healer: 'хил',
  physicalDps: 'дд',
  magicDps: 'дд',
};

const timeLabel = (day: number, minute: number) => {
  const hh = Math.floor(minute / 60).toString().padStart(2, '0');
  const mm = (minute % 60).toString().padStart(2, '0');
  return `День ${day} · ${hh}:${mm}`;
};

const leaderName = (server: ServerState, listing: PartyFinderListing) => {
  if (listing.leaderId === server.player.id) return server.player.name;
  return server.npcs.find((npc) => npc.id === listing.leaderId)?.name ?? listing.leaderId;
};

const guildName = (server: ServerState, guildId?: string) =>
  guildId ? server.guilds.find((guild) => guild.id === guildId)?.name ?? guildId : 'нет';

const FilterButton = ({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) => (
  <button className={active ? 'active' : ''} onClick={onClick}>{label}</button>
);

export const PartyFinderScreen = () => {
  const server = useGameStore((state) => state.server);
  const refreshPartyFinder = useGameStore((state) => state.refreshPartyFinder);
  const createPartyListing = useGameStore((state) => state.createPartyListing);
  const joinPartyListing = useGameStore((state) => state.joinPartyListing);
  const setScreen = useGameStore((state) => state.setScreen);
  const [filter, setFilter] = useState('all');
  const instances = useMemo(() => [...DUNGEONS, ...RAIDS], []);
  const firstAvailableId = instances[0]?.id ?? '';
  const [selectedId, setSelectedId] = useState(firstAvailableId);
  const [visibility, setVisibility] = useState<'public' | 'guild_internal'>('public');
  const playerRole = getClassPartyRole(server.player.classId);
  const playerGear = getGearScore(server.player.equipment);
  const createReason = selectedId ? getCreatePartyListingBlockReason(server, selectedId, visibility) : 'Контент не найден';

  useEffect(() => {
    refreshPartyFinder();
  }, [refreshPartyFinder]);

  const listings = (server.partyFinderListings ?? []).filter((listing) => {
    const dungeon = getDungeonById(listing.dungeonId);
    if (!dungeon) return false;
    if (listing.visibility !== 'public' && listing.guildId !== server.player.guildId) return filter === 'all' ? false : listing.guildId === server.player.guildId;
    if (filter === 'dungeon') return listing.contentType === 'dungeon';
    if (filter === 'raid') return listing.contentType === 'raid';
    if (filter === 'public') return listing.visibility === 'public';
    if (filter === 'guild') return listing.visibility === 'guild_internal' || listing.visibility === 'static';
    if (filter === 'available') return getPlayerListingBlockReason(server, listing) === '';
    if (filter === 'role') {
      if (listing.memberIds.includes(server.player.id)) return true;
      if (playerRole === 'tank') return listing.roles.tankIds.length < listing.requirements.tanks;
      if (playerRole === 'healer') return listing.roles.healerIds.length < listing.requirements.healers;
      return listing.roles.dpsIds.length < listing.requirements.dps;
    }
    return true;
  });

  return (
    <div className="screen-stack">
      <section className="panel hero-panel">
        <div className="section-title">👥 Поиск пати</div>
        <h1>Party Finder</h1>
        <p className="muted">{timeLabel(server.serverDay, server.currentMinute)} · активных заявок: {server.partyFinderListings?.length ?? 0}</p>
        <p className="muted">Создание и вступление открывают лобби. Данж стартует только вручную из полной группы.</p>
        <div className="stat-grid stat-grid-compact">
          <span>Твоя роль: {roleLabel[playerRole]}</span>
          <span>Lv. {server.player.level}</span>
          <span>Gear {playerGear}</span>
          <span>{server.player.guildId ? `Гильдия: ${guildName(server, server.player.guildId)}` : 'Без гильдии'}</span>
        </div>
      </section>

      <section className="panel action-panel">
        <div className="section-title">Создать заявку</div>
        <div className="action-grid">
          <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
            {instances.map((dungeon) => {
              const locked = server.player.level < dungeon.levelRange[0];
              return (
                <option key={dungeon.id} value={dungeon.id}>
                  {dungeon.name} · {typeLabel[dungeon.contentType ?? 'dungeon']} · Lv. {dungeon.levelRange[0]}-{dungeon.levelRange[1]}{locked ? ' · locked' : ''}
                </option>
              );
            })}
          </select>
          <select value={visibility} onChange={(event) => setVisibility(event.target.value as 'public' | 'guild_internal')} disabled={!server.player.guildId}>
            <option value="public">Публичная</option>
            <option value="guild_internal">Гильдейская</option>
          </select>
          <button className="primary-button" onClick={() => selectedId && createPartyListing(selectedId, visibility)} disabled={Boolean(createReason)}>
            {createReason || 'Создать группу'}
          </button>
          <button onClick={refreshPartyFinder}>Обновить</button>
        </div>
      </section>

      <section className="panel">
        <div className="section-title">Фильтр</div>
        <div className="mini-tabs wrap-tabs">
          <FilterButton active={filter === 'all'} label="Все" onClick={() => setFilter('all')} />
          <FilterButton active={filter === 'dungeon'} label="Данжи" onClick={() => setFilter('dungeon')} />
          <FilterButton active={filter === 'raid'} label="Рейды" onClick={() => setFilter('raid')} />
          <FilterButton active={filter === 'public'} label="Публичные" onClick={() => setFilter('public')} />
          <FilterButton active={filter === 'guild'} label="Гильдия" onClick={() => setFilter('guild')} />
          <FilterButton active={filter === 'available'} label="Доступные мне" onClick={() => setFilter('available')} />
          <FilterButton active={filter === 'role'} label="Нужна моя роль" onClick={() => setFilter('role')} />
        </div>
      </section>

      <section className="panel">
        <div className="section-title">Заявки</div>
        <div className="list-lines">
          {listings.length === 0 && <span className="muted">Заявок нет.</span>}
          {listings.map((listing) => {
            const dungeon = getDungeonById(listing.dungeonId);
            const reason = getPlayerListingBlockReason(server, listing);
            const isMember = listing.memberIds.includes(server.player.id);
            const memberCount = listing.memberIds.length;
            const maxMembers = totalPartyRequired(listing.requirements);
            return (
              <div key={listing.id} className={`list-line item-row rarity-border-${listing.contentType === 'raid' ? 'legendary' : 'epic'}`}>
                <span>
                  <strong>{dungeon?.name ?? listing.dungeonId}</strong>
                  <small>
                    {typeLabel[listing.contentType]} · {visibilityLabel[listing.visibility]} · {memberCount}/{maxMembers} · {listing.status}
                  </small>
                  <small>
                    танки {listing.roles.tankIds.length}/{listing.requirements.tanks} · хилы {listing.roles.healerIds.length}/{listing.requirements.healers} · дд {listing.roles.dpsIds.length}/{listing.requirements.dps}
                  </small>
                  <small>
                    лидер: {leaderName(server, listing)} · гильдия: {guildName(server, listing.guildId)}
                  </small>
                  <small>
                    Lv. {listing.requirements.minLevel}-{listing.requirements.maxLevel}
                    {listing.requirements.minGearScore ? ` · GS ${listing.requirements.minGearScore}+` : ''}
                    {listing.note ? ` · ${listing.note}` : ''}
                  </small>
                </span>
                <span className="action-grid compact-actions">
                  {isMember && <button className="primary-button" onClick={() => setScreen('partyFinder')}>Лобби</button>}
                  {!isMember && !reason && <button onClick={() => joinPartyListing(listing.id)}>Вступить</button>}
                  {!isMember && reason && <button disabled>{reason}</button>}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
