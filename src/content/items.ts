import type { ItemDefinition, Rarity } from '../types/game';

export const ITEMS: ItemDefinition[] = [
  { id: 'rusty_sword', name: 'Ржавый меч', type: 'weapon', rarity: 'common', levelReq: 1, classTags: ['warrior'], slot: 'weapon', stats: { attack: 4 }, effects: [], socketSlots: 0, tradeable: true, price: 8, announceIfDropped: false },
  { id: 'training_bow', name: 'Учебный лук', type: 'weapon', rarity: 'common', levelReq: 1, classTags: ['ranger'], slot: 'weapon', stats: { attack: 4, speed: 1 }, effects: [], socketSlots: 0, tradeable: true, price: 8, announceIfDropped: false },
  { id: 'cracked_wand', name: 'Треснувший жезл', type: 'weapon', rarity: 'common', levelReq: 1, classTags: ['mage', 'priest'], slot: 'weapon', stats: { magic: 4 }, effects: [], socketSlots: 0, tradeable: true, price: 8, announceIfDropped: false },
  { id: 'linen_armor', name: 'Льняная броня', type: 'armor', rarity: 'common', levelReq: 1, classTags: [], slot: 'chest', stats: { hp: 8, defense: 1 }, effects: [], socketSlots: 0, tradeable: true, price: 10, announceIfDropped: false },
  { id: 'cloth_cap', name: 'Тканевый капюшон', type: 'armor', rarity: 'common', levelReq: 1, classTags: [], slot: 'head', stats: { mana: 4, defense: 1 }, effects: [], socketSlots: 0, tradeable: true, price: 9, announceIfDropped: false },
  { id: 'worn_boots', name: 'Старые ботинки', type: 'armor', rarity: 'common', levelReq: 1, classTags: [], slot: 'boots', stats: { speed: 1 }, effects: [], socketSlots: 0, tradeable: true, price: 7, announceIfDropped: false },
  { id: 'patched_leggings', name: 'Штаны с заплатами', type: 'armor', rarity: 'common', levelReq: 1, classTags: [], slot: 'legs', stats: { hp: 5, defense: 1 }, effects: [], socketSlots: 0, tradeable: true, price: 8, announceIfDropped: false },

  { id: 'wolf_hide_vest', name: 'Жилет из волчьей шкуры', type: 'armor', rarity: 'uncommon', levelReq: 2, classTags: [], slot: 'chest', stats: { hp: 16, defense: 2 }, effects: [], socketSlots: 0, tradeable: true, price: 32, announceIfDropped: false },
  { id: 'hunter_boots', name: 'Ботинки охотника', type: 'armor', rarity: 'uncommon', levelReq: 2, classTags: [], slot: 'boots', stats: { speed: 2, defense: 1 }, effects: [], socketSlots: 0, tradeable: true, price: 34, announceIfDropped: false },
  { id: 'field_helmet', name: 'Полевой шлем', type: 'armor', rarity: 'uncommon', levelReq: 3, classTags: [], slot: 'head', stats: { hp: 10, defense: 2 }, effects: [], socketSlots: 0, tradeable: true, price: 39, announceIfDropped: false },
  { id: 'forest_ring', name: 'Лесное кольцо', type: 'accessory', rarity: 'uncommon', levelReq: 3, classTags: [], slot: 'ring', stats: { hp: 10, mana: 5 }, effects: [], socketSlots: 0, tradeable: true, price: 45, announceIfDropped: false },

  { id: 'redcap_blade', name: 'Клинок красного колпака', type: 'weapon', rarity: 'rare', levelReq: 4, classTags: ['warrior'], slot: 'weapon', stats: { attack: 12, speed: 1 }, effects: [], socketSlots: 1, tradeable: true, price: 180, announceIfDropped: true },
  { id: 'silverstring_bow', name: 'Лук серебряной тетивы', type: 'weapon', rarity: 'rare', levelReq: 4, classTags: ['ranger'], slot: 'weapon', stats: { attack: 13 }, effects: [], socketSlots: 1, tradeable: true, price: 190, announceIfDropped: true },
  { id: 'ember_staff', name: 'Посох тлеющих углей', type: 'weapon', rarity: 'rare', levelReq: 4, classTags: ['mage', 'priest'], slot: 'weapon', stats: { magic: 14, mana: 20 }, effects: [], socketSlots: 1, tradeable: true, price: 210, announceIfDropped: true },
  { id: 'redcap_coat', name: 'Куртка красного колпака', type: 'armor', rarity: 'rare', levelReq: 5, classTags: [], slot: 'chest', stats: { hp: 28, defense: 4, speed: 1 }, effects: [], socketSlots: 1, tradeable: true, price: 220, announceIfDropped: true },
  { id: 'old_lantern_charm', name: 'Амулет Старого Фонаря', type: 'accessory', rarity: 'epic', levelReq: 5, classTags: [], slot: 'amulet', stats: { hp: 25, mana: 15, defense: 2 }, effects: [], socketSlots: 1, tradeable: true, price: 850, announceIfDropped: true },

  { id: 'wolf_card', name: 'Карта серого волка', type: 'card', rarity: 'epic', levelReq: 1, classTags: [], stats: { attack: 2 }, effects: [], socketSlots: 0, tradeable: true, price: 12000, announceIfDropped: true },
  { id: 'slime_card', name: 'Карта болотной слизи', type: 'card', rarity: 'rare', levelReq: 1, classTags: [], stats: { defense: 1, hp: 12 }, effects: [], socketSlots: 0, tradeable: true, price: 7500, announceIfDropped: true },
  { id: 'redcap_card', name: 'Карта красноколпака', type: 'card', rarity: 'epic', levelReq: 1, classTags: [], stats: { attack: 3, speed: 1 }, effects: [], socketSlots: 0, tradeable: true, price: 16000, announceIfDropped: true },


  { id: 'boar_tusk_amulet', name: 'Амулет кабаньего клыка', type: 'accessory', rarity: 'uncommon', levelReq: 2, classTags: [], slot: 'amulet', stats: { attack: 1, hp: 8 }, effects: [], socketSlots: 0, tradeable: true, price: 42, announceIfDropped: false },
  { id: 'moonleaf_cowl', name: 'Капюшон лунного листа', type: 'armor', rarity: 'rare', levelReq: 4, classTags: [], slot: 'head', stats: { mana: 18, magic: 2, defense: 2 }, effects: [], socketSlots: 1, tradeable: true, price: 160, announceIfDropped: true },
  { id: 'moonleaf_robe', name: 'Мантия лунного листа', type: 'armor', rarity: 'rare', levelReq: 4, classTags: ['mage', 'priest'], slot: 'chest', stats: { mana: 24, magic: 3, defense: 3 }, effects: [], socketSlots: 1, tradeable: true, price: 190, announceIfDropped: true },
  { id: 'iron_miner_helm', name: 'Шлем рудокопа', type: 'armor', rarity: 'rare', levelReq: 6, classTags: [], slot: 'head', stats: { hp: 22, defense: 4 }, effects: [], socketSlots: 1, tradeable: true, price: 210, announceIfDropped: true },
  { id: 'quarry_guard_greaves', name: 'Поножи стража карьера', type: 'armor', rarity: 'rare', levelReq: 6, classTags: [], slot: 'legs', stats: { hp: 26, defense: 4, speed: -1 }, effects: [], socketSlots: 1, tradeable: true, price: 230, announceIfDropped: true },
  { id: 'stonehide_ring', name: 'Кольцо каменной кожи', type: 'accessory', rarity: 'epic', levelReq: 6, classTags: [], slot: 'ring', stats: { hp: 30, defense: 3 }, effects: [], socketSlots: 1, tradeable: true, price: 760, announceIfDropped: true },
  { id: 'blackroot_saber', name: 'Сабля Чёрного Корня', type: 'weapon', rarity: 'epic', levelReq: 9, classTags: ['warrior'], slot: 'weapon', stats: { attack: 22, speed: 2 }, effects: [], socketSlots: 2, tradeable: true, price: 1400, announceIfDropped: true },
  { id: 'blackroot_focus', name: 'Фокус Чёрного Корня', type: 'weapon', rarity: 'epic', levelReq: 9, classTags: ['mage', 'priest'], slot: 'weapon', stats: { magic: 24, mana: 35 }, effects: [], socketSlots: 2, tradeable: true, price: 1480, announceIfDropped: true },
  { id: 'raiders_seal_ring', name: 'Кольцо рейдера', type: 'accessory', rarity: 'epic', levelReq: 8, classTags: [], slot: 'ring', stats: { attack: 3, magic: 3, hp: 18 }, effects: [], socketSlots: 1, tradeable: true, price: 1180, announceIfDropped: true },
  { id: 'moon_wisp_card', name: 'Карта лунного огонька', type: 'card', rarity: 'epic', levelReq: 1, classTags: [], stats: { magic: 3, mana: 10 }, effects: [], socketSlots: 0, tradeable: true, price: 22000, announceIfDropped: true },

  { id: 'ashen_halberd', name: 'Пепельная алебарда', type: 'weapon', rarity: 'rare', levelReq: 10, classTags: ['warrior'], slot: 'weapon', stats: { attack: 28, hp: 18, defense: 2 }, effects: [], socketSlots: 1, tradeable: true, price: 1850, announceIfDropped: true },
  { id: 'marsh_stalker_bow', name: 'Лук болотного следопыта', type: 'weapon', rarity: 'rare', levelReq: 10, classTags: ['ranger'], slot: 'weapon', stats: { attack: 29, speed: 2 }, effects: [], socketSlots: 1, tradeable: true, price: 1880, announceIfDropped: true },
  { id: 'mireglass_scepter', name: 'Скипетр топкого стекла', type: 'weapon', rarity: 'rare', levelReq: 10, classTags: ['mage', 'priest'], slot: 'weapon', stats: { magic: 30, mana: 40 }, effects: [], socketSlots: 1, tradeable: true, price: 1960, announceIfDropped: true },
  { id: 'ashen_guard_plate', name: 'Панцирь пепельной стражи', type: 'armor', rarity: 'rare', levelReq: 10, classTags: [], slot: 'chest', stats: { hp: 48, defense: 7 }, effects: [], socketSlots: 1, tradeable: true, price: 1720, announceIfDropped: true },
  { id: 'mire_runner_boots', name: 'Ботинки болотного бегуна', type: 'armor', rarity: 'rare', levelReq: 10, classTags: [], slot: 'boots', stats: { speed: 3, defense: 3 }, effects: [], socketSlots: 1, tradeable: true, price: 1550, announceIfDropped: true },
  { id: 'skyfall_greatsword', name: 'Двуручник Небопада', type: 'weapon', rarity: 'epic', levelReq: 12, classTags: ['warrior'], slot: 'weapon', stats: { attack: 36, hp: 30, defense: 3 }, effects: [], socketSlots: 2, tradeable: true, price: 3100, announceIfDropped: true },
  { id: 'skyfall_longbow', name: 'Длинный лук Небопада', type: 'weapon', rarity: 'epic', levelReq: 12, classTags: ['ranger'], slot: 'weapon', stats: { attack: 38, speed: 3 }, effects: [], socketSlots: 2, tradeable: true, price: 3200, announceIfDropped: true },
  { id: 'skyfall_orb', name: 'Сфера Небопада', type: 'weapon', rarity: 'epic', levelReq: 12, classTags: ['mage', 'priest'], slot: 'weapon', stats: { magic: 39, mana: 55 }, effects: [], socketSlots: 2, tradeable: true, price: 3350, announceIfDropped: true },
  { id: 'stormguard_helm', name: 'Шлем грозовой стражи', type: 'armor', rarity: 'epic', levelReq: 12, classTags: [], slot: 'head', stats: { hp: 34, defense: 6, mana: 12 }, effects: [], socketSlots: 1, tradeable: true, price: 2750, announceIfDropped: true },
  { id: 'stormguard_legs', name: 'Поножи грозовой стражи', type: 'armor', rarity: 'epic', levelReq: 12, classTags: [], slot: 'legs', stats: { hp: 42, defense: 7 }, effects: [], socketSlots: 1, tradeable: true, price: 2880, announceIfDropped: true },
  { id: 'cloudbreaker_ring', name: 'Кольцо расколотого облака', type: 'accessory', rarity: 'epic', levelReq: 13, classTags: [], slot: 'ring', stats: { attack: 5, magic: 5, hp: 26 }, effects: [], socketSlots: 1, tradeable: true, price: 3400, announceIfDropped: true },
  { id: 'starwell_amulet', name: 'Амулет звёздного колодца', type: 'accessory', rarity: 'epic', levelReq: 13, classTags: [], slot: 'amulet', stats: { mana: 60, magic: 6, defense: 3 }, effects: [], socketSlots: 1, tradeable: true, price: 3550, announceIfDropped: true },
  { id: 'wyrmguard_blade', name: 'Клинок стража вирма', type: 'weapon', rarity: 'legendary', levelReq: 14, classTags: ['warrior'], slot: 'weapon', stats: { attack: 48, hp: 55, defense: 6 }, effects: [], socketSlots: 2, tradeable: true, price: 6200, announceIfDropped: true },
  { id: 'wyrmguard_recurve', name: 'Лук стража вирма', type: 'weapon', rarity: 'legendary', levelReq: 14, classTags: ['ranger'], slot: 'weapon', stats: { attack: 50, speed: 5 }, effects: [], socketSlots: 2, tradeable: true, price: 6300, announceIfDropped: true },
  { id: 'wyrmguard_codex', name: 'Кодекс стража вирма', type: 'weapon', rarity: 'legendary', levelReq: 14, classTags: ['mage', 'priest'], slot: 'weapon', stats: { magic: 52, mana: 85 }, effects: [], socketSlots: 2, tradeable: true, price: 6500, announceIfDropped: true },
  { id: 'first_raid_seal', name: 'Печать первого рейда', type: 'accessory', rarity: 'legendary', levelReq: 14, classTags: [], slot: 'ring', stats: { hp: 50, attack: 7, magic: 7, defense: 5 }, effects: [], socketSlots: 2, tradeable: true, price: 7000, announceIfDropped: true },
  { id: 'thorn_crown_token', name: 'Знак Терновой Короны', type: 'quest', rarity: 'rare', levelReq: 1, classTags: [], stats: {}, effects: [], socketSlots: 0, tradeable: false, price: 0, announceIfDropped: true },
  { id: 'minor_potion', name: 'Малое зелье лечения', type: 'consumable', rarity: 'common', levelReq: 1, classTags: [], stats: {}, effects: [{ type: 'HEAL', value: 35 }], socketSlots: 0, tradeable: true, price: 12, announceIfDropped: false },
  { id: 'mana_potion', name: 'Малое зелье маны', type: 'consumable', rarity: 'common', levelReq: 1, classTags: [], stats: {}, effects: [], socketSlots: 0, tradeable: true, price: 14, announceIfDropped: false },
  { id: 'sharpening_stone', name: 'Камень усиления', type: 'material', rarity: 'uncommon', levelReq: 1, classTags: [], stats: {}, effects: [], socketSlots: 0, tradeable: true, price: 35, announceIfDropped: false },
  { id: 'crystal_mount_whistle', name: 'Свисток кристального кабана', type: 'mount', rarity: 'legendary', levelReq: 1, classTags: [], stats: { speed: 2 }, effects: [], socketSlots: 0, tradeable: true, price: 5000, announceIfDropped: true }
];

