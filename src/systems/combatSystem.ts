import { getClassById, getSkillById } from '../content/classes';
import { ITEMS, getItemById } from '../content/items';
import { getLootTableById, getMobById, getSpotById, getDungeonById } from '../content/world';
import { addNews } from '../engine/news';
import type { Rng } from '../engine/rng';
import { uid } from '../engine/rng';
import type {
  CombatState,
  Combatant,
  InventoryStack,
  ItemDefinition,
  PartyCombatMember,
  PartyRoleMap,
  RewardSummary,
  ServerState,
} from '../types/game';
import { addInventoryItem, getPlayerStats, removeInventoryItem } from './itemSystem';
import { rollLoot } from './lootSystem';
import { addPlayerXp, xpForNextLevel, xpRewardForMob } from './progressionSystem';
import { finishGuildWarDefeatV2, finishGuildWarVictoryV2 } from './guildWarCombatResultSystem';


const bestPotionStack = (inventory: InventoryStack[], playerLevel: number, kind: 'hp' | 'mana') => {
  const ids = kind === 'hp'
    ? ['health_potion_20', 'health_potion_15', 'health_potion_10', 'health_potion_5', 'minor_potion']
    : ['mana_potion_20', 'mana_potion_15', 'mana_potion_10', 'mana_potion_5', 'mana_potion'];
  return inventory
    .map((entry) => ({ entry, item: getItemById(entry.itemId) }))
    .filter((pair) => pair.item && pair.entry.amount > 0 && ids.includes(pair.entry.itemId) && (pair.item?.levelReq ?? 1) <= playerLevel)
    .sort((a, b) => (b.item!.levelReq - a.item!.levelReq) || (b.item!.price - a.item!.price))[0];
};

const potionValue = (itemId: string, kind: 'hp' | 'mana') => {
  const table: Record<string, number> = {
    minor_potion: 35,
    mana_potion: 30,
    health_potion_5: 80,
    mana_potion_5: 65,
    health_potion_10: 150,
    mana_potion_10: 120,
    health_potion_15: 260,
    mana_potion_15: 210,
    health_potion_20: 420,
    mana_potion_20: 340,
  };
  return table[itemId] ?? (kind === 'hp' ? 35 : 30);
};


export const getCombatConsumables = (inventory: InventoryStack[], playerLevel: number) => {
  const ids = new Set([
    'minor_potion', 'mana_potion',
    'health_potion_5', 'mana_potion_5',
    'health_potion_10', 'mana_potion_10',
    'health_potion_15', 'mana_potion_15',
    'health_potion_20', 'mana_potion_20',
  ]);
  return inventory
    .map((entry) => ({ entry, item: getItemById(entry.itemId) }))
    .filter((pair) => pair.item && pair.entry.amount > 0 && ids.has(pair.entry.itemId) && (pair.item?.levelReq ?? 1) <= playerLevel)
    .sort((a, b) => (b.item!.levelReq - a.item!.levelReq) || a.item!.name.localeCompare(b.item!.name));
};

const potionKindFromId = (itemId: string): 'hp' | 'mana' => itemId.includes('mana') ? 'mana' : 'hp';

export const classCombatRole = (classId?: string): PartyCombatMember['role'] => {
  if (classId === 'warrior') return 'tank';
  if (classId === 'priest') return 'healer';
  if (classId === 'mage') return 'magicDps';
  return 'physicalDps';
};

export const createPlayerCombatant = (server: ServerState): Combatant => {
  const stats = getPlayerStats(server.player);
  return {
    id: server.player.id,
    name: server.player.name,
    level: server.player.level,
    classId: server.player.classId,
    maxHp: stats.hp,
    hp: Math.max(1, Math.min(server.player.hp, stats.hp)),
    maxMana: stats.mana,
    mana: Math.max(0, Math.min(server.player.mana, stats.mana)),
    attack: stats.attack,
    magic: stats.magic,
    defense: stats.defense,
    speed: stats.speed,
    shield: 0,
    cooldowns: {},
    defending: false,
  };
};

const createMobCombatant = (mobId: string): Combatant | null => {
  const mob = getMobById(mobId);
  if (!mob) return null;

  const bossScale = mob.tags.includes('boss') ? 1.45 : mob.tags.includes('mini-boss') ? 1.2 : 1;
  return {
    id: mob.id,
    name: mob.name,
    level: mob.level,
    maxHp: Math.round(mob.stats.hp * bossScale),
    hp: Math.round(mob.stats.hp * bossScale),
    maxMana: mob.stats.mana,
    mana: mob.stats.mana,
    attack: Math.round(mob.stats.attack * bossScale),
    magic: Math.round(mob.stats.magic * bossScale),
    defense: Math.round(mob.stats.defense * bossScale),
    speed: mob.stats.speed,
    shield: 0,
    cooldowns: {},
    defending: false,
  };
};

const npcCombatStats = (server: ServerState, npcId: string) => {
  const npc = server.npcs.find((entry) => entry.id === npcId);
  const level = npc?.level ?? server.player.level;
  const gear = npc?.gearScore ?? 25;
  return {
    id: npcId,
    name: npc?.name ?? npcId,
    classId: npc?.classId ?? 'ranger',
    level,
    maxHp: 80 + level * 14 + Math.floor(gear / 4),
    maxMana: npc?.classId === 'mage' || npc?.classId === 'priest' ? 70 + level * 6 : 42 + level * 3,
    attack: 7 + level * 2 + Math.floor(gear / 18),
    magic: 6 + level * 2 + Math.floor(gear / 20),
    defense: 4 + Math.floor(level * 1.4) + Math.floor(gear / 28),
    heal: 10 + level * 3 + Math.floor(gear / 18),
  };
};

