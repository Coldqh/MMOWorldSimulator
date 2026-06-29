import { useEffect, useMemo, useState } from 'react';
import { useGameStore } from '../../state/gameStore';
import type { PartyListingVisibility } from '../../types/game';
import { buildPartyFinderViewModel, type PartyFinderFilter, partyFinderTimeLabel } from '../selectors/partyFinderSelectors';

const FilterButton = ({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) => (
  <button className={active ? 'active' : ''} onClick={onClick}>{label}</button>
);

export const PartyFinderScreen = () => {
  const server = useGameStore((state) => state.server);
  const refreshPartyFinder = useGameStore((state) => state.refreshPartyFinder);
  const createPartyListing = useGameStore((state) => state.createPartyListing);
  const joinPartyListing = useGameStore((state) => state.joinPartyListing);
  const setScreen = useGameStore((state) => state.setScreen);
  const [filter, setFilter] = useState<PartyFinderFilter>('all');
  const [selectedId, setSelectedId] = useState('');
  const [visibility, setVisibility] = useState<PartyListingVisibility>('public');

  const view = useMemo(
    () => buildPartyFinderViewModel(server, { filter, selectedId, visibility }),
    [server, filter, selectedId, visibility],
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
        <p className="muted">{partyFinderTimeLabel(server.serverDay, server.currentMinute)} · активных заявок: {server.partyFinderListings?.length ?? 0}</p>
        <p className="muted">Доступные группы и инстансы сверху: от высокого уровня к низкому. Недоступные ниже.</p>
        <div className="stat-grid stat-grid-compact">
          <span>Твоя роль: {view.playerRoleLabel}</span>
          <span>Lv. {server.player.level}</span>
          <span>Gear {view.playerGear}</span>
          <span>{server.player.guildId ? `Гильдия: ${view.guildName}` : 'Без гильдии'}</span>
        </div>
      </section>

      <section className="panel action-panel">
        <div className="section-title">Создать заявку</div>
        <div className="action-grid">
          <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
            {view.instances.map((dungeon) => {
              const locked = server.player.level < dungeon.levelRange[0];
              return (
                <option key={dungeon.id} value={dungeon.id}>
                  {dungeon.name} · {(dungeon.contentType ?? 'dungeon') === 'raid' ? 'Рейд' : 'Данж'} · Lv. {dungeon.levelRange[0]}-{dungeon.levelRange[1]}{locked ? ' · locked' : ''}
                </option>
              );
            })}
          </select>
          <select value={visibility} onChange={(event) => setVisibility(event.target.value as PartyListingVisibility)} disabled={!server.player.guildId}>
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
