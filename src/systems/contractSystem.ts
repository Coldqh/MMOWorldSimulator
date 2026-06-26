import { DUNGEONS, MOBS, getDungeonById, getMobById } from '../content/world';
import { createRng, type Rng } from '../engine/rng';
import type { ContractDefinition, ContractObjective, ContractReward, ContractStatus, Id, ServerNotification, ServerState } from '../types/game';
import { advanceObjectiveProgress, isObjectiveProgressComplete } from './objectiveSystem';
import { applyRewardToPlayer, formatRewardLines } from './rewardSystem';
import { advanceObjectiveProgress, isObjectiveProgressComplete } from './objectiveSystem';

const WEEKDAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

const visibleStatuses: ContractStatus[] = ['available', 'active', 'readyToClaim'];

const timeReached = (server: ServerState, day: number, minute: number) =>
  server.serverDay > day || (server.serverDay === day && server.currentMinute >= minute);

export const getGameDayOfWeekIndex = (serverDay: number) => ((serverDay - 1) % 7 + 7) % 7;

export const getGameDayOfWeekName = (serverDay: number) => WEEKDAYS[getGameDayOfWeekIndex(serverDay)] ?? 'Понедельник';

export const getCurrentGameWeek = (server: ServerState) => Math.floor((server.serverDay - 1) / 7) + 1;

export const getNextDailyReset = (server: ServerState) => ({
  day: server.serverDay + 1,
  minute: 0,
});

export const getNextWeeklyReset = (server: ServerState) => {
  const dayIndex = getGameDayOfWeekIndex(server.serverDay);
  const daysUntilNextSunday = dayIndex === 6 ? 7 : 6 - dayIndex;
  return {
    day: server.serverDay + daysUntilNextSunday,
    minute: 0,
  };
};

export const getContractTimeLeft = (server: ServerState, contract: ContractDefinition) => {
  const current = (server.serverDay - 1) * 1440 + server.currentMinute;
  const expires = (contract.expiresDay - 1) * 1440 + contract.expiresMinute;
  const left = Math.max(0, expires - current);
  const days = Math.floor(left / 1440);
  const hours = Math.floor((left % 1440) / 60);
  const minutes = left % 60;
  if (days > 0) return `${days}д ${hours}ч`;
  if (hours > 0) return `${hours}ч ${minutes}м`;
  return `${minutes}м`;
};

const rewardFor = (level: number, category: 'daily' | 'weekly', difficulty = 1): ContractReward => {
  const baseXp = 30 + level * 18;
  const baseGold = 15 + level * 9;
  const multiplier = category === 'daily' ? 0.55 : 1.05;
  return {
    xp: Math.max(20, Math.round(baseXp * multiplier * difficulty)),
    gold: Math.max(10, Math.round(baseGold * multiplier * difficulty)),
  };
};

const levelBand = (level: number) => ({
  min: Math.max(1, level - 2),
  max: Math.min(20, level + 1),
});

const eligibleMobs = (server: ServerState) => {
  const band = levelBand(server.player.level);
  const pool = MOBS
    .filter((mob) => mob.level >= band.min && mob.level <= band.max)
    .filter((mob) => !mob.tags.includes('boss'))
    .sort((a, b) => b.level - a.level || a.name.localeCompare(b.name));
  return pool.length > 0
    ? pool
    : MOBS.filter((mob) => mob.level <= server.player.level && !mob.tags.includes('boss')).sort((a, b) => b.level - a.level);
};

const eligibleDungeons = (server: ServerState) =>
  DUNGEONS
    .filter((dungeon) => server.player.level >= dungeon.levelRange[0])
    .sort((a, b) => b.levelRange[0] - a.levelRange[0] || b.levelRange[1] - a.levelRange[1] || a.name.localeCompare(b.name));

const contractId = (server: ServerState, category: 'daily' | 'weekly', slot: number, suffix: string) =>
  `contract_${category}_${server.serverDay}_${getCurrentGameWeek(server)}_${slot}_${suffix}`;

const makeKillContract = (server: ServerState, rng: Rng, category: 'daily' | 'weekly', slot: number): ContractDefinition => {
  const mobs = eligibleMobs(server);
  const mob = mobs.length > 0 ? rng.pick(mobs.slice(0, Math.min(6, mobs.length))) : MOBS[0];
  const required = category === 'daily' ? rng.int(8, 12) : rng.int(28, 40);
  const reset = category === 'daily' ? getNextDailyReset(server) : getNextWeeklyReset(server);
  return {
    id: contractId(server, category, slot, `kill_${mob.id}`),
    category,
    title: category === 'daily' ? 'Охота' : 'Недельная охота',
    objective: {
      type: 'kill_specific_mob',
      targetId: mob.id,
      required,
      current: 0,
      levelMin: mob.level,
      levelMax: mob.level,
    },
    reward: rewardFor(mob.level, category, category === 'daily' ? 1 : 1.2),
    status: 'available',
    generatedDay: server.serverDay,
    generatedMinute: server.currentMinute,
    expiresDay: reset.day,
    expiresMinute: reset.minute,
  };
};

