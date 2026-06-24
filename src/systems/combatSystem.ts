import { getClassById, getSkillById } from '../content/classes';
import { getItemById } from '../content/items';
import { getLootTableById, getMobById, getSpotById } from '../content/world';
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

export const startSpotCombat = (server: ServerState, spotId: string, rng: Rng): CombatState | null => {
  const spot = getSpotById(spotId);
  if (!spot) return null;
  const mobId = rng.pick(spot.mobIds);
  const enemy = createMobCombatant(mobId);
  if (!enemy) return null;
  enemy.maxHp = Math.round(enemy.maxHp * 7.5);
  enemy.hp = enemy.maxHp;

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
): CombatState | null => {
  const enemy = createMobCombatant(bossMobId);
  if (!enemy) return null;

  const mob = getMobById(bossMobId);
  const isBoss = Boolean(mob?.tags.includes('boss'));
  const isFinalDungeonEncounter = typeof dungeonEncounterIndex === 'number' && typeof dungeonFloorEnemyCount === 'number'
    ? dungeonEncounterIndex >= dungeonFloorEnemyCount - 1
    : true;

  if (source === 'dungeon' || source === 'raid') {
    const hpScale = source === 'raid' ? 20 : 10;
    const atkScale = isBoss ? (source === 'raid' ? 1.18 : 1.08) : (source === 'raid' ? 1.55 : 1.32);
    enemy.maxHp = Math.round(enemy.maxHp * hpScale + partyNpcIds.length * (source === 'raid' ? 95 : 55));
    enemy.hp = enemy.maxHp;
    enemy.attack = Math.round(enemy.attack * atkScale);
    enemy.magic = Math.round(enemy.magic * atkScale);
    enemy.defense = Math.round(enemy.defense * (isBoss ? 1.22 : 1.14));
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
    allowLoot: (source !== 'dungeon' && source !== 'raid') || (isBoss && isFinalDungeonEncounter),
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


const pickBossPartyDrop = (combat: CombatState, mobIds: string[], rng: Rng): ItemDefinition | undefined => {
  const lastMob = mobIds.map((id) => getMobById(id)).filter(Boolean).slice(-1)[0];
  const table = lastMob ? getLootTableById(lastMob.lootTableId) : undefined;
  const tableItems = (table?.entries ?? [])
    .map((entry) => getItemById(entry.itemId))
    .filter((item): item is ItemDefinition => Boolean(item && item.slot && item.type !== 'consumable' && item.type !== 'material' && item.type !== 'quest'));
  const roll = rng.next();
  const wanted = roll < 0.1 ? 'legendary' : roll < 0.4 ? 'epic' : 'rare';
  const byWanted = tableItems.filter((item) => item.rarity === wanted);
  if (byWanted.length > 0) return rng.pick(byWanted);
  const fallbackOrder = wanted === 'legendary' ? ['epic', 'rare'] : wanted === 'epic' ? ['rare', 'legendary'] : ['epic', 'legendary'];
  for (const rarity of fallbackOrder) {
    const pool = tableItems.filter((item) => item.rarity === rarity);
    if (pool.length > 0) return rng.pick(pool);
  }
  return tableItems.length > 0 ? rng.pick(tableItems) : undefined;
};

const finishVictory = (server: ServerState, combat: CombatState, rng: Rng): { server: ServerState; combat: CombatState } => {
  if (combat.source === 'arena') return finishArenaVictory(server, combat, rng);

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

  let firstPartyDrop = isGroupInstance && combat.allowLoot
    ? pickBossPartyDrop(combat, mobIds, rng)
    : undefined;

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

  if (drops.length === 0) rewardLines.push(isGroupInstance ? 'Дроп: только с боссов.' : 'Дроп: пусто.');

  const reward: RewardSummary = { xp, gold, items: rewardItems, lines: rewardLines };
  const nextCombat = { ...combat, player: { ...combat.player, hp: player.hp, mana: player.mana, level: player.level }, log: nextLog, status: 'victory' as const, reward };
  return { server: nextServer, combat: nextCombat };
};

const finishDefeat = (server: ServerState, combat: CombatState, rng: Rng): { server: ServerState; combat: CombatState } => {
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
  let members = resetRoundStats(combat.partyMembers ?? createPartyMembers(server, combat.partyNpcIds, roles));
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
    const injured = members.filter((member) => member.hp > 0 && member.hp < member.maxHp);
    if (injured.length >= 3 && healerMember.mana >= 18) {
      const aoeHeal = rng.int(10, 18) + Math.floor(healerStats.heal * 0.55);
      let totalHeal = 0;
      members = members.map((member) => {
        if (member.hp <= 0 || member.hp >= member.maxHp) return member;
        const applied = Math.min(member.maxHp - member.hp, aoeHeal);
        totalHeal += applied;
        return { ...member, hp: member.hp + applied, healingLastRound: member.id === healerMember.id ? member.healingLastRound : member.healingLastRound + applied };
      });
      members = updateMember(members, healerMember.id, { mana: Math.max(0, healerMember.mana - 18), healingLastRound: totalHeal });
      log.push(`${healerMember.name}: АоЕ хилл +${totalHeal}.`);
    } else if (tankMember) {
      const heal = Math.min(tankMember.maxHp - tankMember.hp, rng.int(17, 30) + healerStats.heal);
      if (heal > 0) {
        members = updateMember(members, tankMember.id, { hp: tankMember.hp + heal });
        members = updateMember(members, healerMember.id, { healingLastRound: heal, mana: Math.max(0, healerMember.mana - 9) });
        log.push(`${healerMember.name}: лечение танка +${heal}.`);
      } else {
        log.push(`${healerMember.name}: готовит хилл.`);
      }
    }
  }

  return { enemy: nextEnemy, player: nextPlayer, partyMembers: members };
};

export const resolveCombatAction = (server: ServerState, combat: CombatState, actionId: string, rng: Rng): { server: ServerState; combat: CombatState } => {
  if (combat.status !== 'active') return { server, combat };

  let player = { ...combat.player, defending: false, cooldowns: reduceCooldowns(combat.player.cooldowns), shield: Math.max(0, combat.player.shield - 2) };
  let enemy = { ...combat.enemy, defending: false, cooldowns: reduceCooldowns(combat.enemy.cooldowns), shield: Math.max(0, combat.enemy.shield - 2) };
  const log = [...combat.log];
  let partyMembers = resetRoundStats(combat.partyMembers ?? []);
  let playerDamage = 0;
  let playerHealing = 0;

  const isDownedInGroup = player.hp <= 0 && (combat.source === 'dungeon' || combat.source === 'raid') && (combat.partyMembers ?? []).some((member) => member.id !== server.player.id && member.hp > 0);
  if (isDownedInGroup) {
    log.push('Ты упал. Пати продолжает бой.');
  } else if (actionId === 'defend') {
    player.defending = true;
    player.shield += 8 + Math.floor(player.defense * 0.8);
    log.push('Защита.');
  } else if (actionId === 'potion') {
    const potion = server.player.inventory.find((entry) => entry.itemId === 'minor_potion' && (entry.enhancement ?? 0) === 0);
    if (potion && potion.amount > 0) {
      player.hp = Math.min(player.maxHp, player.hp + 35);
      server = { ...server, player: { ...server.player, inventory: removeInventoryItem(server.player.inventory, 'minor_potion', 1, 0) } };
      log.push('Зелье лечения: +35 HP.');
    } else log.push('Зелья лечения нет.');
  } else if (actionId === 'mana_potion') {
    const potion = server.player.inventory.find((entry) => entry.itemId === 'mana_potion' && (entry.enhancement ?? 0) === 0);
    if (potion && potion.amount > 0) {
      player.mana = Math.min(player.maxMana, player.mana + 30);
      server = { ...server, player: { ...server.player, inventory: removeInventoryItem(server.player.inventory, 'mana_potion', 1, 0) } };
      log.push('Зелье маны: +30 Mana.');
    } else log.push('Зелья маны нет.');
  } else if (actionId === 'basic') {
    const result = dealDamage(player, enemy, player.attack, rng);
    enemy = result.defender;
    playerDamage += result.damage;
    log.push(result.missed ? 'Атака: промах.' : `Атака: ${result.damage} урона${result.crit ? ' · крит' : ''}.`);
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

  const nextCombat = { ...combat, player, enemy, partyMembers, turn: combat.turn + 1, log: log.slice(-28) };
  const isGroup = combat.source === 'dungeon' || combat.source === 'raid';
  const partyAlive = (partyMembers ?? []).some((member) => member.id !== server.player.id && member.hp > 0);
  if (player.hp <= 0 && (!isGroup || !partyAlive)) return finishDefeat(server, nextCombat, rng);
  return { server, combat: nextCombat };
};

export const getUsableSkillIds = (server: ServerState) => getClassById(server.player.classId)?.skillIds ?? [];
export const getPartyRoleName = roleName;