const createPartyMembers = (server: ServerState, partyNpcIds: string[], partyRoles?: PartyRoleMap): PartyCombatMember[] => {
  if (!partyRoles) return [];
  const playerStats = getPlayerStats(server.player);
  const members: PartyCombatMember[] = [
    {
      id: server.player.id,
      name: server.player.name,
      classId: server.player.classId,
      role: classCombatRole(server.player.classId),
      maxHp: playerStats.hp,
      hp: Math.max(1, Math.min(server.player.hp, playerStats.hp)),
      maxMana: playerStats.mana,
      mana: Math.max(0, Math.min(server.player.mana, playerStats.mana)),
      damageLastRound: 0,
      damageTakenLastRound: 0,
      healingLastRound: 0,
    },
  ];

  partyNpcIds.forEach((id) => {
    const stats = npcCombatStats(server, id);
    members.push({
      id,
      name: stats.name,
      classId: stats.classId,
      role: classCombatRole(stats.classId),
      maxHp: stats.maxHp,
      hp: stats.maxHp,
      maxMana: stats.maxMana,
      mana: stats.maxMana,
      damageLastRound: 0,
      damageTakenLastRound: 0,
      healingLastRound: 0,
    });
  });

  return members.sort((a, b) => {
    const order = { tank: 0, healer: 1, physicalDps: 2, magicDps: 3 };
    return order[a.role] - order[b.role];
  });
};

const roleName = (role: PartyCombatMember['role']) =>
  role === 'tank' ? 'танк' : role === 'healer' ? 'хилл' : role === 'magicDps' ? 'маг ДД' : 'физ ДД';

const resetRoundStats = (members: PartyCombatMember[] = []) =>
  members.map((member) => ({ ...member, damageLastRound: 0, damageTakenLastRound: 0, healingLastRound: 0 }));

const updateMember = (members: PartyCombatMember[], id: string, patch: Partial<PartyCombatMember>) =>
  members.map((member) => (member.id === id ? { ...member, ...patch } : member));

export const startSpotCombat = (server: ServerState, spotId: string, rng: Rng, forcedMobId?: string): CombatState | null => {
  const spot = getSpotById(spotId);
  if (!spot) return null;
  const mobId = forcedMobId && spot.mobIds.includes(forcedMobId) ? forcedMobId : rng.pick(spot.mobIds);
  const enemy = createMobCombatant(mobId);
  if (!enemy) return null;
  enemy.maxHp = Math.max(1, Math.round(enemy.maxHp * 1.875));
  enemy.hp = enemy.maxHp;
  // v0.6.12: spot mobs keep reduced burst, but get enough penetration to hurt geared players.
  const playerDefense = getPlayerStats(server.player).defense;
  const minPenetratingAttack = Math.max(enemy.attack, Math.ceil(playerDefense * 0.7) + enemy.level * 2);
  const minPenetratingMagic = Math.max(enemy.magic, Math.ceil(playerDefense * 0.45) + enemy.level);
  enemy.attack = Math.max(3, Math.round(minPenetratingAttack * 0.72));
  enemy.magic = Math.max(2, Math.round(minPenetratingMagic * 0.72));

  return {
    id: uid('combat', rng),
    source: 'spot',
    sourceId: spotId,
    enemyMobId: mobId,
    player: createPlayerCombatant(server),
    enemy,
    partyNpcIds: [],
    turn: 1,
    log: [`Цель: ${enemy.name}.`],
    status: 'active',
  };
};

export const startBossCombat = (
  server: ServerState,
  bossMobId: string,
  sourceId: string,
  source: CombatState['source'],
  partyNpcIds: string[],
  rng: Rng,
  partyRoles?: PartyRoleMap,
  enemyMobIds?: string[],
  title?: string,
  dungeonEncounterIndex?: number,
  dungeonFloorEnemyCount?: number,
  forceAllowLoot = false,
): CombatState | null => {
  const enemy = createMobCombatant(bossMobId);
  if (!enemy) return null;

  const mob = getMobById(bossMobId);
  const isBoss = Boolean(mob?.tags.includes('boss'));
  const isBossEncounter = isBoss || forceAllowLoot;
  const isFinalDungeonEncounter = typeof dungeonEncounterIndex === 'number' && typeof dungeonFloorEnemyCount === 'number'
    ? dungeonEncounterIndex >= dungeonFloorEnemyCount - 1
    : true;

  if (source === 'dungeon' || source === 'raid') {
    const hpScale = source === 'raid' ? 20 : 10;
    const atkScale = isBossEncounter ? (source === 'raid' ? 1.18 : 1.08) : (source === 'raid' ? 1.55 : 1.32);
    enemy.maxHp = Math.round(enemy.maxHp * hpScale + partyNpcIds.length * (source === 'raid' ? 95 : 55));
    enemy.hp = enemy.maxHp;
    enemy.attack = Math.round(enemy.attack * atkScale);
    enemy.magic = Math.round(enemy.magic * atkScale);
    enemy.defense = Math.round(enemy.defense * (isBossEncounter ? 1.22 : 1.14));
  }

  return {
    id: uid('combat', rng),
    source,
    sourceId,
    enemyMobId: bossMobId,
    enemyMobIds: enemyMobIds && enemyMobIds.length > 0 ? enemyMobIds : [bossMobId],
    player: createPlayerCombatant(server),
    enemy: title ? { ...enemy, name: title } : enemy,
    partyNpcIds,
    partyRoles,
    partyMembers: createPartyMembers(server, partyNpcIds, partyRoles),
    dungeonEncounterIndex,
    dungeonFloorEnemyCount,
    isFinalDungeonEncounter,
    allowLoot: (source !== 'dungeon' && source !== 'raid') || isBossEncounter,
    turn: 1,
    log: partyNpcIds.length > 0 ? [`Пати: ${partyNpcIds.length + 1}. Цель: ${title ?? enemy.name}.`] : [`Цель: ${title ?? enemy.name}.`],
    status: 'active',
  };
};

