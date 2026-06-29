import { BASE_MOBS, BASE_SPOTS } from './worldBase.js';
import { EXTRA_MOBS, EXTRA_MOB_PATCHES, EXTRA_SPOTS, EXTRA_SPOT_PATCHES } from './worldExtraContent.js';
import { finalizeWorldMobs, finalizeWorldSpots } from './worldFinalize.js';
import { REBALANCE_MOBS, REMOVED_MOB_IDS } from './worldRebalance.js';
export const WORLD_SPOT_DEFINITIONS = [...BASE_SPOTS, ...EXTRA_SPOTS];
export const WORLD_MOB_DEFINITIONS = [...BASE_MOBS, ...EXTRA_MOBS, ...REBALANCE_MOBS];
export const MOB_CARD_SOURCE_SPOTS = finalizeWorldSpots(WORLD_SPOT_DEFINITIONS, EXTRA_SPOT_PATCHES);
export const MOB_CARD_SOURCE_MOBS = finalizeWorldMobs(WORLD_MOB_DEFINITIONS, MOB_CARD_SOURCE_SPOTS, EXTRA_MOB_PATCHES).filter((mob) => !REMOVED_MOB_IDS.has(mob.id));
