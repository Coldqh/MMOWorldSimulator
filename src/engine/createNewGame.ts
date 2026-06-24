import { CLASSES } from '../content/classes';
import { GUILD_TEMPLATES, NPC_NAMES, ROLE_FOCUSES } from '../content/npc';
import { RACES } from '../content/races';
import type { Guild, GuildType, NpcPlayer, Player, RoleFocus, ServerState } from '../types/game';
import { SAVE_VERSION } from './saveLoad';
import { createRng } from './rng';
import { estimateArenaRatingValue, estimateWealthValue, updateRankings } from '../systems/progressionSystem';
import { generateMarketListings } from '../systems/marketSystem';
import { generateEquipmentForClassLevel, generateEliteEquipmentForClassLevel, generateScaledEquipmentForClassLevel, getGearScore, normalizeNpcEquipmentAndGear } from '../systems/itemSystem';

export const NPC_TARGET_COUNT = 500;
const TARGET_GUILD_MEMBER_DEVIATION = 0;

const createStarterPlayer = (name: string, raceId: string, classId: string, rngSeed: number): Player => {
  const weaponByClass: Record<string, string> = {
    warrior: 'rusty_sword',
    ranger: 'training_bow',
    mage: 'cracked_wand',
    priest: 'cracked_wand'
  };

  return {
    id: 'player',
    name,
    raceId,
    classId,
    level: 1,
    xp: 0,
    gold: 45,
    hp: 100,
    mana: 50,
    inventory: [
      { itemId: 'minor_potion', amount: 3 },
      { itemId: 'mana_potion', amount: 2 },
      { itemId: 'sharpening_stone', amount: 2 },
      { itemId: 'cloth_cap', amount: 1 },
      { itemId: 'worn_boots', amount: 1 }
    ],
    equipment: {
      weapon: { instanceId: `starter_weapon_${rngSeed}`, itemId: weaponByClass[classId] ?? 'rusty_sword', enhancement: 0 },
      chest: { instanceId: `starter_chest_${rngSeed}`, itemId: 'linen_armor', enhancement: 0 }
    },
    reputation: 0,
    arenaRating: 1000
  };
};

const guildTierForIndex = (index: number): 'low' | 'mid' | 'high' => index < 5 ? 'low' : index < 12 ? 'mid' : 'high';
const minLevelForTier = (tier: 'low' | 'mid' | 'high') => tier === 'high' ? 20 : tier === 'mid' ? 10 : 1;

const createGuilds = (): Guild[] => {
  return GUILD_TEMPLATES.map((template, index) => {
    const tier = template.tier ?? guildTierForIndex(index);
    return {
      id: `guild_${index + 1}`,
      name: template.name,
      type: template.type,
      tier,
      minLevel: template.minLevel ?? minLevelForTier(tier),
      level: 1,
      reputation: 10 + index * 4,
      memberIds: [],
      focus: template.focus,
      raidProgress: 0,
      pvpRating: 900 + index * 70,
      stability: 55 + index * 3,
      recruitmentPolicy: template.recruitmentPolicy
    };
  });
};

const npcLevelForGuild = (guild: Guild, rng: ReturnType<typeof createRng>) => {
  const tier = guild.tier ?? 'low';
  if (tier === 'high') return 20;
  if (tier === 'mid') return rng.int(10, 20);
  // Low guilds have the whole server spread, but most members are 1-10.
  const roll = rng.next();
  if (roll < 0.70) return rng.int(1, 10);
  if (roll < 0.90) return rng.int(11, 15);
  return rng.int(16, 20);
};

const normalizeLevelForGuildTier = (currentLevel: number, guild: Guild, rng: ReturnType<typeof createRng>) => {
  const tier = guild.tier ?? 'low';
  if (tier === 'high') return 20;
  if (tier === 'mid') return currentLevel >= 10 && currentLevel <= 20 ? currentLevel : rng.int(10, 20);
  if (currentLevel >= 1 && currentLevel <= 20) return currentLevel;
  return npcLevelForGuild(guild, rng);
};

