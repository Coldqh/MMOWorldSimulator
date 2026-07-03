import { getDungeonById, getMobById } from '../content/world';
import { ITEMS, getItemById } from '../content/items';
import type { Rng } from '../engine/rng';
import { createRng, uid } from '../engine/rng';
import type { CombatState, DungeonDefinition, DungeonDifficulty, DungeonRunRank, DungeonRunResult, DungeonRunState, GameModal, PartyRoleMap, ServerState } from '../types/game';
import { addInventoryItem, getGearScore, getPlayerStats } from './itemSystem';
import { startBossCombat } from './combatSystem';
import { buildPartyRolesFromMembers, getClassPartyRole, isDpsRole } from './partyRoleSystem';

export const DUNGEON_DIFFICULTIES: DungeonDifficulty[] = ['normal', 'hard', 'mythic'];

export const DUNGEON_DIFFICULTY_CONFIG: Record<DungeonDifficulty, { label: string; enemyHp: number; enemyDamage: number; marks: number; rewardGold: number; gearReq: number }> = {
  normal: { label: 'Normal', enemyHp: 1, enemyDamage: 1, marks: 3, rewardGold: 1, gearReq: 0 },
  hard: { label: 'Hard', enemyHp: 1.28, enemyDamage: 1.16, marks: 7, rewardGold: 1.35, gearReq: 1.05 },
  mythic: { label: 'Mythic', enemyHp: 1.72, enemyDamage: 1.35, marks: 14, rewardGold: 1.9, gearReq: 1.35 },
};

export const getDungeonDifficultyLabel = (difficulty: DungeonDifficulty = 'normal') =>
  DUNGEON_DIFFICULTY_CONFIG[difficulty]?.label ?? 'Normal';

export const getDungeonDifficultyGearRequirement = (dungeon: DungeonDefinition, difficulty: DungeonDifficulty = 'normal') => {
  if (difficulty === 'normal') return 0;
  const base = dungeon.levelRange[0] * 110 + dungeon.partySize * 120;
  return Math.round(base * DUNGEON_DIFFICULTY_CONFIG[difficulty].gearReq);
};

export const buildPartyRoles = (server: ServerState, partyNpcIds: string[]): PartyRoleMap | null =>
  buildPartyRolesFromMembers(server, [server.player.id, ...partyNpcIds]);

