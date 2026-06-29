import { useEffect, useMemo, useState } from 'react';
import { useGameStore } from '../../state/gameStore';
import type { ServerState } from '../../types/game';
import { buildPartyFinderViewModel, type PartyFinderFilter, partyFinderTimeLabel } from '../selectors/partyFinderSelectors';

const FilterButton = ({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) => (
  <button className={active ? 'active' : ''} onClick={onClick}>{label}</button>
);

type CreatePartyVisibility = 'public' | 'guild_internal';

export const PartyFinderScreen = () => {
  const player = useGameStore((state) => state.server.player);
  const partyFinderListings = useGameStore((state) => state.server.partyFinderListings);
  const npcs = useGameStore((state) => state.server.npcs);
  const guilds = useGameStore((state) => state.server.guilds);
  const currentDungeonRun = useGameStore((state) => state.server.currentDungeonRun);
  const currentPartyListingId = useGameStore((state) => state.server.currentPartyListingId);
  const serverDay = useGameStore((state) => state.server.serverDay);
  const currentMinute = useGameStore((state) => state.server.currentMinute);
  const refreshPartyFinder = useGameStore((state) => state.refreshPartyFinder);
  const createPartyListing = useGameStore((state) => state.createPartyListing);
  const joinPartyListing = useGameStore((state) => state.joinPartyListing);
  const setScreen = useGameStore((state) => state.setScreen);
  const [filter, setFilter] = useState<PartyFinderFilter>('all');
  const [selectedId, setSelectedId] = useState('');
  const [visibility, setVisibility] = useState<CreatePartyVisibility>('public');

  const viewServer = useMemo(() => ({
    player,
    partyFinderListings,
    npcs,
    guilds,
    currentDungeonRun,
    currentPartyListingId,
    serverDay,
    currentMinute,
  } as ServerState), [player, partyFinderListings, npcs, guilds, currentDungeonRun, currentPartyListingId, serverDay, currentMinute]);

  const view = useMemo(
    () => buildPartyFinderViewModel(viewServer, { filter, selectedId, visibility }),
    [viewServer, filter, selectedId, visibility],
  );

  useEffect(() => {
    if (selectedId) return;
    if (view.highestAvailableId) setSelectedId(view.highestAvailableId);
  }, [selectedId, view.highestAvailableId]);

  return (
    <div className="screen-stack">
      <section className="panel hero-panel">
        <div className="section-title">👥 Поиск пати</div>
        <h1>Party Finder</h1>
        <p className="muted">{partyFinderTimeLabel(serverDay, currentMinute)} · активных заявок: {partyFinderListings?.length ?? 0}</p>
        <p className="muted">Доступные группы и инстансы сверху: от высокого уровня к низкому. Недоступные ниже.</p>
        <div className="stat-grid stat-grid-compact">
          <span>Твоя роль: {view.playerRoleLabel}</span>
          <span>Lv. {player.level}</span>
          <span>Gear {view.playerGear}</span>
          <span>{player.guildId ? `Гильдия: ${view.guildName}` : 'Без гильдии'}</span>
        </div>
      </section>

      <section className="panel action-panel">
        <div className="section-title">Создать заявку</div>
        <div className="action-grid">
          <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
            {view.instances.map((dungeon) => {
              const locked = player.level < dungeon.levelRange[0];
              return (
                <option key={dungeon.id} value={dungeon.id}>
                  {dungeon.name} · {(dungeon.contentType ?? 'dungeon') === 'raid' ? 'Рейд' : 'Данж'} · Lv. {dungeon.levelRange[0]}-{dungeon.levelRange[1]}{locked ? ' · locked' : ''}
                </option>
              );
            })}
          </select>
          <select value={visibility} onChange={(event) => setVisibility(event.target.value as CreatePartyVisibility)} disabled={!player.guildId}>
            <option value="public">Публичная</option>
            <option value="guild_internal">Гильдейская</option>
          </select>
          <button className="primary-button" onClick={() => selectedId && createPartyListing(selectedId, visibility)} disabled={Boolean(view.createReason)}>
            {view.createReason || 'Создать группу'}
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
          {view.listings.length === 0 && <span className="muted">Заявок нет.</span>}
          {view.listings.map((entry) => {
            const listing = entry.listing;
            return (
              <div key={listing.id} className={`list-line item-row rarity-border-${listing.contentType === 'raid' ? 'legendary' : 'epic'}`}>
                <span>
                  <strong>{entry.dungeonName}</strong>
                  <small>
                    {entry.typeLabel} · {entry.visibilityLabel} · {entry.memberCount}/{entry.maxMembers} · {listing.status}
                  </small>
                  <small>{entry.roleText}</small>
                  <small>лидер: {entry.leaderName} · гильдия: {entry.guildName}</small>
                  <small>{entry.levelText}</small>
                </span>
                <span className="action-grid compact-actions">
                  {entry.isMember && <button className="primary-button" onClick={() => setScreen('partyFinder')}>Лобби</button>}
                  {!entry.isMember && !entry.reason && <button onClick={() => joinPartyListing(listing.id)}>Вступить</button>}
                  {!entry.isMember && entry.reason && <button disabled>{entry.reason}</button>}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