const focusForGuild = (guild: Guild, rng: ReturnType<typeof createRng>) => {
  const type: GuildType = guild.type;
  if (type === 'PVP') return rng.pick(['PVP_PLAYER', 'HARDCORE', 'GUILD_PLAYER', 'LEADER'] as RoleFocus[]);
  if (type === 'HARDCORE') return rng.pick(['HARDCORE', 'RAIDER', 'PVP_PLAYER', 'LEADER'] as RoleFocus[]);
  if (type === 'PVE') return rng.pick(['RAIDER', 'PVE_FARMER', 'GUILD_PLAYER', 'HARDCORE'] as RoleFocus[]);
  if (type === 'TRADE') return rng.pick(['TRADER', 'COLLECTOR', 'PVE_FARMER', 'CASUAL'] as RoleFocus[]);
  if (type === 'CASUAL' || type === 'NEWBIE') return rng.pick(['CASUAL', 'GUILD_PLAYER', 'PVE_FARMER', 'COLLECTOR'] as RoleFocus[]);
  return rng.pick(ROLE_FOCUSES);
};

const upgradeNpcForGuild = (npc: NpcPlayer, guild: Guild, seed: number, order = 0): NpcPlayer => {
  const rng = createRng(seed + order * 977 + npc.id.length * 23);
  const tier = guild.tier ?? 'low';
  const minLevel = guild.minLevel ?? minLevelForTier(tier);
  let level = Math.max(normalizeLevelForGuildTier(npc.level, guild, rng), minLevel);
  if (tier === 'mid') level = Math.max(10, Math.min(20, level));
  if (tier === 'low') level = Math.max(1, Math.min(20, level));
  const focus = ['PVP', 'HARDCORE'].includes(guild.type)
    ? rng.pick(['PVP_PLAYER', 'HARDCORE', 'LEADER', 'GUILD_PLAYER'] as RoleFocus[])
    : guild.type === 'PVE'
      ? rng.pick(['RAIDER', 'PVE_FARMER', 'HARDCORE', 'GUILD_PLAYER'] as RoleFocus[])
      : npc.roleFocus;
  const power = tier === 'high'
    ? 0.18 + rng.next() * 0.82
    : tier === 'mid'
      ? 0.18 + rng.next() * 0.48
      : 0.08 + rng.next() * 0.42;
  const equipment = tier === 'high' || focus === 'PVP_PLAYER' || focus === 'HARDCORE'
    ? generateScaledEquipmentForClassLevel(npc.classId, level, rng, power)
    : generateEquipmentForClassLevel(npc.classId, level, rng);
  const gearScore = getGearScore(equipment);
  const arenaRating = estimateArenaRatingValue(level, gearScore, focus) * (focus === 'PVP_PLAYER' ? rng.int(105, 121) : rng.int(92, 109)) / 100;
  const gold = estimateWealthValue(level, gearScore, focus) * rng.int(78, 142) / 100;
  return {
    ...npc,
    level,
    guildId: guild.id,
    roleFocus: focus,
    currentGoal: focus === 'PVP_PLAYER' ? 'рейтинг арены' : focus === 'RAIDER' || focus === 'HARDCORE' ? 'рейдовый шмот' : npc.currentGoal,
    equipment,
    gearScore,
    arenaRating: Math.round(arenaRating),
    gold: Math.round(gold),
  };
};

export const createNpc = (index: number, guilds: Guild[], seed: number, forcedLevel?: number, forcedGuild?: Guild): NpcPlayer => {
  const rng = createRng(seed + index * 7919);
  const classData = rng.pick(CLASSES);
  const raceData = rng.pick(RACES);
  const focus = forcedGuild ? focusForGuild(forcedGuild, rng) : rng.pick(ROLE_FOCUSES);
  const level = forcedLevel ?? (forcedGuild ? npcLevelForGuild(forcedGuild, rng) : Math.max(1, Math.min(20, (index % 20) + 1)));
  const guild = forcedGuild;
  const nameBase = rng.pick(NPC_NAMES);
  const elite = (guild?.tier === 'high') || (forcedLevel === undefined && level >= 16 && (index % 23 === 0 || index % 37 === 0));
  const equipment = elite && level >= 16
    ? generateScaledEquipmentForClassLevel(classData.id, level, rng, guild?.tier === 'high' ? 0.18 + rng.next() * 0.82 : 0.55 + rng.next() * 0.35)
    : generateEquipmentForClassLevel(classData.id, level, rng);
  const gearScore = getGearScore(equipment);
  const roleFocus = elite ? (rng.chance(0.55) ? 'PVP_PLAYER' : rng.chance(0.5) ? 'HARDCORE' : 'RAIDER') : focus;

  return {
    id: `npc_${index + 1}`,
    name: `${nameBase}${rng.int(1, 99)}`,
    raceId: raceData.id,
    classId: classData.id,
    level,
    xp: rng.int(0, 200),
    gearScore,
    gold: Math.round(estimateWealthValue(level, gearScore, roleFocus) * rng.int(65, 145) / 100),
    guildId: guild?.id,
    roleFocus,
    currentGoal: roleFocus === 'COLLECTOR' ? 'редкая карта' : roleFocus === 'RAIDER' ? 'рейд или данж' : roleFocus === 'PVP_PLAYER' ? 'рейтинг арены' : 'уровень и шмот',
    reputation: rng.int(0, 50),
    activityLevel: rng.int(1, 10),
    ambition: rng.int(1, 10),
    risk: rng.int(1, 10),
    socialWeight: rng.int(1, 10),
    inventory: [],
    equipment,
    arenaRating: Math.round(estimateArenaRatingValue(level, gearScore, roleFocus) * rng.int(92, 112) / 100)
  };
};

