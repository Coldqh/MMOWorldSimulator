import { ITEMS, getItemById } from '../content/items';
import { MOBS, SPOTS, ZONES, getLootTableById } from '../content/world';
import { advanceServerClock } from '../engine/time';
import { addNews } from '../engine/news';
import type { Rng } from '../engine/rng';
import { uid } from '../engine/rng';
import type { Guild, GuildType, ItemInstance, NpcPlayer, ServerState } from '../types/game';
import { estimateArenaRatingValue, estimateWealthValue, updateRankings } from './progressionSystem';
import { equipNpcItemIfBetter, getGearScore } from './itemSystem';
import { estimateItemPrice } from './marketSystem';

const xpForNpcLevel = (level: number) => 170 + level * level * 45;

const goalByFocus: Record<string, string[]> = {
  PVE_FARMER: ['редкий дроп', 'новый спот', 'шмот на уровень'],
  RAIDER: ['данж-пати', 'рейдовый предмет', 'Вирмшпиль'],
  PVP_PLAYER: ['рейтинг арены', 'дуэли', 'место в топе'],
  GUILD_PLAYER: ['гильдейный данж', 'стабильный ростер'],
  COLLECTOR: ['карта моба', 'маунт', 'редкий аксессуар'],
  TRADER: ['дешёвый лот', 'перепродажа', 'камни усиления'],
  CASUAL: ['пати на вечер', 'простой фарм'],
  HARDCORE: ['быстрый прогресс', 'лучший гир', 'первый закрытый босс'],
  LEADER: ['новые участники', 'сильный ростер', 'репутация гильдии'],
  DRAMA: ['смена гильдии', 'конфликт в пати', 'новый клан']
};

const refreshGoal = (npc: NpcPlayer, rng: Rng): NpcPlayer => {
  if (!rng.chance(0.06)) return npc;
  const pool = goalByFocus[npc.roleFocus] ?? ['уровень и шмот'];
  return { ...npc, currentGoal: rng.pick(pool) };
};

const makeNpcListing = (server: ServerState, rng: Rng, npc: NpcPlayer, itemId: string, enhancement = 0): ServerState => {
  const item = getItemById(itemId);
  if (!item || !item.tradeable || item.type === 'quest' || item.rarity === 'unique') return server;
  const basePrice = estimateItemPrice(item);
  const percent = rng.int(-20, 200);
  return {
    ...server,
    market: [
      ...server.market,
      {
        id: uid('listing', rng),
        sellerId: npc.id,
        itemId,
        basePrice,
        pricePercent: percent,
        price: Math.max(1, Math.round((basePrice * (100 + percent)) / 100)),
        amount: 1,
        enhancement,
        createdDay: server.serverDay,
      },
    ],
  };
};

const sellOldItem = (server: ServerState, rng: Rng, npc: NpcPlayer, oldItem?: ItemInstance) => {
  if (!oldItem) return server;
  return makeNpcListing(server, rng, npc, oldItem.itemId, oldItem.enhancement);
};

const rollNpcLoot = (npc: NpcPlayer, rng: Rng) => {
  const candidates = MOBS.filter((mob) => Math.abs(mob.level - npc.level) <= 2 && !mob.tags.includes('boss') && !mob.tags.includes('raid'));
  const mob = candidates.length > 0 ? rng.pick(candidates) : rng.pick(MOBS.filter((entry) => !entry.tags.includes('boss')));
  const table = getLootTableById(mob.lootTableId);
  if (!table) return undefined;
  const activityMod = Math.min(1.25, 0.75 + npc.activityLevel * 0.04);
  const entries = table.entries.filter((entry) => {
    const item = getItemById(entry.itemId);
    if (!item) return false;
    const cardPenalty = item.type === 'card' ? 0.01 : 1;
    return rng.chance(entry.chance * activityMod * cardPenalty);
  });
  if (entries.length === 0) return undefined;
  const entry = rng.pick(entries);
  return getItemById(entry.itemId);
};

