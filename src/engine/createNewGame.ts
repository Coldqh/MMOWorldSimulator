import { CLASSES } from '../content/classes';
import { GUILD_TEMPLATES, NPC_NAMES, ROLE_FOCUSES } from '../content/npc';
import { RACES } from '../content/races';
import type { Guild, GuildTier, GuildType, NpcPlayer, Player, RoleFocus, ServerState } from '../types/game';
import { SAVE_VERSION } from './saveLoad';
import { APP_VERSION } from './version';
import { createRng } from './rng';
import { estimateArenaRatingValue, estimateWealthValue, updateRankings } from '../systems/progressionSystem';
import { generateFullMarket, repairMarketIfBroken } from '../systems/marketSystem';
import { refreshPartyFinderListings } from '../systems/partyFinderSystem';
import { initializeGuildWarsCore } from '../systems/guildWarSystem';
import { generateEquipmentForClassLevel, generateEliteEquipmentForClassLevel, generateScaledEquipmentForClassLevel, getGearScore, normalizeNpcEquipmentAndGear } from '../systems/itemSystem';
import { isPlayerCreatedGuild, protectPlayerCreatedGuilds, sanitizePlayerCreatedGuild } from '../systems/playerGuildProtection';
import { LEVEL_BANDS, MAX_LEVEL } from '../balance';

export const NPC_TARGET_COUNT = 1000;

const NPC_UNGUILDED_RATIO = 0.20;
const NPC_TIER_DISTRIBUTION: Array<{ tier: GuildTier; ratio: number }> = [
  { tier: 'low', ratio: 0.15 },
  { tier: 'mid', ratio: 0.25 },
  { tier: 'high', ratio: 0.30 },
  { tier: 'max', ratio: 0.30 },
];

const TARGET_GUILD_SIZE_BY_TIER: Record<GuildTier, number> = {
  low: 20,
  mid: 25,
  high: 24,
  max: 24,
};

const GENERATED_GUILD_NAMES: Record<GuildTier, string[]> = {
  low: ['River Lantern', 'Copper Foxes', 'Morning Hares', 'Small Hearth', 'Dusty Road', 'Oak Bench', 'Soft Pull', 'First Bell'],
  mid: ['Amber Branch', 'Grey Banner', 'Second Watch', 'Hollow Bell', 'Salt Ring', 'Mire Compass', 'Glass Cart', 'Iron Thread', 'Moon Archive', 'Old Bridge'],
  high: ['Storm Ledger', 'Black Chapel', 'Red Contract', 'North Crown', 'Ashen Wolves', 'Blue Meridian', 'White Knives', 'Rook Shelter', 'Cinder Choir', 'Frost Line', 'Brass Oath', 'Crimson Scale'],
  max: ['Last Sun', 'Worldcore', 'Voidglass Crown', 'Eclipse Order', 'Zero Meridian', 'Pale Throne', 'Obsidian Choir', 'Dawn Authority', 'Final Archive', 'Crownless', 'Abyss Ledger', 'Saint Engine'],
};
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

const guildTierForIndex = (index: number): GuildTier =>
  index >= Math.max(0, GUILD_TEMPLATES.length - 1)
    ? 'max'
    : index < 5
      ? 'low'
      : index < 12
        ? 'mid'
        : 'high';

const tierRange = (tier: GuildTier) => LEVEL_BANDS[tier] ?? LEVEL_BANDS.low;
const minLevelForTier = (tier: GuildTier) => tierRange(tier).min;
const maxLevelForTier = (tier: GuildTier) => tierRange(tier).max;
const levelInTier = (level: number, tier: GuildTier) => level >= minLevelForTier(tier) && level <= maxLevelForTier(tier);
const randomLevelInTier = (tier: GuildTier, rng: ReturnType<typeof createRng>) => rng.int(minLevelForTier(tier), maxLevelForTier(tier));


const npcTierForLevel = (level: number): GuildTier => {
  if (level >= LEVEL_BANDS.max.min) return 'max';
  if (level >= LEVEL_BANDS.high.min) return 'high';
  if (level >= LEVEL_BANDS.mid.min) return 'mid';
  return 'low';
};

