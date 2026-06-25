import type { ItemDefinition } from '../types/game';
import { BASE_ITEMS } from './itemBaseDefinitions';
import { QUEST_ITEMS } from './questItems';
import { buildGeneratedItems } from './itemFactories';
import { finalizeItems, rarityLabel, rarityScore } from './itemFinalize';
import { normalizeLegacyItemId, normalizeLegacySetId } from './itemLegacy';
import { createMobCardsForMobs } from './mobCards';
import { BASE_MOBS, BASE_SPOTS } from './worldBase';
import { EXTRA_MOBS, EXTRA_MOB_PATCHES, EXTRA_SPOTS, EXTRA_SPOT_PATCHES } from './worldExtraContent';
import { finalizeWorldMobs, finalizeWorldSpots } from './worldFinalize';

const ITEM_WORLD_SPOTS = finalizeWorldSpots([...BASE_SPOTS, ...EXTRA_SPOTS], EXTRA_SPOT_PATCHES);
const ITEM_WORLD_MOBS = finalizeWorldMobs([...BASE_MOBS, ...EXTRA_MOBS], ITEM_WORLD_SPOTS, EXTRA_MOB_PATCHES);

export const ITEMS: ItemDefinition[] = finalizeItems([
  ...BASE_ITEMS,
  ...QUEST_ITEMS,
  ...buildGeneratedItems(),
  ...createMobCardsForMobs(ITEM_WORLD_MOBS),
]);

export const getItemById = (id: string) => ITEMS.find((entry) => entry.id === normalizeLegacyItemId(id));

export { normalizeLegacyItemId, normalizeLegacySetId, rarityLabel, rarityScore };
