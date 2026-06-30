import { ITEMS, getItemById } from '../content/items';
import { CLASSES } from '../content/classes';
import { RACES } from '../content/races';
import { NPC_NAMES } from '../content/npc';
import { MOBS, SPOTS, ZONES, getLootTableById } from '../content/world';
import { advanceServerClock } from '../engine/time';
import { addNews } from '../engine/news';
import type { Rng } from '../engine/rng';
import { uid } from '../engine/rng';
import type { Guild, GuildType, ItemInstance, NpcPlayer, ServerState } from '../types/game';
import { estimateArenaRatingValue, estimateWealthValue, updateRankings } from './progressionSystem';
import { equipNpcItemIfBetter, generateEquipmentForClassLevel, getGearScore } from './itemSystem';
import { estimateItemPrice } from './marketSystem';
import { refreshPartyFinderListings } from './partyFinderSystem';

const levelingMinutesForNpcLevel = (level: number, rng: Rng) => Math.round((240 + level * level * 42) * (0.8 + rng.next() * 0.4));

const goalByFocus: Record<string, string[]> = {
  pve: ['фарм', 'данж-пати', 'шмот на уровень'],
  pvp: ['рейтинг арены', 'дуэли', 'место в топе'],
  mixed: ['пати на вечер', 'гильдейный ростер', 'рынок']
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
  const percent = rng.int(0, 200);
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
  const candidates = MOBS.filter((mob) => Math.abs(mob.level - npc.level) <= 2 && !mob.tags.includes('raid'));
  const mob = candidates.length > 0 ? rng.pick(candidates) : rng.pick(MOBS.filter((entry) => !entry.tags.includes('raid')));
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
  const item = getItemById(entry.itemId);
  return item ? { item, mob } : undefined;
};

const maybeNpcLootUpgrade = (server: ServerState, npc: NpcPlayer, rng: Rng): { server: ServerState; npc: NpcPlayer } => {
  if (!rng.chance(0.12)) return { server, npc };
  const loot = rollNpcLoot(npc, rng);
  if (!loot) return { server, npc };
  const { item, mob } = loot;

  if (item.type === 'card') {
    const nextNpc = { ...npc, inventory: [...npc.inventory, { itemId: item.id, amount: 1 }] };
    const nextServer = mob.tags.includes('boss') ? addNews(server, rng, 'drop', `${npc.name} выбил карту босса: ${item.name}.`, true) : server;
    return { server: nextServer, npc: nextNpc };
  }

  if (item.slot) {
    const result = equipNpcItemIfBetter(npc, item.id, rng);
    if (result.equipped) {
      const listed = sellOldItem(server, rng, result.npc, result.oldItem);
      return { server: listed, npc: result.npc };
    }
  }

  if (item.tradeable && rng.chance(npc.roleFocus === 'mixed' ? 0.8 : 0.28)) {
    return { server: makeNpcListing(server, rng, npc, item.id), npc };
  }

  return { server, npc: { ...npc, inventory: [...npc.inventory, { itemId: item.id, amount: 1 }] } };
};