const shuffle = <T,>(items: T[], rng: Rng) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = rng.int(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const totalEncounters = (dungeon: DungeonDefinition) =>
  dungeon.floors.reduce((sum, floor) => sum + floor.mobIds.length, 0);

const runDurationMinutes = (server: ServerState, run: DungeonRunState) =>
  Math.max(1, (server.serverDay - run.startedDay) * 1440 + server.currentMinute - run.startedMinute);

const rankDungeonRun = (dungeon: DungeonDefinition, durationMinutes: number, deaths: number, cleared: number): DungeonRunRank => {
  const total = Math.max(1, totalEncounters(dungeon));
  if (cleared < total) return 'Fail';
  if (deaths === 0 && durationMinutes <= Math.max(20, dungeon.timeCostMinutes * 1.05)) return 'S';
  if (deaths <= 1 && durationMinutes <= Math.max(25, dungeon.timeCostMinutes * 1.35)) return 'A';
  if (deaths <= 3) return 'B';
  return 'C';
};

const rankMarkBonus = (rank: DungeonRunRank) => {
  if (rank === 'S') return 5;
  if (rank === 'A') return 3;
  if (rank === 'B') return 1;
  return 0;
};

const stoneIdForRun = (dungeon: DungeonDefinition, difficulty: DungeonDifficulty, rank: DungeonRunRank) => {
  const level = dungeon.levelRange[1];
  const band = level >= 60 ? 'max' : level >= 41 ? 'high' : level >= 21 ? 'mid' : 'low';
  const rarity = difficulty === 'mythic' && (rank === 'S' || rank === 'A')
    ? 'legendary'
    : difficulty === 'mythic'
      ? 'epic'
      : difficulty === 'hard'
        ? 'rare'
        : rank === 'S'
          ? 'uncommon'
          : 'common';

  if (band === 'low') {
    if (rarity === 'common') return 'sharpening_stone';
    return 'enhance_stone_' + rarity;
  }

  return 'enhance_stone_' + band + '_' + rarity;
};

const isPlayerClassReward = (server: ServerState, item: NonNullable<ReturnType<typeof getItemById>>) =>
  item.classTags.length === 0 || item.classTags.includes(server.player.classId);

const rankDropBonus = (rank: DungeonRunRank) => {
  if (rank === 'S') return 0.18;
  if (rank === 'A') return 0.10;
  if (rank === 'B') return 0.04;
  if (rank === 'C') return 0.01;
  return -1;
};

const baseGearDropChance = (dungeon: DungeonDefinition, difficulty: DungeonDifficulty) => {
  if (dungeon.contentType === 'raid') {
    if (difficulty === 'mythic') return 0.70;
    if (difficulty === 'hard') return 0.55;
    return 0.38;
  }

  if (difficulty === 'mythic') return 0.52;
  if (difficulty === 'hard') return 0.34;
  return 0.18;
};

const pickInstanceGearReward = (
  server: ServerState,
  dungeon: DungeonDefinition,
  difficulty: DungeonDifficulty,
  rank: DungeonRunRank,
  rng: Rng,
) => {
  const chance = Math.max(0, Math.min(0.95, baseGearDropChance(dungeon, difficulty) + rankDropBonus(rank)));
  if (!rng.chance(chance)) return undefined;

  const wantedSource = dungeon.contentType === 'raid' ? 'raid' : 'dungeon';
  const maxRewardLevel = Math.max(server.player.level + 2, dungeon.levelRange[1]);
  const candidates = ITEMS
    .filter((item) => item.slot)
    .filter((item) => item.sourceType === wantedSource && item.sourceId === dungeon.id)
    .filter((item) => item.levelReq <= maxRewardLevel)
    .filter((item) => isPlayerClassReward(server, item))
    .filter((item) => {
      if (difficulty === 'normal' && dungeon.contentType !== 'raid') return item.rarity === 'epic';
      if (difficulty === 'normal') return item.rarity === 'epic' || rng.chance(0.12);
      if (difficulty === 'hard') return item.rarity === 'epic' || item.rarity === 'legendary';
      return item.rarity === 'epic' || item.rarity === 'legendary' || item.rarity === 'mythic';
    });

  if (candidates.length === 0) return undefined;

  const sorted = [...candidates].sort((a, b) => {
    const rarityWeight = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5, mythic: 6, unique: 7 };
    return rarityWeight[b.rarity] - rarityWeight[a.rarity] || b.levelReq - a.levelReq;
  });

  const top = sorted.slice(0, Math.min(sorted.length, difficulty === 'mythic' ? 12 : 8));
  return rng.pick(top);
};

export const applyDungeonDifficultyToCombat = (combat: CombatState, difficulty: DungeonDifficulty = 'normal'): CombatState => {
  const config = DUNGEON_DIFFICULTY_CONFIG[difficulty] ?? DUNGEON_DIFFICULTY_CONFIG.normal;
  if (difficulty === 'normal') return combat;

  const enemy = {
    ...combat.enemy,
    maxHp: Math.max(1, Math.round(combat.enemy.maxHp * config.enemyHp)),
    hp: Math.max(1, Math.round(combat.enemy.hp * config.enemyHp)),
    attack: Math.max(1, Math.round(combat.enemy.attack * config.enemyDamage)),
    magic: Math.max(1, Math.round(combat.enemy.magic * config.enemyDamage)),
    defense: Math.max(1, Math.round(combat.enemy.defense * (difficulty === 'mythic' ? 1.18 : 1.08))),
  };

  return {
    ...combat,
    enemy,
    log: [...combat.log, 'Сложность: ' + config.label + '.'].slice(-40),
  };
};