const maybeNpcLootUpgrade = (server: ServerState, npc: NpcPlayer, rng: Rng): { server: ServerState; npc: NpcPlayer } => {
  if (!rng.chance(0.12)) return { server, npc };
  const item = rollNpcLoot(npc, rng);
  if (!item) return { server, npc };

  if (item.type === 'card') {
    const nextNpc = { ...npc, inventory: [...npc.inventory, { itemId: item.id, amount: 1 }] };
    const nextServer = addNews(server, rng, 'drop', `${npc.name} выбил ${item.name}.`, true);
    return { server: nextServer, npc: nextNpc };
  }

  if (item.slot) {
    const result = equipNpcItemIfBetter(npc, item.id, rng);
    if (result.equipped) {
      const listed = sellOldItem(server, rng, result.npc, result.oldItem);
      return { server: listed, npc: result.npc };
    }
  }

  if (item.tradeable && rng.chance(npc.roleFocus === 'TRADER' ? 0.8 : 0.28)) {
    return { server: makeNpcListing(server, rng, npc, item.id), npc };
  }

  return { server, npc: { ...npc, inventory: [...npc.inventory, { itemId: item.id, amount: 1 }] } };
};

const maybeNpcBuyUpgrade = (server: ServerState, npc: NpcPlayer, rng: Rng): { server: ServerState; npc: NpcPlayer } => {
  if (!rng.chance(npc.roleFocus === 'TRADER' ? 0.02 : 0.045)) return { server, npc };
  const candidates = server.market
    .filter((listing) => listing.sellerId !== npc.id && listing.price <= npc.gold)
    .map((listing) => ({ listing, item: getItemById(listing.itemId) }))
    .filter((entry) => entry.item?.slot && entry.item.levelReq <= npc.level && (entry.item.classTags.length === 0 || entry.item.classTags.includes(npc.classId)))
    .sort((a, b) => (a.listing.pricePercent ?? 0) - (b.listing.pricePercent ?? 0))
    .slice(0, 12);
  if (candidates.length === 0) return { server, npc };
  const { listing, item } = rng.pick(candidates);
  if (!item) return { server, npc };
  const result = equipNpcItemIfBetter(npc, item.id, rng);
  if (!result.equipped) return { server, npc };
  let nextServer: ServerState = {
    ...server,
    market: server.market.map((entry) => entry.id === listing.id ? { ...entry, amount: entry.amount - 1 } : entry).filter((entry) => entry.amount > 0),
  };
  nextServer = sellOldItem(nextServer, rng, result.npc, result.oldItem);
  return { server: nextServer, npc: { ...result.npc, gold: Math.max(0, npc.gold - listing.price) } };
};

const simulateNpcAction = (server: ServerState, npc: NpcPlayer, rng: Rng): { server: ServerState; npc: NpcPlayer } => {
  let nextNpc = refreshGoal({ ...npc, gearScore: getGearScore(npc.equipment ?? {}) }, rng);
  let nextServer = server;

  const xpGain = rng.int(4, 18) * Math.max(1, npc.activityLevel);
  nextNpc.xp += xpGain;
  nextNpc.gold += rng.int(3, 18) + Math.floor(npc.level * 4) + (nextNpc.roleFocus === 'RAIDER' ? rng.int(20, 60) : 0) + (nextNpc.roleFocus === 'TRADER' ? rng.int(18, 95) : 0);

  if (nextNpc.xp > xpForNpcLevel(nextNpc.level)) {
    nextNpc.level = Math.min(20, nextNpc.level + 1);
    nextNpc.xp = 0;
  }

  if (nextNpc.roleFocus === 'PVP_PLAYER' && rng.chance(0.2)) {
    const before = nextNpc.arenaRating;
    nextNpc.arenaRating = Math.max(100, nextNpc.arenaRating + rng.int(-18, 30));
    if (before < 1700 && nextNpc.arenaRating >= 1700) {
      nextServer = addNews(nextServer, rng, 'pvp', `${nextNpc.name} вышел в Mythic.`, true);
    }
  }

  const expectedRating = estimateArenaRatingValue(nextNpc.level, nextNpc.gearScore, nextNpc.roleFocus);
  nextNpc.arenaRating = Math.round(nextNpc.arenaRating * 0.88 + expectedRating * 0.12);
  const expectedWealth = estimateWealthValue(nextNpc.level, nextNpc.gearScore, nextNpc.roleFocus);
  if (nextNpc.gold < expectedWealth * 0.22) nextNpc.gold = Math.round(nextNpc.gold * 0.65 + expectedWealth * 0.35);
  if (nextNpc.level < 8 && nextNpc.gold > expectedWealth * 2.2) nextNpc.gold = Math.round(expectedWealth * rng.int(80, 145) / 100);

  const lootResult = maybeNpcLootUpgrade(nextServer, nextNpc, rng);
  nextServer = lootResult.server;
  nextNpc = lootResult.npc;

  const buyResult = maybeNpcBuyUpgrade(nextServer, nextNpc, rng);
  nextServer = buyResult.server;
  nextNpc = buyResult.npc;

  if (nextNpc.roleFocus === 'RAIDER' && rng.chance(0.025)) {
    nextNpc.reputation += 1;
    const guild = nextNpc.guildId ? nextServer.guilds.find((entry) => entry.id === nextNpc.guildId) : undefined;
    if (guild && rng.chance(0.12)) nextServer = addNews(nextServer, rng, 'raid', `${guild.name}: рейдовый прогресс.`, false);
  }

  if (nextNpc.roleFocus === 'TRADER' && rng.chance(0.04)) {
    nextNpc.gold += rng.int(20, 90);
  }

  return { server: nextServer, npc: { ...nextNpc, gearScore: getGearScore(nextNpc.equipment ?? {}) } };
};