const reduceCooldowns = (cooldowns: Record<string, number>) => {
  const next: Record<string, number> = {};
  Object.entries(cooldowns).forEach(([id, value]) => {
    if (value > 1) next[id] = value - 1;
  });
  return next;
};

const dealDamage = (attacker: Combatant, defender: Combatant, raw: number, rng: Rng) => {
  const hitChance = Math.max(0.68, Math.min(0.95, 0.82 + (attacker.speed - defender.speed) * 0.015));
  if (!rng.chance(hitChance)) return { defender, damage: 0, crit: false, missed: true };

  const crit = rng.chance(Math.max(0.05, Math.min(0.22, 0.06 + attacker.speed * 0.008)));
  const variance = rng.int(-2, 3);
  const defense = defender.defending ? defender.defense + 4 : defender.defense;
  const shieldAbsorb = defender.shield;
  const rawDamage = raw * (crit ? 1.55 : 1);
  const damage = Math.max(1, Math.round(rawDamage + variance - defense * 0.55));
  const finalDamage = Math.max(0, damage - shieldAbsorb);

  return {
    defender: { ...defender, hp: Math.max(0, defender.hp - finalDamage), shield: Math.max(0, shieldAbsorb - damage) },
    damage: finalDamage,
    crit,
    missed: false,
  };
};

const addRewardItem = (items: InventoryStack[], itemId: string, amount = 1, enhancement = 0): InventoryStack[] => {
  const existing = items.find((entry) => entry.itemId === itemId && (entry.enhancement ?? 0) === enhancement);
  if (existing) return items.map((entry) => entry.itemId === itemId && (entry.enhancement ?? 0) === enhancement ? { ...entry, amount: entry.amount + amount } : entry);
  return [...items, { itemId, amount, enhancement }];
};


const updateGuildWarTopKillersLocal = (list: any[] = [], characterId: string, guildId: string) => {
  const map = new Map(list.map((entry) => [entry.characterId, { ...entry }]));
  const current = map.get(characterId) ?? { characterId, guildId, kills: 0 };
  current.kills += 1;
  map.set(characterId, current);
  return [...map.values()].sort((a, b) => b.kills - a.kills || a.characterId.localeCompare(b.characterId)).slice(0, 10);
};

const locationIdForGuildWarDuel = (server: ServerState) =>
  server.location.mode === 'spot'
    ? server.location.spotId
    : server.location.mode === 'zone'
      ? server.location.zoneId
      : undefined;

const applyGuildWarDuelKill = (
  server: ServerState,
  combat: CombatState,
  killerGuildId: string | undefined,
  victimGuildId: string | undefined,
  killerId: string,
  victimId: string,
  source: 'player_attack' | 'npc_attack_player',
): ServerState => {
  if (!killerGuildId || !victimGuildId) return server;
  const record = {
    id: `war_kill_${server.serverDay}_${server.currentMinute}_${killerId}_${victimId}_${combat.turn}`,
    day: server.serverDay,
    minute: server.currentMinute,
    killerId,
    killerGuildId,
    victimId,
    victimGuildId,
    locationId: locationIdForGuildWarDuel(server),
    source,
  };
  return {
    ...server,
    guildWars: (server.guildWars ?? []).map((war) => {
      const related = war.status === 'active' &&
        ((war.attackerGuildId === killerGuildId && war.defenderGuildId === victimGuildId) ||
          (war.defenderGuildId === killerGuildId && war.attackerGuildId === victimGuildId) ||
          war.id === combat.sourceId);
      if (!related) return war;
      const attackerScored = war.attackerGuildId === killerGuildId;
      return {
        ...war,
        attackerKills: war.attackerKills + (attackerScored ? 1 : 0),
        defenderKills: war.defenderKills + (attackerScored ? 0 : 1),
        killRecords: [...war.killRecords, record].slice(-250),
        attackerTopKillers: attackerScored ? updateGuildWarTopKillersLocal(war.attackerTopKillers, killerId, killerGuildId) : war.attackerTopKillers,
        defenderTopKillers: attackerScored ? war.defenderTopKillers : updateGuildWarTopKillersLocal(war.defenderTopKillers, killerId, killerGuildId),
      };
    }),
  };
};

const finishGuildWarVictory = (server: ServerState, combat: CombatState, rng: Rng): { server: ServerState; combat: CombatState } => {
  const npc = combat.enemyNpcId ? server.npcs.find((entry) => entry.id === combat.enemyNpcId) : undefined;
  let nextServer: ServerState = {
    ...server,
    player: { ...server.player, hp: Math.max(1, combat.player.hp), mana: Math.max(0, combat.player.mana) },
    npcs: npc
      ? server.npcs.map((entry) => entry.id === npc.id ? { ...entry, locationMode: 'city', currentZoneId: undefined, currentSpotId: undefined } : entry)
      : server.npcs,
  };
  nextServer = applyGuildWarDuelKill(nextServer, combat, server.player.guildId, npc?.guildId, server.player.id, npc?.id ?? combat.enemy.id, 'player_attack');
  nextServer = addNews(nextServer, rng, 'pvp', `${server.player.name} победил ${npc?.name ?? combat.enemy.name} в дуэли войны.`, true);
  const reward: RewardSummary = {
    xp: 0,
    gold: 0,
    items: [],
    lines: [
      'Дуэль войны гильдий: победа.',
      `${npc?.name ?? combat.enemy.name} отправлен в город.`,
      `HP: ${Math.max(1, combat.player.hp)}/${combat.player.maxHp}.`,
      `Mana: ${Math.max(0, combat.player.mana)}/${combat.player.maxMana}.`,
    ],
  };
  return {
    server: nextServer,
    combat: {
      ...combat,
      status: 'victory',
      reward,
      log: [...combat.log, `Победа. ${npc?.name ?? combat.enemy.name} отправлен в город.`].slice(-40),
    },
  };
};