const targetCountForTier = (tier: GuildTier, total = NPC_TARGET_COUNT) => {
  const entry = NPC_TIER_DISTRIBUTION.find((item) => item.tier === tier);
  return Math.round(total * (entry?.ratio ?? 0));
};

const targetGuildedCountForTier = (tier: GuildTier, total = NPC_TARGET_COUNT) =>
  Math.round(targetCountForTier(tier, total) * (1 - NPC_UNGUILDED_RATIO));

const targetGuildCountForTier = (tier: GuildTier, total = NPC_TARGET_COUNT) =>
  Math.max(1, Math.ceil(targetGuildedCountForTier(tier, total) / TARGET_GUILD_SIZE_BY_TIER[tier]));

const tierForRosterIndex = (index: number, total = NPC_TARGET_COUNT): GuildTier => {
  const normalized = ((index % total) + total) % total;
  let cursor = 0;

  for (const entry of NPC_TIER_DISTRIBUTION) {
    cursor += targetCountForTier(entry.tier, total);
    if (normalized < cursor) return entry.tier;
  }

  return 'max';
};

const levelForTier = (tier: GuildTier, rng: ReturnType<typeof createRng>) =>
  tier === 'max' ? MAX_LEVEL : randomLevelInTier(tier, rng);

const generatedGuildType = (tier: GuildTier, index: number): GuildType => {
  if (tier === 'low') return index % 3 === 0 ? 'MIXED' : 'PVE';
  if (tier === 'mid') return index % 4 === 0 ? 'PVP' : index % 2 === 0 ? 'MIXED' : 'PVE';
  if (tier === 'high') return index % 3 === 0 ? 'PVP' : index % 3 === 1 ? 'PVE' : 'MIXED';
  return index % 3 === 0 ? 'PVE' : index % 3 === 1 ? 'PVP' : 'MIXED';
};

const generatedGuildFocus = (tier: GuildTier, type: GuildType) => {
  if (tier === 'max') return type === 'PVP' ? 'финальная арена, топ-рейтинг' : type === 'PVE' ? 'финальные рейды, легендарный гир' : 'рейды, рынок, арена';
  if (tier === 'high') return type === 'PVP' ? 'арена, осады, high PvP' : type === 'PVE' ? 'high-данжи, рейды 40+' : 'high progression и экономика';
  if (tier === 'mid') return type === 'PVP' ? 'арена мид-гейма' : type === 'PVE' ? 'данжи 21–40' : 'фарм, рынок, пати';
  return type === 'PVP' ? 'дуэли новичков' : type === 'PVE' ? 'новички, споты, первые данжи' : 'чат, фарм, торговля';
};

const makeGeneratedGuild = (tier: GuildTier, tierIndex: number, globalIndex: number, id: string): Guild => {
  const type = generatedGuildType(tier, tierIndex);
  const names = GENERATED_GUILD_NAMES[tier];
  const name = names[tierIndex] ?? `${tier.toUpperCase()} Guild ${String(tierIndex + 1).padStart(2, '0')}`;

  return {
    id,
    name,
    type,
    tier,
    minLevel: minLevelForTier(tier),
    reputation: 18 + globalIndex * 4 + tierIndex * 3,
    memberIds: [],
    focus: generatedGuildFocus(tier, type),
    raidProgress: tier === 'max' ? 35 + tierIndex * 4 : tier === 'high' ? 14 + tierIndex * 3 : tier === 'mid' ? 4 + tierIndex : 0,
    pvpRating: tier === 'max' ? 2100 + tierIndex * 55 : tier === 'high' ? 1550 + tierIndex * 45 : tier === 'mid' ? 1120 + tierIndex * 35 : 850 + tierIndex * 20,
    stability: tier === 'max' ? 74 + (tierIndex % 12) : tier === 'high' ? 62 + (tierIndex % 15) : tier === 'mid' ? 56 + (tierIndex % 12) : 48 + (tierIndex % 16),
    recruitmentPolicy: tier === 'low' ? 'open' : tier === 'mid' ? 'invite' : 'strict',
  };
};