const makeDungeonContract = (server: ServerState, rng: Rng, category: 'daily' | 'weekly', slot: number): ContractDefinition => {
  const dungeons = eligibleDungeons(server);
  if (dungeons.length === 0) return makeKillContract(server, rng, category, slot);
  const dungeon = dungeons[0];
  const required = category === 'daily' ? 1 : rng.int(2, 3);
  const reset = category === 'daily' ? getNextDailyReset(server) : getNextWeeklyReset(server);
  return {
    id: contractId(server, category, slot, `dungeon_${dungeon.id}`),
    category,
    title: category === 'daily' ? 'Проверка данжа' : 'Недельный данж',
    objective: {
      type: 'complete_dungeon',
      targetId: dungeon.id,
      required,
      current: 0,
      levelMin: dungeon.levelRange[0],
      levelMax: dungeon.levelRange[1],
    },
    reward: rewardFor(dungeon.levelRange[0], category, category === 'daily' ? 1.25 : 1.55),
    status: 'available',
    generatedDay: server.serverDay,
    generatedMinute: server.currentMinute,
    expiresDay: reset.day,
    expiresMinute: reset.minute,
  };
};

const makeArenaContract = (server: ServerState, rng: Rng, category: 'daily' | 'weekly', slot: number): ContractDefinition => {
  const win = category === 'weekly' ? rng.chance(0.5) : rng.chance(0.35);
  const required = category === 'daily'
    ? (win ? 1 : 2)
    : (win ? rng.int(3, 5) : rng.int(6, 8));
  const reset = category === 'daily' ? getNextDailyReset(server) : getNextWeeklyReset(server);
  return {
    id: contractId(server, category, slot, `${win ? 'win' : 'play'}_arena`),
    category,
    title: category === 'daily' ? 'Арена' : 'Недельная арена',
    objective: {
      type: win ? 'win_arena' : 'play_arena',
      required,
      current: 0,
      levelMin: server.player.level,
      levelMax: server.player.level,
    },
    reward: rewardFor(server.player.level, category, win ? 1.35 : 1.05),
    status: 'available',
    generatedDay: server.serverDay,
    generatedMinute: server.currentMinute,
    expiresDay: reset.day,
    expiresMinute: reset.minute,
  };
};

const buildContracts = (
  server: ServerState,
  rng: Rng,
  category: 'daily' | 'weekly',
): ContractDefinition[] => {
  const makers = [makeKillContract, makeDungeonContract, makeArenaContract];
  return makers.map((maker, index) => maker(server, rng, category, index + 1));
};

export const generateDailyContracts = (server: ServerState, rng: Rng): ContractDefinition[] =>
  buildContracts(server, rng, 'daily');

export const generateWeeklyContracts = (server: ServerState, rng: Rng): ContractDefinition[] =>
  buildContracts(server, rng, 'weekly');

const categoryContracts = (contracts: ContractDefinition[], category: 'daily' | 'weekly') =>
  contracts.filter((contract) => contract.category === category);

const categoryNeedsFullReset = (server: ServerState, contracts: ContractDefinition[], category: 'daily' | 'weekly') => {
  const list = categoryContracts(contracts, category);
  if (list.length === 0) return true;
  return list.every((contract) => timeReached(server, contract.expiresDay, contract.expiresMinute));
};

export const isContractComplete = (contract: ContractDefinition) =>
  isObjectiveProgressComplete(contract.objective);

const updateContractObjective = (objective: ContractObjective, amount = 1): ContractObjective =>
  advanceObjectiveProgress(objective, amount);

export const refreshContracts = (server: ServerState, rng: Rng = createRng(server.seed + server.serverDay * 8800 + server.currentMinute)): ServerState => {
  let contracts = [...(server.contracts ?? [])];

  if (categoryNeedsFullReset(server, contracts, 'daily')) {
    contracts = [
      ...contracts.filter((contract) => contract.category !== 'daily'),
      ...generateDailyContracts({ ...server, contracts }, rng),
    ];
  }

  if (categoryNeedsFullReset(server, contracts, 'weekly')) {
    contracts = [
      ...contracts.filter((contract) => contract.category !== 'weekly'),
      ...generateWeeklyContracts({ ...server, contracts }, rng),
    ];
  }

  return {
    ...server,
    contracts,
  };
};

export const acceptContract = (server: ServerState, contractId: Id): ServerState => ({
  ...server,
  contracts: (server.contracts ?? []).map((contract) =>
    contract.id === contractId && contract.status === 'available'
      ? { ...contract, status: 'active', acceptedDay: server.serverDay, acceptedMinute: server.currentMinute }
      : contract,
  ),
});

export const cancelContract = (server: ServerState, contractId: Id): ServerState => ({
  ...server,
  contracts: (server.contracts ?? []).map((contract) =>
    contract.id === contractId && (contract.status === 'available' || contract.status === 'active' || contract.status === 'readyToClaim')
      ? { ...contract, status: 'cancelled' as const }
      : contract,
  ),
});

