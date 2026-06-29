import { BASE_ITEMS } from './itemBaseDefinitions.js';
import { QUEST_ITEMS } from './questItems.js';
import { buildGeneratedItems } from './itemFactories.js';
import { finalizeItems, rarityLabel, rarityScore } from './itemFinalize.js';
import { normalizeLegacyItemId, normalizeLegacySetId } from './itemLegacy.js';
import { createMobCardsForMobs } from './mobCards.js';
import { MOB_CARD_SOURCE_MOBS } from './mobDefinitions.js';
export const ITEMS = finalizeItems([
    ...BASE_ITEMS,
    ...QUEST_ITEMS,
    ...buildGeneratedItems(),
    ...createMobCardsForMobs(MOB_CARD_SOURCE_MOBS),
]);
export const getItemById = (id) => ITEMS.find((entry) => entry.id === normalizeLegacyItemId(id));
export { normalizeLegacyItemId, normalizeLegacySetId, rarityLabel, rarityScore };
