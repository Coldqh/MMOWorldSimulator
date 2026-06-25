import type { DungeonDefinition, ItemDefinition, MobDefinition, Rarity, EquipmentSlot, ItemType, RoleFocus } from '../types/game';

export interface ItemBudgetInput {
  level: number;
  rarity: Rarity;
  type: ItemType;
  slot?: EquipmentSlot;
  sourceType?: ItemDefinition['sourceType'];
  socketSlots?: number;
  statScore?: number;
  setId?: string;
}

export interface MobBudgetInput {
  level: number;
  tags?: string[];
}

export interface GearScoreCardLike {
  id?: string;
  rarity: Rarity;
  levelReq: number;
  type?: ItemType;
  stats: ItemDefinition['stats'];
}

export interface BalanceFormulaContext {
  linkedMob?: MobDefinition;
  dungeon?: DungeonDefinition;
  roleFocus?: RoleFocus | string;
}
