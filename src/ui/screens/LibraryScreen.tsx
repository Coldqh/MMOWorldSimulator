import { useMemo, useState } from 'react';
import { ITEMS, rarityLabel } from '../../content/items';
import { DUNGEONS, MOBS, RAIDS } from '../../content/world';
import { useGameStore } from '../../state/gameStore';
import type { ItemDefinition, MobDefinition, Rarity } from '../../types/game';
import { ItemLine } from '../components/ItemLine';

type LibraryTab = 'mobs' | 'bosses' | 'sets' | 'cards';

const rarityOrder: Record<Rarity, number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  legendary: 5,
  mythic: 6,
  unique: 7,
};

const classLabel: Record<string, string> = {
  warrior: 'Воин',
  ranger: 'Стрелок',
  mage: 'Маг',
  priest: 'Жрец',
};
const classOrder = ['warrior', 'ranger', 'mage', 'priest'];
const slotOrder = ['weapon', 'head', 'chest', 'legs', 'boots', 'ring', 'amulet'];
const isGear = (item: ItemDefinition) => Boolean(item.slot);
const isSetGear = (item: ItemDefinition) => isGear(item) && Boolean(item.setId);
const isBoss = (mob: MobDefinition) => mob.tags.includes('boss');

const stripSlotAndClass = (name: string) => name
  .replace(/^(Оружие|Шлем|Кираса|Поножи|Сапоги|Кольцо|Амулет)\s+/i, '')
  .replace(/\s+(Воина|Стрелка|Мага|Жреца)$/i, '');

const regularRoot = (setId: string) => setId.replace(/^(common|uncommon|rare)_(warrior|ranger|mage|priest)_(\d+)$/, '$1_$3');
const isRegularClassSet = (setId: string) => /^(common|uncommon|rare)_(warrior|ranger|mage|priest)_\d+$/.test(setId);

interface SetFamily {
  id: string;
  displayName: string;
  rarity: Rarity;
  level: number;
  source: string;
  sourceType: 'general' | 'dungeon' | 'raid' | 'world';
  totalCount: number;
  items: ItemDefinition[];
  classGroups: Array<{ classId: string; items: ItemDefinition[] }>;
  hasClassStage: boolean;
}

const instanceNameById = (sourceId?: string, sourceName?: string) => {
  if (sourceName) return sourceName;
  return [...DUNGEONS, ...RAIDS].find((entry) => entry.id === sourceId)?.name;
};

