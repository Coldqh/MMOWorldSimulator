import type { DungeonDefinition, ItemDefinition, LootTable, MobDefinition, SpotDefinition, StatBlock, ZoneDefinition } from '../types/game';
import { calculateGoldRewardForMob, calculateXpRewardForMob } from '../balance';
import { finalizeLootTables } from './lootFinalize';
import type { DungeonPatch, MobPatch, SpotPatch } from './worldExtraContent';

export interface WorldContentInput {
  lootTables: LootTable[];
  mobs: MobDefinition[];
  spots: SpotDefinition[];
  zones: ZoneDefinition[];
  dungeons: DungeonDefinition[];
  raids: DungeonDefinition[];
  items: ItemDefinition[];
  spotPatches?: SpotPatch[];
  dungeonPatches?: DungeonPatch[];
  raidPatches?: DungeonPatch[];
  mobPatches?: MobPatch[];
}

export interface WorldContentOutput {
  lootTables: LootTable[];
  mobs: MobDefinition[];
  spots: SpotDefinition[];
  zones: ZoneDefinition[];
  dungeons: DungeonDefinition[];
  raids: DungeonDefinition[];
}

const uniqueById = <T extends { id: string }>(entries: T[]): T[] => [...new Map(entries.map((entry) => [entry.id, entry])).values()];

const cloneStats = (stats: StatBlock): StatBlock => ({ ...stats });

const cloneMob = (mob: MobDefinition): MobDefinition => ({
  ...mob,
  stats: cloneStats(mob.stats),
  tags: [...mob.tags],
  gold: [mob.gold[0], mob.gold[1]],
});

const cloneSpot = (spot: SpotDefinition): SpotDefinition => ({
  ...spot,
  levelRange: [spot.levelRange[0], spot.levelRange[1]],
  mobIds: [...spot.mobIds],
  tags: [...spot.tags],
});

const cloneZone = (zone: ZoneDefinition): ZoneDefinition => ({
  ...zone,
  levelRange: [zone.levelRange[0], zone.levelRange[1]],
  spotIds: [...zone.spotIds],
});

const cloneDungeon = (dungeon: DungeonDefinition): DungeonDefinition => ({
  ...dungeon,
  levelRange: [dungeon.levelRange[0], dungeon.levelRange[1]],
  floors: dungeon.floors.map((floor) => ({ ...floor, mobIds: [...floor.mobIds] })),
});

const applySpotPatches = (spots: SpotDefinition[], patches: SpotPatch[] = []) => {
  const byId = new Map(spots.map((spot) => [spot.id, cloneSpot(spot)]));
  patches.forEach((patch) => {
    const spot = byId.get(patch.id);
    if (!spot) return;
    const remove = new Set(patch.removeMobIds ?? []);
    const mobIds = spot.mobIds.filter((id) => !remove.has(id));
    (patch.addMobIds ?? []).forEach((id) => {
      if (!mobIds.includes(id)) mobIds.push(id);
    });
    byId.set(patch.id, { ...spot, mobIds });
  });
  return [...byId.values()];
};

const applyDungeonPatches = (dungeons: DungeonDefinition[], patches: DungeonPatch[] = []) => {
  const patchById = new Map(patches.map((patch) => [patch.id, patch]));
  return dungeons.map((dungeon) => {
    const patch = patchById.get(dungeon.id);
    if (!patch) return dungeon;
    return {
      ...dungeon,
      lootTableId: patch.lootTableId ?? dungeon.lootTableId,
      zoneId: patch.zoneId ?? dungeon.zoneId,
    };
  });
};

const applyMobPatches = (mobs: MobDefinition[], patches: MobPatch[] = []) => {
  const patchById = new Map(patches.map((patch) => [patch.id, patch]));
  return mobs.map((mob) => {
    const patch = patchById.get(mob.id);
    if (!patch) return mob;
    return {
      ...mob,
      name: patch.name ?? mob.name,
      lootTableId: patch.lootTableId ?? mob.lootTableId,
    };
  });
};