const finishGuildWarDefeat = (server: ServerState, combat: CombatState, rng: Rng): { server: ServerState; combat: CombatState } => {
  const npc = combat.enemyNpcId ? server.npcs.find((entry) => entry.id === combat.enemyNpcId) : undefined;
  let nextServer: ServerState = {
    ...server,
    location: { mode: 'city' },
    player: { ...server.player, hp: 1, mana: 0 },
  };
  nextServer = applyGuildWarDuelKill(nextServer, combat, npc?.guildId, server.player.guildId, npc?.id ?? combat.enemy.id, server.player.id, 'npc_attack_player');
  nextServer = addNews(nextServer, rng, 'pvp', `${server.player.name}: смерть в дуэли войны. Город.`, true);
  return {
    server: nextServer,
    combat: {
      ...combat,
      status: 'defeat',
      log: [...combat.log, `Поражение. ${server.player.name} умер и отправлен в город.`].slice(-40),
      defeatLines: [
        'Дуэль войны гильдий: поражение.',
        'Ты умер и отправлен в город.',
        'HP: 1.',
        'Mana: 0.',
      ],
    },
  };
};

const maybeAnnounceLoot = (server: ServerState, rng: Rng, item: ItemDefinition): ServerState => {
  if (!item.announceIfDropped) return server;
  return addNews(server, rng, 'drop', `${server.player.name} выбил ${item.name}.`, ['epic', 'legendary', 'mythic', 'unique'].includes(item.rarity));
};

const finishArenaVictory = (server: ServerState, combat: CombatState, rng: Rng): { server: ServerState; combat: CombatState } => {
  const opponentRating = server.npcs.find((npc) => npc.id === combat.enemyNpcId)?.arenaRating ?? 1000;
  const diff = opponentRating - server.player.arenaRating;
  const ratingGain = Math.max(12, Math.min(38, 22 + Math.round(diff / 35) + rng.int(-3, 5)));
  const gold = rng.int(8, 18) + Math.floor(server.player.level * 1.5);
  const xp = Math.max(1, Math.floor((18 + server.player.level * 2) / 3));
  const opponentId = combat.enemyNpcId;
  let player = addPlayerXp(server.player, xp);
  const fullStats = getPlayerStats(player);
  player = { ...player, arenaRating: player.arenaRating + ratingGain, gold: player.gold + gold, hp: fullStats.hp, mana: fullStats.mana };

  const nextServer: ServerState = {
    ...server,
    player,
    npcs: server.npcs.map((npc) => npc.id === opponentId ? { ...npc, arenaRating: Math.max(100, npc.arenaRating - rng.int(10, 22)) } : npc),
  };
  const reward: RewardSummary = { xp, gold, items: [], lines: [`Рейтинг: +${ratingGain}.`, `Текущий рейтинг: ${player.arenaRating}.`, `HP и Mana восстановлены.`] };

  return { server: nextServer, combat: { ...combat, player: { ...combat.player, hp: player.hp, mana: player.mana, level: player.level }, status: 'victory', reward, log: [...combat.log, `Победа. Рейтинг +${ratingGain}.`] } };
};


const pickBossPartyDrop = (combat: CombatState, mobIds: string[], rng: Rng, forcePlayerClass = false): ItemDefinition | undefined => {
  const playerClassId = combat.player.classId;
  const playerLevel = combat.player.level;
  const sourceLevel = mobIds.map((id) => getMobById(id)?.level ?? playerLevel).sort((a, b) => b - a)[0] ?? playerLevel;
  const sourceType = combat.source === 'raid' ? 'raid' : combat.source === 'dungeon' ? 'dungeon' : undefined;

  const setItems = ITEMS.filter((item) => {
    if (!item.slot || !item.setId) return false;
    if (!sourceType) return false;
    if (item.sourceType !== sourceType) return false;
    if (item.sourceId !== combat.sourceId) return false;
    if (item.levelReq > Math.max(playerLevel + 2, sourceLevel + 2)) return false;
    return true;
  });

  const playerClassItems = setItems.filter((item) => playerClassId && item.classTags.includes(playerClassId));
  const neutralItems = setItems.filter((item) => item.classTags.length === 0);
  const anySetItems = setItems.length > 0 ? setItems : [];

  if (forcePlayerClass && playerClassItems.length > 0) return rng.pick(playerClassItems);

  const dungeon = getDungeonById(combat.sourceId);
  const table = dungeon ? getLootTableById(dungeon.lootTableId) : undefined;
  const tableClassItems = (table?.entries ?? [])
    .map((entry) => getItemById(entry.itemId))
    .filter((item): item is ItemDefinition => Boolean(item))
    .filter((item) => Boolean(item.slot && playerClassId && item.classTags.includes(playerClassId)));
  if (forcePlayerClass && tableClassItems.length > 0) return rng.pick(tableClassItems);

  const generalFallback = ITEMS
    .filter((item) => Boolean(item.slot && playerClassId && item.classTags.includes(playerClassId)))
    .filter((item) => item.levelReq <= Math.max(playerLevel + 2, sourceLevel + 2))
    .sort((a, b) => Math.abs(b.levelReq - sourceLevel) - Math.abs(a.levelReq - sourceLevel));
  if (forcePlayerClass && generalFallback.length > 0) return rng.pick(generalFallback.slice(-12));

  const normalPool = [
    ...playerClassItems,
    ...neutralItems,
    ...anySetItems,
  ];
  if (normalPool.length > 0) return rng.pick(normalPool);

  return generalFallback.length > 0 ? rng.pick(generalFallback.slice(-12)) : undefined;
};

