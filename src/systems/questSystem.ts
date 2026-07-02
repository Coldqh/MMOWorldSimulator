import { QUESTS, getQuestById } from '../content/quests';
import { getQuestGiverById } from '../content/questGivers';
import type {
  Id,
  InventoryStack,
  QuestDefinition,
  QuestObjective,
  QuestStatus,
  QuestSystemAction,
  QuestState,
  ServerNotification,
  ServerState,
} from '../types/game';
import { advanceObjectiveProgress, haveObjectivesChanged, isObjectiveProgressComplete } from './objectiveSystem';
import { applyRewardToPlayer, formatRewardLines } from './rewardSystem';

const cloneObjective = (objective: QuestObjective): QuestObjective => ({
  ...objective,
  targetIds: objective.targetIds ? [...objective.targetIds] : undefined,
  current: objective.current ?? 0,
});

const acceptedObjectives = (quest: QuestDefinition) => quest.objectives.map(cloneObjective);

const completedPrerequisites = (server: ServerState, quest: QuestDefinition) =>
  (quest.prerequisiteQuestIds ?? []).every((id) => server.questStates?.[id]?.status === 'completed');

export const normalizeQuestStates = (server: ServerState): ServerState => ({
  ...server,
  questStates: server.questStates ?? {},
});

export const getQuestTurnInGiverId = (quest: QuestDefinition) => {
  if (quest.type === 'talk') {
    const talkTarget = quest.objectives.find((objective) => objective.type === 'talk' && objective.targetId);
    if (talkTarget?.targetId) return talkTarget.targetId;
  }
  return quest.giverId;
};

export const isQuestObjectiveComplete = (objective: QuestObjective) =>
  isObjectiveProgressComplete(objective);

export const isQuestReadyToTurnIn = (server: ServerState, questId: Id) => {
  const state = server.questStates?.[questId];
  if (!state || state.status === 'completed') return false;
  return state.objectives.every(isQuestObjectiveComplete);
};

export const getQuestState = (server: ServerState, questId: Id): QuestState => {
  const quest = getQuestById(questId);
  const existing = server.questStates?.[questId];
  if (existing) {
    if (existing.status !== 'completed' && existing.objectives.every(isQuestObjectiveComplete)) {
      return { ...existing, status: 'readyToTurnIn' };
    }
    return existing;
  }

  if (!quest) return { status: 'locked', objectives: [] };
  if (server.player.level < quest.levelReq || !completedPrerequisites(server, quest)) {
    return { status: 'locked', objectives: acceptedObjectives(quest) };
  }

  return { status: 'available', objectives: acceptedObjectives(quest) };
};

export const canAcceptQuest = (server: ServerState, quest: QuestDefinition) =>
  getQuestState(server, quest.id).status === 'available';

const questsForGiver = (giverId: Id) =>
  QUESTS.filter((quest) => quest.giverId === giverId || getQuestTurnInGiverId(quest) === giverId);

export const getAvailableQuestsForGiver = (server: ServerState, giverId: Id) =>
  QUESTS.filter((quest) => quest.giverId === giverId && canAcceptQuest(server, quest));

export const getActiveQuestsForGiver = (server: ServerState, giverId: Id) =>
  questsForGiver(giverId).filter((quest) => getQuestState(server, quest.id).status === 'active');

export const getReadyToTurnInQuestsForGiver = (server: ServerState, giverId: Id) =>
  questsForGiver(giverId).filter((quest) => getQuestTurnInGiverId(quest) === giverId && getQuestState(server, quest.id).status === 'readyToTurnIn');

export const hasAvailableQuestForGiver = (server: ServerState, giverId: Id) =>
  getAvailableQuestsForGiver(server, giverId).length > 0 || getReadyToTurnInQuestsForGiver(server, giverId).length > 0;

export const acceptQuest = (server: ServerState, questId: Id): ServerState => {
  const quest = getQuestById(questId);
  if (!quest || !canAcceptQuest(server, quest)) return server;
  let next: ServerState = {
    ...server,
    questStates: {
      ...(server.questStates ?? {}),
      [quest.id]: {
        status: 'active',
        objectives: acceptedObjectives(quest),
        acceptedDay: server.serverDay,
        acceptedMinute: server.currentMinute,
      },
    },
  };
  return refreshReadyQuests(next);
};

const removeQuestItems = (inventory: InventoryStack[], itemId: Id, amount: number) => {
  let left = amount;
  return inventory
    .map((entry) => {
      if (entry.itemId !== itemId || left <= 0) return entry;
      const take = Math.min(entry.amount, left);
      left -= take;
      return { ...entry, amount: entry.amount - take };
    })
    .filter((entry) => entry.amount > 0);
};