const addPotion = (id: string, name: string, levelReq: number, kind: 'hp' | 'mana', value: number, price: number) => {
  if (ITEMS.some((item) => item.id === id)) return;
  ITEMS.push({
    id,
    name,
    type: 'consumable',
    rarity: levelReq >= 20 ? 'epic' : levelReq >= 15 ? 'rare' : levelReq >= 10 ? 'uncommon' : 'common',
    levelReq,
    classTags: [],
    stats: {},
    effects: kind === 'hp' ? [{ type: 'HEAL', value }] : [],
    socketSlots: 0,
    tradeable: true,
    price,
    announceIfDropped: false,
  });
};

addPotion('health_potion_5', 'Зелье здоровья 5', 5, 'hp', 80, 55);
addPotion('mana_potion_5', 'Зелье маны 5', 5, 'mana', 65, 58);
addPotion('health_potion_10', 'Зелье здоровья 10', 10, 'hp', 150, 150);
addPotion('mana_potion_10', 'Зелье маны 10', 10, 'mana', 120, 160);
addPotion('health_potion_15', 'Зелье здоровья 15', 15, 'hp', 260, 360);
addPotion('mana_potion_15', 'Зелье маны 15', 15, 'mana', 210, 390);
addPotion('health_potion_20', 'Зелье здоровья 20', 20, 'hp', 420, 850);
addPotion('mana_potion_20', 'Зелье маны 20', 20, 'mana', 340, 900);

