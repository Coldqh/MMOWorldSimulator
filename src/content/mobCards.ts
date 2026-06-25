import type { ItemDefinition, MobDefinition, Rarity } from '../types/game';
import { calculateCardPrice } from '../balance';
import { rarityScore } from './itemFinalize';

export const getMobCardId = (mob: Pick<MobDefinition, 'id'>) => `card_${mob.id}`;

export const getMobCardRarity = (mob: MobDefinition): Rarity => {
  if (mob.id === 'first_wyrm') return 'legendary';
  if (mob.tags.includes('raid') && mob.tags.includes('boss')) return 'legendary';
  if (mob.tags.includes('boss')) return 'epic';
  if (mob.tags.includes('dungeon') || mob.tags.includes('elite') || mob.tags.includes('mini-boss')) return 'epic';
  return 'rare';
};

export const getMobCardStats = (mob: MobDefinition): ItemDefinition['stats'] => {
  if (mob.id === 'first_wyrm') return { hp: 160, defense: 20, attack: 20, magic: 14 };

  const rarity = getMobCardRarity(mob);
  const scale = Math.max(1, Math.round(mob.level / 4)) + Math.max(0, (rarityScore[rarity] ?? 1) - 4);

  if ((mob.stats.magic ?? 0) > (mob.stats.attack ?? 0)) {
    return { magic: Math.max(1, scale), mana: Math.max(6, scale * 8) };
  }

  if ((mob.stats.defense ?? 0) > (mob.stats.attack ?? 0) * 0.72 || mob.tags.includes('boss')) {
    return { defense: Math.max(1, Math.round(scale * 0.75)), hp: Math.max(12, scale * 14) };
  }

  return { attack: Math.max(1, scale), speed: mob.stats.speed >= 10 ? 1 : 0 };
};

export const getMobCardDropChance = (mob: MobDefinition) => {
  if (mob.tags.includes('raid') && mob.tags.includes('boss')) return 0.000006;
  if (mob.tags.includes('boss')) return 0.00001;
  if (mob.tags.includes('dungeon') || mob.tags.includes('elite') || mob.tags.includes('mini-boss')) return 0.00002;
  return 0.000035;
};

export const createMobCard = (mob: MobDefinition): ItemDefinition => {
  const card: ItemDefinition = {
    id: getMobCardId(mob),
    name: `Карта: ${mob.name}`,
    type: 'card',
    rarity: getMobCardRarity(mob),
    levelReq: mob.level,
    classTags: [],
    stats: getMobCardStats(mob),
    effects: [],
    socketSlots: 0,
    tradeable: true,
    price: 1,
    announceIfDropped: true,
    sourceType: mob.tags.includes('raid') ? 'raid' : mob.tags.includes('boss') || mob.tags.includes('dungeon') ? 'dungeon' : 'world',
    sourceId: mob.id,
    sourceName: mob.name,
  };
  return { ...card, price: calculateCardPrice(card, mob) };
};

export const createMobCardsForMobs = (mobs: MobDefinition[]): ItemDefinition[] => {
  const byId = new Map<string, ItemDefinition>();
  mobs.forEach((mob) => byId.set(getMobCardId(mob), createMobCard(mob)));
  return [...byId.values()];
};
