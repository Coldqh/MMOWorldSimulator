import { DUNGEONS, RAIDS, SPOTS } from '../content/world';
import { MAX_LEVEL } from '../balance';
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
  const safe = Math.max(1, Math.min(MAX_LEVEL, level));
  if (safe <= 10) return 240 + safe * 110;
  if (safe <= 20) return 1100 + safe * 150;
  if (safe <= 40) return 3600 + (safe - 20) * 190;
  if (safe < 60) return 7600 + (safe - 40) * 230;
  return 12000;
};

const tierLabelForLevel = (level: number) => {
  if (level >= 60) return 'max';
  if (level >= 41) return 'high';
  if (level >= 21) return 'mid';
  return 'low';
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

const nearestByLevel = <T extends { levelRange: [number, number] }>(entries: T[], level: number) =>
  [...entries].sort((a, b) => {
    const aCenter = (a.levelRange[0] + a.levelRange[1]) / 2;
    const bCenter = (b.levelRange[0] + b.levelRange[1]) / 2;
    return Math.abs(aCenter - level) - Math.abs(bCenter - level) || a.levelRange[0] - b.levelRange[0];
  })[0];

const bestUnlockedByLevel = <T extends { levelRange: [number, number] }>(entries: T[], level: number) =>
  [...entries]
    .filter((entry) => level >= entry.levelRange[0])
    .sort((a, b) => b.levelRange[0] - a.levelRange[0])[0];

export const buildPlayerGoalsViewModel = (server: ServerState): PlayerGoalsViewModel => {
  const player = server.player;
  const level = player.level;
  const xpTarget = level >= MAX_LEVEL ? 0 : calculateXpForNextLevel(level);
  const xpProgress = level >= MAX_LEVEL ? 100 : percent(player.xp, xpTarget);
  const gearScore = getGearScore(player.equipment);
  const gearTarget = gearTargetForLevel(level);
  const gearProgress = percent(gearScore, gearTarget);
  const arena = getArenaRank(player.arenaRating);
  const nextArenaGap = Math.max(0, arena.next.rating - player.arenaRating);
  const arenaProgress = arena.next.rating === arena.current.rating ? 100 : percent(player.arenaRating - arena.current.rating, arena.next.rating - arena.current.rating);
  const guild = player.guildId ? server.guilds.find((entry) => entry.id === player.guildId) : undefined;
  const currentTier = tierLabelForLevel(level);
  const spot = nearestByLevel(SPOTS, level);
  const dungeon = bestUnlockedByLevel(DUNGEONS, level) ?? nearestByLevel(DUNGEONS, level);
  const raid = bestUnlockedByLevel(RAIDS, level) ?? nearestByLevel(RAIDS, level);
  const activeQuests = Object.values(server.questStates ?? {}).filter((state) => state.status === 'active' || state.status === 'readyToTurnIn').length;
  const activeContracts = (server.contracts ?? []).filter((contract) => contract.status === 'active').length;
  const readyContracts = (server.contracts ?? []).filter((contract) => contract.status === 'readyToClaim').length;
  const arenaPosition = 1 + (server.npcs ?? []).filter((npc) => (npc.arenaRating ?? 0) > player.arenaRating).length;
  const arenaTotal = 1 + (server.npcs ?? []).length;

  const summary: GoalMetric[] = [
    {
      id: 'level',
      label: 'Уровень',
      value: String(level) + ' / ' + String(MAX_LEVEL),
      target: level >= MAX_LEVEL ? 'кап уровня' : fmt(player.xp) + ' / ' + fmt(xpTarget) + ' XP',
      progress: xpProgress,
      severity: level >= MAX_LEVEL ? 'good' : 'normal',
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
      id: 'tier',
      label: 'Tier',
      value: currentTier,
      target: level >= MAX_LEVEL ? 'финальный диапазон' : 'следующий диапазон через уровни',
      progress: level >= MAX_LEVEL ? 100 : percent(level, MAX_LEVEL),
      severity: level >= 60 ? 'good' : level >= 41 ? 'normal' : 'warning',
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
      id: 'next',
      title: 'Следующий шаг',
      subtitle: level >= MAX_LEVEL ? 'Уровень закрыт. Дальше решают gear score, рейды, арена и гильдии.' : 'До ' + String(level + 1) + ' уровня осталось ' + fmt(Math.max(0, xpTarget - player.xp)) + ' XP.',
      metrics: [
        {
          id: 'xp',
          label: 'Опыт',
          value: level >= MAX_LEVEL ? 'кап' : fmt(player.xp),
          target: level >= MAX_LEVEL ? '60 / 60' : fmt(xpTarget),
          progress: xpProgress,
          severity: level >= MAX_LEVEL ? 'good' : 'normal',
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
      subtitle: 'GS ' + fmt(gearScore) + ' из цели ' + fmt(gearTarget) + ' для текущего уровня.',
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
        dungeon ? { label: 'Данж', detail: dungeon.name + ' · Lv. ' + dungeon.levelRange[0] + '–' + dungeon.levelRange[1] } : { label: 'Данж', detail: 'Сначала подними уровень.' },
        { label: 'Заточка', detail: 'Камни теперь завязаны на диапазон уровня и редкость.' },
      ],
    },
    {
      id: 'arena',
      title: 'Арена',
      subtitle: 'Ранг ' + arena.current.name + '. Место: ' + String(arenaPosition) + '/' + String(arenaTotal) + '.',
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
        { label: 'Быстро', detail: '1v1 для проверки билда.' },
        { label: 'Команда', detail: '3v3 / 5v5 / 10v10 для роли и синергии.' },
      ],
    },
    {
      id: 'dungeon_raid',
      title: 'Данжи и рейды',
      subtitle: raid ? 'Рейдовая цель: ' + raid.name + '.' : 'Рейдовая цель пока закрыта.',
      metrics: [
        {
          id: 'dungeon',
          label: 'Данж',
          value: dungeon ? dungeon.name : 'нет',
          target: dungeon ? 'Lv. ' + dungeon.levelRange[0] + '–' + dungeon.levelRange[1] : 'подними уровень',
          progress: dungeon && level >= dungeon.levelRange[0] ? 100 : dungeon ? percent(level, dungeon.levelRange[0]) : 0,
          severity: dungeon && level >= dungeon.levelRange[0] ? 'good' : 'warning',
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
        dungeon ? { label: 'Пати', detail: 'Собери группу в ' + dungeon.name + '.' } : { label: 'Пати', detail: 'Качайся на спотах и квестах.' },
        raid ? { label: 'Рейд', detail: 'Готовь GS и стабильный состав к ' + raid.name + '.' } : { label: 'Рейд', detail: 'Рейды откроются позже.' },
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
          target: guild ? 'участников ' + String(guild.memberIds.length) : 'доступен tier ' + currentTier,
          progress: guild ? 100 : level >= 21 ? 65 : 35,
          severity: guild ? 'good' : 'warning',
        },
      ],
      actions: [
        guild ? { label: 'Войны', detail: 'Проверь войны, осады и заявки.' } : { label: 'Вступить', detail: 'Ищи гильдию своего уровня.' },
        { label: 'Сервер', detail: 'Новости показывают войны, дропы, осады и движение мира.' },
      ],
    },
  ];

  return { summary, sections };
};

export const goalSeverityLabel = (severity: GoalSeverity) => {
  if (severity === 'good') return 'ОК';
  if (severity === 'warning') return 'Риск';
  if (severity === 'danger') return 'Слабо';
  return 'Цель';
};