const simulateGuildRoster = (server: ServerState, rng: Rng): ServerState => {
  let next = server;

  if (rng.chance(0.08)) {
    const guild = rng.pick(next.guilds);
    const freeNpcs = next.npcs.filter((npc) => !npc.guildId && npc.level >= (guild.minLevel ?? 1) && (npc.roleFocus === 'GUILD_PLAYER' || npc.roleFocus === 'RAIDER' || npc.roleFocus === 'PVP_PLAYER' || rng.chance(0.2)));
    const joiner = freeNpcs.length > 0 ? rng.pick(freeNpcs) : undefined;
    if (joiner) {
      next = {
        ...next,
        npcs: next.npcs.map((npc) => npc.id === joiner.id ? { ...npc, guildId: guild.id } : npc),
        guilds: next.guilds.map((entry) => entry.id === guild.id ? { ...entry, memberIds: [...new Set([...entry.memberIds, joiner.id])] } : entry)
      };
      if (rng.chance(0.18)) next = addNews(next, rng, 'guild', `${joiner.name} вступил в ${guild.name}.`, false);
    }
  }

  if (rng.chance(0.045)) {
    const guildsWithMembers = next.guilds.filter((guild) => guild.memberIds.length > 6);
    const guild = guildsWithMembers.length > 0 ? rng.pick(guildsWithMembers) : undefined;
    if (guild) {
      const npcId = rng.pick(guild.memberIds.filter((id) => id !== guild.leaderId && id !== next.player.id));
      const npc = next.npcs.find((entry) => entry.id === npcId);
      if (npc) {
        next = {
          ...next,
          npcs: next.npcs.map((entry) => entry.id === npcId ? { ...entry, guildId: undefined } : entry),
          guilds: next.guilds.map((entry) => entry.id === guild.id ? { ...entry, memberIds: entry.memberIds.filter((id) => id !== npcId), stability: Math.max(0, entry.stability - rng.int(1, 5)) } : entry)
        };
        if (npc.roleFocus === 'DRAMA' || rng.chance(0.16)) next = addNews(next, rng, 'guild', `${npc.name} вышел из ${guild.name}.`, false);
      }
    }
  }

  return next;
};


const newGuildNames = ['Crownless', 'Morning Forge', 'Rabbit Hole', 'Oak Pact', 'Silent Bell', 'Northline', 'Amber Frame', 'Blue Hearth', 'Wolf Table', 'Soft Reset'];
const guildTypes: GuildType[] = ['PVE', 'PVP', 'CASUAL', 'HARDCORE', 'TRADE', 'MIXED'];
const createDynamicGuild = (server: ServerState, rng: Rng): Guild => {
  const tier = rng.chance(0.25) ? 'high' : rng.chance(0.45) ? 'mid' : 'low';
  const minLevel = tier === 'high' ? 20 : tier === 'mid' ? 10 : 1;
  const type = tier === 'high' ? rng.pick(['PVP', 'PVE', 'HARDCORE'] as GuildType[]) : rng.pick(guildTypes);
  return {
    id: `guild_dynamic_${server.serverDay}_${rng.int(1000, 9999)}`,
    name: `${rng.pick(newGuildNames)} ${rng.int(1, 99)}`,
    type,
    tier,
    minLevel,
    level: 1,
    reputation: 0,
    memberIds: [],
    focus: type === 'PVP' ? 'арена и рейтинг' : type === 'TRADE' ? 'рынок' : type === 'HARDCORE' ? 'топовый прогресс' : 'данжи и ростер',
    raidProgress: 0,
    pvpRating: 0,
    stability: rng.int(38, 74),
    recruitmentPolicy: tier === 'low' ? 'open' : tier === 'mid' ? 'invite' : 'strict',
  };
};