const maybeNpcBuyUpgrade = (server: ServerState, npc: NpcPlayer, rng: Rng): { server: ServerState; npc: NpcPlayer } => {
  if (!rng.chance(npc.roleFocus === 'mixed' ? 0.02 : 0.045)) return { server, npc };
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


const nowTotalMinutes = (server: ServerState) => (server.serverDay - 1) * 1440 + server.currentMinute;
const targetTotalMinutes = (day?: number, minute?: number) => day && minute !== undefined ? (day - 1) * 1440 + minute : 0;

const scheduleNextNpcLevel = (server: ServerState, npc: NpcPlayer, rng: Rng): NpcPlayer => {
  if (npc.level >= 20) return { ...npc, nextLevelAtDay: undefined, nextLevelAtMinute: undefined };
  const add = levelingMinutesForNpcLevel(npc.level, rng);
  const total = nowTotalMinutes(server) + add;
  return { ...npc, nextLevelAtDay: Math.floor(total / 1440) + 1, nextLevelAtMinute: total % 1440 };
};

const rebuildNpcAfterLevel = (npc: NpcPlayer, rng: Rng): NpcPlayer => {
  const equipment = generateEquipmentForClassLevel(npc.classId, npc.level, rng);
  const gearScore = getGearScore(equipment);
  return {
    ...npc,
    equipment,
    gearScore,
    arenaRating: Math.round(estimateArenaRatingValue(npc.level, gearScore, npc.roleFocus) * (0.9 + rng.next() * 0.2)),
    gold: Math.max(npc.gold, Math.round(estimateWealthValue(npc.level, gearScore, npc.roleFocus) * (0.55 + rng.next() * 0.35))),
  };
};

const spawnLevelOneNpc = (server: ServerState, rng: Rng): ServerState => {
  const index = server.npcs.length;
  const cls = rng.pick(CLASSES);
  const race = rng.pick(RACES);
  const equipment = generateEquipmentForClassLevel(cls.id, 1, rng);
  const gearScore = getGearScore(equipment);
  const lowGuilds = server.guilds.filter((guild) => (guild.tier ?? 'low') === 'low');
  const guild = rng.chance(0.2) ? undefined : (lowGuilds.length > 0 ? rng.pick(lowGuilds) : undefined);
  const npc: NpcPlayer = {
    id: `npc_new_${server.serverDay}_${server.currentMinute}_${index}_${rng.int(1000, 9999)}`,
    name: `${rng.pick(NPC_NAMES)}${rng.int(1, 99)}`,
    raceId: race.id,
    classId: cls.id,
    level: 1,
    xp: 0,
    gearScore,
    gold: rng.int(20, 80),
    guildId: guild?.id,
    roleFocus: rng.pick(['pve', 'pve', 'mixed', 'pve'] as any),
    currentGoal: 'первый уровень и шмот',
    reputation: 0,
    activityLevel: rng.int(1, 7),
    ambition: rng.int(1, 7),
    risk: rng.int(1, 6),
    socialWeight: rng.int(1, 8),
    inventory: [],
    equipment,
    arenaRating: estimateArenaRatingValue(1, gearScore, 'pve'),
  };
  const scheduled = scheduleNextNpcLevel(server, npc, rng);
  return {
    ...server,
    npcs: [...server.npcs, scheduled],
    guilds: guild ? server.guilds.map((entry) => entry.id === guild.id ? { ...entry, memberIds: [...entry.memberIds, scheduled.id] } : entry) : server.guilds,
  };
};

const simulateNpcAction = (server: ServerState, npc: NpcPlayer, rng: Rng): { server: ServerState; npc: NpcPlayer } => {
  let nextNpc = refreshGoal({ ...npc, gearScore: getGearScore(npc.equipment ?? {}) }, rng);
  let nextServer = server;

  nextNpc.gold += rng.int(3, 18) + Math.floor(npc.level * 4) + (nextNpc.roleFocus === 'pve' ? rng.int(20, 60) : 0) + (nextNpc.roleFocus === 'mixed' ? rng.int(18, 95) : 0);
  if (nextNpc.level < 20 && targetTotalMinutes(nextNpc.nextLevelAtDay, nextNpc.nextLevelAtMinute) <= nowTotalMinutes(server)) {
    const before = nextNpc.level;
    nextNpc = { ...nextNpc, level: Math.min(20, nextNpc.level + 1), xp: 0 };
    nextNpc = rebuildNpcAfterLevel(nextNpc, rng);
    nextNpc = scheduleNextNpcLevel(server, nextNpc, rng);
    if (before < 20 && nextNpc.level >= 20) {
      nextServer = spawnLevelOneNpc(nextServer, rng);
    }
  } else if (!nextNpc.nextLevelAtDay && nextNpc.level < 20) {
    nextNpc = scheduleNextNpcLevel(server, nextNpc, rng);
  }

  if (nextNpc.roleFocus === 'pvp' && rng.chance(0.2)) {
    const before = nextNpc.arenaRating;
    nextNpc.arenaRating = Math.max(100, nextNpc.arenaRating + rng.int(-18, 30));
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

  if (nextNpc.roleFocus === 'pve' && rng.chance(0.025)) {
    nextNpc.reputation += 1;
    const guild = nextNpc.guildId ? nextServer.guilds.find((entry) => entry.id === nextNpc.guildId) : undefined;
    if (guild && rng.chance(0.12)) nextServer = addNews(nextServer, rng, 'raid', `${guild.name}: рейдовый прогресс.`, false);
  }

  if (nextNpc.roleFocus === 'mixed' && rng.chance(0.04)) {
    nextNpc.gold += rng.int(20, 90);
  }

  return { server: nextServer, npc: { ...nextNpc, gearScore: getGearScore(nextNpc.equipment ?? {}) } };
};

const simulateGuildRoster = (server: ServerState, rng: Rng): ServerState => {
  let next = server;

  if (rng.chance(0.08)) {
    const guild = rng.pick(next.guilds);
    const freeNpcs = next.npcs.filter((npc) => !npc.guildId && npc.level >= (guild.minLevel ?? 1) && (npc.roleFocus === 'mixed' || npc.roleFocus === 'pve' || npc.roleFocus === 'pvp' || rng.chance(0.2)));
    const joiner = freeNpcs.length > 0 ? rng.pick(freeNpcs) : undefined;
    if (joiner) {
      next = {
        ...next,
        npcs: next.npcs.map((npc) => npc.id === joiner.id ? { ...npc, guildId: guild.id } : npc),
        guilds: next.guilds.map((entry) => entry.id === guild.id ? { ...entry, memberIds: [...new Set([...entry.memberIds, joiner.id])] } : entry)
      };
      if (guild.memberIds.includes(next.player.id)) next = addNews(next, rng, 'guild', `${joiner.name} вступил в твою гильдию ${guild.name}.`, true);
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
        if (guild.memberIds.includes(next.player.id)) next = addNews(next, rng, 'guild', `${npc.name} вышел из твоей гильдии ${guild.name}.`, true);
      }
    }
  }

  return next;
};


const newGuildNames = ['Crownless', 'Morning Forge', 'Rabbit Hole', 'Oak Pact', 'Silent Bell', 'Northline', 'Amber Frame', 'Blue Hearth', 'Wolf Table', 'Soft Reset'];
const guildTypes: GuildType[] = ['PVE', 'PVP', 'MIXED'];
const createDynamicGuild = (server: ServerState, rng: Rng): Guild => {
  const tier = rng.chance(0.25) ? 'high' : rng.chance(0.45) ? 'mid' : 'low';
  const minLevel = tier === 'high' ? 20 : tier === 'mid' ? 10 : 1;
  const type = tier === 'high' ? rng.pick(['PVP', 'PVE', 'MIXED'] as GuildType[]) : rng.pick(guildTypes);
  return {
    id: `guild_dynamic_${server.serverDay}_${rng.int(1000, 9999)}`,
    name: `${rng.pick(newGuildNames)} ${rng.int(1, 99)}`,
    type,
    tier,
    minLevel,
    level: 1,
    reputation: 0,
    memberIds: [],
    focus: type === 'PVP' ? 'арена и рейтинг' : type === 'MIXED' ? 'рынок и пати' : 'данжи и ростер',
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
    next = addNews(next, rng, 'guild', `Появилась новая гильдия: ${guild.name}.`, true);
  }

  if (next.guilds.length > 20 && rng.chance(0.018)) {
    const weak = [...next.guilds].filter((guild) => guild.memberIds.length < 5 || guild.stability < 12).sort((a, b) => a.stability + a.memberIds.length - (b.stability + b.memberIds.length))[0];
    if (weak && !weak.memberIds.includes(next.player.id)) {
      next = {
        ...next,
        guilds: next.guilds.filter((guild) => guild.id !== weak.id),
        npcs: next.npcs.map((npc) => npc.guildId === weak.id ? { ...npc, guildId: undefined } : npc),
      };
      next = addNews(next, rng, 'guild', `Гильдия ${weak.name} распалась.`, true);
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
  }

  if (rng.chance(0.06)) {
    const guild = rng.pick(next.guilds);
    const progress = rng.int(1, 5);
    next = {
      ...next,
      guilds: next.guilds.map((entry) => entry.id === guild.id ? { ...entry, raidProgress: Math.min(100, entry.raidProgress + progress) } : entry)
    };
    
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
  return { ...server, serverWeek: currentWeek, contentPatch: patch, metaTag };
};


const playerGuildRole = (guild: Guild | undefined, playerId: string) => {
  if (!guild) return 'none';
  if (guild.leaderId === playerId) return 'ГМ';
  if (guild.deputyId === playerId) return 'Зам';
  if ((guild.officerIds ?? []).includes(playerId)) return 'Офицер';
  if (guild.memberIds.includes(playerId)) return 'Участник';
  return 'none';
};

const announceGuildChanges = (before: ServerState, after: ServerState, rng: Rng): ServerState => {
  let next = after;
  const beforeGuilds = new Map(before.guilds.map((guild) => [guild.id, guild]));
  after.guilds.forEach((guild) => {
    const old = beforeGuilds.get(guild.id);
    if (old && old.leaderId && guild.leaderId && old.leaderId !== guild.leaderId) {
      const name = after.npcs.find((npc) => npc.id === guild.leaderId)?.name ?? (guild.leaderId === after.player.id ? after.player.name : guild.leaderId);
      next = addNews(next, rng, 'guild', `${guild.name}: новый ГМ — ${name}.`, true);
    }
  });

  const beforePlayerGuild = before.guilds.find((guild) => guild.id === before.player.guildId);
  const afterPlayerGuild = after.guilds.find((guild) => guild.id === after.player.guildId);
  if (beforePlayerGuild && afterPlayerGuild) {
    const oldRole = playerGuildRole(beforePlayerGuild, before.player.id);
    const newRole = playerGuildRole(afterPlayerGuild, after.player.id);
    if (oldRole !== newRole && newRole !== 'none') {
      next = addNews(next, rng, 'guild', `${afterPlayerGuild.name}: твоя роль изменилась — ${newRole}.`, true);
    }
  }
  return next;
};

const trimRuntimeState = (server: ServerState): ServerState => ({
  ...server,
  worldNews: server.worldNews.slice(-90),
  market: server.market.length > 1200 ? server.market.slice(-1200) : server.market,
  partyFinderListings: (server.partyFinderListings ?? []).slice(-40),
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
    const beforeGuildUpdate = next;
    next = simulateGuilds(next, rng);
    next = updateRankings(next);
    next = announceGuildChanges(beforeGuildUpdate, next, rng);
  }

  next = resolveGuildApplications(next, rng);
  next = applyServerWeekUpdate(next, rng);

  next = refreshPartyFinderListings(next, rng);
  return trimRuntimeState(next);
};