export const normalizeLegacyItemId = (id: string) => {
  const wyrm = id.match(/^wyrmspire(_gold)?_(warrior|ranger|mage|priest)_(head|chest|legs|boots|ring|amulet)$/);
  if (wyrm) return `wyrmspire${wyrm[1] ?? ''}_${wyrm[3]}`;
  const glassDuplicate = id.match(/^glass_catacomb_epic_(warrior|ranger|mage|priest)_(weapon|head|chest|legs|boots|ring|amulet)$/);
  if (glassDuplicate) {
    const slotMap: Record<string, string> = { head: 'chest', boots: 'legs' };
    return `glass_catacomb_${glassDuplicate[1]}_${slotMap[glassDuplicate[2]] ?? glassDuplicate[2]}`;
  }
  const glassTrimmed = id.match(/^glass_catacomb_(warrior|ranger|mage|priest)_(head|boots)$/);
  if (glassTrimmed) return `glass_catacomb_${glassTrimmed[1]}_${glassTrimmed[2] === 'head' ? 'chest' : 'legs'}`;
  const oldSet = id.match(/^set_(common|uncommon|rare|epic)_(warrior|ranger|mage|priest)_(\d+)_(weapon|head|chest|legs|boots|ring|amulet)$/);
  if (oldSet) {
    const rarity = oldSet[1];
    const classId = oldSet[2];
    const level = Number(oldSet[3]);
    const slot = oldSet[4];
    const commonLevels = [1, 5, 10, 15, 20];
    const uncommonLevels = [3, 8, 13, 18];
    const rareLevels = [5, 10, 15, 20];
    const epicLevels = [10, 20];
    const pool = rarity === 'common' ? commonLevels : rarity === 'uncommon' ? uncommonLevels : rarity === 'rare' ? rareLevels : epicLevels;
    const nearest = pool.reduce((best, current) => Math.abs(current - level) < Math.abs(best - level) ? current : best, pool[0]);
    return `set_${rarity}_${classId}_${nearest}_${slot}`;
  }
  return id;
};

