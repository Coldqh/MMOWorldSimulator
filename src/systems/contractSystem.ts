import { DUNGEONS, MOBS, getDungeonById, getMobById } from '../content/world';
import { createRng, type Rng } from '../engine/rng';
import type { ContractDefinition, ContractObjective, ContractReward, ContractStatus, Id, ServerNotification, ServerState } from '../types/game';
import { addPlayerXp } from './progressionSystem';

const WEEKDAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

const activeStatuses: ContractStatus[] = ['available', 'active', 'readyToClaim'];

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
  const isSunday = dayIndex === 6;
  const daysUntilSunday = isSunday ? 7 : 6 - dayIndex;
  return {
    day: server.serverDay + daysUntilSunday,
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
  count = 3,
  startSlot = 1,
): ContractDefinition[] => {
  const makers = [makeKillContract, makeDungeonContract, makeArenaContract];
  return Array.from({ length: count }, (_entry, index) => {
    const slot = startSlot + index;
    const maker = makers[(slot - 1) % makers.length] ?? makeKillContract;
    return maker(server, rng, category, slot);
  });
};

export const generateDailyContracts = (server: ServerState, rng: Rng, count = 3, startSlot = 1): ContractDefinition[] =>
  buildContracts(server, rng, 'daily', count, startSlot);

export const generateWeeklyContracts = (server: ServerState, rng: Rng, count = 3, startSlot = 1): ContractDefinition[] =>
  buildContracts(server, rng, 'weekly', count, startSlot);

const liveCount = (contracts: ContractDefinition[], category: 'daily' | 'weekly') =>
  contracts.filter((contract) => contract.category === category && activeStatuses.includes(contract.status)).length;

const nextSlotFor = (contracts: ContractDefinition[], category: 'daily' | 'weekly') =>
  contracts.filter((contract) => contract.category === category).length + 1;

export const isContractComplete = (contract: ContractDefinition) =>
  contract.objective.current >= contract.objective.required;

const markReadyIfComplete = (server: ServerState, contract: ContractDefinition): { contract: ContractDefinition; notification?: ServerNotification } => {
  if (contract.status !== 'active' || !isContractComplete(contract)) return { contract };
  const ready: ContractDefinition = {
    ...contract,
    status: 'readyToClaim',
    completedDay: server.serverDay,
    completedMinute: server.currentMinute,
  };
  return {
    contract: ready,
    notification: {
      id: `contract_ready_${contract.id}_${server.serverDay}_${server.currentMinute}`,
      type: 'reward',
      title: 'Контракт выполнен',
      text: contract.title,
      lines: [getContractGoalText(contract), 'Забери награду во вкладке Контракты.'],
    },
  };
};

export const refreshContracts = (server: ServerState, rng: Rng = createRng(server.seed + server.serverDay * 8800 + server.currentMinute)): ServerState => {
  let contracts = [...(server.contracts ?? [])].map((contract) => {
    if (activeStatuses.includes(contract.status) && timeReached(server, contract.expiresDay, contract.expiresMinute)) {
      return { ...contract, status: 'expired' as const };
    }
    return contract;
  });

  const dailyLive = liveCount(contracts, 'daily');
  if (dailyLive < 3) {
    contracts = [
      ...contracts.filter((contract) => !(contract.category === 'daily' && !activeStatuses.includes(contract.status))),
      ...generateDailyContracts({ ...server, contracts }, rng, 3 - dailyLive, nextSlotFor(contracts, 'daily')),
    ];
  }

  const weeklyLive = liveCount(contracts, 'weekly');
  if (weeklyLive < 3) {
    contracts = [
      ...contracts.filter((contract) => !(contract.category === 'weekly' && !activeStatuses.includes(contract.status))),
      ...generateWeeklyContracts({ ...server, contracts }, rng, 3 - weeklyLive, nextSlotFor(contracts, 'weekly')),
    ];
  }

  const unique = new Map<string, ContractDefinition>();
  contracts.forEach((contract) => unique.set(contract.id, contract));

  return {
    ...server,
    contracts: [...unique.values()],
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

export const cancelContract = (server: ServerState, contractId: Id): ServerState => {
  const cancelled = (server.contracts ?? []).map((contract) =>
    contract.id === contractId && (contract.status === 'available' || contract.status === 'active')
      ? { ...contract, status: 'cancelled' as const }
      : contract,
  );
  return refreshContracts({ ...server, contracts: cancelled }, createRng(server.seed + server.serverDay * 8911 + server.currentMinute));
};

export const claimContractReward = (server: ServerState, contractId: Id): { server: ServerState; notification: ServerNotification | null } => {
  const contract = (server.contracts ?? []).find((entry) => entry.id === contractId);
  if (!contract || contract.status !== 'readyToClaim') return { server, notification: null };

  let player = addPlayerXp(server.player, contract.reward.xp);
  player = { ...player, gold: player.gold + contract.reward.gold };

  const next: ServerState = refreshContracts({
    ...server,
    player,
    contracts: (server.contracts ?? []).map((entry) =>
      entry.id === contract.id
        ? { ...entry, status: 'claimed', claimedDay: server.serverDay, claimedMinute: server.currentMinute }
        : entry,
    ),
  }, createRng(server.seed + server.serverDay * 8922 + server.currentMinute));

  return {
    server: next,
    notification: {
      id: `contract_claim_${contract.id}_${server.serverDay}_${server.currentMinute}`,
      type: 'reward',
      title: 'Награда получена',
      text: contract.title,
      lines: [`XP +${contract.reward.xp}`, `Gold +${contract.reward.gold}`],
    },
  };
};

const updateContracts = (
  server: ServerState,
  updater: (objective: ContractObjective) => ContractObjective,
): ServerState => {
  const notifications: ServerNotification[] = [];
  const contracts = (server.contracts ?? []).map((contract) => {
    if (contract.status !== 'active') return contract;
    const next = { ...contract, objective: updater(contract.objective) };
    const ready = markReadyIfComplete(server, next);
    if (ready.notification) notifications.push(ready.notification);
    return ready.contract;
  });
  return {
    ...server,
    contracts,
    notifications: [...(server.notifications ?? []), ...notifications],
  };
};

export const updateContractsOnMobKill = (server: ServerState, mobId: Id): ServerState => {
  const mob = getMobById(mobId);
  return updateContracts(server, (objective) => {
    if (objective.type === 'kill_specific_mob' && objective.targetId === mobId) {
      return { ...objective, current: Math.min(objective.required, objective.current + 1) };
    }
    if (objective.type === 'kill_mobs' && mob) {
      const min = objective.levelMin ?? 1;
      const max = objective.levelMax ?? 20;
      if (mob.level >= min && mob.level <= max) {
        return { ...objective, current: Math.min(objective.required, objective.current + 1) };
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
    return { ...objective, current: Math.min(objective.required, objective.current + 1) };
  });

export const updateContractsOnArenaResult = (server: ServerState, won: boolean): ServerState =>
  updateContracts(server, (objective) => {
    if (objective.type === 'play_arena') {
      return { ...objective, current: Math.min(objective.required, objective.current + 1) };
    }
    if (objective.type === 'win_arena' && won) {
      return { ...objective, current: Math.min(objective.required, objective.current + 1) };
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
