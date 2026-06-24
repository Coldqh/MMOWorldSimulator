import { getClassById } from '../content/classes';
import { ITEMS, getItemById, normalizeLegacyItemId, rarityScore } from '../content/items';
import { getRaceById } from '../content/races';
import type { Rng } from '../engine/rng';
import type { Equipment, EquipmentSlot, InventoryStack, ItemDefinition, ItemInstance, NpcPlayer, Player, StatBlock } from '../types/game';

const stackEnhance = (entry: InventoryStack) => entry.enhancement ?? 0;
const stackCards = (entry: InventoryStack | ItemInstance) => [...(entry.cardIds ?? [])].sort().join('|');
const sameStack = (entry: InventoryStack, itemId: string, enhancement = 0, cardIds: string[] = [], socketSlots?: number) =>
  normalizeLegacyItemId(entry.itemId) === normalizeLegacyItemId(itemId) && stackEnhance(entry) === enhancement && stackCards(entry) === [...cardIds].sort().join('|') && (socketSlots === undefined || entry.socketSlots === undefined || entry.socketSlots === socketSlots);

export const socketSlotsForItem = (item: ItemDefinition, seed = 0) => {
  if (!item.slot) return 0;
  if (item.rarity === 'rare') return Math.abs(seed) % 2 === 0 ? 1 : 0;
  if (item.rarity === 'epic') return 1 + (Math.abs(seed) % 2);
  if (item.rarity === 'legendary' || item.rarity === 'mythic' || item.rarity === 'unique') return 2;
  return Math.max(0, item.socketSlots ?? 0);
};

const instanceSocketSlots = (item: ItemDefinition, instance?: Pick<ItemInstance, 'instanceId' | 'socketSlots'> | Pick<InventoryStack, 'itemId' | 'enhancement' | 'cardIds' | 'socketSlots'>) => {
  if (instance && typeof (instance as any).socketSlots === 'number') return Math.max(0, (instance as any).socketSlots);
  const raw = instance && 'instanceId' in instance ? instance.instanceId : `${item.id}_${(instance as InventoryStack | undefined)?.enhancement ?? 0}`;
  const seed = [...raw].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return socketSlotsForItem(item, seed);
};

export const getSocketSlotCount = instanceSocketSlots;

export const addInventoryItem = (inventory: InventoryStack[], itemId: string, amount = 1, enhancement = 0, cardIds: string[] = []): InventoryStack[] => {
  itemId = normalizeLegacyItemId(itemId);
  const item = getItemById(itemId);
  const socketSlots = item?.slot ? socketSlotsForItem(item, Math.floor(Math.random() * 1000000) + itemId.length + enhancement + cardIds.length) : undefined;
  const existing = inventory.find((entry) => sameStack(entry, itemId, enhancement, cardIds, socketSlots));
  if (existing) {
    return inventory.map((entry) => (sameStack(entry, itemId, enhancement, cardIds, socketSlots) ? { ...entry, amount: entry.amount + amount, enhancement, cardIds, socketSlots } : entry));
  }
  return [...inventory, { itemId, amount, enhancement, cardIds, socketSlots }];
};

export const removeInventoryItem = (inventory: InventoryStack[], itemId: string, amount = 1, enhancement = 0, cardIds: string[] = []): InventoryStack[] => {
  itemId = normalizeLegacyItemId(itemId);
  return inventory
    .map((entry) => (sameStack(entry, itemId, enhancement, cardIds) ? { ...entry, amount: entry.amount - amount } : entry))
    .filter((entry) => entry.amount > 0);
};

export const normalizeInventory = (inventory: InventoryStack[] = []): InventoryStack[] => {
  return inventory
    .filter((entry) => Boolean(getItemById(entry.itemId)))
    .reduce<InventoryStack[]>((result, entry) => addInventoryItem(result, normalizeLegacyItemId(entry.itemId), entry.amount, entry.enhancement ?? 0, entry.cardIds ?? []), []);
};

export const canUseItem = (player: Player, item: ItemDefinition) => {
  if (player.level < item.levelReq) return false;
  if (item.classTags.length === 0) return true;
  return item.classTags.includes(player.classId);
};