export const getItemById = (id: string) => ITEMS.find((entry) => entry.id === normalizeLegacyItemId(id));

export const rarityLabel: Record<Rarity, string> = {
  common: 'Обычный',
  uncommon: 'Необычный',
  rare: 'Редкий',
  epic: 'Эпический',
  legendary: 'Легендарный',
  mythic: 'Мифический',
  unique: 'Уникальный'
};

export const rarityScore: Record<Rarity, number> = {
  common: 1,
  uncommon: 2,
  rare: 4,
  epic: 7,
  legendary: 12,
  mythic: 18,
  unique: 25
};

const slotName: Record<string, string> = {
  weapon: 'Оружие', head: 'Шлем', chest: 'Кираса', legs: 'Поножи', boots: 'Сапоги', ring: 'Кольцо', amulet: 'Амулет'
};
const classNameShort: Record<string, string> = { warrior: 'Воина', ranger: 'Стрелка', mage: 'Мага', priest: 'Жреца' };
const classMainStat: Record<string, 'attack' | 'magic' | 'defense'> = { warrior: 'attack', ranger: 'attack', mage: 'magic', priest: 'magic' };
const rarityName: Record<Rarity, string> = { common: 'Белый', uncommon: 'Зелёный', rare: 'Синий', epic: 'Фиолетовый', legendary: 'Легендарный', mythic: 'Мифический', unique: 'Уникальный' };
const slots = ['weapon', 'head', 'chest', 'legs', 'boots', 'ring', 'amulet'] as const;

ITEMS.forEach((item) => {
  if (item.rarity === 'legendary' && item.levelReq < 20) item.rarity = 'epic';
  if (item.type === 'card') item.price = Math.max(item.price, item.rarity === 'rare' ? 65000 : 120000);
});

const pushSetItems = (rarity: Rarity, levels: number[]) => {
  for (const level of levels) {
    for (const classId of Object.keys(classNameShort)) {
      for (const slot of slots) {
        const id = `set_${rarity}_${classId}_${level}_${slot}`;
        if (ITEMS.some((item) => item.id === id)) continue;
        const main = classMainStat[classId];
        const base = Math.max(1, Math.floor(level * (rarityScore[rarity] * 0.55)));
        const stats: Record<string, number> = slot === 'weapon'
          ? { [main]: base + level }
          : slot === 'ring' || slot === 'amulet'
            ? { hp: base * 3, mana: classId === 'mage' || classId === 'priest' ? base * 2 : base, [main]: Math.max(1, Math.floor(base / 2)) }
            : { hp: base * 4, defense: Math.max(1, Math.floor(base / 2)) };
        ITEMS.push({
          id,
          name: `${rarityName[rarity]} ${slotName[slot]} ${classNameShort[classId]} ${level}`,
          type: slot === 'weapon' ? 'weapon' : slot === 'ring' || slot === 'amulet' ? 'accessory' : 'armor',
          rarity,
          levelReq: level,
          classTags: slot === 'weapon' ? [classId] : [],
          slot,
          stats,
          effects: [],
          socketSlots: rarity === 'rare' ? 1 : rarity === 'epic' ? 2 : rarity === 'legendary' ? 2 : 0,
          tradeable: true,
          price: Math.round(20 + level * level * (rarityScore[rarity] + 1)),
          announceIfDropped: rarity !== 'common',
          setId: `${rarity}_${classId}_${level}`,
        });
      }
    }
  }
};

pushSetItems('common', [2, 4, 6, 8, 10, 12, 14, 16, 18, 20]);
pushSetItems('uncommon', [3, 6, 9, 12, 15, 18]);
pushSetItems('rare', [5, 10, 15, 20]);
pushSetItems('epic', [10, 20]);

const instanceDropSets = [
  { prefix: 'old_lantern', name: 'Старого Фонаря', level: 6, rarity: 'rare' as Rarity, setId: 'dungeon_old_lantern' },
  { prefix: 'thorn_crypt', name: 'Терновой Короны', level: 8, rarity: 'rare' as Rarity, setId: 'dungeon_thorn_crypt' },
  { prefix: 'blackroot', name: 'Чёрного Корня', level: 11, rarity: 'epic' as Rarity, setId: 'dungeon_blackroot' },
  { prefix: 'mire_depths', name: 'Глубокой Топи', level: 14, rarity: 'rare' as Rarity, setId: 'dungeon_mire_depths' },
  { prefix: 'wyrmspire', name: 'Вирмшпиля', level: 20, rarity: 'epic' as Rarity, setId: 'raid_wyrmspire' },
  { prefix: 'wyrmspire_gold', name: 'Первого Вирма', level: 20, rarity: 'legendary' as Rarity, setId: 'raid_wyrmspire_legendary' },
  { prefix: 'glass_catacomb', name: 'Стеклянных Катакомб', level: 20, rarity: 'rare' as Rarity, setId: 'dungeon_glass_catacomb' },
  { prefix: 'glass_catacomb_epic', name: 'Сердца Катакомб', level: 20, rarity: 'epic' as Rarity, setId: 'dungeon_glass_catacomb_epic' },
];