const finishVictory = (server: ServerState, combat: CombatState, rng: Rng): { server: ServerState; combat: CombatState } => {
  if (combat.source === 'arena') return finishArenaVictory(server, combat, rng);
  if (combat.source === 'guild_war') return finishGuildWarVictoryV2(server, combat, rng);

  const mobIds = combat.enemyMobIds && combat.enemyMobIds.length > 0 ? combat.enemyMobIds : combat.enemyMobId ? [combat.enemyMobId] : [];
  const mobs = mobIds.map((id) => getMobById(id)).filter(Boolean);
  if (mobs.length === 0) {
    const reward: RewardSummary = { xp: 0, gold: 0, items: [], lines: ['Добычи нет.'] };
    return { server, combat: { ...combat, status: 'victory', reward } };
  }

  const xp = mobs.reduce((sum, mob) => sum + xpRewardForMob(mob!, server.player.level), 0);
  const gold = mobs.reduce((sum, mob) => sum + rng.int(mob!.gold[0], mob!.gold[1]), 0);
  const beforeLevel = server.player.level;
  let player = addPlayerXp(server.player, xp);
  const leveledUp = player.level > beforeLevel;
  player = { ...player, gold: player.gold + gold, hp: combat.player.hp, mana: combat.player.mana };
  if ((combat.source === 'dungeon' || combat.source === 'raid') && player.hp <= 0) {
    const stats = getPlayerStats(player);
    player = { ...player, hp: Math.max(1, Math.floor(stats.hp * 0.45)), mana: Math.max(0, Math.floor(stats.mana * 0.45)) };
  }

  let nextServer: ServerState = { ...server, player };
  let rewardItems: InventoryStack[] = [];
  const rewardLines = [`Опыт: +${xp}${leveledUp ? ` · Lv. ${player.level}` : ` · ${player.xp}/${xpForNextLevel(player.level)}`}`, `Золото: +${gold}`];
  const nextLog = [...combat.log, `Победа. XP +${xp}. Gold +${gold}.`];
  const isGroupInstance = combat.source === 'dungeon' || combat.source === 'raid';
  const shouldRollLoot = !isGroupInstance || Boolean(combat.allowLoot);
  let drops = shouldRollLoot ? mobs.flatMap((mob) => rollLoot(mob!.lootTableId, rng, server.player.level)) : [];

  const bossDropIndex = isGroupInstance && combat.allowLoot ? (server.currentDungeonRun?.bossLootCount ?? 0) + 1 : 0;
  const forcePlayerClass = isGroupInstance && combat.allowLoot && !server.currentDungeonRun?.playerClassBossLootDropped && bossDropIndex >= 3;
  let firstPartyDrop = isGroupInstance && combat.allowLoot
    ? pickBossPartyDrop(combat, mobIds, rng, forcePlayerClass)
    : undefined;
  const isClassDrop = Boolean(firstPartyDrop?.slot && combat.player.classId && firstPartyDrop.classTags.includes(combat.player.classId));

  if (isGroupInstance && combat.allowLoot && server.currentDungeonRun) {
    nextServer = {
      ...nextServer,
      currentDungeonRun: {
        ...server.currentDungeonRun,
        bossLootCount: (server.currentDungeonRun.bossLootCount ?? 0) + 1,
        playerClassBossLootDropped: Boolean(server.currentDungeonRun.playerClassBossLootDropped || isClassDrop),
      },
    };
  }

  drops.forEach((item) => {
    if (isGroupInstance && item.slot) return;
    nextServer = { ...nextServer, player: { ...nextServer.player, inventory: addInventoryItem(nextServer.player.inventory, item.id, 1, 0) } };
    rewardItems = addRewardItem(rewardItems, item.id, 1, 0);
    rewardLines.push(`Дроп: ${item.name}.`);
    nextServer = maybeAnnounceLoot(nextServer, rng, item);
  });

  if (firstPartyDrop) {
    nextServer = {
      ...nextServer,
      pendingLootRoll: {
        id: uid('loot_roll', rng),
        itemId: firstPartyDrop.id,
        source: combat.source === 'raid' ? 'raid' : 'dungeon',
        partyNpcIds: combat.partyNpcIds,
        createdDay: server.serverDay,
        createdMinute: server.currentMinute,
      },
    };
    rewardLines.push(`Пати-лут: ${firstPartyDrop.name}.`);
    nextLog.push(`Выпало на пати: ${firstPartyDrop.name}.`);
  }

  if (drops.length === 0 && !firstPartyDrop) rewardLines.push('Дроп: пусто.');

  const reward: RewardSummary = { xp, gold, items: rewardItems, lines: rewardLines };
  const nextCombat = { ...combat, player: { ...combat.player, hp: player.hp, mana: player.mana, level: player.level }, log: nextLog, status: 'victory' as const, reward };
  return { server: nextServer, combat: nextCombat };
};