export const canEquipItem = (player: Player, item: ItemDefinition) => {
  if (!item.slot) return false;
  return canUseItem(player, item);
};

export const equipInventoryItem = (player: Player, itemId: string, seed = Date.now(), enhancement = 0, cardIds: string[] = []): Player => {
  const item = getItemById(itemId);
  if (!item || !item.slot || !canEquipItem(player, item)) return player;
  const stack = player.inventory.find((entry) => sameStack(entry, itemId, enhancement, cardIds));
  if (!stack || stack.amount <= 0) return player;

  const slot = item.slot as EquipmentSlot;
  const previous = player.equipment[slot];
  let inventory = removeInventoryItem(player.inventory, itemId, 1, enhancement, cardIds);
  if (previous) inventory = addInventoryItem(inventory, previous.itemId, 1, previous.enhancement, previous.cardIds ?? []);

  return {
    ...player,
    inventory,
    equipment: {
      ...player.equipment,
      [slot]: {
        instanceId: `equipped_${itemId}_${enhancement}_${seed}_${cardIds.join('_')}`,
        itemId,
        enhancement,
        cardIds,
        socketSlots: stack.socketSlots ?? socketSlotsForItem(item, itemId.length + enhancement + cardIds.length),
      }
    }
  };
};

export const getItemStatScore = (item: ItemDefinition) => Object.values(item.stats).reduce((sum, value) => sum + Math.abs(value ?? 0), 0);

export const getInstanceGearScore = (item: ItemDefinition, enhancement = 0, cardIds: string[] = []) => {
  const cardPower = cardIds
    .map((id) => getItemById(id))
    .filter((card): card is ItemDefinition => Boolean(card))
    .reduce((sum, card) => sum + getItemStatScore(card) + (rarityScore[card.rarity] ?? 1) * 2, 0);
  return Math.round(getItemStatScore(item) + enhancement * 9 + rarityScore[item.rarity] * 8 + item.levelReq * 4 + socketSlotsForItem(item, item.id.length) * 5 + cardPower);
};

const addStats = (result: Partial<StatBlock>, stats: Partial<StatBlock>, multiplier = 1) => {
  Object.entries(stats).forEach(([key, value]) => {
    const statKey = key as keyof StatBlock;
    result[statKey] = (result[statKey] ?? 0) + (value ?? 0) * multiplier;
  });
};

export const getEquipmentStats = (equipment: Equipment): Partial<StatBlock> => {
  const result: Partial<StatBlock> = {};

  Object.values(equipment).forEach((instance) => {
    if (!instance) return;
    const item = getItemById(instance.itemId);
    if (!item) return;

    Object.entries(item.stats).forEach(([key, value]) => {
      const statKey = key as keyof StatBlock;
      const enhancementBonus = item.slot === 'weapon' && statKey === 'attack' ? instance.enhancement * 2 : instance.enhancement;
      result[statKey] = (result[statKey] ?? 0) + (value ?? 0) + enhancementBonus;
    });
    (instance.cardIds ?? []).forEach((cardId: string) => {
      const card = getItemById(cardId);
      if (card?.type === 'card') addStats(result, card.stats);
    });
  });

  return result;
};

export const getPlayerStats = (player: Player): StatBlock => {
  const classData = getClassById(player.classId);
  const base = classData?.baseStats ?? { hp: 80, mana: 40, attack: 8, magic: 4, defense: 3, speed: 5 };
  const race = getRaceById(player.raceId);
  const raceBonus = race?.statBonus ?? {};
  const equipment = getEquipmentStats(player.equipment);

  return {
    hp: Math.round(base.hp + player.level * 12 + (raceBonus.hp ?? 0) + (equipment.hp ?? 0)),
    mana: Math.round(base.mana + player.level * 5 + (raceBonus.mana ?? 0) + (equipment.mana ?? 0)),
    attack: Math.round(base.attack + player.level * 2 + (raceBonus.attack ?? 0) + (equipment.attack ?? 0)),
    magic: Math.round(base.magic + player.level * 2 + (raceBonus.magic ?? 0) + (equipment.magic ?? 0)),
    defense: Math.round(base.defense + Math.floor(player.level * 1.5) + (raceBonus.defense ?? 0) + (equipment.defense ?? 0)),
    speed: Math.round(base.speed + (raceBonus.speed ?? 0) + (equipment.speed ?? 0))
  };
};

