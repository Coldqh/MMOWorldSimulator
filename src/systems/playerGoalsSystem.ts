import { DUNGEONS, RAIDS, SPOTS } from '../content/world';
import { calculateXpForNextLevel } from '../balance/formulas';
import { getGearScore } from './itemSystem';
import type { ServerState } from '../types/game';

export type GoalSeverity = 'good' | 'normal' | 'warning' | 'danger';

export interface GoalMetric {
  id: string;
  label: string;
  value: string;
  target?: string;
  progress: number;
  severity: GoalSeverity;
}

export interface GoalAction {
  label: string;
  detail: string;
}

export interface GoalSection {
  id: string;
  title: string;
  subtitle: string;
  metrics: GoalMetric[];
  actions: GoalAction[];
}

export interface PlayerGoalsViewModel {
  summary: GoalMetric[];
  sections: GoalSection[];
}

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const percent = (value: number, target: number) => clamp(target <= 0 ? 100 : (value / target) * 100);
const fmt = (value: number) => Math.max(0, Math.round(value)).toLocaleString('ru-RU');

const gearTargetForLevel = (level: number) => {
  const safe = Math.max(1, Math.min(20, level));
  if (safe <= 3) return 120 + safe * 45;
  if (safe <= 9) return 250 + safe * 85;
  if (safe <= 15) return 550 + safe * 115;
  return 1150 + safe * 145;
};

const arenaRanks = [
  { name: 'Bronze', rating: 0 },
  { name: 'Silver', rating: 900 },
  { name: 'Gold', rating: 1200 },
  { name: 'Platinum', rating: 1500 },
  { name: 'Diamond', rating: 1800 },
  { name: 'Legend', rating: 2200 },
];

const getArenaRank = (rating: number) => {
  let current = arenaRanks[0];
  let next = arenaRanks[arenaRanks.length - 1];

  for (let i = 0; i < arenaRanks.length; i += 1) {
    if (rating >= arenaRanks[i].rating) {
      current = arenaRanks[i];
      next = arenaRanks[Math.min(arenaRanks.length - 1, i + 1)];
    }
  }

  return { current, next };
};