const finishDefeat = (server: ServerState, combat: CombatState, rng: Rng): { server: ServerState; combat: CombatState } => {
  if (combat.source === 'guild_war') return finishGuildWarDefeatV2(server, combat, rng);
  const ratingLoss = combat.source === 'arena' ? rng.int(14, 26) : 0;
  const stats = getPlayerStats(server.player);
  const isGroupInstance = combat.source === 'dungeon' || combat.source === 'raid';
  const player = combat.source === 'arena'
    ? { ...server.player, arenaRating: Math.max(100, server.player.arenaRating - ratingLoss), hp: stats.hp, mana: stats.mana }
    : isGroupInstance
      ? { ...server.player, hp: Math.max(1, Math.floor(stats.hp * 0.55)), mana: Math.max(0, Math.floor(stats.mana * 0.55)) }
      : { ...server.player, arenaRating: server.player.arenaRating, hp: Math.max(1, Math.floor(combat.player.maxHp * 0.35)), mana: Math.max(0, Math.floor(combat.player.maxMana * 0.25)) };

  let nextServer: ServerState = {
    ...server,
    location: isGroupInstance ? server.location : { mode: 'city' },
    player,
    currentDungeonRun: isGroupInstance && server.currentDungeonRun ? { ...server.currentDungeonRun, currentEncounterIndex: 0, status: 'betweenFloors' } : server.currentDungeonRun,
    npcs: combat.source === 'arena' && combat.enemyNpcId ? server.npcs.map((npc) => npc.id === combat.enemyNpcId ? { ...npc, arenaRating: npc.arenaRating + rng.int(10, 22) } : npc) : server.npcs
  };
  if (!isGroupInstance) nextServer = addNews(nextServer, rng, 'system', `${server.player.name}: смерть. Город.`, false);

  const defeatLines = combat.source === 'arena'
    ? ['Бой завершён.', `HP: ${player.hp}/${stats.hp}.`, `Mana: ${player.mana}/${stats.mana}.`]
    : isGroupInstance
      ? ['Вайп группы.', 'Откат к началу этажа.', `HP: ${player.hp}/${stats.hp}.`, `Mana: ${player.mana}/${stats.mana}.`]
      : ['Возврат в город.', `HP: ${player.hp}/${combat.player.maxHp}.`, `Mana: ${player.mana}/${combat.player.maxMana}.`];
  if (ratingLoss > 0) defeatLines.push(`Рейтинг: -${ratingLoss}.`);

  return { server: nextServer, combat: { ...combat, log: [...combat.log, combat.source === 'dungeon' || combat.source === 'raid' ? 'Вайп. Начало этажа.' : 'Поражение. Город.'], status: 'defeat', defeatLines } };
};

const resolvePartyRound = (server: ServerState, combat: CombatState, enemy: Combatant, player: Combatant, log: string[], rng: Rng) => {
  if (!combat.partyRoles || combat.partyNpcIds.length === 0 || enemy.hp <= 0) return { enemy, player, partyMembers: combat.partyMembers ?? [] };
  const roles = combat.partyRoles;
  let members = combat.partyMembers ?? createPartyMembers(server, combat.partyNpcIds, roles);
  let nextEnemy = enemy;
  let nextPlayer = player;

  const addDamage = (memberId: string, damage: number) => {
    members = members.map((member) => member.id === memberId ? { ...member, damageLastRound: member.damageLastRound + damage } : member);
  };

  const npcAutoAttack = (id: string) => {
    const stats = npcCombatStats(server, id);
    const role = classCombatRole(stats.classId);
    const raw = role === 'magicDps' ? rng.int(11, 20) + stats.magic : rng.int(10, 18) + stats.attack;
    const result = dealDamage({ id: stats.id, name: stats.name, level: stats.level, classId: stats.classId, maxHp: stats.maxHp, hp: stats.maxHp, maxMana: stats.maxMana, mana: stats.maxMana, attack: stats.attack, magic: stats.magic, speed: 7 + Math.floor(stats.level / 3), defense: stats.defense, shield: 0, cooldowns: {}, defending: false } as Combatant, nextEnemy, raw, rng);
    nextEnemy = result.defender;
    addDamage(id, result.damage);
    log.push(`${stats.name}: ${result.missed ? 'промах' : `${result.damage} урона`}.`);
  };

  roles.dpsIds.filter((id) => id !== server.player.id).forEach(npcAutoAttack);
  if (roles.tankId !== server.player.id) npcAutoAttack(roles.tankId);

  const healerMember = members.find((member) => member.id === roles.healerId);
  const tankMember = members.find((member) => member.id === roles.tankId);
  if (healerMember && healerMember.id !== server.player.id) {
    const healerStats = npcCombatStats(server, healerMember.id);
    const injured = members.filter((member) => member.hp > 0 && member.hp < member.maxHp * 0.95);
    if (injured.length >= 3 && healerMember.mana >= 18) {
      const aoeHeal = rng.int(10, 18) + Math.floor(healerStats.heal * 0.55);
      let totalHeal = 0;
      members = members.map((member) => {
        if (member.hp <= 0 || member.hp >= member.maxHp * 0.95) return member;
        const applied = Math.min(member.maxHp - member.hp, aoeHeal);
        totalHeal += applied;
        if (member.id === server.player.id) nextPlayer = { ...nextPlayer, hp: Math.min(nextPlayer.maxHp, nextPlayer.hp + applied) };
        return { ...member, hp: member.hp + applied, healingLastRound: member.healingLastRound + applied };
      });
      members = updateMember(members, healerMember.id, { mana: Math.max(0, healerMember.mana - 18), healingLastRound: totalHeal });
      log.push(`${healerMember.name}: общий хилл +${totalHeal}.`);
    } else {
      const preferred = tankMember && tankMember.hp > 0 && tankMember.hp < tankMember.maxHp * 0.95
        ? tankMember
        : injured.sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];
      if (preferred) {
        const heal = Math.min(preferred.maxHp - preferred.hp, rng.int(17, 30) + healerStats.heal);
        if (heal > 0) {
          if (preferred.id === server.player.id) nextPlayer = { ...nextPlayer, hp: Math.min(nextPlayer.maxHp, nextPlayer.hp + heal) };
          members = updateMember(members, preferred.id, { hp: preferred.hp + heal });
          members = updateMember(members, healerMember.id, { healingLastRound: heal, mana: Math.max(0, healerMember.mana - 9) });
          log.push(`${healerMember.name}: лечение ${preferred.name} +${heal}.`);
        }
      } else {
        npcAutoAttack(healerMember.id);
      }
    }
  }

  return { enemy: nextEnemy, player: nextPlayer, partyMembers: members };
};

