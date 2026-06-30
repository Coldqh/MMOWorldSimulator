import { DUNGEONS, RAIDS, SPOTS } from '../content/world';
import { getItemById } from '../content/items';
import { calculateXpForNextLevel } from '../balance/formulas';
import { getGearScore } from './itemSystem';
import type { EquipmentSlot, ServerState } from '../types/game';

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

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(value)));
const percent = (value: number, target: number) => clamp(target <= 0 ? 100 : (value / target) * 100);
const formatNumber = (value: number) => Math.max(0, Math.round(value)).toLocaleString('ru-RU');

const gearTargetForLevel = (level: number) => {
  const safe = Math.max(1, Math.min(20, level));
  if (safe <= 3) return 120 + safe * 45;
  if (safe <= 9) return 250 + safe * 85;
  if (safe <= 15) return 550 + safe * 115;
  return 1150 + safe * 145;
};

const arenaRankThresholds = [
  { name: 'Bronze', rating: 0 },
  { name: 'Silver', rating: 900 },
  { name: 'Gold', rating: 1200 },
  { name: 'Platinum', rating: 1500 },
  { name: 'Diamond', rating: 1800 },
  { name: 'Legend', rating: 2200 },
];

const getArenaRank = (rating: number) => {
  let current = arenaRankThresholds[0];
  let next = arenaRankThresholds[arenaRankThresholds.length - 1];
  for (let i = 0; i < arenaRankThresholds.length; i += 1) {
    if (rating >= arenaRankThresholds[i].rating) {
      current = arenaRankThresholds[i];
      next = arenaRankThresholds[Math.min(arenaRankThresholds.length - 1, i + 1)];
    }
  }
  return { current, next };
};

const equippedSlots: EquipmentSlot[] = ['weapon', 'head', 'chest', 'legs', 'boots', 'ring', 'amulet'];

const missingEquipmentSlots = (server: ServerState) =>
  equippedSlots.filter((slot) => !server.player.equipment[slot]);