const generateBalancedNpcRoster = (guilds: Guild[], seed: number, startIndex = 0, targetCount = NPC_TARGET_COUNT): NpcPlayer[] => {
  const perGuild = Math.floor(targetCount / Math.max(1, guilds.length));
  const remainder = targetCount % Math.max(1, guilds.length);
  const npcs: NpcPlayer[] = [];
  guilds.forEach((guild, guildIndex) => {
    const target = perGuild + (guildIndex < remainder ? 1 : 0);
    for (let i = 0; i < target; i += 1) {
      const nextIndex = startIndex + npcs.length;
      const rng = createRng(seed + guildIndex * 4000 + i * 67);
      const level = npcLevelForGuild(guild, rng);
      npcs.push(createNpc(nextIndex, guilds, seed + guildIndex * 131, level, guild));
    }
  });
  return npcs.slice(0, targetCount);
};

const rebalanceGuildMemberships = (server: ServerState, guilds: Guild[], normalizedNpcs: NpcPlayer[]): { guilds: Guild[]; npcs: NpcPlayer[] } => {
  const seed = server.seed ?? Date.now();
  const guildCount = Math.max(1, guilds.length);
  const perGuild = Math.floor(NPC_TARGET_COUNT / guildCount);
  const remainder = NPC_TARGET_COUNT % guildCount;
  let npcs = normalizedNpcs.slice(0, NPC_TARGET_COUNT);
  const existingIds = new Set(npcs.map((npc) => npc.id));

  while (npcs.length < NPC_TARGET_COUNT) {
    const index = npcs.length;
    const guild = guilds[index % guilds.length];
    const rng = createRng(seed + 90000 + index * 31);
    npcs.push(createNpc(index, guilds, seed + 120000, npcLevelForGuild(guild, rng), guild));
    existingIds.add(npcs[npcs.length - 1].id);
  }

  const assigned = new Set<string>();
  const updatedNpcs = new Map(npcs.map((npc) => [npc.id, npc]));
  const nextGuilds = guilds.map((guild, guildIndex) => {
    const target = perGuild + (guildIndex < remainder ? 1 : 0);
    const minLevel = guild.minLevel ?? minLevelForTier(guild.tier ?? 'low');
    let pool = npcs
      .filter((npc) => !assigned.has(npc.id))
      .filter((npc) => npc.level >= minLevel)
      .filter((npc) => (guild.tier ?? 'low') === 'high' ? npc.level >= 20 : (guild.tier ?? 'low') === 'mid' ? npc.level >= 10 && npc.level <= 20 : npc.level >= 1 && npc.level <= 20)
      .sort((a, b) => {
        const hashA = (seed + guildIndex * 13007 + a.id.length * 97 + a.level * 31 + a.gearScore) % 100000;
        const hashB = (seed + guildIndex * 13007 + b.id.length * 97 + b.level * 31 + b.gearScore) % 100000;
        const tier = guild.tier ?? 'low';
        if (tier === 'high') {
          const scoreA = a.arenaRating + a.gearScore * 0.35 + a.level * 30;
          const scoreB = b.arenaRating + b.gearScore * 0.35 + b.level * 30;
          return scoreB - scoreA || hashA - hashB;
        }
        if (tier === 'mid') {
          const bucketA = a.level >= 10 && a.level <= 19 ? 0 : 1;
          const bucketB = b.level >= 10 && b.level <= 19 ? 0 : 1;
          return bucketA - bucketB || hashA - hashB;
        }
        const bucketA = a.level <= 10 ? 0 : a.level <= 15 ? 1 : 2;
        const bucketB = b.level <= 10 ? 0 : b.level <= 15 ? 1 : 2;
        return bucketA - bucketB || hashA - hashB;
      });

    while (pool.length < target) {
      const candidate = npcs.find((npc) => !assigned.has(npc.id) && !pool.some((entry) => entry.id === npc.id));
      if (!candidate) break;
      const upgraded = upgradeNpcForGuild(candidate, guild, seed, guildIndex + pool.length);
      updatedNpcs.set(upgraded.id, upgraded);
      pool.push(upgraded);
    }

    const chosen = pool.slice(0, target).map((npc, order) => {
      let upgraded = upgradeNpcForGuild(updatedNpcs.get(npc.id) ?? npc, guild, seed, guildIndex * 100 + order);
      const tier = guild.tier ?? 'low';
      const rng = createRng(seed + guildIndex * 7700 + order * 109);
      if (tier === 'low') {
        const bucket = order % 10;
        const forcedLevel = bucket < 7 ? rng.int(1, 10) : bucket < 9 ? rng.int(11, 15) : rng.int(16, 20);
        const equipment = generateEquipmentForClassLevel(upgraded.classId, forcedLevel, rng);
        const gearScore = getGearScore(equipment);
        upgraded = { ...upgraded, level: forcedLevel, equipment, gearScore, arenaRating: Math.round(estimateArenaRatingValue(forcedLevel, gearScore, upgraded.roleFocus)), gold: Math.round(estimateWealthValue(forcedLevel, gearScore, upgraded.roleFocus)) };
      } else if (tier === 'mid') {
        const forcedLevel = rng.int(10, 20);
        const equipment = generateScaledEquipmentForClassLevel(upgraded.classId, forcedLevel, rng, 0.22 + rng.next() * 0.45);
        const gearScore = getGearScore(equipment);
        upgraded = { ...upgraded, level: forcedLevel, equipment, gearScore, arenaRating: Math.round(estimateArenaRatingValue(forcedLevel, gearScore, upgraded.roleFocus)), gold: Math.round(estimateWealthValue(forcedLevel, gearScore, upgraded.roleFocus)) };
      }
      updatedNpcs.set(upgraded.id, upgraded);
      assigned.add(upgraded.id);
      return upgraded.id;
    });

    const sortedMembers = chosen
      .map((id) => updatedNpcs.get(id))
      .filter(Boolean) as NpcPlayer[];
    const leaderScore = (npc: NpcPlayer) => {
      if (guild.type === 'PVP') return npc.arenaRating * 1.2 + npc.gearScore * 0.25 + npc.activityLevel * 75 + npc.gold * 0.006;
      if (guild.type === 'HARDCORE') return npc.gearScore * 0.9 + npc.arenaRating * 0.45 + npc.activityLevel * 100 + npc.gold * 0.004;
      if (guild.type === 'TRADE') return npc.gold * 0.025 + npc.gearScore * 0.35 + npc.activityLevel * 80;
      return npc.gearScore * 0.75 + npc.level * 30 + npc.activityLevel * 85 + npc.reputation * 20;
    };
    const officers = [...sortedMembers].sort((a, b) => leaderScore(b) - leaderScore(a));
    return {
      ...guild,
      memberIds: chosen,
      leaderId: officers[0]?.id,
      deputyId: officers[1]?.id,
      officerIds: officers.slice(2, 6).map((npc) => npc.id),
    };
  });

  npcs = npcs.map((npc) => updatedNpcs.get(npc.id) ?? npc).map((npc) => ({ ...npc, guildId: nextGuilds.find((guild) => guild.memberIds.includes(npc.id))?.id }));
  return { guilds: nextGuilds, npcs };
};