const buildSetFamilies = (): SetFamily[] => {
  const raw = new Map<string, ItemDefinition[]>();
  ITEMS.filter(isSetGear).forEach((item) => {
    const key = isRegularClassSet(item.setId ?? '') ? regularRoot(item.setId ?? '') : item.setId ?? item.id;
    raw.set(key, [...(raw.get(key) ?? []), item]);
  });

  return Array.from(raw.entries()).map(([id, items]) => {
    const sorted = [...items].sort((a, b) => {
      const classA = classOrder.indexOf(a.classTags[0] ?? 'zz');
      const classB = classOrder.indexOf(b.classTags[0] ?? 'zz');
      const slotA = slotOrder.indexOf(a.slot ?? '');
      const slotB = slotOrder.indexOf(b.slot ?? '');
      return classA - classB || slotA - slotB || a.name.localeCompare(b.name);
    });
    const sample = sorted[0];
    const sourceType = sample?.sourceType ?? (sample?.setId?.startsWith('raid_') ? 'raid' : sample?.setId?.startsWith('dungeon_') ? 'dungeon' : 'general');
    const sourceName = instanceNameById(sample?.sourceId, sample?.sourceName);
    const source = sourceType === 'raid'
      ? `Рейд: ${sourceName ?? sample?.sourceId ?? 'рейд'}`
      : sourceType === 'dungeon'
        ? `Данж: ${sourceName ?? sample?.sourceId ?? 'данж'}`
        : 'Общий сет';
    const classGroups = classOrder.map((classId) => ({
      classId,
      items: sorted.filter((item) => item.classTags.includes(classId)),
    })).filter((entry) => entry.items.length > 0);
    const hasSharedOnly = classGroups.length === 0;
    const hasClassStage = sourceType !== 'raid' && sample?.rarity !== 'legendary' && classGroups.length > 1 && !hasSharedOnly;
    return {
      id,
      displayName: stripSlotAndClass(sample?.name ?? id),
      rarity: sample?.rarity ?? 'common',
      level: sample?.levelReq ?? 1,
      source,
      sourceType,
      totalCount: sorted.length,
      items: sorted,
      classGroups,
      hasClassStage,
    };
  }).sort((a, b) => a.level - b.level || rarityOrder[a.rarity] - rarityOrder[b.rarity] || a.displayName.localeCompare(b.displayName));
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
  const cards = useMemo(() => ITEMS.filter((item) => item.type === 'card').sort((a, b) => a.levelReq - b.levelReq || rarityOrder[b.rarity] - rarityOrder[a.rarity] || a.name.localeCompare(b.name)), []);
  const setFamilies = useMemo(buildSetFamilies, []);
  const selected = selectedSetId ? setFamilies.find((entry) => entry.id === selectedSetId) : undefined;

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

  const renderSets = () => {
    if (selected) {
      if (selected.hasClassStage && !selectedClass) {
        return (
          <section className="panel">
            <div className="title-row"><div className="section-title">{selected.displayName}</div><button onClick={() => setSelectedSetId(null)}>Назад</button></div>
            <p className="muted">{selected.source} · {selected.totalCount} предметов</p>
            <div className="card-grid">
              {selected.classGroups.map((group) => (
                <button key={group.classId} className={`content-card rarity-border-${selected.rarity}`} onClick={() => setSelectedClass(group.classId)}>
                  <strong>{selected.displayName} {classLabel[group.classId]}</strong>
                  <span>{group.items.length} предметов</span>
                </button>
              ))}
            </div>
          </section>
        );
      }
      const items = selectedClass
        ? selected.classGroups.find((entry) => entry.classId === selectedClass)?.items ?? selected.items
        : selected.items;
      return (
        <section className="panel">
          <div className="title-row"><div className="section-title">{selected.displayName}</div><button onClick={() => { selectedClass ? setSelectedClass(null) : setSelectedSetId(null); }}>Назад</button></div>
          <p className="muted">{selected.source} · {selected.totalCount} предметов</p>
          <div className="list-lines">{items.map(renderItem)}</div>
        </section>
      );
    }

    return (
      <section className="panel">
        <div className="section-title">Сеты</div>
        <div className="card-grid">
          {setFamilies.map((family) => (
            <button key={family.id} className={`content-card rarity-border-${family.rarity}`} onClick={() => { setSelectedSetId(family.id); setSelectedClass(null); }}>
              <strong>{family.displayName}</strong>
              <span>Lv. {family.level} · {rarityLabel[family.rarity]}</span>
              <span>{family.source}</span>
              <span>{family.totalCount} предметов</span>
            </button>
          ))}
        </div>
      </section>
    );
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
      {tab === 'sets' && renderSets()}
      {tab === 'cards' && <section className="panel"><div className="section-title">Карты</div><div className="list-lines">{cards.map((card) => { const mob = MOBS.find((entry) => card.id === `card_${entry.id}`); return <div key={card.id} className={`list-line library-row ${obtained.has(card.id) ? 'known-row' : ''}`}><button className="text-button" onClick={() => openItemProfile(card.id, 'loot', 0, [])}>{obtained.has(card.id) ? '✓' : '○'} <ItemLine itemId={card.id} showLevel /></button><strong>{mob?.tags.includes('boss') ? 'boss · ' : ''}{rarityLabel[card.rarity]}</strong></div>; })}</div></section>}
    </div>
  );
};
