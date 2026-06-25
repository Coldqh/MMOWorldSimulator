import { getClassById } from '../../content/classes';
import { getItemById, rarityLabel } from '../../content/items';
import { useGameStore } from '../../state/gameStore';
import { getInstanceGearScore } from '../../systems/itemSystem';

const choiceLabel: Record<string, string> = {
  need: 'Нужно',
  want: 'Хочу',
  pass: 'Отказ',
};

const statLines = (itemId: string) => {
  const item = getItemById(itemId);
  if (!item) return [];
  return Object.entries(item.stats).map(([key, value]) => `${key.toUpperCase()} ${Number(value) >= 0 ? '+' : ''}${value}`);
};

const cardSummary = (cardIds: string[]) => cardIds
  .map((id) => {
    const card = getItemById(id);
    if (!card || card.type !== 'card') return id;
    const stats = Object.entries(card.stats).map(([key, value]) => `${key.toUpperCase()} ${Number(value) >= 0 ? '+' : ''}${value}`).join(' ');
    return `${card.name}${stats ? ` (${stats})` : ''}`;
  })
  .join(' · ');

const splitLine = (line: string) => {
  const clean = line.replace(/\.$/, '');
  const idx = clean.indexOf(':');
  if (idx <= 0) return { key: '', value: clean };
  return { key: clean.slice(0, idx), value: clean.slice(idx + 1).trim() };
};

const ProfileGrid = ({ lines }: { lines: string[] }) => (
  <div className="profile-grid-modal">
    {lines.map((line, index) => {
      const pair = splitLine(line);
      return (
        <div key={`${line}_${index}`} className="profile-cell">
          {pair.key && <span>{pair.key}</span>}
          <strong>{pair.value}</strong>
        </div>
      );
    })}
  </div>
);