export const buildPlayerGoalsViewModel = (server: ServerState): PlayerGoalsViewModel => {
  const player = server.player;
  const level = player.level;
  const xpTarget = level >= 20 ? 0 : calculateXpForNextLevel(level);
  const xpProgress = level >= 20 ? 100 : percent(player.xp, xpTarget);
  const gearScore = getGearScore(player.equipment);
  const gearTarget = gearTargetForLevel(level);
  const gearProgress = percent(gearScore, gearTarget);
  const arena = getArenaRank(player.arenaRating);
  const nextArenaGap = Math.max(0, arena.next.rating - player.arenaRating);
  const arenaProgress = arena.next.rating === arena.current.rating ? 100 : percent(player.arenaRating - arena.current.rating, arena.next.rating - arena.current.rating);
  const guild = player.guildId ? server.guilds.find((entry) => entry.id === player.guildId) : undefined;
  const spot = [...SPOTS]
    .filter((entry) => level >= Math.max(1, entry.levelRange[0] - 1))
    .sort((a, b) => Math.abs(((a.levelRange[0] + a.levelRange[1]) / 2) - level) - Math.abs(((b.levelRange[0] + b.levelRange[1]) / 2) - level))[0];
  const dungeon = [...DUNGEONS]
    .filter((entry) => level >= entry.levelRange[0])
    .sort((a, b) => b.levelRange[0] - a.levelRange[0])[0];
  const raid = [...RAIDS]
    .filter((entry) => level >= Math.max(1, entry.levelRange[0] - 1))
    .sort((a, b) => a.levelRange[0] - b.levelRange[0])[0];
  const activeQuests = Object.values(server.questStates ?? {}).filter((state) => state.status === 'active' || state.status === 'readyToTurnIn').length;
  const activeContracts = (server.contracts ?? []).filter((contract) => contract.status === 'active').length;
  const readyContracts = (server.contracts ?? []).filter((contract) => contract.status === 'readyToClaim').length;
  const arenaPosition = 1 + (server.npcs ?? []).filter((npc) => (npc.arenaRating ?? 0) > player.arenaRating).length;
  const arenaTotal = 1 + (server.npcs ?? []).length;

  const summary: GoalMetric[] = [
    {
      id: 'level',
      label: 'Уровень',
      value: level >= 20 ? '20 / 20' : String(level) + ' ур.',
      target: level >= 20 ? 'кап' : fmt(player.xp) + ' / ' + fmt(xpTarget) + ' XP',
      progress: xpProgress,
      severity: level >= 20 ? 'good' : 'normal',
    },
    {
      id: 'gear',
      label: 'Gear Score',
      value: fmt(gearScore),
      target: 'цель ' + fmt(gearTarget),
      progress: gearProgress,
      severity: gearProgress >= 100 ? 'good' : gearProgress >= 75 ? 'normal' : 'warning',
    },
    {
      id: 'arena',
      label: 'Арена',
      value: fmt(player.arenaRating) + ' · ' + arena.current.name,
      target: nextArenaGap > 0 ? 'до ' + arena.next.name + ': ' + fmt(nextArenaGap) : 'верхний ранг',
      progress: arenaProgress,
      severity: 'normal',
    },
    {
      id: 'guild',
      label: 'Гильдия',
      value: guild ? guild.name : 'нет',
      target: guild ? String(guild.tier ?? 'low') + ' · ' + String(guild.guildFocus ?? guild.type) : 'вступить или создать',
      progress: guild ? 100 : 0,
      severity: guild ? 'good' : 'warning',
    },
  ];

  const sections: GoalSection[] = [
    {
      id: 'progress',
      title: 'Прокачка',
      subtitle: level >= 20 ? 'Кап уровня взят.' : 'До ' + String(level + 1) + ' уровня осталось ' + fmt(Math.max(0, xpTarget - player.xp)) + ' XP.',
      metrics: [
        {
          id: 'xp',
          label: 'Опыт',
          value: fmt(player.xp),
          target: level >= 20 ? 'кап' : fmt(xpTarget),
          progress: xpProgress,
          severity: 'normal',
        },
        {
          id: 'quests',
          label: 'Квесты',
          value: String(activeQuests),
          target: '2–4 активных',
          progress: clamp(activeQuests * 25),
          severity: activeQuests > 0 ? 'good' : 'warning',
        },
      ],
      actions: [
        spot ? { label: 'Фарм', detail: spot.name + ' · Lv. ' + spot.levelRange[0] + '–' + spot.levelRange[1] } : { label: 'Фарм', detail: 'Подходящий спот не найден.' },
        { label: 'Контракты', detail: String(activeContracts) + ' активных · ' + String(readyContracts) + ' готовы к сдаче' },
      ],
    },
    {
      id: 'gear',
      title: 'Снаряжение',
      subtitle: 'Текущий GS ' + fmt(gearScore) + '. Цель по уровню: ' + fmt(gearTarget) + '.',
      metrics: [
        {
          id: 'gs',
          label: 'GS',
          value: fmt(gearScore),
          target: fmt(gearTarget),
          progress: gearProgress,
          severity: gearProgress >= 100 ? 'good' : gearProgress >= 70 ? 'normal' : 'danger',
        },
      ],
      actions: [
        dungeon ? { label: 'Добыча', detail: dungeon.name + ': хороший источник апгрейдов.' } : { label: 'Добыча', detail: 'Сначала открой данжи по уровню.' },
        { label: 'Заточка', detail: 'Сначала оружие и броня, потом карты.' },
      ],
    },
    {
      id: 'arena',
      title: 'Арена',
      subtitle: 'Ранг ' + arena.current.name + '. Примерное место: ' + String(arenaPosition) + '/' + String(arenaTotal) + '.',
      metrics: [
        {
          id: 'rating',
          label: 'Рейтинг',
          value: fmt(player.arenaRating),
          target: nextArenaGap > 0 ? arena.next.name + ': ' + fmt(arena.next.rating) : 'верхний ранг',
          progress: arenaProgress,
          severity: 'normal',
        },
      ],
      actions: [
        { label: '1v1', detail: 'Быстрая проверка билда.' },
        { label: '3v3 / 5v5 / 10v10', detail: 'Проверка роли и командной боёвки.' },
      ],
    },
    {
      id: 'dungeon_raid',
      title: 'Данжи и рейды',
      subtitle: raid ? 'Ближайшая рейдовая цель: ' + raid.name + '.' : 'Рейдовая цель пока закрыта.',
      metrics: [
        {
          id: 'dungeon',
          label: 'Данж',
          value: dungeon ? dungeon.name : 'нет',
          target: dungeon ? 'Lv. ' + dungeon.levelRange[0] + '–' + dungeon.levelRange[1] : 'подними уровень',
          progress: dungeon ? 100 : 0,
          severity: dungeon ? 'good' : 'warning',
        },
        {
          id: 'raid',
          label: 'Рейд',
          value: raid ? raid.name : 'нет',
          target: raid ? 'Lv. ' + raid.levelRange[0] + '–' + raid.levelRange[1] : 'позже',
          progress: raid ? percent(level, raid.levelRange[0]) : 0,
          severity: raid && level >= raid.levelRange[0] ? 'normal' : 'warning',
        },
      ],
      actions: [
        dungeon ? { label: 'Следующий шаг', detail: 'Собери пати в ' + dungeon.name + '.' } : { label: 'Следующий шаг', detail: 'Качайся на спотах и квестах.' },
        raid ? { label: 'Рейд', detail: 'Готовь GS и стабильную пати к ' + raid.name + '.' } : { label: 'Рейд', detail: 'Рейды появятся ближе к high-уровням.' },
      ],
    },
    {
      id: 'guild',
      title: 'Гильдия и сервер',
      subtitle: guild ? 'Ты в гильдии ' + guild.name + '.' : 'Ты без гильдии.',
      metrics: [
        {
          id: 'guild_state',
          label: 'Статус',
          value: guild ? String(guild.tier ?? 'low') + ' · ' + String(guild.guildFocus ?? guild.type) : 'без гильдии',
          target: guild ? 'участников ' + String(guild.memberIds.length) : level >= 20 ? 'high доступна' : level >= 10 ? 'mid доступна' : 'low доступна',
          progress: guild ? 100 : level >= 10 ? 60 : 30,
          severity: guild ? 'good' : 'warning',
        },
      ],
      actions: [
        guild ? { label: 'Гильдия', detail: 'Проверь войны, осады и заявки.' } : { label: 'Гильдия', detail: level >= 20 ? 'Можно создавать high-гильдию.' : level >= 10 ? 'Можно создавать mid-гильдию.' : 'Пока доступна low-гильдия.' },
        { label: 'Сервер', detail: 'Новости показывают войны, дропы, осады и движение мира.' },
      ],
    },
  ];

  return { summary, sections };
};

export const goalSeverityLabel = (severity: GoalSeverity) => {
  if (severity === 'good') return 'ОК';
  if (severity === 'warning') return 'Внимание';
  if (severity === 'danger') return 'Слабо';
  return 'Цель';
};
