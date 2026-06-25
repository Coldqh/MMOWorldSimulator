import { ITEMS } from './items';
import {
  BASE_DUNGEONS,
  BASE_LOOT_TABLES,
  BASE_MOBS,
  BASE_RAIDS,
  BASE_SPOTS,
  BASE_ZONES,
  CITY_ID,
  CITY_NAME,
} from './worldBase';
import {
  EXTRA_DUNGEON_PATCHES,
  EXTRA_DUNGEONS,
  EXTRA_LOOT_TABLES,
  EXTRA_MOB_PATCHES,
  EXTRA_MOBS,
  EXTRA_SPOT_PATCHES,
  EXTRA_SPOTS,
  EXTRA_ZONES,
} from './worldExtraContent';
import { finalizeWorldContent } from './worldFinalize';

const WORLD = finalizeWorldContent({
  lootTables: [...BASE_LOOT_TABLES, ...EXTRA_LOOT_TABLES],
  mobs: [...BASE_MOBS, ...EXTRA_MOBS],
  spots: [...BASE_SPOTS, ...EXTRA_SPOTS],
  zones: [...BASE_ZONES, ...EXTRA_ZONES],
  dungeons: [...BASE_DUNGEONS, ...EXTRA_DUNGEONS],
  raids: [...BASE_RAIDS],
  items: ITEMS,
  spotPatches: EXTRA_SPOT_PATCHES,
  dungeonPatches: EXTRA_DUNGEON_PATCHES,
  mobPatches: EXTRA_MOB_PATCHES,
});

export { CITY_ID, CITY_NAME };
export const LOOT_TABLES = WORLD.lootTables;
export const MOBS = WORLD.mobs;
export const SPOTS = WORLD.spots;
export const ZONES = WORLD.zones;
export const DUNGEONS = WORLD.dungeons;
export const RAIDS = WORLD.raids;

export const getMobById = (id: string) => MOBS.find((entry) => entry.id === id);
export const getSpotById = (id: string) => SPOTS.find((entry) => entry.id === id);
export const getZoneById = (id: string) => ZONES.find((entry) => entry.id === id);
export const getLootTableById = (id: string) => LOOT_TABLES.find((entry) => entry.id === id);
export const getDungeonById = (id: string) => [...DUNGEONS, ...RAIDS].find((entry) => entry.id === id);
export const getRaidById = (id: string) => RAIDS.find((entry) => entry.id === id);
export const getDungeonsByZoneId = (zoneId: string) => DUNGEONS.filter((entry) => entry.zoneId === zoneId);
export const getRaidsByZoneId = (zoneId: string) => RAIDS.filter((entry) => entry.zoneId === zoneId);
