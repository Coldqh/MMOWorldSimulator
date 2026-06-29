import { ITEMS } from './itemContent.js';
import { BASE_DUNGEONS, BASE_LOOT_TABLES, BASE_RAIDS, BASE_ZONES, CITY_ID, CITY_NAME, } from './worldBase.js';
import { EXTRA_DUNGEON_PATCHES, EXTRA_DUNGEONS, EXTRA_LOOT_TABLES, EXTRA_MOB_PATCHES, EXTRA_SPOT_PATCHES, EXTRA_ZONES, } from './worldExtraContent.js';
import { finalizeWorldContent } from './worldFinalize.js';
import { rebalanceWorldContent } from './worldRebalance.js';
import { WORLD_MOB_DEFINITIONS, WORLD_SPOT_DEFINITIONS } from './mobDefinitions.js';
const WORLD = rebalanceWorldContent(finalizeWorldContent({
    lootTables: [...BASE_LOOT_TABLES, ...EXTRA_LOOT_TABLES],
    mobs: WORLD_MOB_DEFINITIONS,
    spots: WORLD_SPOT_DEFINITIONS,
    zones: [...BASE_ZONES, ...EXTRA_ZONES],
    dungeons: [...BASE_DUNGEONS, ...EXTRA_DUNGEONS],
    raids: [...BASE_RAIDS],
    items: ITEMS,
    spotPatches: EXTRA_SPOT_PATCHES,
    dungeonPatches: EXTRA_DUNGEON_PATCHES,
    mobPatches: EXTRA_MOB_PATCHES,
}));
export { CITY_ID, CITY_NAME };
export const LOOT_TABLES = WORLD.lootTables;
export const MOBS = WORLD.mobs;
export const SPOTS = WORLD.spots;
export const ZONES = WORLD.zones;
export const DUNGEONS = WORLD.dungeons;
export const RAIDS = WORLD.raids;
export const getMobById = (id) => MOBS.find((entry) => entry.id === id);
export const getSpotById = (id) => SPOTS.find((entry) => entry.id === id);
export const getZoneById = (id) => ZONES.find((entry) => entry.id === id);
export const getLootTableById = (id) => LOOT_TABLES.find((entry) => entry.id === id);
export const getDungeonById = (id) => [...DUNGEONS, ...RAIDS].find((entry) => entry.id === id);
export const getRaidById = (id) => RAIDS.find((entry) => entry.id === id);
export const getDungeonsByZoneId = (zoneId) => DUNGEONS.filter((entry) => entry.zoneId === zoneId);
export const getRaidsByZoneId = (zoneId) => RAIDS.filter((entry) => entry.zoneId === zoneId);