export const completeDungeonRunReward = (server: ServerState, completedRun: DungeonRunState): ServerState => {
  const dungeon = getDungeonById(completedRun.dungeonId);
  if (!dungeon) return { ...server, currentDungeonRun: undefined };

  const difficulty = completedRun.difficulty ?? 'normal';
  const config = DUNGEON_DIFFICULTY_CONFIG[difficulty] ?? DUNGEON_DIFFICULTY_CONFIG.normal;
  const cleared = completedRun.encountersCleared ?? totalEncounters(dungeon);
  const deaths = completedRun.deaths ?? 0;
  const duration = runDurationMinutes(server, completedRun);
  const rank = rankDungeonRun(dungeon, duration, deaths, cleared);
  const dailyBonus = server.player.lastDailyDungeonBonusDay !== server.serverDay;
  const weekly = server.serverWeek ?? Math.max(1, Math.ceil(server.serverDay / 7));
  const weeklyBonus = server.player.lastWeeklyDungeonChestWeek !== weekly && difficulty !== 'normal';

  const baseMarks = config.marks + rankMarkBonus(rank);
  const marks = baseMarks + (dailyBonus ? 4 : 0) + (weeklyBonus ? 10 : 0);
  const gold = Math.max(1, Math.round((dungeon.levelRange[0] * 14 + dungeon.partySize * 18) * config.rewardGold + rankMarkBonus(rank) * 12));
  const rewardRng = createRng(server.seed + server.serverDay * 9001 + server.currentMinute + completedRun.id.length);
  const stoneId = stoneIdForRun(dungeon, difficulty, rank);
  const stone = getItemById(stoneId);
  const gearReward = pickInstanceGearReward(server, dungeon, difficulty, rank, rewardRng);
  const lootItemIds = [stone?.id, gearReward?.id].filter((id): id is string => Boolean(id));

  const lines = [
    'Ранг: ' + rank + '.',
    'Сложность: ' + config.label + '.',
    'Время: ' + duration + ' мин.',
    'Смерти: ' + deaths + '.',
    'Энкаунтеры: ' + cleared + '/' + totalEncounters(dungeon) + '.',
    'Dungeon Marks: +' + marks + '.',
    'Gold: +' + gold + '.',
  ];

  if (dailyBonus) lines.push('Daily bonus: +4 marks.');
  if (weeklyBonus) lines.push('Weekly chest: +10 marks.');
  if (stone) lines.push('Награда: ' + stone.name + '.');
  if (gearReward) lines.push('BoP gear: ' + gearReward.name + ' · ' + (gearReward.sourceName ?? dungeon.name) + '.');

  let inventory = server.player.inventory;
  if (stone) inventory = addInventoryItem(inventory, stone.id, 1, 0);
  if (gearReward) inventory = addInventoryItem(inventory, gearReward.id, 1, 0);

  const player = {
    ...server.player,
    gold: server.player.gold + gold,
    dungeonMarks: (server.player.dungeonMarks ?? 0) + marks,
    lastDailyDungeonBonusDay: dailyBonus ? server.serverDay : server.player.lastDailyDungeonBonusDay,
    lastWeeklyDungeonChestWeek: weeklyBonus ? weekly : server.player.lastWeeklyDungeonChestWeek,
    inventory,
  };

  const result: DungeonRunResult = {
    id: 'dungeon_result_' + completedRun.id,
    dungeonId: dungeon.id,
    difficulty,
    rank,
    success: rank !== 'Fail',
    deaths,
    encountersCleared: cleared,
    totalEncounters: totalEncounters(dungeon),
    durationMinutes: duration,
    marks,
    dailyBonus,
    weeklyBonus,
    gold,
    lootItemIds,
    lines,
    completedDay: server.serverDay,
    completedMinute: server.currentMinute,
  };

  return {
    ...server,
    player,
    currentDungeonRun: undefined,
    lastDungeonRunResult: result,
    notifications: [
      ...(server.notifications ?? []),
      {
        id: result.id,
        type: 'dungeon',
        title: 'Данж завершён',
        text: dungeon.name + ' · ' + config.label + ' · Rank ' + rank,
        lines,
      },
    ],
    worldNews: [
      ...(server.worldNews ?? []),
      {
        id: 'news_' + result.id,
        day: server.serverDay,
        minute: server.currentMinute,
        type: dungeon.contentType === 'raid' ? 'raid' as const : 'dungeon' as const,
        text: server.player.name + ' завершил ' + dungeon.name + ' на ' + config.label + '. Rank ' + rank + '.',
        important: rank === 'S' || difficulty === 'mythic',
      },
    ].slice(-80),
  };
};