export const turnInQuest = (server: ServerState, questId: Id): { server: ServerState; notification: ServerNotification | null } => {
  const quest = getQuestById(questId);
  const state = quest ? getQuestState(server, questId) : undefined;
  if (!quest || !state || state.status !== 'readyToTurnIn') return { server, notification: null };

  let player = applyRewardToPlayer(server.player, quest.reward, { includeItems: false, includeReputation: false });

  state.objectives.forEach((objective) => {
    if (objective.type === 'collect' && objective.itemId) {
      player = { ...player, inventory: removeQuestItems(player.inventory, objective.itemId, objective.required) };
    }
  });

  player = applyRewardToPlayer(player, { xp: 0, gold: 0, items: quest.reward.items ?? [] }, { includeReputation: false });

  let next: ServerState = {
    ...server,
    player,
    questStates: {
      ...(server.questStates ?? {}),
      [quest.id]: {
        ...state,
        status: 'completed',
        completedDay: server.serverDay,
        completedMinute: server.currentMinute,
      },
    },
  };

  const unlockedContentIds = quest.reward.unlockContentIds ?? [];
  if (unlockedContentIds.length > 0) {
    const before = new Set(next.unlockedContent ?? []);
    const opened = unlockedContentIds.filter((id) => !before.has(id));

    next = {
      ...next,
      unlockedContent: [...new Set([...(next.unlockedContent ?? []), ...unlockedContentIds])],
    };

    if (opened.length > 0) {
      next = {
        ...next,
        notifications: [
          ...(next.notifications ?? []),
          {
            id: `unlock_content_${quest.id}_${server.serverDay}_${server.currentMinute}`,
            type: 'dungeon',
            title: quest.unlockTargetType === 'raid' ? 'Рейд открыт' : 'Данж открыт',
            text: quest.title,
            lines: opened.map((id) => 'Открыт доступ: ' + id),
          },
        ],
        worldNews: [
          ...(next.worldNews ?? []),
          {
            id: `news_unlock_${quest.id}_${server.serverDay}_${server.currentMinute}`,
            day: server.serverDay,
            minute: server.currentMinute,
            type: quest.unlockTargetType === 'raid' ? 'raid' as const : 'dungeon' as const,
            text: `${server.player.name} открыл доступ: ${opened.join(', ')}.`,
            important: quest.unlockTargetType === 'raid',
          },
        ].slice(-80),
      };
    }
  }

  const rewardLines = [
    ...formatRewardLines(quest.reward),
    ...unlockedContentIds.map((id) => 'Открыт доступ: ' + id),
  ];

  return {
    server: next,
    notification: {
      id: `quest_turnin_${quest.id}_${server.currentMinute}`,
      type: 'reward',
      title: 'Квест сдан',
      text: quest.title,
      lines: rewardLines,
    },
  };
};

const updateObjective = (objective: QuestObjective, amount = 1): QuestObjective =>
  advanceObjectiveProgress(objective, amount);

export const refreshReadyQuests = (server: ServerState): ServerState => {
  const states = Object.fromEntries(Object.entries(server.questStates ?? {}).map(([questId, state]) => {
    if (state.status === 'completed') return [questId, state];
    const ready = state.objectives.every(isQuestObjectiveComplete);
    return [questId, { ...state, status: ready ? 'readyToTurnIn' as QuestStatus : 'active' as QuestStatus }];
  }));
  return { ...server, questStates: states };
};

const updateActiveQuestObjectives = (
  server: ServerState,
  updater: (quest: QuestDefinition, objective: QuestObjective) => QuestObjective,
): ServerState => {
  const questStates = { ...(server.questStates ?? {}) };
  let changed = false;

  QUESTS.forEach((quest) => {
    const state = questStates[quest.id];
    if (!state || state.status !== 'active') return;
    const nextObjectives = state.objectives.map((objective) => updater(quest, objective));
    if (haveObjectivesChanged(state.objectives, nextObjectives)) {
      questStates[quest.id] = { ...state, objectives: nextObjectives };
      changed = true;
    }
  });

  return changed ? refreshReadyQuests({ ...server, questStates }) : server;
};

export const updateQuestProgressOnMobKill = (server: ServerState, mobId: Id): ServerState =>
  updateActiveQuestObjectives(server, (_quest, objective) => {
    if (objective.type !== 'kill') return objective;
    if (objective.targetId === mobId) return updateObjective(objective);
    if (objective.targetIds?.includes(mobId)) return updateObjective(objective);
    return objective;
  });

export const updateQuestProgressOnItemGain = (server: ServerState, itemId: Id, amount = 1): ServerState =>
  updateActiveQuestObjectives(server, (_quest, objective) => {
    if (objective.type !== 'collect' || objective.itemId !== itemId) return objective;
    return updateObjective(objective, amount);
  });

export const updateQuestProgressOnDungeonComplete = (server: ServerState, dungeonId: Id): ServerState =>
  updateActiveQuestObjectives(server, (_quest, objective) => {
    if (objective.type !== 'dungeon' || objective.dungeonId !== dungeonId) return objective;
    return updateObjective(objective);
  });

export const updateQuestProgressOnSystemAction = (server: ServerState, action: QuestSystemAction): ServerState =>
  updateActiveQuestObjectives(server, (_quest, objective) => {
    if (objective.type !== 'system' || objective.systemAction !== action) return objective;
    return updateObjective(objective);
  });

export const talkToQuestGiver = (server: ServerState, giverId: Id): ServerState => {
  if (!getQuestGiverById(giverId)) return server;
  return updateActiveQuestObjectives(server, (_quest, objective) => {
    if (objective.type !== 'talk' || objective.targetId !== giverId) return objective;
    return updateObjective(objective);
  });
};

export const getQuestProgressText = (server: ServerState, quest: QuestDefinition) => {
  const state = getQuestState(server, quest.id);
  return state.objectives.map((objective) => {
    if (objective.type === 'kill') return `${objective.current ?? 0}/${objective.required}`;
    if (objective.type === 'collect') return `${objective.current ?? 0}/${objective.required}`;
    if (objective.type === 'dungeon') return isQuestObjectiveComplete(objective) ? 'готово' : '0/1';
    if (objective.type === 'system') return isQuestObjectiveComplete(objective) ? 'готово' : '0/1';
    if (objective.type === 'talk') return isQuestObjectiveComplete(objective) ? 'готово' : '0/1';
    return `${objective.current ?? 0}/${objective.required}`;
  }).join(' · ');
};
