import { useMemo, useState } from 'react';
import { ITEMS, rarityLabel } from '../../content/items';
import { DUNGEONS, MOBS, RAIDS } from '../../content/world';
import { useGameStore } from '../../state/gameStore';
import type { ItemDefinition, MobDefinition } from '../../types/game';
import { ItemLine } from '../components/ItemLine';

type LibraryTab = 'mobs' | 'bosses' | 'sets' | 'cards';

const rarityOrder: Record<string, number> = {
  legendary: 6,
  unique: 6,
  mythic: 6,
  epic: 5,
  rare: 4,
  uncommon: 3,
  common: 2,
};

const classLabel: Record<string, string> = {
  warrior: 'Воин',
  ranger: 'Стрелок',
  mage: 'Маг',
  priest: 'Жрец',
};

const classOrder = ['warrior', 'ranger', 'mage', 'priest'];
const isGear = (item: ItemDefinition) => Boolean(item.slot);
const isSetGear = (item: ItemDefinition) => isGear(item) && Boolean(item.setId);
const isBoss = (mob: MobDefinition) => mob.tags.includes('boss');

const regularSetFamilyName = (items: ItemDefinition[]) => {
  const sample = items[0];
  if (!sample) return 'Сет';
  const name = sample.name.replace(/^(Оружие|Шлем|Кираса|Поножи|Сапоги|Кольцо|Амулет)\s+/, '');
  return name.replace(/\s+(Воина|Стрелка|Мага|Жреца)$/i, '');
};

const setSortValue = (items: ItemDefinition[]) => {
  const sample = items[0];
  return (sample?.levelReq ?? 1) * 10 + (rarityOrder[sample?.rarity ?? 'common'] ?? 0);
};

