import { ITEMS } from './itemContent';
import {
  BASE_DUNGEONS,
  BASE_LOOT_TABLES,
  BASE_RAIDS,
  BASE_ZONES,
  CITY_ID,
  CITY_NAME,
} from './worldBase';
import {
  EXTRA_DUNGEON_PATCHES,
  EXTRA_DUNGEONS,
  EXTRA_LOOT_TABLES,
  EXTRA_MOB_PATCHES,
  EXTRA_SPOT_PATCHES,
  EXTRA_ZONES,
} from './worldExtraContent';
import { finalizeWorldContent } from './worldFinalize';
import { rebalanceWorldContent } from './worldRebalance';
import { WORLD_MOB_DEFINITIONS, WORLD_SPOT_DEFINITIONS } from './mobDefinitions';

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
export const ALL_INSTANCES = [...DUNGEONS, ...RAIDS];

export const MOB_BY_ID = new Map(MOBS.map((entry) => [entry.id, entry]));
export const SPOT_BY_ID = new Map(SPOTS.map((entry) => [entry.id, entry]));
export const ZONE_BY_ID = new Map(ZONES.map((entry) => [entry.id, entry]));
export const LOOT_TABLE_BY_ID = new Map(LOOT_TABLES.map((entry) => [entry.id, entry]));
export const DUNGEON_BY_ID = new Map(DUNGEONS.map((entry) => [entry.id, entry]));
export const RAID_BY_ID = new Map(RAIDS.map((entry) => [entry.id, entry]));
export const ALL_INSTANCES_BY_ID = new Map(ALL_INSTANCES.map((entry) => [entry.id, entry]));

export const getMobById = (id: string) => MOB_BY_ID.get(id);
export const getSpotById = (id: string) => SPOT_BY_ID.get(id);
export const getZoneById = (id: string) => ZONE_BY_ID.get(id);
export const getLootTableById = (id: string) => LOOT_TABLE_BY_ID.get(id);
export const getDungeonById = (id: string) => ALL_INSTANCES_BY_ID.get(id);
export const getRaidById = (id: string) => RAID_BY_ID.get(id);
export const getDungeonsByZoneId = (zoneId: string) => DUNGEONS.filter((entry) => entry.zoneId === zoneId);
export const getRaidsByZoneId = (zoneId: string) => RAIDS.filter((entry) => entry.zoneId === zoneId);
