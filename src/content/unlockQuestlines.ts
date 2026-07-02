import { DUNGEONS, RAIDS, SPOTS, getZoneById } from './world';
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

const buildProbeObjective = (instance: DungeonDefinition, giverId: string): QuestObjective => {
  const mobs = zoneMobIds(instance.zoneId).slice(0, 3);
  if (mobs.length > 0) {
    return {
      type: 'kill',
      targetIds: mobs,
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

  return [
    {
      id: probeId,
      title: 'Следы у входа: ' + cleanName,
      giverId: giver.id,
      levelReq: instance.levelRange[0],
      zoneId: instance.zoneId,
      type: 'kill',
      importance: 'unlock',
      unlockTargetType: type,
      unlockTargetId: instance.id,
      objectives: [buildProbeObjective(instance, giver.id)],
      reward: {
        xp: Math.max(80, instance.levelRange[0] * 45),
        gold: Math.max(30, instance.levelRange[0] * 12),
      },
      introText: 'Открывает ' + label + '. Сначала проверь вход и зачисти врагов рядом.',
      progressText: 'Убей ' + requiredKills + ' врагов рядом с входом в ' + (zone?.name ?? instance.zoneId) + '.',
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
      lockedText: 'Нужно завершить ветку: ' + (zone?.name ?? instance.zoneId) + '.',
    },
  ];
};

export const UNLOCK_QUESTS: QuestDefinition[] = uniqueById([...DUNGEONS, ...RAIDS])
  .flatMap(buildUnlockQuestsForInstance);
