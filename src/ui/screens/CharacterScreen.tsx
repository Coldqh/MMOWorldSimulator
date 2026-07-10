import { useMemo, useState } from 'react';
import { CLASSES } from '../../content/classes';
import { getItemById } from '../../content/items';
import { getRaceById } from '../../content/races';
import { useGameStore } from '../../state/gameStore';
import { canEquipItem, getGearScore, getPlayerStats } from '../../systems/itemSystem';
import { ACTIVITY_CURRENCY_LABELS, ACTIVITY_CURRENCY_ORDER, getActivityCurrencyAmount } from '../../systems/activityCurrencySystem';
import { xpForNextLevel } from '../../systems/progressionSystem';
import { ItemLine } from '../components/ItemLine';

const slotOrder = ['weapon', 'head', 'chest', 'legs', 'boots', 'ring', 'amulet'] as const;

type InventoryFilter = 'all' | 'equipment' | 'card' | 'consumable' | 'material';

const slotLabel: Record<string, string> = {
  weapon: 'Оружие',
  head: 'Шлем',
  chest: 'Нагрудник',
  legs: 'Поножи',
  boots: 'Сапоги',
  ring: 'Кольцо',
  amulet: 'Амулет',
};

const slotIcon: Record<string, string> = {
  weapon: '⚔',
  head: '◒',
  chest: '⬡',
  legs: '▥',
  boots: '◣',
  ring: '◉',
  amulet: '◇',
};

const currencyIcon: Record<string, string> = {
  dungeonMarks: '◆',
  raidSeals: '♜',
  arenaHonor: '✦',
  warCrests: '♛',
};

const pct = (value: number, max: number) => Math.max(0, Math.min(100, Math.round((value / Math.max(1, max)) * 100)));

const ResourceBar = ({ label, value, max, kind }: { label: string; value: number; max: number; kind: 'hp' | 'mana' | 'xp' }) => (
  <div className={`resource-wrap ${kind}`}>
    <div className="resource-meta">
      <span>{label}</span>
      <strong>{Math.max(0, value).toLocaleString('ru-RU')}<i>/</i>{max.toLocaleString('ru-RU')}</strong>
    </div>
    <div className="resource-track" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.max(0, value)}>
      <div className="resource-fill" style={{ width: `${pct(value, max)}%` }} />
    </div>
  </div>
);

const statLine = (itemId: string) => {
  const item = getItemById(itemId);
  if (!item) return '';
  return Object.entries(item.stats)
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => `${key.toUpperCase()} ${value && value > 0 ? '+' : ''}${value}`)
    .join(' · ');
};