export const getGearScore = (equipment: Equipment) => {
  let score = 0;
  Object.values(equipment).forEach((instance) => {
    if (!instance) return;
    const item = getItemById(instance.itemId);
    if (!item) return;
    score += getInstanceGearScore(item, instance.enhancement, instance.cardIds ?? []);
  });
  return Math.round(score);
};

export const equipmentEntries = (equipment: Equipment): Array<{ slot: EquipmentSlot; instance: ItemInstance }> => {
  return (Object.entries(equipment) as Array<[EquipmentSlot, ItemInstance | undefined]>)
    .filter((entry): entry is [EquipmentSlot, ItemInstance] => Boolean(entry[1]))
    .map(([slot, instance]) => ({ slot, instance }));
};

export const canNpcUseItem = (npc: Pick<NpcPlayer, 'level' | 'classId'>, item: ItemDefinition) => {
  if (npc.level < item.levelReq) return false;
  if (item.classTags.length === 0) return true;
  return item.classTags.includes(npc.classId);
};

const buildInstance = (itemId: string, seed: string, enhancement = 0, cardIds: string[] = []): ItemInstance => {
  const item = getItemById(itemId);
  return {
    instanceId: `npc_item_${itemId}_${seed}`,
    itemId,
    enhancement,
    cardIds,
    socketSlots: item?.slot ? socketSlotsForItem(item, [...seed].reduce((sum, ch) => sum + ch.charCodeAt(0), 0)) : undefined,
  };
};

export const bestItemsForNpc = (classId: string, level: number, slot: EquipmentSlot, limit = 8) => {
  return ITEMS
    .filter((item) => item.slot === slot && canNpcUseItem({ classId, level }, item))
    .sort((a, b) => getInstanceGearScore(b, 0) - getInstanceGearScore(a, 0))
    .slice(0, limit);
};


const orderedSlots: EquipmentSlot[] = ['weapon', 'chest', 'head', 'legs', 'boots', 'ring', 'amulet'];
const npcRarityPool: Array<ItemDefinition['rarity']> = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

const weightedPick = <T,>(rng: Rng, entries: Array<{ value: T; weight: number }>): T => {
  const total = entries.reduce((sum, entry) => sum + Math.max(0, entry.weight), 0);
  if (total <= 0) return entries[0].value;
  let roll = rng.next() * total;
  for (const entry of entries) {
    roll -= Math.max(0, entry.weight);
    if (roll <= 0) return entry.value;
  }
  return entries[entries.length - 1].value;
};

const rarityWeightsForNpc = (level: number, power = 0.5): Array<{ value: ItemDefinition['rarity']; weight: number }> => {
  const p = Math.max(0, Math.min(1, power));
  if (level >= 20) {
    return [
      { value: 'rare', weight: Math.max(2, 24 - p * 18) },
      { value: 'epic', weight: 50 + p * 18 },
      { value: 'legendary', weight: Math.max(1, 4 + p * 22) },
      { value: 'uncommon', weight: Math.max(0, 7 - p * 7) },
      { value: 'common', weight: Math.max(0, 3 - p * 3) },
    ];
  }
  if (level >= 15) {
    return [
      { value: 'common', weight: 5 },
      { value: 'uncommon', weight: 18 },
      { value: 'rare', weight: 52 },
      { value: 'epic', weight: 20 + p * 8 },
      { value: 'legendary', weight: 0 },
    ];
  }
  if (level >= 10) {
    return [
      { value: 'common', weight: 10 },
      { value: 'uncommon', weight: 28 },
      { value: 'rare', weight: 46 },
      { value: 'epic', weight: 8 + p * 7 },
      { value: 'legendary', weight: 0 },
    ];
  }
  if (level >= 5) {
    return [
      { value: 'common', weight: 32 },
      { value: 'uncommon', weight: 42 },
      { value: 'rare', weight: 20 },
      { value: 'epic', weight: 2 + p * 2 },
      { value: 'legendary', weight: 0 },
    ];
  }
  return [
    { value: 'common', weight: 72 },
    { value: 'uncommon', weight: 25 },
    { value: 'rare', weight: 3 },
    { value: 'epic', weight: 0 },
    { value: 'legendary', weight: 0 },
  ];
};