const simulateGuildLifecycle = (server: ServerState, rng: Rng): ServerState => {
  let next = server;
  if (next.guilds.length < 20 || rng.chance(0.025)) {
    const guild = createDynamicGuild(next, rng);
    const candidates = next.npcs
      .filter((npc) => !npc.guildId && npc.level >= (guild.minLevel ?? 1))
      .sort((a, b) => (guild.type === 'PVP' ? b.arenaRating - a.arenaRating : b.gearScore - a.gearScore))
      .slice(0, rng.int(6, 18));
    next = {
      ...next,
      guilds: [...next.guilds, { ...guild, memberIds: candidates.map((npc) => npc.id), leaderId: candidates[0]?.id, deputyId: candidates[1]?.id, officerIds: candidates.slice(2, 6).map((npc) => npc.id) }],
      npcs: next.npcs.map((npc) => candidates.some((c) => c.id === npc.id) ? { ...npc, guildId: guild.id } : npc),
    };
    if (rng.chance(0.55)) next = addNews(next, rng, 'guild', `Создана гильдия ${guild.name}.`, false);
  }

  if (next.guilds.length > 20 && rng.chance(0.018)) {
    const weak = [...next.guilds].filter((guild) => guild.memberIds.length < 5 || guild.stability < 12).sort((a, b) => a.stability + a.memberIds.length - (b.stability + b.memberIds.length))[0];
    if (weak && !weak.memberIds.includes(next.player.id)) {
      next = {
        ...next,
        guilds: next.guilds.filter((guild) => guild.id !== weak.id),
        npcs: next.npcs.map((npc) => npc.guildId === weak.id ? { ...npc, guildId: undefined } : npc),
      };
      next = addNews(next, rng, 'guild', `${weak.name} распалась.`, true);
    }
  }
  return next;
};

const simulateGuilds = (server: ServerState, rng: Rng): ServerState => {
  let next = simulateGuildLifecycle(simulateGuildRoster(server, rng), rng);

  if (rng.chance(0.12)) {
    const guild = rng.pick(next.guilds);
    const shift = rng.int(-8, 12);
    next = {
      ...next,
      guilds: next.guilds.map((entry) => entry.id === guild.id ? { ...entry, reputation: Math.max(0, entry.reputation + shift), stability: Math.max(0, Math.min(100, entry.stability + rng.int(-6, 4))) } : entry)
    };
    if (Math.abs(shift) >= 8) {
      next = addNews(next, rng, 'guild', `${guild.name}: ${shift > 0 ? 'рост влияния' : 'потеря влияния'}.`, false);
    }
  }

  if (rng.chance(0.06)) {
    const guild = rng.pick(next.guilds);
    const progress = rng.int(1, 5);
    next = {
      ...next,
      guilds: next.guilds.map((entry) => entry.id === guild.id ? { ...entry, raidProgress: Math.min(100, entry.raidProgress + progress) } : entry)
    };
    if (guild.raidProgress + progress >= 50 && rng.chance(0.12)) next = addNews(next, rng, 'raid', `${guild.name}: рейд-прогресс ${Math.min(100, guild.raidProgress + progress)}%.`, false);
  }

  return next;
};

const totalMinutes = (day: number, minute: number) => (day - 1) * 1440 + minute;