export const findDungeonParty = (server: ServerState, dungeonId: string, rng: Rng): string[] => {
  const dungeon = getDungeonById(dungeonId);
  if (!dungeon || server.player.level < (dungeon.contentType === 'raid' ? dungeon.levelRange[0] : 5)) return [];

  const playerGuild = server.player.guildId
    ? server.guilds.find((guild) => guild.id === server.player.guildId)
    : undefined;
  const guildLocked = playerGuild?.tier === 'high';
  const playerRole = getClassPartyRole(server.player.classId);

  const basePool = shuffle(
    server.npcs
      .filter((npc) => npc.level >= dungeon.levelRange[0] - 1 && npc.level <= dungeon.levelRange[1] + 1)
      .filter((npc) => !guildLocked || npc.guildId === playerGuild?.id)
      .filter((npc) => ['pve', 'pve', 'mixed', 'pve', 'pvp'].includes(npc.roleFocus)),
    rng,
  ).sort((a, b) => {
    const aScore = a.activityLevel + a.socialWeight + a.gearScore / 16 + (a.roleFocus === 'pve' ? 4 : 0) + rng.next() * 8;
    const bScore = b.activityLevel + b.socialWeight + b.gearScore / 16 + (b.roleFocus === 'pve' ? 4 : 0) + rng.next() * 8;
    return bScore - aScore;
  });

  const selected: string[] = [];
  const takeFirst = (predicate: (npc: ServerState['npcs'][number]) => boolean) => {
    const npc = basePool.find((entry) => !selected.includes(entry.id) && predicate(entry));
    if (npc) selected.push(npc.id);
    return npc;
  };

  if (playerRole !== 'tank') takeFirst((npc) => getClassPartyRole(npc.classId) === 'tank');
  if (playerRole !== 'healer') takeFirst((npc) => getClassPartyRole(npc.classId) === 'healer');

  for (const npc of basePool) {
    if (selected.length >= dungeon.partySize - 1) break;
    if (selected.includes(npc.id)) continue;
    if (!isDpsRole(getClassPartyRole(npc.classId))) continue;
    selected.push(npc.id);
  }

  if (selected.length < dungeon.partySize - 1) return [];
  const roles = buildPartyRoles(server, selected);
  if (!roles) return [];
  const allMembers = [server.player, ...selected.map((id) => server.npcs.find((npc) => npc.id === id)).filter(Boolean) as ServerState['npcs']];
  const hasOnlyValidRoles = allMembers.every((member) => {
    const role = getClassPartyRole(member.classId);
    if (role === 'tank') return member.classId === 'warrior';
    if (role === 'healer') return member.classId === 'priest';
    return member.classId === 'mage' || member.classId === 'ranger';
  });
  return hasOnlyValidRoles ? selected : [];
};

export const createDungeonRun = (server: ServerState, dungeonId: string, rng: Rng, difficulty: DungeonDifficulty = 'normal'): DungeonRunState | null => {
  const dungeon = getDungeonById(dungeonId);
  if (!dungeon || server.player.level < (dungeon.contentType === 'raid' ? dungeon.levelRange[0] : 5)) return null;

  const party = findDungeonParty(server, dungeonId, rng);
  if (party.length < dungeon.partySize - 1) return null;
  const partyRoles = buildPartyRoles(server, party);
  if (!partyRoles) return null;

  return {
    id: uid('dungeon_run', rng),
    dungeonId,
    partyNpcIds: party,
    partyRoles,
    currentFloor: 0,
    currentEncounterIndex: 0,
    status: 'betweenFloors',
    startedDay: server.serverDay,
    startedMinute: server.currentMinute,
    contentType: dungeon.contentType ?? 'dungeon',
    difficulty,
    encountersCleared: 0,
    deaths: 0,
  };
};