export const ResultModal = () => {
  const modal = useGameStore((state) => state.modal);
  const server = useGameStore((state) => state.server);
  const closeModal = useGameStore((state) => state.closeModal);
  const resolveLootRoll = useGameStore((state) => state.resolveLootRoll);
  const enhanceTarget = useGameStore((state) => state.enhanceTarget);
  const openItemProfile = useGameStore((state) => state.openItemProfile);
  const socketCard = useGameStore((state) => state.socketCard);
  const openGuildProfile = useGameStore((state) => state.openGuildProfile);
  const openGuildRoster = useGameStore((state) => state.openGuildRoster);
  const pendingLoot = server.pendingLootRoll;

  if (!modal && !pendingLoot) return null;

  if (pendingLoot) {
    const item = getItemById(pendingLoot.itemId);
    const ownClass = item?.classTags.length === 0 || item?.classTags.includes(server.player.classId);
    const classText = item?.classTags.length ? item.classTags.map((id) => getClassById(id)?.name ?? id).join(', ') : 'любой';
    return (
      <div className="modal-backdrop" role="presentation">
        <section className={`result-modal loot-modal full-window-modal rarity-border-${item?.rarity ?? 'common'}`} role="dialog" aria-modal="true">
          <div className="modal-header-line">
            <div>
              <div className="section-title">🎲 Групповой ролл</div>
              <h2>Выпала шмотка</h2>
            </div>
            <span className="modal-badge">{pendingLoot.source === 'raid' ? 'рейд' : 'данж'}</span>
          </div>

          {item && (
            <button className="loot-item-hero" onClick={() => openItemProfile(item.id, 'loot', 0)}>
              <span className={`rarity rarity-${item.rarity}`}>{item.name}</span>
              <small>{rarityLabel[item.rarity]} · Lv. {item.levelReq} · Gear {getInstanceGearScore(item, 0)}</small>
            </button>
          )}

          {item && (
            <div className="profile-grid-modal item-profile-grid">
              <div className="profile-cell"><span>Класс</span><strong>{classText}</strong></div>
              <div className="profile-cell"><span>Слот</span><strong>{item.slot ?? 'нет'}</strong></div>
              <div className="profile-cell"><span>Бонусы</span><strong>{statLines(item.id).join(' · ') || 'нет'}</strong></div>
              <div className="profile-cell"><span>Выбор</span><strong>{ownClass ? 'Need доступен' : 'Need закрыт'}</strong></div>
            </div>
          )}

          <div className="loot-choice-grid full-roll-actions">
            <button className="primary-button" onClick={() => resolveLootRoll('need')} disabled={!ownClass}>{choiceLabel.need}</button>
            <button onClick={() => resolveLootRoll('want')}>{choiceLabel.want}</button>
            <button className="ghost-button" onClick={() => resolveLootRoll('pass')}>{choiceLabel.pass}</button>
          </div>
        </section>
      </div>
    );
  }

  if (!modal) return null;
  const reward = modal.reward;
  const actionLines = modal.lines?.filter((line) => line.startsWith('ACTION_')) ?? [];
  const visibleLines = modal.lines?.filter((line) => !line.startsWith('ACTION_')) ?? [];
  const enhanceAction = actionLines.find((line) => line.startsWith('ACTION_ENHANCE_INVENTORY:'));
  const enhanceParts = enhanceAction?.split(':');
  const socketState = actionLines.find((line) => line.startsWith('ACTION_SOCKET_STATE:'));
  const socketActions = actionLines.filter((line) => line.startsWith('ACTION_SOCKET_') && !line.startsWith('ACTION_SOCKET_STATE:'));
  const npcItemActions = actionLines.filter((line) => line.startsWith('ACTION_NPC_ITEM|'));
  const guildAction = actionLines.find((line) => line.startsWith('ACTION_GUILD_PROFILE:'));
  const guildRosterAction = actionLines.find((line) => line.startsWith('ACTION_GUILD_ROSTER:'));
  const profileMode = modal.type === 'item' || modal.type === 'npc' || modal.type === 'loot';

  return (
    <div className="modal-backdrop" role="presentation">
      <section className={`result-modal full-window-modal ${modal.type === 'death' ? 'death-modal' : ''} ${modal.type === 'item' ? 'item-modal' : ''} ${modal.type === 'npc' ? 'npc-modal' : ''} ${modal.rarity ? `rarity-border-${modal.rarity}` : ''}`} role="dialog" aria-modal="true">
        <div className="modal-header-line">
          <div>
            <div className="section-title">
              {modal.type === 'death' ? '☠️ Смерть' : modal.type === 'item' ? '🎒 Предмет' : modal.type === 'npc' ? '👤 Игрок' : modal.type === 'enhance' ? '🔨 Заточка' : modal.type === 'loot' ? '🎲 Ролл' : 'Итог'}
            </div>
            <h2>{modal.title}</h2>
          </div>
          <button className="small-close" onClick={closeModal}>×</button>
        </div>
        <p className="muted modal-subtitle">{modal.text}</p>

        {reward && (
          <div className="reward-grid">
            <div className="reward-box"><span>Опыт</span><strong>+{reward.xp}</strong></div>
            <div className="reward-box"><span>Золото</span><strong>+{reward.gold}</strong></div>
          </div>
        )}

        {reward && (
          <div className="modal-section">
            <div className="section-title">Добыча</div>
            {reward.items.length === 0 ? <p className="muted">Шмотки не выпали.</p> : (
              <div className="loot-card-list">
                {reward.items.map((entry) => {
                  const item = getItemById(entry.itemId);
                  return (
                    <button key={`${entry.itemId}_${entry.enhancement ?? 0}`} className="loot-card-button" onClick={() => openItemProfile(entry.itemId, 'loot', entry.enhancement ?? 0)}>
                      <span className={`rarity rarity-${item?.rarity ?? 'common'}`}>{item?.name ?? entry.itemId}{entry.enhancement ? ` +${entry.enhancement}` : ''}</span>
                      <small>{entry.amount > 1 ? `×${entry.amount}` : rarityLabel[item?.rarity ?? 'common']}</small>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {visibleLines.length > 0 && (
          <div className="modal-section">
            <div className="section-title">{profileMode ? 'Профиль' : 'События'}</div>
            {profileMode ? <ProfileGrid lines={visibleLines} /> : (
              <div className="modal-lines card-lines">
                {visibleLines.map((line, index) => <div key={`${line}_${index}`}>{line}</div>)}
              </div>
            )}
          </div>
        )}

        {guildAction && (() => {
          const [, guildId, guildName] = guildAction.split(':');
          return <button className="wide-button" onClick={() => openGuildProfile(guildId)}>Гильдия: {guildName}</button>;
        })()}

        {guildRosterAction && (() => {
          const [, guildId] = guildRosterAction.split(':');
          return <button className="wide-button" onClick={() => openGuildRoster(guildId)}>Ростер</button>;
        })()}

        {npcItemActions.length > 0 && (
          <div className="modal-section">
            <div className="section-title">Экипировка</div>
            <div className="loot-card-list">
              {npcItemActions.map((line) => {
                const [, itemId, enhancementRaw, rarityRaw, label, cardsRaw] = line.split('|');
                const profileNpc = modal.type === 'npc' ? server.npcs.find((npc) => npc.name === modal.title) : undefined;
                const inferredCards = profileNpc
                  ? Object.values(profileNpc.equipment ?? {}).find((instance) => instance?.itemId === itemId && String(instance.enhancement ?? 0) === String(enhancementRaw ?? 0))?.cardIds ?? []
                  : [];
                const cardIds = cardsRaw && cardsRaw !== '-' ? cardsRaw.split(',').filter(Boolean) : inferredCards;
                return (
                  <button key={line} className={`loot-card-button rarity-border-${rarityRaw}`} onClick={() => openItemProfile(itemId, 'loot', Number(enhancementRaw ?? 0), cardIds)}>
                    <span>{label}{cardIds.length > 0 ? ` · 🃏${cardIds.length}` : ''}</span>
                    {cardIds.length > 0 && <small>{cardSummary(cardIds)}</small>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {socketState && (() => {
          const [, cardsRaw, totalRaw] = socketState.split(':');
          const total = Number(totalRaw ?? 0);
          const cards = cardsRaw === '-' ? [] : cardsRaw.split(',').filter(Boolean);
          return (
            <div className="modal-section">
              <div className="section-title">Слоты карт</div>
              <div className="socket-row">
                {Array.from({ length: total }).map((_, index) => {
                  const card = cards[index] ? getItemById(cards[index]) : undefined;
                  return <span key={index} className={`socket-box ${card ? `filled rarity-bg-${card.rarity}` : ''}`}>{card ? '◆' : ''}</span>;
                })}
              </div>
              {cards.length > 0 && <p className="muted">{cardSummary(cards)}</p>}
            </div>
          );
        })()}

        {socketActions.length > 0 && (
          <div className="modal-section">
            <div className="section-title">Доступные карты</div>
            <div className="loot-card-list">
              {socketActions.map((line) => {
                const parts = line.split(':');
                if (parts[0] === 'ACTION_SOCKET_EQUIPMENT') {
                  const [, slot, cardId, cardName] = parts;
                  return <button key={line} className="loot-card-button" onClick={() => socketCard('equipment', slot, cardId)}>Вставить: {cardName}</button>;
                }
                const [, itemId, enhancementRaw, cardIdsRaw, cardId, cardName] = parts;
                const cardIds = cardIdsRaw === '-' ? [] : cardIdsRaw.split(',').filter(Boolean);
                return <button key={line} className="loot-card-button" onClick={() => socketCard('inventory', itemId, cardId, Number(enhancementRaw ?? 0), cardIds)}>Вставить: {cardName}</button>;
              })}
            </div>
          </div>
        )}

        {enhanceParts && enhanceParts.length >= 3 && (
          <button className="primary-button wide-button" onClick={() => enhanceTarget({ source: 'inventory', itemId: enhanceParts[1], enhancement: Number(enhanceParts[2] ?? 0) })}>Заточить</button>
        )}
        <button className="wide-button" onClick={closeModal}>Закрыть</button>
      </section>
    </div>
  );
};
