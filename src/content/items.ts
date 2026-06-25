import type { ItemDefinition } from '../types/game';
import { BASE_ITEMS } from './itemBaseDefinitions';
import { buildGeneratedItems } from './itemFactories';
import { finalizeItems, rarityLabel, rarityScore } from './itemFinalize';
import { normalizeLegacyItemId, normalizeLegacySetId } from './itemLegacy';

export const ITEMS: ItemDefinition[] = finalizeItems([
  ...BASE_ITEMS,
  ...buildGeneratedItems(),
]);

export const getItemById = (id: string) => ITEMS.find((entry) => entry.id === normalizeLegacyItemId(id));

export { normalizeLegacyItemId, normalizeLegacySetId, rarityLabel, rarityScore };
