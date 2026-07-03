import type { Equipment, InventoryStack, ItemDefinition, NpcPlayer, Player, StatBlock } from '../types/game';

export const ENHANCEMENT_STAT_STEP = 0.10;
export const MAX_UNIFIED_ENHANCEMENT = 12;

export const clampEnhancementLevel = (enhancement = 0) =>
  Math.max(0, Math.min(MAX_UNIFIED_ENHANCEMENT, Math.round(enhancement || 0)));

export const getEnhancementMultiplier = (enhancement = 0) =>
  1 + clampEnhancementLevel(enhancement) * ENHANCEMENT_STAT_STEP;

export const getEnhancedItemStats = (item: ItemDefinition, enhancement = 0): Partial<StatBlock> => {
  const multiplier = getEnhancementMultiplier(enhancement);
  const result: Partial<StatBlock> = {};

  Object.entries(item.stats ?? {}).forEach(([key, value]) => {
    const statKey = key as keyof StatBlock;
    result[statKey] = Math.round((value ?? 0) * multiplier);
  });

  return result;
};

export const playerLikeFromNpc = (npc: NpcPlayer): Player => ({
  id: npc.id,
  name: npc.name,
  raceId: npc.raceId,
  classId: npc.classId,
  level: npc.level,
  xp: npc.xp ?? 0,
  gold: npc.gold ?? 0,
  hp: 1,
  mana: 0,
  inventory: npc.inventory ?? ([] as InventoryStack[]),
  equipment: npc.equipment ?? ({} as Equipment),
  guildId: npc.guildId,
  reputation: npc.reputation ?? 0,
  arenaRating: npc.arenaRating ?? 1000,
});