for (const spec of instanceDropSets) {
  for (const classId of Object.keys(classNameShort)) {
    for (const slot of slots) {
      const id = `${spec.prefix}_${classId}_${slot}`;
      if (ITEMS.some((item) => item.id === id)) continue;
      const main = classMainStat[classId];
      const power = spec.level + rarityScore[spec.rarity] * 2;
      const stats: Record<string, number> = slot === 'weapon'
        ? { [main]: power + 4 }
        : slot === 'ring' || slot === 'amulet'
          ? { hp: power * 3, mana: classId === 'mage' || classId === 'priest' ? power * 2 : power, [main]: Math.floor(power / 2) }
          : { hp: power * 4, defense: Math.floor(power / 2) };
      ITEMS.push({
        id,
        name: `${slotName[slot]} ${spec.name} ${classNameShort[classId]}`,
        type: slot === 'weapon' ? 'weapon' : slot === 'ring' || slot === 'amulet' ? 'accessory' : 'armor',
        rarity: spec.rarity,
        levelReq: spec.level,
        classTags: slot === 'weapon' ? [classId] : [],
        slot,
        stats,
        effects: [],
        socketSlots: spec.rarity === 'legendary' ? 2 : spec.rarity === 'epic' ? 2 : 1,
        tradeable: true,
        price: Math.round(600 + spec.level * spec.level * rarityScore[spec.rarity]),
        announceIfDropped: true,
        setId: spec.setId,
      });
    }
  }
}


// v0.3.2 item balance and cap-20 cleanup
for (let i = ITEMS.length - 1; i >= 0; i -= 1) {
  const item = ITEMS[i];
  if (item.id.startsWith('set_legendary_') || /^legendary_/.test(item.id)) ITEMS.splice(i, 1);
}

const rarityStatMult: Record<Rarity, number> = { common: 1.0, uncommon: 1.32, rare: 1.78, epic: 2.45, legendary: 3.45, mythic: 4.8, unique: 6.2 };
const slotStatMult: Record<string, number> = { weapon: 1.25, chest: 1.16, legs: 1.0, head: 0.88, boots: 0.78, ring: 0.7, amulet: 0.74 };
const rebalanceItemStats = () => {
  ITEMS.forEach((item) => {
    if (!item.slot || item.type === 'card' || item.type === 'consumable' || item.type === 'material') return;
    const main = item.classTags.includes('mage') || item.classTags.includes('priest') ? 'magic' : 'attack';
    const power = Math.max(1, Math.round((item.levelReq + 2) * rarityStatMult[item.rarity] * (slotStatMult[item.slot] ?? 1)));
    if (item.slot === 'weapon') item.stats = { [main]: power + Math.round(item.levelReq * rarityStatMult[item.rarity]) };
    else if (item.slot === 'ring' || item.slot === 'amulet') item.stats = { hp: power * 3, mana: power * 2, [main]: Math.max(1, Math.round(power * 0.48)) };
    else if (item.slot === 'boots') item.stats = { hp: power * 3, defense: Math.max(1, Math.round(power * 0.55)), speed: Math.max(1, Math.round(rarityScore[item.rarity] / 2)) };
    else item.stats = { hp: power * 4, defense: Math.max(1, Math.round(power * 0.72)) };
    item.price = Math.max(item.price, Math.round(30 + item.levelReq * item.levelReq * rarityScore[item.rarity] * (item.slot === 'weapon' ? 1.7 : 1.15)));
  });
};
rebalanceItemStats();
ITEMS.forEach((item) => {
  if (item.type === 'card') item.price = Math.max(item.price, item.rarity === 'rare' ? 90000 : item.rarity === 'epic' ? 180000 : 320000);
});

// v0.3.3 set cleanup, enhancement stones and Wyrm set merge
for (let i = ITEMS.length - 1; i >= 0; i -= 1) {
  const item = ITEMS[i];
  if (/^set_(common|uncommon|rare|epic)_/.test(item.id)) ITEMS.splice(i, 1);
  if (/^wyrmspire(_gold)?_(warrior|ranger|mage|priest)_(head|chest|legs|boots|ring|amulet)$/.test(item.id)) ITEMS.splice(i, 1);
}

const desiredGeneralSets: Array<{ rarity: Rarity; levels: number[] }> = [
  { rarity: 'common', levels: [1, 5, 10, 15, 20] },
  { rarity: 'uncommon', levels: [3, 8, 13, 18] },
  { rarity: 'rare', levels: [5, 10, 15, 20] },
];
desiredGeneralSets.forEach((entry) => pushSetItems(entry.rarity, entry.levels));

const addStone = (id: string, name: string, rarity: Rarity, price: number) => {
  const existing = ITEMS.find((item) => item.id === id);
  if (existing) {
    existing.name = name;
    existing.rarity = rarity;
    existing.price = Math.max(existing.price, price);
    existing.type = 'material';
    existing.tradeable = true;
    return;
  }
  ITEMS.push({ id, name, type: 'material', rarity, levelReq: 1, classTags: [], stats: {}, effects: [], socketSlots: 0, tradeable: true, price, announceIfDropped: false });
};
addStone('sharpening_stone', 'Обычный камень усиления', 'common', 120);
addStone('enhance_stone_uncommon', 'Необычный камень усиления', 'uncommon', 420);
addStone('enhance_stone_rare', 'Редкий камень усиления', 'rare', 1600);
addStone('enhance_stone_epic', 'Эпический камень усиления', 'epic', 6800);
addStone('enhance_stone_legendary', 'Легендарный камень усиления', 'legendary', 24000);