export const startDungeonFloorCombat = (server: ServerState, rng: Rng): CombatState | null => {
  const run = server.currentDungeonRun;
  if (!run || run.status !== 'betweenFloors') return null;

  const dungeon = getDungeonById(run.dungeonId);
  const floor = dungeon?.floors[run.currentFloor];
  if (!dungeon || !floor) return null;

  const encounterIndex = run.currentEncounterIndex ?? 0;
  const mobId = floor.mobIds[encounterIndex];
  if (!mobId) return null;
  const mob = getMobById(mobId);
  const total = floor.mobIds.length;
  const title = mob ? mob.name + ' · ' + (encounterIndex + 1) + '/' + total : floor.name + ' · ' + (encounterIndex + 1) + '/' + total;
  const isBossTarget = floor.type === 'boss' && encounterIndex >= total - 1;
  const combat = startBossCombat(
    server,
    mobId,
    dungeon.id,
    (run.contentType ?? dungeon.contentType ?? 'dungeon') as 'dungeon' | 'raid',
    run.partyNpcIds,
    rng,
    run.partyRoles,
    [mobId],
    title,
    encounterIndex,
    total,
    isBossTarget,
  );
  if (!combat) return null;

  return applyDungeonDifficultyToCombat({
    ...combat,
    dungeonFloorIndex: run.currentFloor,
    log: [
      floor.name + '.',
      'Цель ' + (encounterIndex + 1) + '/' + total + ': ' + (mob?.name ?? mobId) + '.',
      'Пати: ' + (run.partyNpcIds.length + 1) + '.',
    ],
  }, run.difficulty ?? 'normal');
};

export const advanceDungeonAfterEncounter = (server: ServerState, floorIndex: number): ServerState => {
  const run = server.currentDungeonRun;
  const dungeon = run ? getDungeonById(run.dungeonId) : undefined;
  const floor = dungeon?.floors[floorIndex];
  if (!run || !dungeon || !floor || floorIndex !== run.currentFloor) return server;

  const cleared = (run.encountersCleared ?? 0) + 1;
  const nextEncounter = (run.currentEncounterIndex ?? 0) + 1;
  if (nextEncounter < floor.mobIds.length) {
    return { ...server, currentDungeonRun: { ...run, encountersCleared: cleared, currentEncounterIndex: nextEncounter, status: 'betweenFloors' } };
  }

  const nextFloor = run.currentFloor + 1;
  if (nextFloor >= dungeon.floors.length) {
    return completeDungeonRunReward(server, { ...run, encountersCleared: cleared, status: 'completed' });
  }

  return { ...server, currentDungeonRun: { ...run, encountersCleared: cleared, currentFloor: nextFloor, currentEncounterIndex: 0, status: 'betweenFloors' } };
};

export const completeDungeonFloor = advanceDungeonAfterEncounter;

export const restInDungeon = (server: ServerState): { server: ServerState; minutes: number } => {
  const stats = getPlayerStats(server.player);
  const hpRatio = 1 - Math.max(0, Math.min(server.player.hp, stats.hp)) / Math.max(1, stats.hp);
  const manaRatio = 1 - Math.max(0, Math.min(server.player.mana, stats.mana)) / Math.max(1, stats.mana);
  const missingRatio = Math.max(0, Math.min(1, Math.max(hpRatio, manaRatio)));
  const minutes = missingRatio <= 0 ? 5 : Math.max(5, Math.min(60, Math.ceil(missingRatio * 60)));

  return {
    minutes,
    server: {
      ...server,
      player: {
        ...server.player,
        hp: stats.hp,
        mana: stats.mana,
      },
    },
  };
};

export const resolveDungeonEventFloor = (server: ServerState, _rng: Rng): { server: ServerState; modal: GameModal | null; minutes: number } => {
  return { server, modal: null, minutes: 0 };
};