const enhancementForNpc = (level: number, rarity: ItemDefinition['rarity'], rng: Rng, power = 0.5) => {
  const p = Math.max(0, Math.min(1, power));
  const rarityBoost = rarity === 'legendary' ? 2 : rarity === 'epic' ? 1 : rarity === 'rare' ? 0 : -1;
  if (level >= 20) {
    const max = Math.max(1, Math.round(3 + p * 8 + rarityBoost));
    const min = p > 0.82 ? 5 : p > 0.62 ? 3 : p > 0.36 ? 1 : 0;
    return rng.int(Math.max(0, min), Math.max(min, max));
  }
  if (level >= 15) return rng.chance(0.45 + p * 0.25) ? rng.int(0, Math.max(1, Math.round(3 + p * 4 + rarityBoost))) : 0;
  if (level >= 10) return rng.chance(0.28 + p * 0.2) ? rng.int(0, Math.max(1, Math.round(2 + p * 3 + rarityBoost))) : 0;
  if (level >= 5) return rng.chance(0.18 + p * 0.1) ? rng.int(0, Math.max(1, 2 + rarityBoost)) : 0;
  return rng.chance(0.08) ? 1 : 0;
};

const chooseNpcItem = (classId: string, level: number, slot: EquipmentSlot, rng: Rng, power = 0.5): ItemDefinition | undefined => {
  const usable = ITEMS
    .filter((item) => item.slot === slot && canNpcUseItem({ classId, level }, item))
    .filter((item) => item.levelReq <= level && item.rarity !== 'mythic' && item.rarity !== 'unique')
    .sort((a, b) => {
      const levelScore = Math.abs(level - a.levelReq) - Math.abs(level - b.levelReq);
      if (levelScore !== 0) return levelScore;
      return getInstanceGearScore(b, 0) - getInstanceGearScore(a, 0);
    });
  if (usable.length === 0) return undefined;

  const desired = weightedPick(rng, rarityWeightsForNpc(level, power));
  const desiredCandidates = usable.filter((item) => item.rarity === desired);
  const nearbyDesired = desiredCandidates.filter((item) => level - item.levelReq <= 5);
  const pool = (nearbyDesired.length ? nearbyDesired : desiredCandidates.length ? desiredCandidates : usable).slice(0, Math.max(3, Math.min(10, usable.length)));
  const weighted = pool.map((item, index) => ({
    value: item,
    weight: Math.max(1, 12 - index * 1.3 + (item.levelReq / Math.max(1, level)) * 2 + (rarityScore[item.rarity] ?? 1) * Math.max(0.2, power)),
  }));
  return weightedPick(rng, weighted);
};

export const generateEquipmentForClassLevel = (classId: string, level: number, rng: Rng): Equipment => {
  const power = level >= 20 ? 0.22 + rng.next() * 0.42 : 0.18 + rng.next() * 0.34;
  return generateScaledEquipmentForClassLevel(classId, level, rng, power);
};

export const equipNpcItemIfBetter = (npc: NpcPlayer, itemId: string, rng: Rng): { npc: NpcPlayer; equipped: boolean; oldItem?: ItemInstance } => {
  const item = getItemById(itemId);
  if (!item || !item.slot || !canNpcUseItem(npc, item)) return { npc, equipped: false };
  const slot = item.slot;
  const current = npc.equipment?.[slot];
  const currentItem = current ? getItemById(current.itemId) : undefined;
  const currentScore = current && currentItem ? getInstanceGearScore(currentItem, current.enhancement, current.cardIds ?? []) : 0;
  const newScore = getInstanceGearScore(item, 0);
  if (newScore <= currentScore + 2) return { npc, equipped: false };
  const nextEquipment = { ...(npc.equipment ?? {}), [slot]: buildInstance(item.id, `${npc.id}_${rng.int(1, 999999)}`, 0) };
  const nextNpc = { ...npc, equipment: nextEquipment, gearScore: getGearScore(nextEquipment) };
  return { npc: nextNpc, equipped: true, oldItem: current };
};