const redistributeMaxLevelGearSpread = (npcs: NpcPlayer[], seed: number): NpcPlayer[] => {
  const maxLevelNpcs = npcs
    .filter((npc) => npc.level >= 20)
    .sort((a, b) => {
      const focusWeight = (npc: NpcPlayer) => npc.roleFocus === 'PVP_PLAYER' || npc.roleFocus === 'HARDCORE' ? 2 : npc.roleFocus === 'RAIDER' || npc.roleFocus === 'LEADER' ? 1 : 0;
      return focusWeight(b) - focusWeight(a) || a.id.localeCompare(b.id);
    });
  if (maxLevelNpcs.length === 0) return npcs.map((npc) => ({ ...npc, gearScore: getGearScore(npc.equipment ?? {}) }));

  const powerById = new Map<string, number>();
  const count = Math.max(1, maxLevelNpcs.length - 1);
  maxLevelNpcs.forEach((npc, index) => {
    const base = maxLevelNpcs.length === 1 ? 0.55 : index / count;
    const focusBoost = npc.roleFocus === 'PVP_PLAYER' || npc.roleFocus === 'HARDCORE' ? 0.08 : npc.roleFocus === 'RAIDER' || npc.roleFocus === 'LEADER' ? 0.04 : 0;
    const noise = (((seed + index * 37 + npc.id.length * 11) % 17) - 8) / 200;
    powerById.set(npc.id, Math.max(0.05, Math.min(1, base + focusBoost + noise)));
  });

  return npcs.map((npc, index) => {
    const rng = createRng(seed + 240000 + index * 97);
    if (npc.level < 20) {
      const normalized = npc.equipment && Object.keys(npc.equipment).length > 0 ? npc.equipment : generateEquipmentForClassLevel(npc.classId, npc.level, rng);
      const gearScore = getGearScore(normalized);
      return { ...npc, level: Math.min(19, npc.level), equipment: normalized, gearScore };
    }

    let power = powerById.get(npc.id) ?? 0.5;
    let equipment = generateScaledEquipmentForClassLevel(npc.classId, 20, rng, power);
    let gearScore = getGearScore(equipment);
    let guard = 0;
    while (gearScore < 2000 && guard < 5) {
      power = Math.min(1, power + 0.12);
      equipment = generateScaledEquipmentForClassLevel(npc.classId, 20, rng, power);
      gearScore = getGearScore(equipment);
      guard += 1;
    }
    const arenaRating = Math.round(estimateArenaRatingValue(20, gearScore, npc.roleFocus) * (0.94 + power * 0.18));
    const gold = Math.round(estimateWealthValue(20, gearScore, npc.roleFocus) * (0.72 + power * 0.82));
    return { ...npc, level: 20, equipment, gearScore, arenaRating, gold };
  });
};