const addWyrmShared = (prefix: 'wyrmspire' | 'wyrmspire_gold', rarity: Rarity, setId: string, name: string) => {
  const level = 20;
  const nonWeaponSlots = ['head', 'chest', 'legs', 'boots', 'ring', 'amulet'] as const;
  nonWeaponSlots.forEach((slot) => {
    const id = `${prefix}_${slot}`;
    if (ITEMS.some((item) => item.id === id)) return;
    const power = level + rarityScore[rarity] * 2;
    const stats: Record<string, number> = slot === 'ring' || slot === 'amulet'
      ? { hp: power * 3, mana: power * 2, attack: Math.floor(power / 3), magic: Math.floor(power / 3) }
      : slot === 'boots'
        ? { hp: power * 3, defense: Math.floor(power * 0.7), speed: Math.max(1, Math.floor(rarityScore[rarity] / 2)) }
        : { hp: power * 4, defense: Math.floor(power * 0.85) };
    ITEMS.push({
      id,
      name: `${slotName[slot]} ${name}`,
      type: slot === 'ring' || slot === 'amulet' ? 'accessory' : 'armor',
      rarity,
      levelReq: level,
      classTags: [],
      slot,
      stats,
      effects: [],
      socketSlots: rarity === 'legendary' ? 2 : 2,
      tradeable: true,
      price: Math.round(900 + level * level * rarityScore[rarity]),
      announceIfDropped: true,
      setId,
    });
  });
};
addWyrmShared('wyrmspire', 'epic', 'raid_wyrmspire', 'Вирмшпиля');
addWyrmShared('wyrmspire_gold', 'legendary', 'raid_wyrmspire_legendary', 'Первого Вирма');
rebalanceItemStats();
ITEMS.forEach((item) => {
  if (item.type === 'card') item.price = Math.max(item.price, item.rarity === 'rare' ? 120000 : item.rarity === 'epic' ? 240000 : 420000);
});


// v0.3.4 cleanup: card scaling, old Wyrm ID safety, and no class-split armor for Wyrm sets.
ITEMS.forEach((item) => {
  if (item.type === 'card') {
    const statPower = Object.values(item.stats).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
    const levelByCard: Record<string, number> = {
      slime_card: 1,
      wolf_card: 3,
      redcap_card: 5,
      moon_wisp_card: 4,
    };
    item.levelReq = levelByCard[item.id] ?? Math.max(item.levelReq, Math.min(20, Math.max(1, statPower * 2)));
    item.price = Math.max(item.price, Math.round(45000 + item.levelReq * item.levelReq * 1800 + statPower * rarityScore[item.rarity] * 22000));
  }
});

// Keep shared Wyrm armor/accessories only. Weapons stay class-specific.
for (let i = ITEMS.length - 1; i >= 0; i -= 1) {
  const item = ITEMS[i];
  if (/^wyrmspire(_gold)?_(warrior|ranger|mage|priest)_(head|chest|legs|boots|ring|amulet)$/.test(item.id)) ITEMS.splice(i, 1);
}

// Final price pass after legacy cleanup.
rebalanceItemStats();
ITEMS.forEach((item) => {
  if (item.type === 'card') {
    const statPower = Object.values(item.stats).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
    item.price = Math.max(item.price, Math.round(50000 + item.levelReq * item.levelReq * 2000 + statPower * rarityScore[item.rarity] * 24000));
  }
});


// v0.4.7 class-bound gear and named base sets.
const setFamilyByRarityLevel: Record<string, string> = {
  'common_1': 'Первой вылазки',
  'common_5': 'Старого тракта',
  'common_10': 'Пограничной стражи',
  'common_15': 'Северного привала',
  'common_20': 'Последнего рубежа',
  'uncommon_3': 'Зелёной дороги',
  'uncommon_8': 'Лесного дозора',
  'uncommon_13': 'Топяной заставы',
  'uncommon_18': 'Ледяного перевала',
  'rare_5': 'Синей заставы',
  'rare_10': 'Серебряного тракта',
  'rare_15': 'Глубокой топи',
  'rare_20': 'Стеклянного дозора',
  'epic_10': 'Чёрного корня',
  'epic_20': 'Вершины шпиля',
};

const classGearFlavor: Record<string, string> = {
  warrior: 'Воина',
  ranger: 'Стрелка',
  mage: 'Мага',
  priest: 'Жреца',
};

const inferSingleClassForItem = (item: ItemDefinition): string => {
  const id = item.id.toLowerCase();
  const name = item.name.toLowerCase();
  const raw = `${id} ${name}`;
  const setMatch = item.id.match(/^set_(common|uncommon|rare|epic)_(warrior|ranger|mage|priest)_(\d+)_(weapon|head|chest|legs|boots|ring|amulet)$/);
  if (setMatch) return setMatch[2];
  const instanceMatch = item.id.match(/^(old_lantern|thorn_crypt|blackroot|mire_depths|glass_catacomb|glass_catacomb_epic|wyrmspire|wyrmspire_gold)_(warrior|ranger|mage|priest)_(weapon|head|chest|legs|boots|ring|amulet)$/);
  if (instanceMatch) return instanceMatch[2];
  if (raw.includes('priest') || raw.includes('жрец') || raw.includes('часовн') || raw.includes('палад') || raw.includes('молит')) return 'priest';
  if (raw.includes('mage') || raw.includes('маг') || raw.includes('мант') || raw.includes('посох') || raw.includes('сфера') || raw.includes('фокус') || raw.includes('жезл') || raw.includes('скипетр')) return 'mage';
  if (raw.includes('ranger') || raw.includes('стрел') || raw.includes('лук') || raw.includes('охот') || raw.includes('следоп') || raw.includes('бегун')) return 'ranger';
  if (raw.includes('warrior') || raw.includes('воин') || raw.includes('меч') || raw.includes('алебард') || raw.includes('панцир') || raw.includes('шлем') || raw.includes('страж')) return 'warrior';
  const stats = item.stats ?? {};
  if ((stats.magic ?? 0) > (stats.attack ?? 0)) return (stats.mana ?? 0) > (stats.hp ?? 0) ? 'mage' : 'priest';
  if ((stats.speed ?? 0) > 0 && (stats.defense ?? 0) <= 3) return 'ranger';
  if ((stats.defense ?? 0) >= (stats.attack ?? 0)) return 'warrior';
  return 'ranger';
};

ITEMS.forEach((item) => {
  if (!item.slot || item.rarity === 'legendary') return;
  const singleClass = inferSingleClassForItem(item);
  item.classTags = [singleClass];
  const setMatch = item.id.match(/^set_(common|uncommon|rare|epic)_(warrior|ranger|mage|priest)_(\d+)_(weapon|head|chest|legs|boots|ring|amulet)$/);
  if (setMatch) {
    const [, rarity, classId, level, slot] = setMatch;
    const family = setFamilyByRarityLevel[`${rarity}_${level}`] ?? `${rarityName[rarity as Rarity]} ${level}`;
    item.name = `${slotName[slot]} ${family} ${classGearFlavor[classId]}`;
    item.setId = `${rarity}_${classId}_${level}`;
  }
});