export const resolveCombatAction = (server: ServerState, combat: CombatState, actionId: string, rng: Rng): { server: ServerState; combat: CombatState } => {
  if (combat.status !== 'active') return { server, combat };
  if (combat.enemy.hp <= 0) return finishVictory(server, combat, rng);
  const groupAtStart = combat.source === 'dungeon' || combat.source === 'raid';
  const partyAliveAtStart = (combat.partyMembers ?? []).some((member) => member.id !== server.player.id && member.hp > 0);
  if (combat.player.hp <= 0 && (!groupAtStart || !partyAliveAtStart)) return finishDefeat(server, combat, rng);

  let player = { ...combat.player, defending: false, cooldowns: reduceCooldowns(combat.player.cooldowns), shield: Math.max(0, combat.player.shield - 2) };
  let enemy = { ...combat.enemy, defending: false, cooldowns: reduceCooldowns(combat.enemy.cooldowns), shield: Math.max(0, combat.enemy.shield - 2) };
  const log = [...combat.log];
  let partyMembers = resetRoundStats(combat.partyMembers ?? []);
  let playerDamage = 0;
  let playerHealing = 0;

  const isDownedInGroup = player.hp <= 0 && (combat.source === 'dungeon' || combat.source === 'raid') && (combat.partyMembers ?? []).some((member) => member.id !== server.player.id && member.hp > 0);
  if (isDownedInGroup) {
    log.push('Ты упал. Пати продолжает бой.');
  } else if (actionId.startsWith('consume:')) {
    const itemId = actionId.slice('consume:'.length);
    const stack = server.player.inventory.find((entry) => entry.itemId === itemId && entry.amount > 0);
    const item = getItemById(itemId);
    if (!stack || !item || (item.levelReq ?? 1) > server.player.level) {
      log.push('Расходник недоступен.');
    } else {
      const kind = potionKindFromId(itemId);
      const value = potionValue(itemId, kind);
      if (kind === 'mana') {
        player.mana = Math.min(player.maxMana, player.mana + value);
        log.push(`${item.name}: +${value} Mana.`);
      } else {
        player.hp = Math.min(player.maxHp, player.hp + value);
        log.push(`${item.name}: +${value} HP.`);
      }
      server = { ...server, player: { ...server.player, inventory: removeInventoryItem(server.player.inventory, itemId, 1, stack.enhancement ?? 0, stack.cardIds ?? []) } };
    }
  } else if (actionId === 'potion') {
    const potion = bestPotionStack(server.player.inventory, server.player.level, 'hp');
    if (potion) {
      const heal = potionValue(potion.entry.itemId, 'hp');
      player.hp = Math.min(player.maxHp, player.hp + heal);
      server = { ...server, player: { ...server.player, inventory: removeInventoryItem(server.player.inventory, potion.entry.itemId, 1, potion.entry.enhancement ?? 0, potion.entry.cardIds ?? []) } };
      log.push(`${potion.item?.name ?? 'Зелье лечения'}: +${heal} HP.`);
    } else log.push('Зелья лечения нет.');
  } else if (actionId === 'mana_potion') {
    const potion = bestPotionStack(server.player.inventory, server.player.level, 'mana');
    if (potion) {
      const mana = potionValue(potion.entry.itemId, 'mana');
      player.mana = Math.min(player.maxMana, player.mana + mana);
      server = { ...server, player: { ...server.player, inventory: removeInventoryItem(server.player.inventory, potion.entry.itemId, 1, potion.entry.enhancement ?? 0, potion.entry.cardIds ?? []) } };
      log.push(`${potion.item?.name ?? 'Зелье маны'}: +${mana} Mana.`);
    } else log.push('Зелья маны нет.');
  } else if (actionId === 'basic') {
    const manaGain = Math.max(4, Math.ceil(player.maxMana * 0.06));
    player.mana = Math.min(player.maxMana, player.mana + manaGain);
    const result = dealDamage(player, enemy, player.attack, rng);
    enemy = result.defender;
    playerDamage += result.damage;
    log.push(result.missed ? `Атака: промах. Mana +${manaGain}.` : `Атака: ${result.damage} урона${result.crit ? ' · крит' : ''}. Mana +${manaGain}.`);
  } else {
    const skill = getSkillById(actionId);
    if (!skill || !skill.classIds.includes(server.player.classId)) log.push('Навык недоступен.');
    else if ((player.cooldowns[actionId] ?? 0) > 0) log.push('Навык на откате.');
    else if (player.mana < skill.manaCost) log.push('Не хватает маны.');
    else {
      player.mana -= skill.manaCost;
      player.cooldowns[actionId] = skill.cooldown;
      skill.effects.forEach((effect) => {
        if (effect.type === 'DAMAGE') {
          const scale = effect.scale === 'magic' ? player.magic : player.attack;
          const result = dealDamage(player, enemy, scale * effect.value, rng);
          enemy = result.defender;
          playerDamage += result.damage;
          log.push(result.missed ? `${skill.name}: промах.` : `${skill.name}: ${result.damage} урона${result.crit ? ' · крит' : ''}.`);
        }
        if (effect.type === 'HEAL') {
          const scale = effect.scale === 'magic' ? player.magic : player.attack;
          const healing = Math.round(scale * effect.value + effect.value);
          if (skill.id === 'priest_group_heal' && partyMembers.length > 0) {
            let totalHeal = 0;
            partyMembers = partyMembers.map((member) => {
              if (member.hp <= 0 || member.hp >= member.maxHp) return member;
              const applied = Math.min(member.maxHp - member.hp, healing);
              totalHeal += applied;
              if (member.id === server.player.id) player.hp = Math.min(player.maxHp, player.hp + applied);
              return { ...member, hp: Math.min(member.maxHp, member.hp + applied), healingLastRound: member.healingLastRound + applied };
            });
            playerHealing += totalHeal;
            log.push(`${skill.name}: пати +${totalHeal} HP.`);
          } else {
            const applied = Math.min(player.maxHp - player.hp, healing);
            player.hp = Math.min(player.maxHp, player.hp + healing);
            playerHealing += applied;
            log.push(`${skill.name}: +${applied} HP.`);
          }
        }
      });
    }
  }

  if (partyMembers.length > 0) {
    partyMembers = partyMembers.map((member) => member.id === server.player.id ? { ...member, hp: player.hp, mana: player.mana, damageLastRound: playerDamage, healingLastRound: playerHealing, damageTakenLastRound: member.damageTakenLastRound } : member);
  }

  const partyResult = resolvePartyRound(server, { ...combat, partyMembers }, enemy, player, log, rng);
  enemy = partyResult.enemy;
  player = partyResult.player;
  partyMembers = partyResult.partyMembers;

  if (enemy.hp <= 0) return finishVictory(server, { ...combat, player, enemy, partyMembers, log }, rng);

  const enemyRaw = enemy.attack + Math.max(0, enemy.magic * 0.6);
  const tankId = combat.partyRoles?.tankId;
  const tankMember = partyMembers.find((member) => member.id === tankId && member.hp > 0);
  const fallbackTarget = partyMembers.find((member) => member.id !== server.player.id && member.hp > 0);
  if ((tankMember && tankMember.id !== server.player.id) || (!tankMember && player.hp <= 0 && fallbackTarget)) {
    const target = tankMember && tankMember.id !== server.player.id ? tankMember : fallbackTarget!;
    const tankDef = npcCombatStats(server, target.id).defense;
    const damage = Math.max(1, Math.round((enemyRaw * rng.int(68, 105)) / 100 - tankDef * 0.5));
    partyMembers = updateMember(partyMembers, target.id, { hp: Math.max(0, target.hp - damage), damageTakenLastRound: damage });
    log.push(`${enemy.name}: ${damage} урона по ${target.name}.`);
  } else {
    const enemyHit = dealDamage(enemy, player, enemyRaw, rng);
    player = enemyHit.defender;
    const taken = enemyHit.damage;
    if (partyMembers.length > 0) {
      partyMembers = partyMembers.map((member) => member.id === server.player.id ? { ...member, hp: player.hp, mana: player.mana, damageTakenLastRound: taken } : member);
    }
    log.push(enemyHit.missed ? `${enemy.name}: промах.` : `${enemy.name}: ${enemyHit.damage} урона${enemyHit.crit ? ' · крит' : ''}.`);
  }

  if (combat.source === 'arena' && enemy.classId === 'priest' && enemy.hp > 0 && enemy.hp < enemy.maxHp * 0.82 && enemy.mana >= 12 && rng.chance(0.38)) {
    const heal = Math.min(enemy.maxHp - enemy.hp, Math.round(enemy.magic * 0.95 + rng.int(8, 18)));
    enemy = { ...enemy, hp: enemy.hp + heal, mana: Math.max(0, enemy.mana - 12) };
    log.push(`${enemy.name}: хилл +${heal}.`);
  }

  const enemyMob = combat.enemyMobId ? getMobById(combat.enemyMobId) : undefined;
  const bossAoe = Boolean(enemyMob?.tags.includes('aoe') || enemyMob?.tags.includes('raid')) && partyMembers.length > 0 && combat.turn % 3 === 0 && enemy.hp > 0;
  if (bossAoe) {
    const aoeRaw = Math.max(6, Math.round((enemy.magic > 0 ? enemy.magic : enemy.attack) * 0.62));
    let totalAoe = 0;
    partyMembers = partyMembers.map((member) => {
      if (member.hp <= 0) return member;
      const resist = member.role === 'tank' ? 0.78 : 1;
      const damage = Math.max(1, Math.round((aoeRaw + rng.int(0, 8)) * resist));
      totalAoe += damage;
      if (member.id === server.player.id) player = { ...player, hp: Math.max(0, player.hp - damage) };
      return { ...member, hp: Math.max(0, member.id === server.player.id ? player.hp : member.hp - damage), damageTakenLastRound: member.damageTakenLastRound + damage };
    });
    log.push(`${enemy.name}: АоЕ ${totalAoe} урона по пати.`);
  }

  let nextCombat = { ...combat, player, enemy, partyMembers, turn: combat.turn + 1, log: log.slice(-28) };
  if (enemy.hp <= 0) return finishVictory(server, nextCombat, rng);
  const isGroup = combat.source === 'dungeon' || combat.source === 'raid';
  const partyAlive = (partyMembers ?? []).some((member) => member.id !== server.player.id && member.hp > 0);
  if (player.hp <= 0 && (!isGroup || !partyAlive)) return finishDefeat(server, nextCombat, rng);
  if (nextCombat.turn > 180) {
    nextCombat = { ...nextCombat, log: [...nextCombat.log, 'combat_max_turn: бой принудительно завершён.'].slice(-28) };
    const enemyPercent = enemy.hp / Math.max(1, enemy.maxHp);
    const playerPercent = player.hp / Math.max(1, player.maxHp);
    return enemyPercent <= playerPercent ? finishVictory(server, nextCombat, rng) : finishDefeat(server, nextCombat, rng);
  }
  return { server, combat: nextCombat };
};

export const getUsableSkillIds = (server: ServerState) => getClassById(server.player.classId)?.skillIds ?? [];
export const getPartyRoleName = roleName;