const levelingMinutesForLevel = (level: number, rng: ReturnType<typeof createRng>) => {
  const base = 240 + level * level * 42;
  return Math.round(base * (0.8 + rng.next() * 0.4));
};

const setNpcLevelTimer = (npc: NpcPlayer, seed: number, index: number): NpcPlayer => {
  if (npc.level >= 20) return { ...npc, nextLevelAtDay: undefined, nextLevelAtMinute: undefined };
  const rng = createRng(seed + 510000 + index * 113);
  const add = levelingMinutesForLevel(npc.level, rng);
  const total = add;
  return {
    ...npc,
    nextLevelAtDay: Math.floor(total / 1440) + 1,
    nextLevelAtMinute: total % 1440,
  };
};

const rebuildNpcForLevel = (npc: NpcPlayer, level: number, seed: number, index: number): NpcPlayer => {
  const rng = createRng(seed + 470000 + index * 131 + level * 17);
  const isCap = level >= 20;
  const isStrong = npc.roleFocus === 'PVP_PLAYER' || npc.roleFocus === 'HARDCORE' || npc.roleFocus === 'RAIDER' || npc.roleFocus === 'LEADER';
  const power = isCap ? Math.min(1, 0.22 + (index % 150) / 150 * 0.78 + (isStrong ? 0.08 : 0)) : 0.12 + rng.next() * 0.46;
  const equipment = isCap ? generateScaledEquipmentForClassLevel(npc.classId, 20, rng, power) : generateEquipmentForClassLevel(npc.classId, level, rng);
  const gearScore = getGearScore(equipment);
  const roleFocus = isCap && isStrong ? npc.roleFocus : npc.roleFocus;
  const arenaRating = Math.round(estimateArenaRatingValue(level, gearScore, roleFocus) * (0.92 + rng.next() * 0.18));
  const gold = Math.round(estimateWealthValue(level, gearScore, roleFocus) * (0.65 + rng.next() * 0.9));
  return setNpcLevelTimer({ ...npc, level, xp: 0, equipment, gearScore, arenaRating, gold }, seed, index);
};