// v0.4.9 economy: enhancement stones are cheaper.
ITEMS.forEach((item) => {
  if (item.type === 'material' && /камень усиления/i.test(item.name)) {
    item.price = Math.max(1, Math.round(item.price / 3));
  }
});

// v0.5.0 instance set cleanup and full raid/dungeon set pass.
const classIdsV050 = ['warrior', 'ranger', 'mage', 'priest'] as const;
const slotIdsV050 = ['weapon', 'head', 'chest', 'legs', 'boots', 'ring', 'amulet'] as const;
const classNameV050: Record<string, string> = { warrior: 'Воина', ranger: 'Стрелка', mage: 'Мага', priest: 'Жреца' };
const classMainV050: Record<string, 'attack' | 'magic'> = { warrior: 'attack', ranger: 'attack', mage: 'magic', priest: 'magic' };

// Remove old shared Wyrm armor/accessories. The raid set is now a full 28-piece class set.
for (let i = ITEMS.length - 1; i >= 0; i -= 1) {
  const item = ITEMS[i];
  if (/^wyrmspire(_gold)?_(head|chest|legs|boots|ring|amulet)$/.test(item.id)) ITEMS.splice(i, 1);
  if (/^set_epic_/.test(item.id)) ITEMS.splice(i, 1);
}

const ensureInstanceSetItem = (prefix: string, familyName: string, level: number, rarity: Rarity, setId: string, classId: string, slot: string) => {
  const id = `${prefix}_${classId}_${slot}`;
  const main = classMainV050[classId] ?? 'attack';
  const power = Math.round((level + 4) * (rarityStatMult[rarity] ?? 1) * (slotStatMult[slot] ?? 1));
  const stats: Record<string, number> = slot === 'weapon'
    ? { [main]: power + level }
    : slot === 'ring' || slot === 'amulet'
      ? { hp: power * 3, mana: (classId === 'mage' || classId === 'priest') ? power * 2 : power, [main]: Math.max(1, Math.round(power * 0.5)) }
      : slot === 'boots'
        ? { hp: power * 3, defense: Math.max(1, Math.round(power * 0.55)), speed: Math.max(1, Math.round(rarityScore[rarity] / 2)) }
        : { hp: power * 4, defense: Math.max(1, Math.round(power * 0.72)) };
  const existing = ITEMS.find((item) => item.id === id);
  const data = {
    name: `${slotName[slot]} ${familyName} ${classNameV050[classId]}`,
    type: slot === 'weapon' ? 'weapon' as const : (slot === 'ring' || slot === 'amulet' ? 'accessory' as const : 'armor' as const),
    rarity,
    levelReq: level,
    classTags: [classId],
    slot: slot as any,
    stats,
    effects: [],
    socketSlots: rarity === 'legendary' ? 2 : 2,
    tradeable: true,
    price: Math.round(900 + level * level * rarityScore[rarity] * (rarity === 'legendary' ? 2.4 : 1.35)),
    announceIfDropped: true,
    setId,
  };
  if (existing) Object.assign(existing, data);
  else ITEMS.push({ id, ...data });
};

const ensureFullClassSet = (prefix: string, familyName: string, level: number, rarity: Rarity, setId: string) => {
  classIdsV050.forEach((classId) => slotIdsV050.forEach((slot) => ensureInstanceSetItem(prefix, familyName, level, rarity, setId, classId, slot)));
};

// Every dungeon has an epic set. Raid has epic + legendary sets.
ensureFullClassSet('old_lantern', 'Старого Фонаря', 6, 'epic', 'dungeon_old_lantern');
ensureFullClassSet('thorn_crypt', 'Терновой Короны', 8, 'epic', 'dungeon_thorn_crypt');
ensureFullClassSet('blackroot', 'Чёрного Корня', 11, 'epic', 'dungeon_blackroot');
ensureFullClassSet('mire_depths', 'Глубокой Топи', 14, 'epic', 'dungeon_mire_depths');
ensureFullClassSet('frost_vault', 'Ледяного Хранилища', 18, 'epic', 'dungeon_frost_vault');
ensureFullClassSet('glass_catacomb', 'Стеклянных Катакомб', 20, 'epic', 'dungeon_glass_catacomb_epic');
ensureFullClassSet('wyrmspire', 'Вирмшпиля', 20, 'epic', 'raid_wyrmspire');
ensureFullClassSet('wyrmspire_gold', 'Первого Вирма', 20, 'legendary', 'raid_wyrmspire_legendary');

// Dungeon sets that were blue are now purple.
ITEMS.forEach((item) => {
  if (item.setId?.startsWith('dungeon_')) {
    item.rarity = 'epic';
    item.socketSlots = Math.max(1, item.socketSlots ?? 1);
    item.price = Math.max(item.price, Math.round(700 + item.levelReq * item.levelReq * rarityScore.epic * 1.4));
  }
});
rebalanceItemStats();


// v0.5.1 canonical item pass. This is the only final authority for broken legacy set shapes.
const canonicalClassIds = ['warrior', 'ranger', 'mage', 'priest'] as const;
const canonicalSlots = ['weapon', 'head', 'chest', 'legs', 'boots', 'ring', 'amulet'] as const;
const glassCanonicalSlots = ['weapon', 'chest', 'legs', 'ring', 'amulet'] as const;
const sharedWyrmSlots = ['head', 'chest', 'legs', 'boots', 'ring', 'amulet'] as const;
const canonicalClassLabel: Record<string, string> = { warrior: 'Воина', ranger: 'Стрелка', mage: 'Мага', priest: 'Жреца' };
const sourceNames: Record<string, string> = {
  dungeon_old_lantern: 'Погреб Старого Фонаря',
  dungeon_thorn_crypt: 'Склеп Терновой Короны',
  dungeon_blackroot: 'Дозор Чёрного Корня',
  dungeon_mire_depths: 'Глубины Топи',
  dungeon_frost_vault: 'Ледяное Хранилище',
  dungeon_glass_catacomb: 'Стеклянные Катакомбы',
  raid_wyrmspire: 'Вирмшпиль: первый подъём',
  raid_wyrmspire_legendary: 'Вирмшпиль: первый подъём',
};
const sourceIds: Record<string, string> = {
  dungeon_old_lantern: 'old_lantern_cellar',
  dungeon_thorn_crypt: 'thorn_crown_crypt',
  dungeon_blackroot: 'blackroot_watch',
  dungeon_mire_depths: 'mire_depths',
  dungeon_frost_vault: 'frost_vault',
  dungeon_glass_catacomb: 'glass_catacomb',
  raid_wyrmspire: 'wyrmspire_first_raid',
  raid_wyrmspire_legendary: 'wyrmspire_first_raid',
};