const normalizeBossFloors = (dungeon: DungeonDefinition): DungeonDefinition => {
  const floors = dungeon.floors.map((floor) => ({ ...floor, mobIds: [...floor.mobIds] }));
  if (floors.length === 0) return { ...dungeon, floors };

  const preferred = Array.from(new Set([
    Math.min(1, floors.length - 1),
    Math.min(3, floors.length - 1),
    floors.length - 1,
  ]));

  let bossIndexes = floors
    .map((floor, index) => ({ floor, index }))
    .filter(({ floor }) => floor.type === 'boss')
    .map(({ index }) => index);

  preferred.forEach((index) => {
    if (bossIndexes.length < 3 && !bossIndexes.includes(index)) bossIndexes.push(index);
  });

  bossIndexes = Array.from(new Set(bossIndexes)).sort((a, b) => a - b).slice(-3);
  const bossSet = new Set(bossIndexes);

  return {
    ...dungeon,
    floors: floors.map((floor, index) => ({
      ...floor,
      type: bossSet.has(index) ? 'boss' : floor.type === 'boss' ? 'mobs' : floor.type,
    })),
  };
};

const bossFloorMobIds = (instances: DungeonDefinition[]) => new Set(
  instances.flatMap((dungeon) =>
    dungeon.floors
      .filter((floor) => floor.type === 'boss')
      .map((floor) => floor.mobIds[floor.mobIds.length - 1])
      .filter((id): id is string => Boolean(id)),
  ),
);

const tuneMobStats = (mob: MobDefinition, spotMobIds: Set<string>): MobDefinition => {
  const spotOpenWorldMob = spotMobIds.has(mob.id) && !mob.tags.includes('dungeon') && !mob.tags.includes('raid') && !mob.tags.includes('boss');
  const hp = spotOpenWorldMob ? mob.stats.hp * 2 : mob.stats.hp;
  return {
    ...mob,
    stats: {
      ...mob.stats,
      hp: Math.round(hp * 2),
      attack: Math.round(mob.stats.attack * 3),
      magic: Math.round(mob.stats.magic * 3),
    },
  };
};

export const finalizeWorldSpots = (spots: SpotDefinition[], spotPatches: SpotPatch[] = []) =>
  uniqueById(applySpotPatches(spots.map(cloneSpot), spotPatches)).sort((a, b) => a.id.localeCompare(b.id));

export const finalizeWorldMobs = (mobs: MobDefinition[], spots: SpotDefinition[], mobPatches: MobPatch[] = []) => {
  const patched = applyMobPatches(uniqueById(mobs.map(cloneMob)), mobPatches);
  const spotMobIds = new Set(spots.flatMap((spot) => spot.mobIds));
  return patched
    .map((mob) => tuneMobStats(mob, spotMobIds))
    .map((mob) => ({
      ...mob,
      xp: calculateXpRewardForMob(mob, mob.level),
      gold: calculateGoldRewardForMob(mob),
    }))
    .sort((a, b) => a.level - b.level || a.id.localeCompare(b.id));
};

export const finalizeWorldContent = (input: WorldContentInput): WorldContentOutput => {
  const spots = finalizeWorldSpots(input.spots, input.spotPatches);
  let mobs = finalizeWorldMobs(input.mobs, spots, input.mobPatches);
  const dungeons = applyDungeonPatches(uniqueById(input.dungeons.map(cloneDungeon)), input.dungeonPatches)
    .map(normalizeBossFloors)
    .map((dungeon) => ({
      ...dungeon,
      // v0.5.6+: force every dungeon to 5-player party size.
      partySize: 5,
      description: dungeon.description.replace(/пати\s*\d+/i, 'пати 5'),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
  const raids = applyDungeonPatches(uniqueById(input.raids.map(cloneDungeon)), input.raidPatches)
    .map(normalizeBossFloors)
    .sort((a, b) => a.id.localeCompare(b.id));
  const forcedBossMobIds = bossFloorMobIds([...dungeons, ...raids]);
  mobs = mobs.map((mob) => ({ ...mob, tags: mob.tags.filter((tag) => tag !== 'mini-boss') }));
  mobs = mobs
    .map((mob) => forcedBossMobIds.has(mob.id) ? { ...mob, tags: Array.from(new Set([...mob.tags, 'boss'])) } : mob)
    .map((mob) => ({
      ...mob,
      xp: calculateXpRewardForMob(mob, mob.level),
      gold: calculateGoldRewardForMob(mob),
    }));
  const zones = uniqueById(input.zones.map(cloneZone)).sort((a, b) => a.id.localeCompare(b.id));
  const lootTables = finalizeLootTables(input.lootTables, mobs, input.items);

  return {
    lootTables,
    mobs,
    spots,
    zones,
    dungeons,
    raids,
  };
};
