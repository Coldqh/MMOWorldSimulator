import { useMemo, useState } from 'react';
import { ITEMS, rarityLabel } from '../../content/items';
import { DUNGEONS, MOBS, RAIDS } from '../../content/world';
import { useGameStore } from '../../state/gameStore';
import type { ItemDefinition, MobDefinition } from '../../types/game';
import { ItemLine } from '../components/ItemLine';

type LibraryTab = 'mobs' | 'bosses' | 'sets' | 'cards';

const rarityOrder: Record<string, number> = {
  legendary: 5,
  epic: 4,
  rare: 3,
  uncommon: 2,
  common: 1,
};

const isGear = (item: ItemDefinition) => Boolean(item.slot);
const isSetGear = (item: ItemDefinition) => isGear(item) && Boolean(item.setId);
const isBoss = (mob: MobDefinition) => mob.tags.includes('boss');

const itemKey = (item: ItemDefinition) => `${item.rarity}_${item.setId ?? 'solo'}_${item.levelReq}_${item.id}`;

export const LibraryScreen = () => {
  const server = useGameStore((state) => state.server);
  const openItemProfile = useGameStore((state) => state.openItemProfile);
  const [tab, setTab] = useState<LibraryTab>('mobs');

  const obtained = new Set(server.collectionProgress?.obtainedItemIds ?? []);
  const defeated = new Set(server.collectionProgress?.defeatedMobIds ?? []);

  const mobs = useMemo(() => MOBS.filter((mob) => !isBoss(mob)).sort((a, b) => a.level - b.level || a.name.localeCompare(b.name)), []);
  const bosses = useMemo(() => MOBS.filter(isBoss).sort((a, b) => a.level - b.level || a.name.localeCompare(b.name)), []);
  const setItems = useMemo(() => ITEMS.filter(isSetGear).sort((a, b) => a.levelReq - b.levelReq || (rarityOrder[b.rarity] ?? 0) - (rarityOrder[a.rarity] ?? 0) || a.name.localeCompare(b.name)), []);
  const cards = useMemo(() => ITEMS.filter((item) => item.type === 'card').sort((a, b) => a.levelReq - b.levelReq || (rarityOrder[b.rarity] ?? 0) - (rarityOrder[a.rarity] ?? 0) || a.name.localeCompare(b.name)), []);

  const dungeonSets = useMemo(() => {
    const content = [...DUNGEONS, ...RAIDS];
    return content.map((entry) => {
      const related = ITEMS.filter((item) => item.setId && item.setId.includes(entry.id));
      return { entry, related };
    }).filter((row) => row.related.length > 0);
  }, []);

  const renderMob = (mob: MobDefinition) => (
    <div key={mob.id} className={`list-line library-row ${defeated.has(mob.id) ? 'known-row' : ''}`}>
      <span>{defeated.has(mob.id) ? '✓' : '○'} {mob.name}</span>
      <strong>Lv. {mob.level} · HP {mob.stats.hp} · {mob.tags.join(', ')}</strong>
    </div>
  );

  const renderItem = (item: ItemDefinition) => (
    <div key={item.id} className={`list-line library-row ${obtained.has(item.id) ? 'known-row' : ''}`}>
      <button className="text-button" onClick={() => openItemProfile(item.id, 'loot', 0, [])}>
        {obtained.has(item.id) ? '✓' : '○'} <ItemLine itemId={item.id} showLevel />
      </button>
      <strong>{item.slot ?? item.type} · {item.classTags.length ? item.classTags.join('/') : 'all'} · {rarityLabel[item.rarity]}</strong>
    </div>
  );

  return (
    <div className="screen-stack">
      <section className="panel hero-panel">
        <div className="section-title">📚 Библиотека</div>
        <h1>Серверная база</h1>
        <p className="muted">✓ — уже встречал или получал.</p>
        <div className="tab-row">
          <button className={tab === 'mobs' ? 'active' : ''} onClick={() => setTab('mobs')}>Мобы</button>
          <button className={tab === 'bosses' ? 'active' : ''} onClick={() => setTab('bosses')}>Боссы</button>
          <button className={tab === 'sets' ? 'active' : ''} onClick={() => setTab('sets')}>Сеты</button>
          <button className={tab === 'cards' ? 'active' : ''} onClick={() => setTab('cards')}>Карты</button>
        </div>
      </section>

      {tab === 'mobs' && <section className="panel"><div className="section-title">Мобы</div><div className="list-lines">{mobs.map(renderMob)}</div></section>}
      {tab === 'bosses' && <section className="panel"><div className="section-title">Боссы</div><div className="list-lines">{bosses.map(renderMob)}</div></section>}
      {tab === 'sets' && (
        <>
          <section className="panel">
            <div className="section-title">Сеты</div>
            <div className="list-lines">{setItems.map(renderItem)}</div>
          </section>
          <section className="panel">
            <div className="section-title">Сеты подземелий и рейдов</div>
            <div className="list-lines">
              {dungeonSets.map(({ entry, related }) => (
                <div key={entry.id} className="library-set-block">
                  <strong>{entry.name} · Lv. {entry.levelRange[0]}–{entry.levelRange[1]}</strong>
                  <span>{related.length} предметов</span>
                  <div className="compact-token-list">
                    {related.slice(0, 18).map((item) => (
                      <button key={item.id} className="text-button small-token" onClick={() => openItemProfile(item.id, 'loot', 0, [])}>
                        {obtained.has(item.id) ? '✓' : '○'} {item.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
      {tab === 'cards' && <section className="panel"><div className="section-title">Карты</div><div className="list-lines">{cards.map(renderItem)}</div></section>}
    </div>
  );
};
