import type { ItemDefinition } from '../types/game';
import { BASE_ITEMS } from './itemBaseDefinitions';
import { QUEST_ITEMS } from './questItems';
import { buildGeneratedItems } from './itemFactories';
import { finalizeItems, rarityLabel, rarityScore } from './itemFinalize';
import { normalizeLegacyItemId, normalizeLegacySetId } from './itemLegacy';
import { createMobCardsForMobs } from './mobCards';
import { ACTIVITY_SHOP_ITEMS } from './activityShopItems';
import { MOB_CARD_SOURCE_MOBS } from './mobDefinitions';

export const ITEMS: ItemDefinition[] = finalizeItems([
  ...BASE_ITEMS,
  ...QUEST_ITEMS,
  ...buildGeneratedItems(),
  ...ACTIVITY_SHOP_ITEMS,
  ...createMobCardsForMobs(MOB_CARD_SOURCE_MOBS),
]);

export const ITEM_BY_ID = new Map(ITEMS.map((entry) => [entry.id, entry]));

export const getItemById = (id: string) => ITEM_BY_ID.get(normalizeLegacyItemId(id));

export { normalizeLegacyItemId, normalizeLegacySetId, rarityLabel, rarityScore };