const ensureNpcGuildCapacity = (sourceGuilds: Guild[]): Guild[] => {
  const guilds = sourceGuilds.map((guild) => ({ ...guild, memberIds: [...(guild.memberIds ?? [])] }));
  const usedIds = new Set(guilds.map((guild) => guild.id));

  NPC_TIER_DISTRIBUTION.forEach(({ tier }) => {
    const needed = targetGuildCountForTier(tier);
    let existing = guilds.filter((guild) => !isPlayerCreatedGuild(guild) && (guild.tier ?? 'low') === tier).length;
    let tierIndex = existing;

    while (existing < needed) {
      let id = `guild_auto_${tier}_${String(tierIndex + 1).padStart(2, '0')}`;

      while (usedIds.has(id)) {
        tierIndex += 1;
        id = `guild_auto_${tier}_${String(tierIndex + 1).padStart(2, '0')}`;
      }

      guilds.push(makeGeneratedGuild(tier, tierIndex, guilds.length, id));
      usedIds.add(id);
      existing += 1;
      tierIndex += 1;
    }
  });

  return guilds;
};

const createGuilds = (): Guild[] => {
  const baseGuilds = GUILD_TEMPLATES.map((template, index) => {
    const tier = (template.tier ?? guildTierForIndex(index)) as GuildTier;
    return {
      id: `guild_${index + 1}`,
      name: template.name,
      type: template.type,
      tier,
      minLevel: template.minLevel ?? minLevelForTier(tier),
      reputation: 10 + index * 4,
      memberIds: [],
      focus: template.focus,
      raidProgress: 0,
      pvpRating: 900 + index * 70,
      stability: 55 + index * 3,
      recruitmentPolicy: template.recruitmentPolicy
    };
  });

  return ensureNpcGuildCapacity(baseGuilds);
};


const npcLevelForGuild = (guild: Guild, rng: ReturnType<typeof createRng>) => {
  const tier = (guild.tier ?? 'low') as GuildTier;
  if (tier === 'max') return MAX_LEVEL;
  if (tier === 'high') return randomLevelInTier('high', rng);
  if (tier === 'mid') return randomLevelInTier('mid', rng);

  const roll = rng.next();
  if (roll < 0.70) return rng.int(LEVEL_BANDS.low.min, 10);
  if (roll < 0.90) return rng.int(11, 15);
  return rng.int(16, LEVEL_BANDS.low.max);
};

const normalizeLevelForGuildTier = (currentLevel: number, guild: Guild, rng: ReturnType<typeof createRng>) => {
  const tier = (guild.tier ?? 'low') as GuildTier;
  if (levelInTier(currentLevel, tier)) return currentLevel;
  return npcLevelForGuild(guild, rng);
};

const focusForGuild = (guild: Guild, rng: ReturnType<typeof createRng>): RoleFocus => {
  if (guild.type === 'PVP') return rng.pick(['pvp', 'pvp', 'mixed'] as RoleFocus[]);
  if (guild.type === 'PVE') return rng.pick(['pve', 'pve', 'mixed'] as RoleFocus[]);
  return rng.pick(['mixed', 'pve', 'pvp'] as RoleFocus[]);
};