const bestMarketUpgrade = (server: ServerState) => {
  const player = server.player;
  const currentBySlot = new Map<EquipmentSlot, number>();
  equippedSlots.forEach((slot) => {
    const equipped = player.equipment[slot];
    const item = equipped ? getItemById(equipped.itemId) : undefined;
    currentBySlot.set(slot, item ? Math.max(1, item.levelReq + (equipped?.enhancement ?? 0)) : 0);
  });

  return [...(server.market ?? [])]
    .map((listing) => {
      const item = getItemById(listing.itemId);
      if (!item?.slot) return undefined;
      if (item.levelReq > player.level) return undefined;
      if (item.classTags.length > 0 && !item.classTags.includes(player.classId)) return undefined;
      const current = currentBySlot.get(item.slot) ?? 0;
      const rarityBonus = item.rarity === 'rare' ? 2 : item.rarity === 'epic' ? 4 : item.rarity === 'legendary' ? 7 : 0;
      const score = item.levelReq + (listing.enhancement ?? 0) + rarityBonus;
      if (score <= current) return undefined;
      return { listing, item, score, current };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .sort((a, b) => (b.score - b.current) - (a.score - a.current) || a.listing.price - b.listing.price)[0];
};

const recommendedSpot = (server: ServerState) => {
  const level = server.player.level;
  return [...SPOTS]
    .map((spot) => {
      const center = (spot.levelRange[0] + spot.levelRange[1]) / 2;
      const distance = Math.abs(center - level);
      const available = level >= Math.max(1, spot.levelRange[0] - 1);
      const score = (available ? 100 : 0) - distance * 15 - spot.risk * 3;
      return { spot, score };
    })
    .sort((a, b) => b.score - a.score)[0]?.spot;
};

const recommendedDungeon = (server: ServerState) => {
  const level = server.player.level;
  return [...DUNGEONS]
    .filter((dungeon) => level >= dungeon.levelRange[0])
    .sort((a, b) => b.levelRange[0] - a.levelRange[0] || b.levelRange[1] - a.levelRange[1])[0];
};

const recommendedRaid = (server: ServerState) => {
  const level = server.player.level;
  return [...RAIDS]
    .filter((raid) => level >= Math.max(1, raid.levelRange[0] - 1))
    .sort((a, b) => a.levelRange[0] - b.levelRange[0])[0];
};

const activeQuestCount = (server: ServerState) =>
  Object.values(server.questStates ?? {}).filter((state) => state.status === 'active' || state.status === 'readyToTurnIn').length;

const readyContractCount = (server: ServerState) =>
  (server.contracts ?? []).filter((contract) => contract.status === 'readyToClaim').length;

const activeContractCount = (server: ServerState) =>
  (server.contracts ?? []).filter((contract) => contract.status === 'active').length;

export const buildPlayerGoalsViewModel = (server: ServerState): PlayerGoalsViewModel => {
  const player = server.player;
  const level = player.level;
  const nextLevelXp = level >= 20 ? 0 : calculateXpForNextLevel(level);
  const xpProgress = level >= 20 ? 100 : percent(player.xp, nextLevelXp);
  const gearScore = getGearScore(player.equipment);
  const gearTarget = gearTargetForLevel(level);
  const nextGearTarget = gearTargetForLevel(Math.min(20, level + 1));
  const gearProgress = percent(gearScore, gearTarget);
  const arena = getArenaRank(player.arenaRating);
  const nextArenaGap = Math.max(0, arena.next.rating - player.arenaRating);
  const arenaProgress = arena.next.rating === arena.current.rating
    ? 100
    : percent(player.arenaRating - arena.current.rating, arena.next.rating - arena.current.rating);

  const spot = recommendedSpot(server);
  const dungeon = recommendedDungeon(server);
  const raid = recommendedRaid(server);
  const missingSlots = missingEquipmentSlots(server);
  const marketUpgrade = bestMarketUpgrade(server);
  const guild = player.guildId ? server.guilds.find((entry) => entry.id === player.guildId) : undefined;

  const arenaPosition = 1 + (server.npcs ?? []).filter((npc) => (npc.arenaRating ?? 0) > player.arenaRating).length;
  const arenaTotal = 1 + (server.npcs ?? []).length;

  const summary: GoalMetric[] = [
    {
      id: 'summary_level',
      label: 'Уровень',
      value: level >= 20 ? '20 / 20' : `${level} ур.`,
      target: level >= 20 ? 'кап' : `${formatNumber(player.xp)} / ${formatNumber(nextLevelXp)} XP`,
      progress: xpProgress,
      severity: level >= 20 ? 'good' : 'normal',
    },
    {
      id: 'summary_gear',
      label: 'Gear Score',
      value: formatNumber(gearScore),
      target: `цель ${formatNumber(gearTarget)}`,
      progress: gearProgress,
      severity: gearProgress >= 100 ? 'good' : gearProgress >= 75 ? 'normal' : 'warning',
    },
    {
      id: 'summary_arena',
      label: 'Арена',
      value: `${formatNumber(player.arenaRating)} · ${arena.current.name}`,
      target: nextArenaGap > 0 ? `до ${arena.next.name}: ${formatNumber(nextArenaGap)}` : 'верхний ранг',
      progress: arenaProgress,
      severity: arenaProgress >= 100 ? 'good' : 'normal',
    },
    {
      id: 'summary_guild',
      label: 'Гильдия',
      value: guild ? guild.name : 'нет',
      target: guild ? `${guild.tier ?? 'low'} · ${guild.guildFocus ?? guild.type}` : 'вступить или создать',
      progress: guild ? 100 : 0,
      severity: guild ? 'good' : 'warning',
    },
  ];

  const sections: GoalSection[] = [
    {
      id: 'level',
      title: 'Уровень',
      subtitle: level >= 20 ? 'Кап уровня взят. Дальше цель — шмот, рейды, арена и гильдии.' : `До ${level + 1} уровня осталось ${formatNumber(Math.max(0, nextLevelXp - player.xp))} XP.`,
      metrics: [
        {
          id: 'level_xp',
          label: 'Опыт',
          value: formatNumber(player.xp),
          target: level >= 20 ? 'кап' : formatNumber(nextLevelXp),
          progress: xpProgress,
          severity: xpProgress >= 100 ? 'good' : 'normal',
        },
        {
          id: 'level_active_quests',
          label: 'Активные квесты',
          value: `${activeQuestCount(server)}`,
          target: 'держи 2–4',
          progress: clamp(activeQuestCount(server) * 25),
          severity: activeQuestCount(server) > 0 ? 'good' : 'warning',
        },
      ],
      actions: [
        spot ? { label: 'Фарм', detail: `${spot.name} · Lv. ${spot.levelRange[0]}–${spot.levelRange[1]} · ${spot.timeCostMinutes} мин` } : { label: 'Фарм', detail: 'Подходящий спот не найден.' },
        dungeon ? { label: 'Данж', detail: `${dungeon.name} · Lv. ${dungeon.levelRange[0]}–${dungeon.levelRange[1]} · пати ${dungeon.partySize}` } : { label: 'Данж', detail: 'Данж по уровню пока закрыт.' },
        { label: 'Контракты', detail: `${activeContractCount(server)} активных · ${readyContractCount(server)} готовы к сдаче` },
      ],
    },
    {
      id: 'gear',
      title: 'Gear Score',
      subtitle: `Текущий GS ${formatNumber(gearScore)}. Цель для уровня: ${formatNumber(gearTarget)}. Следующая планка: ${formatNumber(nextGearTarget)}.`,
      metrics: [
        {
          id: 'gear_current',
          label: 'Текущий GS',
          value: formatNumber(gearScore),
          target: formatNumber(gearTarget),
          progress: gearProgress,
          severity: gearProgress >= 100 ? 'good' : gearProgress >= 70 ? 'normal' : 'danger',
        },
        {
          id: 'gear_slots',
          label: 'Слоты',
          value: `${equippedSlots.length - missingSlots.length}/${equippedSlots.length}`,
          target: missingSlots.length ? `нет: ${missingSlots.join(', ')}` : 'все закрыты',
          progress: percent(equippedSlots.length - missingSlots.length, equippedSlots.length),
          severity: missingSlots.length === 0 ? 'good' : 'warning',
        },
      ],
      actions: [
        marketUpgrade
          ? { label: 'Рынок', detail: `${marketUpgrade.item.name} · ${marketUpgrade.item.slot} · ${formatNumber(marketUpgrade.listing.price)}g` }
          : { label: 'Рынок', detail: 'Явного апгрейда под уровень не найдено.' },
        dungeon
          ? { label: 'Добыча', detail: `Ходи в ${dungeon.name}: шанс закрыть слабые слоты и поднять GS.` }
          : { label: 'Добыча', detail: 'Сначала открой ближайший данж по уровню.' },
        { label: 'Заточка', detail: missingSlots.length ? 'Сначала закрой пустые слоты, потом точи оружие/броню.' : 'Точи основной предмет и ставь карты в лучшие вещи.' },
      ],
    },
    {
      id: 'arena',
      title: 'Арена',
      subtitle: `Ранг ${arena.current.name}. Место примерно ${arenaPosition}/${arenaTotal} среди игроков сервера.`,
      metrics: [
        {
          id: 'arena_rating',
          label: 'Рейтинг',
          value: formatNumber(player.arenaRating),
          target: nextArenaGap > 0 ? `${arena.next.name}: ${formatNumber(arena.next.rating)}` : 'верхний ранг',
          progress: arenaProgress,
          severity: arenaProgress >= 100 ? 'good' : 'normal',
        },
        {
          id: 'arena_position',
          label: 'Позиция',
          value: `#${arenaPosition}`,
          target: `из ${arenaTotal}`,
          progress: percent(arenaTotal - arenaPosition + 1, arenaTotal),
          severity: arenaPosition <= 10 ? 'good' : arenaPosition <= Math.ceil(arenaTotal * 0.25) ? 'normal' : 'warning',
        },
      ],
      actions: [
        { label: '1v1', detail: 'Играй, если нужен быстрый рейтинг и проверка билда.' },
        { label: '3v3 / 5v5 / 10v10', detail: 'Играй, если хочешь проверить командную боёвку и роль.' },
        gearProgress < 80
          ? { label: 'Перед ареной', detail: `Подними GS хотя бы до ${formatNumber(gearTarget)}.` }
          : { label: 'Перед ареной', detail: 'GS нормальный. Можно пушить рейтинг.' },
      ],
    },
    {
      id: 'dungeon_raid',
      title: 'Данжи и рейды',
      subtitle: raid ? `Ближайшая рейдовая цель: ${raid.name}.` : 'Рейдовая цель пока не открыта.',
      metrics: [
        {
          id: 'dungeon_ready',
          label: 'Данж',
          value: dungeon ? dungeon.name : 'нет',
          target: dungeon ? `Lv. ${dungeon.levelRange[0]}–${dungeon.levelRange[1]}` : 'подними уровень',
          progress: dungeon ? 100 : 0,
          severity: dungeon ? 'good' : 'warning',
        },
        {
          id: 'raid_ready',
          label: 'Рейд',
          value: raid ? raid.name : 'нет',
          target: raid ? `Lv. ${raid.levelRange[0]}–${raid.levelRange[1]}` : 'позже',
          progress: raid ? percent(level, raid.levelRange[0]) : 0,
          severity: raid && level >= raid.levelRange[0] && gearScore >= gearTargetForLevel(raid.levelRange[0]) ? 'good' : 'warning',
        },
      ],
      actions: [
        dungeon ? { label: 'Следующий данж', detail: `${dungeon.name}: собери пати через поиск.` } : { label: 'Следующий данж', detail: 'Пока качайся на спотах и квестах.' },
        raid ? { label: 'Подготовка к рейду', detail: `Нужны уровень ${raid.levelRange[0]}+, высокий GS и стабильная пати.` } : { label: 'Подготовка к рейду', detail: 'Рейды появятся ближе к high-уровням.' },
      ],
    },
    {
      id: 'guild',
      title: 'Гильдия и сервер',
      subtitle: guild ? `Ты в гильдии ${guild.name}.` : 'Ты без гильдии. Это режет доступ к войнам, осадам и гильдейскому прогрессу.',
      metrics: [
        {
          id: 'guild_state',
          label: 'Статус',
          value: guild ? `${guild.tier ?? 'low'} · ${guild.guildFocus ?? guild.type}` : 'без гильдии',
          target: guild ? `участников ${guild.memberIds.length}` : level >= 20 ? 'high доступна' : level >= 10 ? 'mid доступна' : 'low доступна',
          progress: guild ? 100 : level >= 10 ? 60 : 30,
          severity: guild ? 'good' : 'warning',
        },
        {
          id: 'server_events',
          label: 'Новости',
          value: `${server.worldNews.length}`,
          target: 'следи за сервером',
          progress: clamp(server.worldNews.length),
          severity: 'normal',
        },
      ],
      actions: [
        guild
          ? { label: 'Гильдия', detail: 'Проверь войны, осады, заявки и активность.' }
          : { label: 'Гильдия', detail: level >= 20 ? 'Можно создавать high-гильдию.' : level >= 10 ? 'Можно создавать mid-гильдию.' : 'Пока доступна low-гильдия.' },
        { label: 'Сервер', detail: 'Смотри новости: там видно войны, дропы, осады и движение мира.' },
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