const enforceRosterLevelSpread = (npcs: NpcPlayer[], seed: number): NpcPlayer[] => {
  const total = Math.max(NPC_TARGET_COUNT, npcs.length);
  const capCount = Math.round(total * 0.30);
  const lowerCount = Math.max(0, total - capCount);
  const lowerLevels: number[] = [];
  for (let i = 0; i < lowerCount; i += 1) lowerLevels.push((i % 19) + 1);
  const sorted = [...npcs].sort((a, b) => {
    const focus = (npc: NpcPlayer) => npc.roleFocus === 'PVP_PLAYER' || npc.roleFocus === 'HARDCORE' ? 4 : npc.roleFocus === 'RAIDER' || npc.roleFocus === 'LEADER' ? 3 : npc.roleFocus === 'GUILD_PLAYER' ? 2 : 1;
    return focus(b) - focus(a) || b.gearScore - a.gearScore || a.id.localeCompare(b.id);
  });
  const capIds = new Set(sorted.slice(0, capCount).map((npc) => npc.id));
  let lowerIndex = 0;
  return npcs.map((npc, index) => {
    const level = capIds.has(npc.id) ? 20 : lowerLevels[lowerIndex++ % Math.max(1, lowerLevels.length)];
    return rebuildNpcForLevel(npc, level, seed, index);
  });
};

const assignGuildsByTier = (server: ServerState, guilds: Guild[], npcs: NpcPlayer[]): { guilds: Guild[]; npcs: NpcPlayer[] } => {
  const seed = server.seed ?? Date.now();
  const highGuilds = guilds.filter((guild) => (guild.tier ?? 'low') === 'high');
  const midGuilds = guilds.filter((guild) => (guild.tier ?? 'low') === 'mid');
  const lowGuilds = guilds.filter((guild) => (guild.tier ?? 'low') === 'low');
  const groups = new Map<string, string[]>();
  guilds.forEach((guild) => groups.set(guild.id, []));
  const shuffled = [...npcs].sort((a, b) => {
    const ha = (seed + a.id.length * 71 + a.level * 131 + a.gearScore) % 100000;
    const hb = (seed + b.id.length * 71 + b.level * 131 + b.gearScore) % 100000;
    return ha - hb;
  });

  const pushToSmallest = (guildPool: Guild[], npc: NpcPlayer) => {
    if (guildPool.length === 0) return;
    const guild = [...guildPool].sort((a, b) => (groups.get(a.id)?.length ?? 0) - (groups.get(b.id)?.length ?? 0))[0];
    groups.get(guild.id)?.push(npc.id);
    npc.guildId = guild.id;
  };

  shuffled.forEach((npc) => {
    if (npc.level >= 20 && highGuilds.length > 0 && (groups.get(highGuilds[0].id)?.length ?? 0) < 9999) pushToSmallest(highGuilds, npc);
    else if (npc.level >= 10 && midGuilds.length > 0) pushToSmallest(midGuilds, npc);
    else pushToSmallest(lowGuilds.length > 0 ? lowGuilds : guilds, npc);
  });

  const npcsById = new Map(shuffled.map((npc) => [npc.id, npc]));
  const nextGuilds = guilds.map((guild) => {
    const members = (groups.get(guild.id) ?? [])
      .map((id) => npcsById.get(id))
      .filter(Boolean) as NpcPlayer[];
    const leaderScore = (npc: NpcPlayer) => guild.type === 'PVP'
      ? npc.arenaRating * 1.3 + npc.gearScore * 0.25 + npc.activityLevel * 75
      : guild.type === 'TRADE'
        ? npc.gold * 0.03 + npc.gearScore * 0.25 + npc.activityLevel * 80
        : npc.gearScore * 0.9 + npc.arenaRating * 0.25 + npc.activityLevel * 75;
    const officers = [...members].sort((a, b) => leaderScore(b) - leaderScore(a));
    return {
      ...guild,
      memberIds: members.map((npc) => npc.id),
      leaderId: officers[0]?.id,
      deputyId: officers[1]?.id,
      officerIds: officers.slice(2, 6).map((npc) => npc.id),
    };
  });
  return { guilds: nextGuilds, npcs: shuffled };
};