const canonicalRemove = (predicate: (item: ItemDefinition) => boolean) => {
  for (let i = ITEMS.length - 1; i >= 0; i -= 1) {
    if (predicate(ITEMS[i])) ITEMS.splice(i, 1);
  }
};

const canonicalItemData = (
  id: string,
  name: string,
  level: number,
  rarity: Rarity,
  setId: string,
  slot: string,
  classTags: string[],
  sourceType: 'general' | 'dungeon' | 'raid' | 'world',
  sourceId?: string,
  sourceName?: string,
) => {
  const mainClass = classTags[0] ?? (slot === 'weapon' ? 'warrior' : 'warrior');
  const main = classMainV050[mainClass] ?? 'attack';
  const power = Math.max(2, Math.round((level + 5) * (rarityStatMult[rarity] ?? 1) * (slotStatMult[slot] ?? 1)));
  const stats: Record<string, number> = slot === 'weapon'
    ? { [main]: power + level }
    : slot === 'ring' || slot === 'amulet'
      ? { hp: power * 3, mana: classTags.includes('mage') || classTags.includes('priest') || classTags.length === 0 ? power * 2 : power, [main]: Math.max(1, Math.round(power * 0.45)) }
      : slot === 'boots'
        ? { hp: power * 3, defense: Math.max(1, Math.round(power * 0.55)), speed: Math.max(1, Math.round(rarityScore[rarity] / 2)) }
        : { hp: power * 4, defense: Math.max(1, Math.round(power * 0.75)) };
  return {
    id,
    name,
    type: slot === 'weapon' ? 'weapon' as const : (slot === 'ring' || slot === 'amulet' ? 'accessory' as const : 'armor' as const),
    rarity,
    levelReq: level,
    classTags,
    slot: slot as any,
    stats,
    effects: [],
    socketSlots: rarity === 'legendary' ? 2 : rarity === 'epic' ? 2 : rarity === 'rare' ? 1 : 0,
    tradeable: true,
    price: Math.round(800 + level * level * rarityScore[rarity] * (rarity === 'legendary' ? 3.2 : rarity === 'epic' ? 1.85 : 1.15)),
    announceIfDropped: true,
    setId,
    sourceType,
    sourceId,
    sourceName,
  };
};

const upsertCanonicalItem = (data: ItemDefinition) => {
  const index = ITEMS.findIndex((item) => item.id === data.id);
  if (index >= 0) ITEMS[index] = { ...ITEMS[index], ...data };
  else ITEMS.push(data);
};

// First Wyrm legendary set: 4 class weapons + 6 shared pieces = 10.
canonicalRemove((item) => /^wyrmspire_gold_(warrior|ranger|mage|priest)_(head|chest|legs|boots|ring|amulet)$/.test(item.id));
canonicalRemove((item) => /^wyrmspire_gold_(head|chest|legs|boots|ring|amulet)$/.test(item.id));
canonicalClassIds.forEach((classId) => {
  upsertCanonicalItem(canonicalItemData(
    `wyrmspire_gold_${classId}_weapon`,
    `Оружие Первого Вирма ${canonicalClassLabel[classId]}`,
    20,
    'legendary',
    'raid_wyrmspire_legendary',
    'weapon',
    [classId],
    'raid',
    'wyrmspire_first_raid',
    'Вирмшпиль: первый подъём',
  ));
});
sharedWyrmSlots.forEach((slot) => {
  upsertCanonicalItem(canonicalItemData(
    `wyrmspire_gold_${slot}`,
    `${slotName[slot]} Первого Вирма`,
    20,
    'legendary',
    'raid_wyrmspire_legendary',
    slot,
    [],
    'raid',
    'wyrmspire_first_raid',
    'Вирмшпиль: первый подъём',
  ));
});

// Glass Catacombs canonical set: 20 items = 4 classes × 5 slots.
canonicalRemove((item) => /^glass_catacomb_epic_/.test(item.id));
canonicalRemove((item) => /^glass_catacomb_(warrior|ranger|mage|priest)_(head|boots)$/.test(item.id));
canonicalClassIds.forEach((classId) => {
  glassCanonicalSlots.forEach((slot) => {
    upsertCanonicalItem(canonicalItemData(
      `glass_catacomb_${classId}_${slot}`,
      `${slotName[slot]} Стеклянных Катакомб ${canonicalClassLabel[classId]}`,
      20,
      'epic',
      'dungeon_glass_catacomb',
      slot,
      [classId],
      'dungeon',
      'glass_catacomb',
      'Стеклянные Катакомбы',
    ));
  });
});

// Stable source metadata for all sets and general gear.
ITEMS.forEach((item) => {
  if (item.setId?.startsWith('dungeon_')) {
    item.sourceType = 'dungeon';
    item.sourceId = sourceIds[item.setId] ?? item.sourceId;
    item.sourceName = sourceNames[item.setId] ?? item.sourceName ?? 'Данж';
  } else if (item.setId?.startsWith('raid_')) {
    item.sourceType = 'raid';
    item.sourceId = sourceIds[item.setId] ?? item.sourceId;
    item.sourceName = sourceNames[item.setId] ?? item.sourceName ?? 'Рейд';
  } else if (item.setId) {
    item.sourceType = 'general';
    item.sourceName = 'Общий сет';
  } else if (!item.sourceType) {
    item.sourceType = 'world';
    item.sourceName = 'Мир';
  }
});

rebalanceItemStats();