export const claimContractReward = (server: ServerState, contractId: Id): { server: ServerState; notification: ServerNotification | null } => {
  const contract = (server.contracts ?? []).find((entry) => entry.id === contractId);
  if (!contract || contract.status !== 'readyToClaim') return { server, notification: null };

  const player = applyRewardToPlayer(server.player, contract.reward);

  return {
    server: {
      ...server,
      player,
      contracts: (server.contracts ?? []).map((entry) =>
        entry.id === contract.id
          ? { ...entry, status: 'claimed', claimedDay: server.serverDay, claimedMinute: server.currentMinute }
          : entry,
      ),
    },
    notification: {
      id: `contract_claim_${contract.id}_${server.serverDay}_${server.currentMinute}`,
      type: 'reward',
      title: 'Контракт выполнен',
      text: contract.title,
      lines: [getContractGoalText(contract), ...formatRewardLines(contract.reward)],
    },
  };
};

const completeContract = (server: ServerState, contract: ContractDefinition) => {
  const player = applyRewardToPlayer(server.player, contract.reward);

  const completed: ContractDefinition = {
    ...contract,
    status: 'claimed',
    completedDay: server.serverDay,
    completedMinute: server.currentMinute,
    claimedDay: server.serverDay,
    claimedMinute: server.currentMinute,
  };

  const notification: ServerNotification = {
    id: `contract_auto_claim_${contract.id}_${server.serverDay}_${server.currentMinute}`,
    type: 'reward',
    title: 'Контракт выполнен',
    text: contract.title,
    lines: [getContractGoalText(contract), ...formatRewardLines(contract.reward)],
  };

  return { player, contract: completed, notification };
};

const updateContracts = (
  server: ServerState,
  updater: (objective: ContractObjective) => ContractObjective,
): ServerState => {
  const notifications: ServerNotification[] = [];
  let player = server.player;

  const contracts = (server.contracts ?? []).map((contract) => {
    if (contract.status !== 'active') return contract;
    const next = { ...contract, objective: updater(contract.objective) };
    if (!isContractComplete(next)) return next;
    const result = completeContract({ ...server, player }, next);
    player = result.player;
    notifications.push(result.notification);
    return result.contract;
  });

  return {
    ...server,
    player,
    contracts,
    notifications: [...(server.notifications ?? []), ...notifications],
  };
};

export const updateContractsOnMobKill = (server: ServerState, mobId: Id): ServerState => {
  const mob = getMobById(mobId);
  return updateContracts(server, (objective) => {
    if (objective.type === 'kill_specific_mob' && objective.targetId === mobId) {
      return updateContractObjective(objective);
    }
    if (objective.type === 'kill_mobs' && mob) {
      const min = objective.levelMin ?? 1;
      const max = objective.levelMax ?? 20;
      if (mob.level >= min && mob.level <= max) {
        return updateContractObjective(objective);
      }
    }
    return objective;
  });
};

export const updateContractsOnDungeonComplete = (server: ServerState, dungeonId: Id): ServerState =>
  updateContracts(server, (objective) => {
    if (objective.type !== 'complete_dungeon') return objective;
    if (objective.targetId && objective.targetId !== dungeonId) return objective;
    const dungeon = getDungeonById(dungeonId);
    if (!dungeon) return objective;
    const min = objective.levelMin ?? 1;
    const max = objective.levelMax ?? 20;
    if (dungeon.levelRange[0] < min || dungeon.levelRange[0] > max) return objective;
    return updateContractObjective(objective);
  });

export const updateContractsOnArenaResult = (server: ServerState, won: boolean): ServerState =>
  updateContracts(server, (objective) => {
    if (objective.type === 'play_arena') {
      return updateContractObjective(objective);
    }
    if (objective.type === 'win_arena' && won) {
      return updateContractObjective(objective);
    }
    return objective;
  });

export const getContractGoalText = (contract: ContractDefinition) => {
  const objective = contract.objective;
  if (objective.type === 'kill_specific_mob') {
    const mob = objective.targetId ? getMobById(objective.targetId) : undefined;
    return `Убить ${objective.required} ${mob?.name ?? 'мобов'}`;
  }
  if (objective.type === 'kill_mobs') {
    return `Убить ${objective.required} мобов уровня ${objective.levelMin ?? 1}–${objective.levelMax ?? 20}`;
  }
  if (objective.type === 'complete_dungeon') {
    const dungeon = objective.targetId ? getDungeonById(objective.targetId) : undefined;
    return `Пройти ${objective.required} ${dungeon?.name ?? 'данж'}`;
  }
  if (objective.type === 'play_arena') return `Сыграть ${objective.required} боёв на арене`;
  if (objective.type === 'win_arena') return `Выиграть ${objective.required} боёв на арене`;
  return contract.title;
};

export const getContractRewardText = (contract: ContractDefinition) =>
  `XP ${contract.reward.xp} · Gold ${contract.reward.gold}`;

export const isContractVisible = (contract: ContractDefinition) =>
  visibleStatuses.includes(contract.status);
