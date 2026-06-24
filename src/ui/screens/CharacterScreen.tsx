import { CLASSES } from '../../content/classes';
import { getItemById } from '../../content/items';
import { getRaceById } from '../../content/races';
import { useGameStore } from '../../state/gameStore';
import { canEquipItem, getGearScore, getPlayerStats } from '../../systems/itemSystem';
import { xpForNextLevel } from '../../systems/progressionSystem';
import { ItemLine } from '../components/ItemLine';

const slotOrder = ['weapon', 'head', 'chest', 'legs', 'boots', 'ring', 'amulet'] as const;

const slotLabel: Record<string, string> = {
  weapon: 'Оружие',
  head: 'Голова',
  chest: 'Тело',
  legs: 'Ноги',
  boots: 'Ботинки',
  ring: 'Кольцо',
  amulet: 'Амулет',
};

const pct = (value: number, max: number) => Math.max(0, Math.min(100, Math.round((value / Math.max(1, max)) * 100)));

const ResourceBar = ({ label, value, max, kind }: { label: string; value: number; max: number; kind: 'hp' | 'mana' | 'xp' }) => (
  <div className={`resource-wrap ${kind}`}>
    <div className="resource-meta"><span>{label}</span><strong>{Math.max(0, value)}/{max}</strong></div>
    <div className="resource-track"><div className="resource-fill" style={{ width: `${pct(value, max)}%` }} /></div>
  </div>
);

const statLine = (itemId: string) => {
  const item = getItemById(itemId);
  if (!item) return '';
  return Object.entries(item.stats).map(([key, value]) => `${key.toUpperCase()} ${value && value > 0 ? '+' : ''}${value}`).join(' · ');
};

export const CharacterScreen = () => {
  const server = useGameStore((state) => state.server);
  const skipDay = useGameStore((state) => state.skipDay);
  const recoverFullHp = useGameStore((state) => state.recoverFullHp);
  const equipItem = useGameStore((state) => state.equipItem);
  const openItemProfile = useGameStore((state) => state.openItemProfile);
  const player = server.player;
  const classData = CLASSES.find((entry) => entry.id === player.classId);
  const raceData = getRaceById(player.raceId);
  const stats = getPlayerStats(player);
  const gearScore = getGearScore(player.equipment);
  const missingHp = Math.max(0, stats.hp - Math.min(player.hp, stats.hp));
  const missingMana = Math.max(0, stats.mana - Math.min(player.mana, stats.mana));
  const recoveryMinutes = Math.max(5, Math.ceil(missingHp / 4) + Math.ceil(missingMana / 8));

  return (
    <div className="screen-stack">
      <section className="panel hero-panel character-hero">
        <div className="section-title">🧍 Персонаж</div>
        <h1>{player.name}</h1>
        <p className="muted">{raceData?.name} · {classData?.name} · Lv. {player.level} · Gear {gearScore}</p>
        <div className="bar-stack">
          <ResourceBar label="HP" value={Math.min(player.hp, stats.hp)} max={stats.hp} kind="hp" />
          <ResourceBar label="Mana" value={Math.min(player.mana, stats.mana)} max={stats.mana} kind="mana" />
          <ResourceBar label="XP" value={player.xp} max={xpForNextLevel(player.level)} kind="xp" />
        </div>
        <div className="stat-grid stat-grid-compact">
          <span>Gold {player.gold}</span>
          <span>Gear {gearScore}</span>
          <span>ATK {stats.attack}</span>
          <span>MAG {stats.magic}</span>
          <span>DEF {stats.defense}</span>
          <span>SPD {stats.speed}</span>
        </div>
      </section>

      <section className="panel action-panel">
        <div className="section-title">Действия</div>
        <div className="action-grid">
          <button onClick={recoverFullHp}>Восстановить · ~{recoveryMinutes} мин</button>
          <button onClick={skipDay}>Пропустить день</button>
        </div>
      </section>


      <section className="panel">
        <div className="section-title">Действия</div>
        <div className="action-grid">
          <button onClick={recoverFullHp}>Восстановить · ~{recoveryMinutes} мин</button>
          <button onClick={skipDay}>Пропустить день</button>
        </div>
      </section>

      <section className="panel">
        <div className="section-title">Экипировка</div>
        <div className="list-lines">
          {slotOrder.map((slot) => {
            const instance = player.equipment[slot];
            return (
              <div key={slot} className="list-line gear-line">
                <span>{slotLabel[slot]}</span>
                <strong>
                  {instance ? (
                    <button className="text-button" onClick={() => openItemProfile(instance.itemId, 'equipment', instance.enhancement, instance.cardIds ?? [])}>
                      <ItemLine itemId={instance.itemId} enhancement={instance.enhancement} cardIds={instance.cardIds ?? []} showLevel />
                    </button>
                  ) : 'пусто'}
                </strong>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <div className="section-title">Инвентарь</div>
        <div className="list-lines">
          {player.inventory.length === 0 && <span className="muted">Пусто.</span>}
          {player.inventory.map((entry) => {
            const item = getItemById(entry.itemId);
            const equippable = item ? canEquipItem(player, item) : false;
            return (
              <div key={`${entry.itemId}_${entry.enhancement ?? 0}`} className="list-line item-row">
                <span>
                  <button className="text-button" onClick={() => openItemProfile(entry.itemId, 'inventory', entry.enhancement ?? 0, entry.cardIds ?? [])}>
                    <ItemLine itemId={entry.itemId} amount={entry.amount} enhancement={entry.enhancement ?? 0} cardIds={entry.cardIds ?? []} showLevel />
                  </button>
                  {item && <small>{item.slot ? ` · ${slotLabel[item.slot]}` : ''}{statLine(entry.itemId) ? ` · ${statLine(entry.itemId)}` : ''}</small>}
                </span>
                {equippable && <button onClick={() => equipItem(entry.itemId, entry.enhancement ?? 0, entry.cardIds ?? [])}>Надеть</button>}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
