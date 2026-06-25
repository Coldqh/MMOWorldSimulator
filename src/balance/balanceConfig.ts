import type { EquipmentSlot, ItemType, Rarity, RoleFocus } from '../types/game';

export const MAX_LEVEL = 20;

export const RARITY_POWER: Record<Rarity, number> = {
  common: 1,
  uncommon: 1.35,
  rare: 1.85,
  epic: 2.65,
  legendary: 4.1,
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
  card: 3.2,
  consumable: 0.28,
  material: 0.46,
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
  early: 42,
  mid: 72,
  high: 118,
  late: 190,
  exponent: 1.52,
};

export const GOLD_REWARD = {
  base: 2.6,
  levelSquare: 0.72,
  statScale: 0.028,
};

export const ITEM_PRICE = {
  base: 8,
  levelSquare: 7.2,
  statPower: 9.5,
  socket: 70,
  set: 1.18,
  dungeon: 1.22,
  raid: 1.45,
  legendaryFloor: 8500,
};

export const CARD_PRICE = {
  perGearScore: 128,
  firstWyrmId: 'card_first_wyrm',
  firstWyrmGearScore: 390,
  firstWyrmPrice: 50000,
  bossMultiplier: 1.15,
  raidMultiplier: 1.35,
};

export const GEAR_SCORE = {
  stat: 1.0,
  level: 5.2,
  rarity: 15,
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
  PVE_FARMER: 1.04,
  RAIDER: 1.2,
  PVP_PLAYER: 1.12,
  GUILD_PLAYER: 1.06,
  COLLECTOR: 1.16,
  TRADER: 1.55,
  CASUAL: 0.72,
  HARDCORE: 1.28,
  LEADER: 1.22,
  DRAMA: 0.84,
};

export const ROLE_ARENA_MULTIPLIER: Record<RoleFocus | 'PLAYER' | string, number> = {
  PLAYER: 1,
  PVE_FARMER: 0.86,
  RAIDER: 1.08,
  PVP_PLAYER: 1.18,
  GUILD_PLAYER: 1.05,
  COLLECTOR: 0.92,
  TRADER: 0.78,
  CASUAL: 0.8,
  HARDCORE: 1.14,
  LEADER: 1.07,
  DRAMA: 0.88,
};
