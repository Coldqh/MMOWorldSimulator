import { DUNGEONS, RAIDS, SPOTS, getMobById, getZoneById } from './world';
import { QUEST_GIVERS } from './questGivers';
import type { DungeonDefinition, QuestDefinition, QuestObjective } from '../types/game';

const safeId = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');

const uniqueById = <T extends { id: string }>(items: T[]) =>
  [...new Map(items.map((item) => [item.id, item])).values()];

const giverForZone = (zoneId: string) =>
  QUEST_GIVERS.find((giver) => giver.zoneId === zoneId) ??
  QUEST_GIVERS.find((giver) => giver.zoneId !== 'starting_city') ??
  QUEST_GIVERS[0];

const zoneMobIds = (zoneId: string) =>
  [...new Set(SPOTS.filter((spot) => spot.zoneId === zoneId).flatMap((spot) => spot.mobIds))];

const cleanInstanceName = (name: string) =>
  name.replace(/^(Данж|Рейд):\s*/i, '').trim();

const targetTypeText = (instance: DungeonDefinition) =>
  instance.contentType === 'raid' ? 'рейд' : 'данж';

const targetLabel = (instance: DungeonDefinition) =>
  targetTypeText(instance) + ' «' + instance.name + '»';

const mobNames = (ids: string[]) =>
  ids.map((id) => getMobById(id)?.name ?? id).join(', ');

const buildProbeObjective = (mobIds: string[], instance: DungeonDefinition, giverId: string): QuestObjective => {
  if (mobIds.length > 0) {
    return {
      type: 'kill',
      targetIds: mobIds,
      required: instance.contentType === 'raid' ? 18 : 10,
    };
  }

  return {
    type: 'talk',
    targetId: giverId,
    required: 1,
  };
};

const buildUnlockQuestsForInstance = (instance: DungeonDefinition): QuestDefinition[] => {
  const giver = giverForZone(instance.zoneId);
  if (!giver) return [];

  const zone = getZoneById(instance.zoneId);
  const type = instance.contentType === 'raid' ? 'raid' : 'dungeon';
  const base = safeId(instance.id);
  const probeId = 'unlock_' + base + '_probe';
  const openId = 'unlock_' + base + '_open';
  const cleanName = cleanInstanceName(instance.name);
  const label = targetLabel(instance);
  const requiredKills = instance.contentType === 'raid' ? 18 : 10;
  const probeMobIds = zoneMobIds(instance.zoneId).slice(0, 3);
  const probeObjective = buildProbeObjective(probeMobIds, instance, giver.id);
  const targetNames = probeMobIds.length > 0 ? mobNames(probeMobIds) : giver.name;
  const zoneName = zone?.name ?? instance.zoneId;

  return [
    {
      id: probeId,
      title: 'Следы у входа: ' + cleanName,
      giverId: giver.id,
      levelReq: instance.levelRange[0],
      zoneId: instance.zoneId,
      type: probeObjective.type,
      importance: 'unlock',
      unlockTargetType: type,
      unlockTargetId: instance.id,
      objectives: [probeObjective],
      reward: {
        xp: Math.max(80, instance.levelRange[0] * 45),
        gold: Math.max(30, instance.levelRange[0] * 12),
      },
      introText: 'Открывает ' + label + '. Цели: ' + targetNames + '.',
      progressText: probeObjective.type === 'kill'
        ? 'Убей ' + requiredKills + ' врагов: ' + targetNames + '. Локация: ' + zoneName + '.'
        : 'Поговори с ' + giver.name + '. Локация: ' + zoneName + '.',
      completeText: 'Следы собраны. Теперь можно получить финальный допуск.',
    },
    {
      id: openId,
      title: 'Открыть проход: ' + cleanName,
      giverId: giver.id,
      levelReq: instance.levelRange[0],
      zoneId: instance.zoneId,
      type: 'talk',
      importance: 'unlock',
      unlockTargetType: type,
      unlockTargetId: instance.id,
      prerequisiteQuestIds: [probeId],
      objectives: [{ type: 'talk', targetId: giver.id, required: 1 }],
      reward: {
        xp: Math.max(120, instance.levelRange[0] * 55),
        gold: Math.max(45, instance.levelRange[0] * 15),
        unlockContentIds: [instance.id],
      },
      introText: 'Финальный допуск. После сдачи откроется ' + label + '.',
      progressText: 'Вернись к ' + giver.name + ' и получи доступ.',
      completeText: 'Доступ открыт: ' + instance.name + '.',
      lockedText: 'Нужно завершить ветку: ' + zoneName + '.',
    },
  ];
};

export const UNLOCK_QUESTS: QuestDefinition[] = uniqueById([...DUNGEONS, ...RAIDS])
  .flatMap(buildUnlockQuestsForInstance);
