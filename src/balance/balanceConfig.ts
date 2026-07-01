import type { EquipmentSlot, ItemType, Rarity, RoleFocus } from '../types/game';

export const MAX_LEVEL = 20;

export const RARITY_POWER: Record<Rarity, number> = {
  common: 1,
  uncommon: 1.32,
  rare: 1.78,
  epic: 2.55,
  legendary: 4.25,
  mythic: 5.8,
  unique: 6.8,
};

export const RARITY_SCORE: Record<Rarity, number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  legendary: 5,
  mythic: 6,
  unique: 7,
};

export const ITEM_TYPE_POWER: Record<ItemType, number> = {
  weapon: 1.35,
  armor: 1.08,
  accessory: 1.18,
  card: 3.05,
  consumable: 0.18,
  material: 0.34,
  mount: 5,
  pet: 3.6,
  cosmetic: 2.2,
  quest: 0,
};

export const SLOT_POWER: Record<EquipmentSlot, number> = {
  weapon: 1.55,
  chest: 1.32,
  head: 1.08,
  legs: 1.18,
  boots: 0.92,
  ring: 0.88,
  amulet: 1.0,
};

export const MOB_TAG_POWER: Record<string, number> = {
  starter: 0.9,
  beast: 1,
  humanoid: 1.04,
  magic: 1.08,
  tough: 1.12,
  elite: 1.38,
  dungeon: 1.55,
  'mini-boss': 2.1,
  boss: 3.2,
  raid: 5.2,
  aoe: 1.18,
};

export const XP_CURVE = {
  base: 55,
  early: 36,
  mid: 66,
  high: 108,
  late: 172,
  exponent: 1.50,
};

export const GOLD_REWARD = {
  base: 2.6,
  levelSquare: 0.72,
  statScale: 0.028,
};

export const ITEM_PRICE = {
  base: 8,
  levelSquare: 6.4,
  statPower: 8.2,
  socket: 62,
  set: 1.14,
  dungeon: 1.2,
  raid: 1.42,
  legendaryFloor: 7800,
};

export const CARD_PRICE = {
  perGearScore: 128,
  firstWyrmId: 'card_first_wyrm',
  firstWyrmGearScore: 390,
  firstWyrmPrice: 50000,
  bossMultiplier: 1.2,
  raidMultiplier: 1.38,
};

export const GEAR_SCORE = {
  stat: 0.95,
  level: 5.0,
  rarity: 14,
  socket: 10,
  enhancementBase: 11,
  cardStringFallback: 8,
};

export const ENHANCEMENT_VALUE = {
  linear: 11,
  rarity: 1.15,
  highStart: 7,
  highBonus: 3.4,
};

export const DUNGEON_DIFFICULTY = {
  dungeon: 1.55,
  raid: 2.6,
  boss: 2.1,
  floor: 0.18,
};

export const ROLE_WEALTH_MULTIPLIER: Record<RoleFocus | 'PLAYER' | string, number> = {
  PLAYER: 1,
  pve: 1.12,
  pvp: 1.02,
  mixed: 1.08,
};

export const ROLE_ARENA_MULTIPLIER: Record<RoleFocus | 'PLAYER' | string, number> = {
  PLAYER: 1,
  pve: 0.94,
  pvp: 1.16,
  mixed: 1.04,
};