export const ensureServerRoster = (server: ServerState): ServerState => {
  const seed = server.seed ?? Date.now();
  const baseGuilds = server.guilds.length >= 20 ? server.guilds : createGuilds();
  const guilds = baseGuilds.map((guild, index) => {
    const tier = guild.tier ?? guildTierForIndex(index);
    return {
      ...guild,
      tier,
      minLevel: guild.minLevel ?? minLevelForTier(tier),
      deputyId: guild.deputyId,
      officerIds: guild.officerIds ?? [],
      memberIds: [],
    };
  });

  let npcs = (server.npcs ?? []).map((npc, index) => normalizeNpcEquipmentAndGear(npc, createRng(seed + 33000 + index * 17)));
  while (npcs.length < NPC_TARGET_COUNT) {
    const index = npcs.length;
    npcs.push(createNpc(index, guilds, seed + 120000, (index % 19) + 1));
  }
  npcs = npcs.slice(0, NPC_TARGET_COUNT);
  npcs = enforceRosterLevelSpread(npcs, seed);
  const assigned = assignGuildsByTier(server, guilds, npcs);
  const withPlayerGuild = assigned.guilds.map((guild) => {
    const playerAllowed = server.player.guildId === guild.id && server.player.level >= (guild.minLevel ?? 1);
    return playerAllowed ? { ...guild, memberIds: [...new Set([...guild.memberIds, server.player.id])] } : guild;
  });

  return { ...server, npcs: assigned.npcs, guilds: withPlayerGuild };
};

export const createNewGame = (
  playerName = 'Newbie',
  raceId = 'human',
  classId = 'warrior',
  seed = Date.now(),
  characterCreated = true
): ServerState => {
  const rng = createRng(seed);
  const guilds = createGuilds();
  const npcs = generateBalancedNpcRoster(guilds, seed, 0, NPC_TARGET_COUNT);

  const guildsWithMembers = guilds.map((guild) => {
    const members = npcs.filter((npc) => npc.guildId === guild.id).map((npc) => npc.id);
    const ranked = members
      .map((id) => npcs.find((npc) => npc.id === id))
      .filter(Boolean)
      .sort((a, b) => (b!.gearScore + b!.arenaRating * 0.25 + b!.gold * 0.004) - (a!.gearScore + a!.arenaRating * 0.25 + a!.gold * 0.004));
    return {
      ...guild,
      memberIds: members,
      leaderId: ranked[0]?.id,
      deputyId: ranked[1]?.id,
      officerIds: ranked.slice(2, 6).map((npc) => npc!.id),
    };
  });

  const server: ServerState = {
    version: SAVE_VERSION,
    seed,
    characterCreated,
    serverDay: 1,
    currentMinute: 6 * 60,
    location: { mode: 'city' },
    player: createStarterPlayer(playerName || 'Newbie', raceId, classId, seed),
    npcs,
    guilds: guildsWithMembers,
    market: generateMarketListings({ seed, serverDay: 1, npcs }, rng),
    rankings: {
      arenaTop: [],
      raidRaceTop: [],
      wealthTop: [],
      gearTop: [],
      guildPvpTop: [],
      guildReputationTop: [],
    },
    worldNews: [],
    unlockedContent: ['greenfield', 'moonwood', 'redcap_hills', 'iron_quarry', 'ashen_mire', 'skyfall_pass', 'frostspire_ridge', 'wyrmspire_peak'],
    guildApplications: [],
    notifications: [],
    serverWeek: 1,
    contentPatch: 1,
    metaTag: 'fresh_start',
    serverChronicle: [],
    collectionProgress: {
      obtainedItemIds: Array.from(new Set([
        ...Object.values(createStarterPlayer(playerName || 'Newbie', raceId, classId, seed).equipment).filter(Boolean).map((entry: any) => entry.itemId),
        ...createStarterPlayer(playerName || 'Newbie', raceId, classId, seed).inventory.map((entry) => entry.itemId),
      ])),
      defeatedMobIds: [],
    }
  };

  return updateRankings(ensureServerRoster(server));
};

export const createEmptyServer = (seed = Date.now()) => createNewGame('Newbie', 'human', 'warrior', seed, false);