const sanitizeEquipment = (equipment: Equipment = {}): Equipment => {
  const next: Equipment = {};
  (Object.entries(equipment) as Array<[EquipmentSlot, ItemInstance | undefined]>).forEach(([slot, instance]) => {
    if (instance && getItemById(instance.itemId)) next[slot] = { ...instance, itemId: normalizeLegacyItemId(instance.itemId) };
  });
  return next;
};

export const normalizeNpcEquipmentAndGear = (npc: NpcPlayer, rng: Rng): NpcPlayer => {
  const current = sanitizeEquipment(npc.equipment ?? {});
  const fallback = generateEquipmentForClassLevel(npc.classId, npc.level, rng);
  const equipment: Equipment = { ...fallback, ...current };
  return { ...npc, equipment, inventory: normalizeInventory(npc.inventory ?? []), gearScore: getGearScore(equipment) };
};

export const socketCardIntoEquipment = (player: Player, slot: EquipmentSlot, cardId: string): Player => {
  const card = getItemById(cardId);
  const instance = player.equipment[slot];
  if (!card || card.type !== 'card' || !instance) return player;
  const item = getItemById(instance.itemId);
  if (!item) return player;
  const used = instance.cardIds ?? [];
  if (used.length >= instanceSocketSlots(item, instance)) return player;
  const stack = player.inventory.find((entry) => entry.itemId === cardId && (entry.enhancement ?? 0) === 0);
  if (!stack) return player;
  return {
    ...player,
    inventory: removeInventoryItem(player.inventory, cardId, 1, 0),
    equipment: {
      ...player.equipment,
      [slot]: { ...instance, cardIds: [...used, cardId] },
    },
  };
};

export const socketCardIntoInventoryItem = (player: Player, itemId: string, enhancement: number, cardIds: string[], cardId: string): Player => {
  const item = getItemById(itemId);
  const card = getItemById(cardId);
  if (!item || !card || card.type !== 'card') return player;
  const stack = player.inventory.find((entry) => sameStack(entry, itemId, enhancement, cardIds));
  if (!stack) return player;
  if (cardIds.length >= instanceSocketSlots(item, stack)) return player;
  const cardStack = player.inventory.find((entry) => entry.itemId === cardId && (entry.enhancement ?? 0) === 0);
  if (!cardStack) return player;
  let inventory = removeInventoryItem(player.inventory, itemId, 1, enhancement, cardIds);
  inventory = removeInventoryItem(inventory, cardId, 1, 0);
  inventory = addInventoryItem(inventory, itemId, 1, enhancement, [...cardIds, cardId]);
  return { ...player, inventory };
};



export const generateScaledEquipmentForClassLevel = (classId: string, level: number, rng: Rng, power = 0.5): Equipment => {
  const equipment: Equipment = {};
  const normalizedPower = Math.max(0, Math.min(1, power));
  orderedSlots.forEach((slot) => {
    const item = chooseNpcItem(classId, level, slot, rng, normalizedPower);
    if (!item) return;
    const enhancement = enhancementForNpc(level, item.rarity, rng, normalizedPower);
    equipment[slot] = buildInstance(item.id, `scaled_${classId}_${level}_${slot}_${Math.round(normalizedPower * 1000)}_${rng.int(1, 999999)}`, enhancement);
  });
  return equipment;
};

export const generateEliteEquipmentForClassLevel = (classId: string, level: number, rng: Rng, minEnhance = 6, maxEnhance = 11): Equipment => {
  const power = Math.max(0.68, Math.min(1, 0.76 + rng.next() * 0.24));
  const equipment = generateScaledEquipmentForClassLevel(classId, level, rng, power);
  orderedSlots.forEach((slot) => {
    const instance = equipment[slot];
    if (!instance) return;
    const item = getItemById(instance.itemId);
    if (!item) return;
    const highRoll = rng.chance(item.rarity === 'legendary' ? 0.65 : item.rarity === 'epic' ? 0.48 : 0.25);
    equipment[slot] = {
      ...instance,
      enhancement: highRoll ? rng.int(minEnhance, maxEnhance) : Math.max(instance.enhancement, rng.int(3, Math.min(maxEnhance, Math.max(3, minEnhance + 1))))
    };
  });
  return equipment;
};
