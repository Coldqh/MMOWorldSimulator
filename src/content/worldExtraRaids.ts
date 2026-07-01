import type { DungeonDefinition } from '../types/game';
import type { DungeonPatch } from './worldExtraContent';

// Expansion hook for post-20 and level-60 raid content.
// Keep raid definitions here so future raid packs do not have to touch worldBase.ts.
export const EXTRA_RAIDS: DungeonDefinition[] = [];
export const EXTRA_RAID_PATCHES: DungeonPatch[] = [];
