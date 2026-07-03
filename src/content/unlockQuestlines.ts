import { DUNGEONS, RAIDS, SPOTS, getMobById, getZoneById } from './world';
import { QUEST_GIVERS } from './questGivers';
import type { DungeonDefinition, QuestDefinition, QuestObjective } from '../types/game';

const safeId = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');

const uniqueById = <T extends { id: string }>(items: T[]) =>
  [...new Map(items.map((item) => [item.id, item])).values()];

const cleanName = (name: string) =>
  name.replace(/^(Данж|Рейд):\s*/i, '').trim();

const giverForZone = (zoneId: string) =>
  QUEST_GIVERS.find((giver) => giver.zoneId === zoneId) ??
  QUEST_GIVERS.find((giver) => giver.zoneId !== 'starting_city') ??
  QUEST_GIVERS[0];

const zoneMobIds = (zoneId: string) =>
  [...new Set(SPOTS.filter((spot) => spot.zoneId === zoneId).flatMap((spot) => spot.mobIds))];

const mobName = (id: string) => getMobById(id)?.name ?? id;

const targetTypeText = (instance: DungeonDefinition) =>
  instance.contentType === 'raid' ? 'рейд' : 'данж';

const buildKillObjectives = (instance: DungeonDefinition): QuestObjective[] => {
  const mobs = zoneMobIds(instance.zoneId).slice(0, 3);
  if (mobs.length === 0) return [];
  const perMob = instance.contentType === 'raid' ? 6 : 4;
  return mobs.map((mobId) => ({
    type: 'kill',
    targetId: mobId,
    required: perMob,
  }));
};

const buildUnlockQuestForInstance = (instance: DungeonDefinition): QuestDefinition[] => {
  const giver = giverForZone(instance.zoneId);
  if (!giver) return [];

  const zone = getZoneById(instance.zoneId);
  const type = instance.contentType === 'raid' ? 'raid' : 'dungeon';
  const titleType = instance.contentType === 'raid' ? 'рейд' : 'данж';
  const base = safeId(instance.id);
  const instanceName = cleanName(instance.name);
  const objectives = buildKillObjectives(instance);
  const objectiveText = objectives.length > 0
    ? objectives.map((objective) => {
      const name = objective.targetId ? mobName(objective.targetId) : 'цель';
      return name + ' — ' + objective.required;
    }).join('; ')
    : 'поговорить с ' + giver.name;
  const finalObjectives = objectives.length > 0
    ? objectives
    : [{ type: 'talk' as const, targetId: giver.id, required: 1 }];

  return [{
    id: 'unlock_' + base,
    title: 'Открыть ' + titleType + ': ' + instanceName,
    giverId: giver.id,
    levelReq: instance.levelRange[0],
    zoneId: instance.zoneId,
    type: objectives.length > 0 ? 'kill' : 'talk',
    importance: 'unlock',
    unlockTargetType: type,
    unlockTargetId: instance.id,
    objectives: finalObjectives,
    reward: {
      xp: Math.max(120, instance.levelRange[0] * 60),
      gold: Math.max(45, instance.levelRange[0] * 16),
      unlockContentIds: [instance.id],
    },
    introText: 'Открывает ' + targetTypeText(instance) + ': ' + instanceName + '.',
    progressText: 'Убей: ' + objectiveText + '. Локация: ' + (zone?.name ?? instance.zoneId) + '.',
    completeText: 'Доступ открыт: ' + instanceName + '.',
    lockedText: 'Нужно прийти в зону: ' + (zone?.name ?? instance.zoneId) + '.',
  }];
};

export const UNLOCK_QUESTS: QuestDefinition[] = uniqueById([...DUNGEONS, ...RAIDS])
  .flatMap(buildUnlockQuestForInstance);