const upgradeNpcForGuild = (npc: NpcPlayer, guild: Guild, seed: number, order = 0): NpcPlayer => {
  const rng = createRng(seed + order * 977 + npc.id.length * 23);
  const tier = (guild.tier ?? 'low') as GuildTier;
  const minLevel = guild.minLevel ?? minLevelForTier(tier);
  const maxLevel = maxLevelForTier(tier);
  let level = Math.max(normalizeLevelForGuildTier(npc.level, guild, rng), minLevel);
  level = Math.max(minLevel, Math.min(maxLevel, level));

  const focus = ['PVP', 'pvp'].includes(guild.type)
    ? rng.pick(['pvp', 'pvp', 'pvp', 'mixed'] as RoleFocus[])
    : guild.type === 'PVE'
      ? rng.pick(['pve', 'pve', 'pvp', 'mixed'] as RoleFocus[])
      : npc.roleFocus;

  const power = tier === 'max'
    ? 0.82 + rng.next() * 0.18
    : tier === 'high'
      ? 0.38 + rng.next() * 0.58
      : tier === 'mid'
        ? 0.20 + rng.next() * 0.48
        : 0.08 + rng.next() * 0.42;

  const equipment = tier === 'max' || tier === 'high' || focus === 'pvp'
    ? generateScaledEquipmentForClassLevel(npc.classId, level, rng, power)
    : generateEquipmentForClassLevel(npc.classId, level, rng);

  const gearScore = getGearScore(equipment);
  const arenaRating = estimateArenaRatingValue(level, gearScore, focus) * (focus === 'pvp' ? rng.int(105, 121) : rng.int(92, 109)) / 100;
  const gold = estimateWealthValue(level, gearScore, focus) * rng.int(78, 142) / 100;

  return {
    ...npc,
    level,
    guildId: guild.id,
    roleFocus: focus,
    currentGoal: focus === 'pvp' ? 'рейтинг арены' : focus === 'pve' ? 'рейдовый шмот' : npc.currentGoal,
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
  const level = forcedLevel ?? (forcedGuild ? npcLevelForGuild(forcedGuild, rng) : Math.max(1, Math.min(MAX_LEVEL, (index % MAX_LEVEL) + 1)));
  const guild = forcedGuild;
  const tier = (guild?.tier ?? 'low') as GuildTier;
  const nameBase = rng.pick(NPC_NAMES);
  const elite = tier === 'max' || tier === 'high' || (forcedLevel === undefined && level >= LEVEL_BANDS.high.min && (index % 23 === 0 || index % 37 === 0));
  const equipment = elite && level >= LEVEL_BANDS.mid.min
    ? generateScaledEquipmentForClassLevel(classData.id, level, rng, tier === 'max' ? 0.82 + rng.next() * 0.18 : tier === 'high' ? 0.38 + rng.next() * 0.58 : 0.55 + rng.next() * 0.35)
    : generateEquipmentForClassLevel(classData.id, level, rng);
  const gearScore = getGearScore(equipment);
  const roleFocus: RoleFocus = elite ? (rng.chance(0.55) ? 'pvp' : rng.chance(0.5) ? 'pve' : 'mixed') : focus;

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
    currentGoal: roleFocus === 'pvp' ? 'рейтинг арены' : roleFocus === 'pve' ? 'рейд или данж' : 'уровень и шмот',
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
  const protectedBase = protectPlayerCreatedGuilds({ ...server, guilds, npcs: normalizedNpcs });
  const sourceGuilds = protectedBase.guilds;
  const npcGuilds = sourceGuilds.filter((guild) => !isPlayerCreatedGuild(guild));
  if (npcGuilds.length === 0) return { guilds: sourceGuilds, npcs: protectedBase.npcs };

  const guildCount = Math.max(1, npcGuilds.length);
  const perGuild = Math.floor(NPC_TARGET_COUNT / guildCount);
  const remainder = NPC_TARGET_COUNT % guildCount;
  let npcs = protectedBase.npcs.slice(0, NPC_TARGET_COUNT);
  const existingIds = new Set(npcs.map((npc) => npc.id));

  while (npcs.length < NPC_TARGET_COUNT) {
    const index = npcs.length;
    const guild = npcGuilds[index % npcGuilds.length];
    const rng = createRng(seed + 90000 + index * 31);
    npcs.push(createNpc(index, npcGuilds, seed + 120000, npcLevelForGuild(guild, rng), guild));
    existingIds.add(npcs[npcs.length - 1].id);
  }

  const assigned = new Set<string>();
  const updatedNpcs = new Map(npcs.map((npc) => [npc.id, npc]));
  const nextGuilds = sourceGuilds.map((guild) => {
    if (isPlayerCreatedGuild(guild)) return sanitizePlayerCreatedGuild(protectedBase, guild);

    const guildIndex = Math.max(0, npcGuilds.findIndex((entry) => entry.id === guild.id));
    const target = perGuild + (guildIndex < remainder ? 1 : 0);
    const minLevel = guild.minLevel ?? minLevelForTier(guild.tier ?? 'low');
    let pool = npcs
      .filter((npc) => !assigned.has(npc.id))
      .filter((npc) => npc.level >= minLevel)
      .filter((npc) => (guild.tier ?? 'low') === 'max' ? npc.level >= MAX_LEVEL : (guild.tier ?? 'low') === 'high' ? npc.level >= LEVEL_BANDS.high.min && npc.level <= LEVEL_BANDS.high.max : (guild.tier ?? 'low') === 'mid' ? npc.level >= LEVEL_BANDS.mid.min && npc.level <= LEVEL_BANDS.mid.max : npc.level >= LEVEL_BANDS.low.min && npc.level <= LEVEL_BANDS.low.max)
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
        const forcedLevel = randomLevelInTier('mid', rng);
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
      if (guild.type === 'MIXED') return npc.gearScore * 0.55 + npc.arenaRating * 0.25 + npc.activityLevel * 80 + npc.gold * 0.006;
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
  const protectedResult = protectPlayerCreatedGuilds({ ...server, guilds: nextGuilds, npcs });
  return { guilds: protectedResult.guilds, npcs: protectedResult.npcs };
};

const redistributeMaxLevelGearSpread = (npcs: NpcPlayer[], seed: number): NpcPlayer[] => {
  const maxLevelNpcs = npcs
    .filter((npc) => npc.level >= MAX_LEVEL)
    .sort((a, b) => {
      const focusWeight = (npc: NpcPlayer) => npc.roleFocus === 'pvp' ? 2 : npc.roleFocus === 'pve' ? 1 : 0;
      return focusWeight(b) - focusWeight(a) || a.id.localeCompare(b.id);
    });

  if (maxLevelNpcs.length === 0) return npcs.map((npc) => ({ ...npc, gearScore: getGearScore(npc.equipment ?? {}) }));

  const powerById = new Map<string, number>();
  const count = Math.max(1, maxLevelNpcs.length - 1);

  maxLevelNpcs.forEach((npc, index) => {
    const base = maxLevelNpcs.length === 1 ? 0.86 : 0.72 + (index / count) * 0.28;
    const focusBoost = npc.roleFocus === 'pvp' ? 0.05 : npc.roleFocus === 'pve' ? 0.03 : 0;
    const noise = (((seed + index * 37 + npc.id.length * 11) % 17) - 8) / 240;
    powerById.set(npc.id, Math.max(0.68, Math.min(1, base + focusBoost + noise)));
  });

  return npcs.map((npc, index) => {
    const rng = createRng(seed + 240000 + index * 97);

    if (npc.level < MAX_LEVEL) {
      const safeLevel = Math.max(1, Math.min(MAX_LEVEL - 1, npc.level));
      const normalized = npc.equipment && Object.keys(npc.equipment).length > 0
        ? npc.equipment
        : generateEquipmentForClassLevel(npc.classId, safeLevel, rng);
      const gearScore = getGearScore(normalized);
      return { ...npc, level: safeLevel, equipment: normalized, gearScore };
    }

    let power = powerById.get(npc.id) ?? 0.85;
    let equipment = generateScaledEquipmentForClassLevel(npc.classId, MAX_LEVEL, rng, power);
    let gearScore = getGearScore(equipment);
    let guard = 0;

    while (gearScore < 5200 && guard < 5) {
      power = Math.min(1, power + 0.08);
      equipment = generateScaledEquipmentForClassLevel(npc.classId, MAX_LEVEL, rng, power);
      gearScore = getGearScore(equipment);
      guard += 1;
    }

    const arenaRating = Math.round(estimateArenaRatingValue(MAX_LEVEL, gearScore, npc.roleFocus) * (0.96 + power * 0.16));
    const gold = Math.round(estimateWealthValue(MAX_LEVEL, gearScore, npc.roleFocus) * (0.82 + power * 0.82));
    return { ...npc, level: MAX_LEVEL, equipment, gearScore, arenaRating, gold };
  });
};



const levelingMinutesForLevel = (level: number, rng: ReturnType<typeof createRng>) => {
  const base = 240 + level * level * 42;
  return Math.round(base * (0.8 + rng.next() * 0.4));
};

const setNpcLevelTimer = (npc: NpcPlayer, seed: number, index: number): NpcPlayer => {
  if (npc.level >= MAX_LEVEL) return { ...npc, nextLevelAtDay: undefined, nextLevelAtMinute: undefined };
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
  const isCap = level >= MAX_LEVEL;
  const isStrong = npc.roleFocus === 'pvp' || npc.roleFocus === 'pve';
  const power = isCap ? Math.min(1, 0.22 + (index % 150) / 150 * 0.78 + (isStrong ? 0.08 : 0)) : 0.12 + rng.next() * 0.46;
  const equipment = isCap ? generateScaledEquipmentForClassLevel(npc.classId, MAX_LEVEL, rng, power) : generateEquipmentForClassLevel(npc.classId, level, rng);
  const gearScore = getGearScore(equipment);
  const roleFocus = isCap && isStrong ? npc.roleFocus : npc.roleFocus;
  const arenaRating = Math.round(estimateArenaRatingValue(level, gearScore, roleFocus) * (0.92 + rng.next() * 0.18));
  const gold = Math.round(estimateWealthValue(level, gearScore, roleFocus) * (0.65 + rng.next() * 0.9));
  return setNpcLevelTimer({ ...npc, level, xp: 0, equipment, gearScore, arenaRating, gold }, seed, index);
};

const enforceRosterLevelSpread = (npcs: NpcPlayer[], seed: number): NpcPlayer[] => {
  const total = Math.max(NPC_TARGET_COUNT, npcs.length);
  const tierPlan: GuildTier[] = [];

  NPC_TIER_DISTRIBUTION.forEach(({ tier }) => {
    const count = targetCountForTier(tier, total);
    for (let i = 0; i < count; i += 1) tierPlan.push(tier);
  });

  while (tierPlan.length < total) tierPlan.push('max');
  if (tierPlan.length > total) tierPlan.length = total;

  const sorted = [...npcs].sort((a, b) => {
    const focus = (npc: NpcPlayer) => npc.roleFocus === 'pvp' ? 4 : npc.roleFocus === 'pve' ? 3 : npc.roleFocus === 'mixed' ? 2 : 1;
    return focus(b) - focus(a) || b.gearScore - a.gearScore || a.id.localeCompare(b.id);
  });

  const orderedTierPlan = [
    ...tierPlan.filter((tier) => tier === 'max'),
    ...tierPlan.filter((tier) => tier === 'high'),
    ...tierPlan.filter((tier) => tier === 'mid'),
    ...tierPlan.filter((tier) => tier === 'low'),
  ];

  const tierById = new Map<string, GuildTier>();
  sorted.forEach((npc, index) => tierById.set(npc.id, orderedTierPlan[index] ?? tierForRosterIndex(index, total)));

  return npcs.map((npc, index) => {
    const tier = tierById.get(npc.id) ?? tierForRosterIndex(index, total);
    const rng = createRng(seed + 590000 + index * 137 + npc.id.length * 19);
    return rebuildNpcForLevel(npc, levelForTier(tier, rng), seed, index);
  });
};


const assignGuildsByTier = (server: ServerState, guilds: Guild[], npcs: NpcPlayer[]): { guilds: Guild[]; npcs: NpcPlayer[] } => {
  const capacityGuilds = ensureNpcGuildCapacity(guilds);
  const protectedBase = protectPlayerCreatedGuilds({ ...server, guilds: capacityGuilds, npcs });
  const sourceGuilds = protectedBase.guilds;
  const protectedGuildIds = new Set(sourceGuilds.filter(isPlayerCreatedGuild).map((guild) => guild.id));
  const npcGuilds = sourceGuilds.filter((guild) => !isPlayerCreatedGuild(guild));

  const guildsByTier = new Map<GuildTier, Guild[]>();
  NPC_TIER_DISTRIBUTION.forEach(({ tier }) => guildsByTier.set(tier, []));
  npcGuilds.forEach((guild) => guildsByTier.get((guild.tier ?? 'low') as GuildTier)?.push(guild));

  const groups = new Map<string, string[]>();
  npcGuilds.forEach((guild) => groups.set(guild.id, []));

  const cleanNpcs = protectedBase.npcs.map((npc) =>
    npc.guildId && protectedGuildIds.has(npc.guildId) ? npc : { ...npc, guildId: undefined },
  );

  const npcsById = new Map(cleanNpcs.map((npc) => [npc.id, npc]));
  const assignableByTier = new Map<GuildTier, NpcPlayer[]>();
  NPC_TIER_DISTRIBUTION.forEach(({ tier }) => assignableByTier.set(tier, []));

  cleanNpcs.forEach((npc) => {
    if (npc.guildId && protectedGuildIds.has(npc.guildId)) return;
    assignableByTier.get(npcTierForLevel(npc.level))?.push(npc);
  });

  const pushToSmallest = (guildPool: Guild[], npc: NpcPlayer) => {
    if (guildPool.length === 0) {
      npcsById.set(npc.id, { ...npc, guildId: undefined });
      return;
    }

    const guild = [...guildPool].sort((a, b) =>
      (groups.get(a.id)?.length ?? 0) - (groups.get(b.id)?.length ?? 0) || a.id.localeCompare(b.id),
    )[0];

    groups.get(guild.id)?.push(npc.id);
    npcsById.set(npc.id, { ...npc, guildId: guild.id });
  };

  NPC_TIER_DISTRIBUTION.forEach(({ tier }) => {
    const guildPool = guildsByTier.get(tier) ?? [];
    const candidates = [...(assignableByTier.get(tier) ?? [])].sort((a, b) => {
      const score = (npc: NpcPlayer) => {
        if (tier === 'max') return npc.gearScore * 0.9 + npc.arenaRating * 0.35 + npc.activityLevel * 80 + npc.gold * 0.004;
        if (tier === 'high') return npc.gearScore * 0.65 + npc.arenaRating * 0.45 + npc.activityLevel * 70;
        if (tier === 'mid') return npc.gearScore * 0.45 + npc.level * 45 + npc.activityLevel * 55;
        return npc.level * 55 + npc.activityLevel * 35 + npc.socialWeight * 25;
      };

      return score(b) - score(a) || a.id.localeCompare(b.id);
    });

    const assignedCount = Math.min(candidates.length, Math.round(candidates.length * (1 - NPC_UNGUILDED_RATIO)));

    candidates.forEach((npc, index) => {
      if (index < assignedCount) pushToSmallest(guildPool, npc);
      else npcsById.set(npc.id, { ...npc, guildId: undefined });
    });
  });

  const nextGuilds = sourceGuilds.map((guild) => {
    if (isPlayerCreatedGuild(guild)) return sanitizePlayerCreatedGuild(protectedBase, guild);

    const members = (groups.get(guild.id) ?? [])
      .map((id) => npcsById.get(id))
      .filter(Boolean) as NpcPlayer[];

    const leaderScore = (npc: NpcPlayer) => {
      if (guild.type === 'PVP') return npc.arenaRating * 1.3 + npc.gearScore * 0.25 + npc.activityLevel * 75;
      if (guild.type === 'MIXED') return npc.gold * 0.03 + npc.gearScore * 0.25 + npc.activityLevel * 80;
      return npc.gearScore * 0.9 + npc.arenaRating * 0.25 + npc.activityLevel * 75;
    };

    const officers = [...members].sort((a, b) => leaderScore(b) - leaderScore(a));

    return {
      ...guild,
      memberIds: members.map((npc) => npc.id),
      leaderId: officers[0]?.id,
      deputyId: officers[1]?.id,
      officerIds: officers.slice(2, 6).map((npc) => npc.id),
    };
  });

  const finalNpcs = cleanNpcs.map((npc) => npcsById.get(npc.id) ?? npc);
  const protectedResult = protectPlayerCreatedGuilds({ ...server, guilds: nextGuilds, npcs: finalNpcs });
  return { guilds: protectedResult.guilds, npcs: protectedResult.npcs };
};


export const ensureServerRoster = (server: ServerState): ServerState => {
  const seed = server.seed ?? Date.now();
  const existingNpcGuilds = server.guilds.filter((guild) => !isPlayerCreatedGuild(guild));
  const playerGuilds = server.guilds.filter(isPlayerCreatedGuild);
  const baseGuilds = ensureNpcGuildCapacity(existingNpcGuilds.length >= 20
    ? server.guilds
    : [...createGuilds(), ...playerGuilds]);

  const protectedBase = protectPlayerCreatedGuilds({ ...server, guilds: baseGuilds, npcs: server.npcs ?? [] });
  const guilds = protectedBase.guilds.map((guild, index) => {
    if (isPlayerCreatedGuild(guild)) return sanitizePlayerCreatedGuild(protectedBase, guild);

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

  let npcs = (protectedBase.npcs ?? []).map((npc, index) => normalizeNpcEquipmentAndGear(npc, createRng(seed + 33000 + index * 17)));

  while (npcs.length < NPC_TARGET_COUNT) {
    const index = npcs.length;
    const tier = tierForRosterIndex(index);
    const rng = createRng(seed + 120000 + index * 41);
    npcs.push(createNpc(index, guilds, seed + 120000, levelForTier(tier, rng)));
  }

  npcs = npcs.slice(0, NPC_TARGET_COUNT);
  npcs = enforceRosterLevelSpread(npcs, seed);

  const assigned = assignGuildsByTier(server, guilds, npcs);
  const withPlayerGuild = assigned.guilds.map((guild) => {
    const playerAllowed = server.player.guildId === guild.id && server.player.level >= (guild.minLevel ?? 1);
    return playerAllowed ? { ...guild, memberIds: [...new Set([...guild.memberIds, server.player.id])] } : guild;
  });

  return protectPlayerCreatedGuilds({ ...server, npcs: assigned.npcs, guilds: withPlayerGuild });
};



export const createNewGame = (
  playerName = 'Newbie',
  raceId = 'human',
  classId = 'warrior',
  seed = Date.now(),
  characterCreated = true
): ServerState => {
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
    appVersion: APP_VERSION,
    seed,
    characterCreated,
    serverDay: 1,
    currentMinute: 6 * 60,
    location: { mode: 'city' },
    player: createStarterPlayer(playerName || 'Newbie', raceId, classId, seed),
    npcs,
    guilds: guildsWithMembers,
    guildRelations: [],
    guildWars: [],
    guildWarVotes: [],
    market: [],
    rankings: {
      arenaTop: [],
      raidRaceTop: [],
      wealthTop: [],
      gearTop: [],
      guildPvpTop: [],
      guildReputationTop: [],
    },
    worldNews: [],
    unlockedContent: ['greenfield', 'redcap_hills', 'ashen_mire', 'moonwood', 'frostspire_ridge', 'wyrmspire_peak'],
    guildApplications: [],
    partyFinderListings: [],
    notifications: [],
    serverWeek: 1,
    contentPatch: 1,
    metaTag: 'fresh_start',
    serverChronicle: [],
    questStates: {},
    contracts: [],
    collectionProgress: {
      obtainedItemIds: Array.from(new Set([
        ...Object.values(createStarterPlayer(playerName || 'Newbie', raceId, classId, seed).equipment).filter(Boolean).map((entry: any) => entry.itemId),
        ...createStarterPlayer(playerName || 'Newbie', raceId, classId, seed).inventory.map((entry) => entry.itemId),
      ])),
      defeatedMobIds: [],
    }
  };

  const finalRoster = ensureServerRoster(server);
  const marketRng = createRng(seed + 777001);
  const fullMarket = { ...finalRoster, market: generateFullMarket(finalRoster, marketRng) };
  const finalMarket = repairMarketIfBroken(fullMarket, marketRng, "createNewGame");
  const partyReady = refreshPartyFinderListings(finalMarket, createRng(seed + 880001));
  const guildWarReady = initializeGuildWarsCore(partyReady, createRng(seed + 990001));
  return updateRankings(guildWarReady);
};

export const createEmptyServer = (seed = Date.now()) => createNewGame('Newbie', 'human', 'warrior', seed, false);