export const LibraryScreen = () => {
  const server = useGameStore((state) => state.server);
  const openItemProfile = useGameStore((state) => state.openItemProfile);
  const [tab, setTab] = useState<LibraryTab>('mobs');
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  const obtained = new Set(server.collectionProgress?.obtainedItemIds ?? []);
  const defeated = new Set(server.collectionProgress?.defeatedMobIds ?? []);

  const mobs = useMemo(() => MOBS.filter((mob) => !isBoss(mob)).sort((a, b) => a.level - b.level || a.name.localeCompare(b.name)), []);
  const bosses = useMemo(() => MOBS.filter(isBoss).sort((a, b) => a.level - b.level || a.name.localeCompare(b.name)), []);
  const cards = useMemo(() => ITEMS.filter((item) => item.type === 'card').sort((a, b) => a.levelReq - b.levelReq || (rarityOrder[b.rarity] ?? 0) - (rarityOrder[a.rarity] ?? 0) || a.name.localeCompare(b.name)), []);

  const setGroups = useMemo(() => {
    const groups = new Map<string, ItemDefinition[]>();
    ITEMS.filter(isSetGear).forEach((item) => {
      const key = item.setId ?? item.id;
      groups.set(key, [...(groups.get(key) ?? []), item]);
    });
    return Array.from(groups.entries())
      .map(([setId, items]) => ({ setId, items: items.sort((a, b) => (a.slot ?? '').localeCompare(b.slot ?? '')) }))
      .sort((a, b) => setSortValue(a.items) - setSortValue(b.items) || regularSetFamilyName(a.items).localeCompare(regularSetFamilyName(b.items)));
  }, []);

  const selectedSet = selectedSetId ? setGroups.find((entry) => entry.setId === selectedSetId) : null;
  const selectedIsRegular = selectedSet ? /^(common|uncommon|rare|epic)_(warrior|ranger|mage|priest)_\d+$/.test(selectedSet.setId) : false;
  const selectedSetRoot = selectedSetId?.replace(/^(common|uncommon|rare|epic)_(warrior|ranger|mage|priest)_(\d+)$/, '$1_$3') ?? '';
  const regularVariations = selectedIsRegular ? setGroups.filter((entry) => entry.setId.replace(/^(common|uncommon|rare|epic)_(warrior|ranger|mage|priest)_(\d+)$/, '$1_$3') === selectedSetRoot) : [];

  const dungeonSets = useMemo(() => {
    const content = [...DUNGEONS, ...RAIDS];
    return content.map((entry) => {
      const related = ITEMS.filter((item) => item.setId && item.setId.includes(entry.id.replace('_first_raid', '').replace('_cellar', '').replace('_crypt', '').replace('_watch', '')));
      const byLoot = ITEMS.filter((item) => item.setId && (item.setId.includes(entry.id) || item.setId.includes(entry.bossMobId) || item.setId.includes(entry.lootTableId.replace('lt_', '').replace('_raid', '').replace('_dungeon', ''))));
      const merged = Array.from(new Map([...related, ...byLoot].map((item) => [item.id, item])).values());
      return { entry, related: merged };
    }).filter((row) => row.related.length > 0);
  }, []);

  const renderMob = (mob: MobDefinition) => (
    <div key={mob.id} className={`list-line library-row ${defeated.has(mob.id) ? 'known-row' : ''}`}>
      <span>{defeated.has(mob.id) ? '✓' : '○'} {mob.name}</span>
      <strong>Lv. {mob.level} · HP {mob.stats.hp}{isBoss(mob) ? ' · boss' : ''}</strong>
    </div>
  );

  const renderItem = (item: ItemDefinition) => (
    <div key={item.id} className={`list-line library-row ${obtained.has(item.id) ? 'known-row' : ''}`}>
      <button className="text-button" onClick={() => openItemProfile(item.id, 'loot', 0, [])}>
        {obtained.has(item.id) ? '✓' : '○'} <ItemLine itemId={item.id} showLevel />
      </button>
      <strong>{item.slot ?? item.type} · {item.classTags.length ? item.classTags.map((id) => classLabel[id] ?? id).join('/') : 'all'} · {rarityLabel[item.rarity]}</strong>
    </div>
  );

  const renderSetCards = () => {
    if (selectedSet) {
      if (selectedIsRegular && !selectedClass) {
        return (
          <section className="panel">
            <div className="title-row"><div className="section-title">Вариации класса</div><button onClick={() => setSelectedSetId(null)}>Назад</button></div>
            <div className="card-grid">
              {classOrder.map((classId) => {
                const variation = regularVariations.find((entry) => entry.setId.includes(`_${classId}_`));
                if (!variation) return null;
                return <button key={classId} className="content-card" onClick={() => setSelectedClass(classId)}><strong>{regularSetFamilyName(variation.items)} {classLabel[classId]}</strong><span>{variation.items.length} предметов</span></button>;
              })}
            </div>
          </section>
        );
      }
      const items = selectedIsRegular && selectedClass
        ? (regularVariations.find((entry) => entry.setId.includes(`_${selectedClass}_`))?.items ?? selectedSet.items)
        : selectedSet.items;
      return (
        <section className="panel">
          <div className="title-row"><div className="section-title">Предметы сета</div><button onClick={() => { selectedClass ? setSelectedClass(null) : setSelectedSetId(null); }}>Назад</button></div>
          <div className="list-lines">{items.map(renderItem)}</div>
        </section>
      );
    }

    const topLevelSets = setGroups.filter((group) => {
      if (/^(common|uncommon|rare|epic)_(warrior|ranger|mage|priest)_\d+$/.test(group.setId)) {
        return group.setId.includes('_warrior_');
      }
      return true;
    });
    return <section className="panel"><div className="section-title">Сеты</div><div className="card-grid">{topLevelSets.map((group) => <button key={group.setId} className="content-card" onClick={() => { setSelectedSetId(group.setId); setSelectedClass(null); }}><strong>{regularSetFamilyName(group.items)}</strong><span>Lv. {group.items[0]?.levelReq} · {rarityLabel[group.items[0]?.rarity ?? 'common']}</span><span>{group.items.length} предметов</span></button>)}</div></section>;
  };

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
      {tab === 'sets' && (<>{renderSetCards()}<section className="panel"><div className="section-title">Сеты подземелий и рейдов</div><div className="list-lines">{dungeonSets.map(({ entry, related }) => <div key={entry.id} className="library-set-block"><strong>{entry.name} · Lv. {entry.levelRange[0]}–{entry.levelRange[1]}</strong><span>{related.length} предметов</span><div className="compact-token-list">{related.slice(0, 24).map((item) => <button key={item.id} className="text-button small-token" onClick={() => openItemProfile(item.id, 'loot', 0, [])}>{obtained.has(item.id) ? '✓' : '○'} {item.name}</button>)}</div></div>)}</div></section></>)}
      {tab === 'cards' && <section className="panel"><div className="section-title">Карты</div><div className="list-lines">{cards.map((card) => { const mob = MOBS.find((entry) => card.id === `card_${entry.id}`); return <div key={card.id} className={`list-line library-row ${obtained.has(card.id) ? 'known-row' : ''}`}><button className="text-button" onClick={() => openItemProfile(card.id, 'loot', 0, [])}>{obtained.has(card.id) ? '✓' : '○'} <ItemLine itemId={card.id} showLevel /></button><strong>{mob?.tags.includes('boss') ? 'boss · ' : ''}{rarityLabel[card.rarity]}</strong></div>; })}</div></section>}
    </div>
  );
};