export const CharacterScreen = () => {
  const server = useGameStore((state) => state.server);
  const skipHour = useGameStore((state) => state.skipHour);
  const skipDay = useGameStore((state) => state.skipDay);
  const recoverFullHp = useGameStore((state) => state.recoverFullHp);
  const equipItem = useGameStore((state) => state.equipItem);
  const openItemProfile = useGameStore((state) => state.openItemProfile);
  const [inventoryFilter, setInventoryFilter] = useState<InventoryFilter>('all');
  const player = server.player;
  const classData = CLASSES.find((entry) => entry.id === player.classId);
  const raceData = getRaceById(player.raceId);
  const stats = getPlayerStats(player);
  const gearScore = getGearScore(player.equipment);
  const missingHp = Math.max(0, stats.hp - Math.min(player.hp, stats.hp));
  const missingMana = Math.max(0, stats.mana - Math.min(player.mana, stats.mana));
  const missingHpPercent = missingHp / Math.max(1, stats.hp);
  const missingManaPercent = missingMana / Math.max(1, stats.mana);
  const recoveryMinutes = Math.max(5, Math.min(60, Math.ceil(Math.max(missingHpPercent, missingManaPercent) * 60)));
  const initials = player.name.slice(0, 2).toUpperCase();

  const filteredInventory = useMemo(() => {
    if (inventoryFilter === 'all') return player.inventory;
    return player.inventory.filter((entry) => {
      const item = getItemById(entry.itemId);
      if (!item) return false;
      if (inventoryFilter === 'equipment') return Boolean(item.slot);
      return item.type === inventoryFilter;
    });
  }, [inventoryFilter, player.inventory]);

  return (
    <div className="screen-stack character-screen">
      <section className="panel hero-panel character-hero">
        <div className="character-identity">
          <div className="character-avatar-wrap">
            <div className="character-avatar">{initials}</div>
            <span className="level-orbit">{player.level}</span>
          </div>
          <div className="character-copy">
            <div className="section-title">ПРОФИЛЬ ПЕРСОНАЖА</div>
            <h1>{player.name}</h1>
            <p>{raceData?.name} · {classData?.name}</p>
            <div className="character-badges">
              <span>Lv. {player.level}</span>
              <span className="accent">GS {gearScore.toLocaleString('ru-RU')}</span>
              <span>{player.gold.toLocaleString('ru-RU')} G</span>
            </div>
          </div>
        </div>

        <div className="character-resources">
          <ResourceBar label="HP" value={Math.min(player.hp, stats.hp)} max={stats.hp} kind="hp" />
          <ResourceBar label="MANA" value={Math.min(player.mana, stats.mana)} max={stats.mana} kind="mana" />
          <ResourceBar label="ОПЫТ" value={player.xp} max={xpForNextLevel(player.level)} kind="xp" />
        </div>

        <div className="combat-stat-grid">
          <div className="combat-stat"><span>ATK</span><strong>{stats.attack}</strong><small>Физический урон</small></div>
          <div className="combat-stat"><span>MAG</span><strong>{stats.magic}</strong><small>Сила магии</small></div>
          <div className="combat-stat"><span>DEF</span><strong>{stats.defense}</strong><small>Защита</small></div>
          <div className="combat-stat"><span>SPD</span><strong>{stats.speed}</strong><small>Скорость</small></div>
        </div>
      </section>

      <section className="panel action-panel quick-action-panel">
        <div className="panel-heading">
          <div>
            <div className="section-title">БЫСТРЫЕ ДЕЙСТВИЯ</div>
            <h2>Управление временем</h2>
          </div>
          <span className="panel-kicker">День {server.serverDay}</span>
        </div>
        <div className="quick-action-grid">
          <button className="quick-action primary-button" onClick={recoverFullHp}>
            <span className="quick-action-icon">＋</span>
            <span><strong>Восстановиться</strong><small>около {recoveryMinutes} минут</small></span>
          </button>
          <button className="quick-action" onClick={skipHour}>
            <span className="quick-action-icon">◷</span>
            <span><strong>Пропустить час</strong><small>мир продолжит жить</small></span>
          </button>
          <button className="quick-action" onClick={skipDay}>
            <span className="quick-action-icon">☼</span>
            <span><strong>Пропустить день</strong><small>полная симуляция сервера</small></span>
          </button>
        </div>
      </section>

      <section className="panel currency-panel">
        <div className="panel-heading compact">
          <div>
            <div className="section-title">Валюты активностей</div>
            <h2>Боевые ресурсы</h2>
          </div>
        </div>
        <div className="currency-grid">
          {ACTIVITY_CURRENCY_ORDER.map((key) => (
            <div className={`currency-card currency-${key}`} key={key}>
              <span className="currency-icon">{currencyIcon[key]}</span>
              <span><small>{ACTIVITY_CURRENCY_LABELS[key]}</small><strong>{getActivityCurrencyAmount(player, key).toLocaleString('ru-RU')}</strong></span>
            </div>
          ))}
        </div>
      </section>

      <div className="character-content-grid">
        <section className="panel equipment-panel">
          <div className="panel-heading compact">
            <div>
              <div className="section-title">ЭКИПИРОВКА</div>
              <h2>Боевой комплект</h2>
            </div>
            <span className="panel-kicker">GS {gearScore.toLocaleString('ru-RU')}</span>
          </div>
          <div className="equipment-grid">
            {slotOrder.map((slot) => {
              const instance = player.equipment[slot];
              const item = instance ? getItemById(instance.itemId) : undefined;
              return (
                <button
                  key={slot}
                  className={`equipment-slot ${instance ? `filled rarity-border-${item?.rarity ?? 'common'}` : 'empty'}`}
                  onClick={() => instance && openItemProfile(instance.itemId, 'equipment', instance.enhancement, instance.cardIds ?? [])}
                  disabled={!instance}
                >
                  <span className="equipment-slot-icon">{slotIcon[slot]}</span>
                  <span className="equipment-slot-copy">
                    <small>{slotLabel[slot]}</small>
                    <strong>{instance ? <ItemLine itemId={instance.itemId} enhancement={instance.enhancement} cardIds={instance.cardIds ?? []} /> : 'Пустой слот'}</strong>
                    {item && <em>Lv. {item.levelReq}{instance?.cardIds?.length ? ` · карт ${instance.cardIds.length}` : ''}</em>}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="panel inventory-panel">
          <div className="panel-heading compact">
            <div>
              <div className="section-title">ИНВЕНТАРЬ</div>
              <h2>Хранилище</h2>
            </div>
            <span className="panel-kicker">{player.inventory.length} поз.</span>
          </div>

          <div className="chip-row inventory-filters">
            {([
              ['all', 'Все'],
              ['equipment', 'Снаряжение'],
              ['card', 'Карты'],
              ['consumable', 'Расходники'],
              ['material', 'Материалы'],
            ] as const).map(([id, label]) => (
              <button key={id} className={inventoryFilter === id ? 'active' : ''} onClick={() => setInventoryFilter(id)}>{label}</button>
            ))}
          </div>

          <div className="inventory-list">
            {filteredInventory.length === 0 && <div className="empty-state"><span>◇</span><strong>Ничего не найдено</strong><small>Попробуй другой фильтр.</small></div>}
            {filteredInventory.map((entry) => {
              const item = getItemById(entry.itemId);
              const equippable = item ? canEquipItem(player, item) : false;
              return (
                <article key={`${entry.itemId}_${entry.enhancement ?? 0}_${(entry.cardIds ?? []).join('_')}`} className={`inventory-row rarity-border-${item?.rarity ?? 'common'}`}>
                  <button className="inventory-item-main" onClick={() => openItemProfile(entry.itemId, 'inventory', entry.enhancement ?? 0, entry.cardIds ?? [])}>
                    <span className={`item-orb rarity-bg-${item?.rarity ?? 'common'}`}>{item?.slot ? slotIcon[item.slot] : item?.type === 'card' ? '◆' : '◇'}</span>
                    <span className="inventory-item-copy">
                      <strong><ItemLine itemId={entry.itemId} amount={entry.amount} enhancement={entry.enhancement ?? 0} cardIds={entry.cardIds ?? []} showLevel /></strong>
                      {item && <small>{item.slot ? slotLabel[item.slot] : item.type}{statLine(entry.itemId) ? ` · ${statLine(entry.itemId)}` : ''}</small>}
                    </span>
                  </button>
                  {equippable && <button className="inventory-equip-button" onClick={() => equipItem(entry.itemId, entry.enhancement ?? 0, entry.cardIds ?? [])}>Надеть</button>}
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};