const resolveGuildApplications = (server: ServerState, rng: Rng): ServerState => {
  const pending = server.guildApplications.filter((app) => app.status === 'pending');
  if (pending.length === 0 || server.player.guildId) return server;

  let next = server;
  const now = totalMinutes(server.serverDay, server.currentMinute);

  pending.forEach((app) => {
    if (next.player.guildId) return;
    const ready = totalMinutes(app.resolveDay, app.resolveMinute) <= now;
    if (!ready) return;

    const guild = next.guilds.find((entry) => entry.id === app.guildId);
    if (!guild) return;

    const accepted = true;

    if (accepted) {
      next = {
        ...next,
        player: { ...next.player, guildId: guild.id },
        guildApplications: next.guildApplications.map((entry) => entry.id === app.id ? { ...entry, status: 'accepted', resultText: `Принят в ${guild.name}.` } : entry),
        guilds: next.guilds.map((entry) => entry.id === guild.id ? { ...entry, memberIds: [...new Set([...entry.memberIds, next.player.id])] } : entry),
        notifications: [
          ...next.notifications,
          {
            id: `notif_guild_accept_${app.id}`,
            type: 'guild',
            title: 'Заявка принята',
            text: guild.name,
            lines: ['Ты принят в гильдию.', `ГМ: ${next.npcs.find((npc) => npc.id === guild.leaderId)?.name ?? 'нет'}.`]
          }
        ]
      };
      next = addNews(next, rng, 'guild', `${next.player.name} принят в ${guild.name}.`, false);
    } else {
      next = {
        ...next,
        guildApplications: next.guildApplications.map((entry) => entry.id === app.id ? { ...entry, status: 'declined', resultText: `${guild.name}: отказ.` } : entry),
        notifications: [
          ...next.notifications,
          {
            id: `notif_guild_decline_${app.id}`,
            type: 'guild',
            title: 'Заявка отклонена',
            text: guild.name,
            lines: ['Гильдия отказала.', 'Можно подать заявку позже или выбрать другую гильдию.']
          }
        ]
      };
      next = addNews(next, rng, 'guild', `${guild.name}: заявка отклонена.`, false);
    }
  });

  return next;
};

const applyServerWeekUpdate = (server: ServerState, rng: Rng): ServerState => {
  const currentWeek = Math.max(1, Math.ceil(server.serverDay / 7));
  if ((server.serverWeek ?? 1) >= currentWeek) return server;
  const metaPool = ['танки в тяжёлом шмоте', 'маги на AoE', 'стрелки на арене', 'рейдовые пати', 'охота за картами'];
  const metaTag = rng.pick(metaPool);
  const patch = (server.contentPatch ?? 1) + (rng.chance(0.35) ? 1 : 0);
  let next: ServerState = { ...server, serverWeek: currentWeek, contentPatch: patch, metaTag };
  const bestGuild = [...next.guilds].sort((a, b) => b.reputation + b.raidProgress - (a.reputation + a.raidProgress))[0];
  const arenaLeaderId = next.rankings.arenaTop[0];
  const arenaLeader = arenaLeaderId === next.player.id ? next.player.name : next.npcs.find((npc) => npc.id === arenaLeaderId)?.name;
  next = addNews(next, rng, 'system', `Неделя ${currentWeek}: мета — ${metaTag}.`, true);
  if (bestGuild) next = addNews(next, rng, 'guild', `Неделя ${currentWeek}: сильная гильдия — ${bestGuild.name}.`, true);
  if (arenaLeader) next = addNews(next, rng, 'pvp', `Неделя ${currentWeek}: лидер арены — ${arenaLeader}.`, true);
  return { ...next, serverChronicle: [...(next.serverChronicle ?? []), ...next.worldNews.slice(-3)].slice(-30) };
};

const trimRuntimeState = (server: ServerState): ServerState => ({
  ...server,
  worldNews: server.worldNews.slice(-90),
  market: server.market.length > 1200 ? server.market.slice(-1200) : server.market,
});

export const simulateServerForMinutes = (server: ServerState, minutes: number, rng: Rng): ServerState => {
  let next = advanceServerClock(server, minutes);
  const actionCount = minutes < 30 ? 0 : Math.min(34, Math.max(1, Math.floor(minutes / 45)));

  for (let i = 0; i < actionCount; i += 1) {
    const index = rng.int(0, Math.max(0, next.npcs.length - 1));
    const npc = next.npcs[index];
    if (!npc) continue;
    const result = simulateNpcAction(next, npc, rng);
    const updatedNpcs = result.server.npcs.slice();
    const resultIndex = updatedNpcs.findIndex((entry) => entry.id === npc.id);
    if (resultIndex >= 0) updatedNpcs[resultIndex] = result.npc;
    next = { ...result.server, npcs: updatedNpcs };
  }

  if (actionCount > 0 || minutes >= 120) {
    next = simulateGuilds(next, rng);
    next = updateRankings(next);
  }

  next = resolveGuildApplications(next, rng);
  next = applyServerWeekUpdate(next, rng);

  if (minutes >= 60 && rng.chance(0.018)) {
    const zone = rng.pick(ZONES);
    next = addNews(next, rng, 'system', `${zone.name}: высокий онлайн.`, false);
  }

  return trimRuntimeState(next);
};
