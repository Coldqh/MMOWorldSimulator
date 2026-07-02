import { getItemById } from '../../content/items';
import { canEnhanceWithAnyStone, enhanceStoneIds } from '../../systems/enhancementSystem';
import { useGameStore } from '../../state/gameStore';
import { equipmentEntries, getInstanceGearScore } from '../../systems/itemSystem';
import type { EquipmentSlot } from '../../types/game';
import { ItemLine } from '../components/ItemLine';

const slotLabel: Record<EquipmentSlot, string> = {
  weapon: 'Оружие',
  head: 'Голова',
  chest: 'Тело',
  legs: 'Ноги',
  boots: 'Ботинки',
  ring: 'Кольцо',
  amulet: 'Амулет'
};

const chanceLabel = (level: number) => {
  if (level <= 2) return '100%';
  if (level <= 5) return '72%';
  if (level <= 8) return '45% · есть откат/слом';
  return '22% · высокий риск';
};

export const EnhanceScreen = () => {
  const server = useGameStore((state) => state.server);
  const setScreen = useGameStore((state) => state.setScreen);
  const enhanceTarget = useGameStore((state) => state.enhanceTarget);
  const openItemProfile = useGameStore((state) => state.openItemProfile);
  const inCity = server.location.mode === 'city';
  const stones = enhanceStoneIds.reduce((sum, stone) => sum + (server.player.inventory.find((entry) => entry.itemId === stone.id && (entry.enhancement ?? 0) === 0)?.amount ?? 0), 0);
  const inventoryGear = server.player.inventory.filter((entry) => Boolean(getItemById(entry.itemId)?.slot));

  if (!inCity) {
    return (
      <div className="screen-stack">
        <section className="panel hero-panel">
          <div className="section-title">🔨 Заточка</div>
          <h1>Нужен город</h1>
          <p className="muted">Заточка доступна только в городе.</p>
          <button onClick={() => setScreen('world')}>В мир</button>
        </section>
      </div>
    );
  }

  return (
    <div className="screen-stack">
      <section className="panel hero-panel premium-panel">
        <div className="section-title">🔨 Заточка</div>
        <h1>Мастер усиления</h1>
        <div className="stat-grid">
          <span>Камни {stones}</span>
          <span>+1–+3 безопасно</span>
          <span>+7 риск отката</span>
          <span>+10 риск слома</span>
        </div>
      </section>

      <section className="panel">
        <div className="section-title">Экипировка</div>
        <div className="list-lines">
          {equipmentEntries(server.player.equipment).map(({ slot, instance }) => {
            const item = getItemById(instance.itemId);
            return item ? (
              <div key={`${slot}_${instance.itemId}`} className="list-line market-line">
                <span>
                  <button className="text-button" onClick={() => openItemProfile(instance.itemId, 'equipment', instance.enhancement, instance.cardIds ?? [])}><ItemLine itemId={instance.itemId} enhancement={instance.enhancement} cardIds={instance.cardIds ?? []} /></button>
                  <small>{slotLabel[slot]} · Gear {getInstanceGearScore(item, instance.enhancement)} · шанс {chanceLabel(instance.enhancement)}</small>
                </span>
                <button disabled={!canEnhanceWithAnyStone(server, item.levelReq, item.rarity)} onClick={() => enhanceTarget({ source: 'equipment', slot })}>Заточить</button>
              </div>
            ) : null;
          })}
        </div>
      </section>

      <section className="panel">
        <div className="section-title">Инвентарь</div>
        <div className="list-lines">
          {inventoryGear.length === 0 && <span className="muted">Снаряжения нет.</span>}
          {inventoryGear.map((entry) => {
            const item = getItemById(entry.itemId);
            const enhancement = entry.enhancement ?? 0;
            return item ? (
              <div key={`${entry.itemId}_${enhancement}`} className="list-line market-line">
                <span>
                  <button className="text-button" onClick={() => openItemProfile(entry.itemId, 'inventory', enhancement, entry.cardIds ?? [])}><ItemLine itemId={entry.itemId} amount={entry.amount} enhancement={enhancement} cardIds={entry.cardIds ?? []} /></button>
                  <small>Gear {getInstanceGearScore(item, enhancement)} · шанс {chanceLabel(enhancement)}</small>
                </span>
                <button disabled={!canEnhanceWithAnyStone(server, item.levelReq, item.rarity)} onClick={() => enhanceTarget({ source: 'inventory', itemId: entry.itemId, enhancement })}>Заточить</button>
              </div>
            ) : null;
          })}
        </div>
      </section>
    </div>
  );
};
