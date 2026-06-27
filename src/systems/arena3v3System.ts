import { getSkillById } from '../content/classes';
import type { Rng } from '../engine/rng';
import { uid } from '../engine/rng';
import type {
  CombatAggression,
  CombatState,
  Combatant,
  CombatantV2,
  CombatTeamId,
  CombatTeamV2,
  NpcPlayer,
  PartyRole,
  RewardSummary,
  ServerState,
} from '../types/game';
import { getGearScore, getPlayerStats } from './itemSystem';
import { addPlayerXp } from './progressionSystem';
import { finishGuildWarDefeatV2, finishGuildWarVictoryV2 } from './guildWarCombatResultSystem';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(value)));

const roleFromClass = (classId?: string): PartyRole => {
  if (classId === 'warrior') return 'tank';
  if (classId === 'priest') return 'healer';
  if (classId === 'mage') return 'magicDps';
  return 'physicalDps';
};

const aggressionFromRole = (role: PartyRole, pvp = false): CombatAggression => {
  if (role === 'tank') return pvp ? 'reckless' : 'aggressive';
  if (role === 'physicalDps' || role === 'magicDps') return pvp ? 'aggressive' : 'balanced';
  if (role === 'healer') return 'defensive';
  return 'balanced';
};

const targetPriorityFromRole = (role: PartyRole) => {
  if (role === 'healer') return 'enemyDps' as const;
  if (role === 'tank') return 'highestThreat' as const;
  return 'lowestHp' as const;
};

const aggressionDamageMod = (aggression: CombatAggression) => {
  if (aggression === 'defensive') return 0.9;
  if (aggression === 'aggressive') return 1.08;
  if (aggression === 'reckless') return 1.15;
  return 1;
};

const aggressionDefenseMod = (aggression: CombatAggression) => {
  if (aggression === 'defensive') return 1.1;
  if (aggression === 'aggressive') return 0.95;
  if (aggression === 'reckless') return 0.88;
  return 1;
};

const createLegacyCombatant = (unit: CombatantV2): Combatant => ({
  id: unit.id,
  name: unit.name,
  level: unit.level,
  classId: unit.classId,
  maxHp: unit.maxHp,
  hp: unit.hp,
  maxMana: unit.maxMana,
  mana: unit.mana,
  attack: unit.attack,
  magic: unit.magic,
  defense: unit.defense,
  speed: unit.speed,
  shield: unit.shield,
  cooldowns: unit.cooldowns,
  defending: unit.defending,
});

const makePlayerCombatant = (server: ServerState): CombatantV2 => {
  const stats = getPlayerStats(server.player);
  const role = roleFromClass(server.player.classId);
  const gearScore = getGearScore(server.player.equipment);
  return {
    id: 'teamA_player',
    sourceId: server.player.id,
    name: server.player.name,
    kind: 'player',
    controller: 'player',
    teamId: 'teamA',
    level: server.player.level,
    classId: server.player.classId,
    role,
    maxHp: stats.hp,
    hp: Math.max(1, Math.min(server.player.hp, stats.hp)),
    maxMana: stats.mana,
    mana: Math.max(0, Math.min(server.player.mana, stats.mana)),
    attack: stats.attack,
    magic: stats.magic,
    defense: stats.defense,
    speed: stats.speed,
    shield: 0,
    gearScore,
    skill: 7,
    aggression: role === 'healer' ? 'balanced' : aggressionFromRole(role, true),
    targetPriority: role === 'healer' ? 'enemyDps' : 'lowestHp',
    threat: {},
    cooldowns: {},
    defending: false,
    alive: true,
    damageDealt: 0,
    damageTaken: 0,
    healingDone: 0,
    kills: 0,
  };
};

const npcStats = (npc: NpcPlayer) => {
  const level = npc.level;
  const gear = npc.gearScore ?? 25;
  const classId = npc.classId;
  const role = roleFromClass(classId);
  let maxHp = 95 + level * 16 + Math.floor(gear / 4);
  let maxMana = classId === 'mage' || classId === 'priest' ? 80 + level * 7 : 45 + level * 3;
  let attack = 8 + level * 2 + Math.floor(gear / 17);
  let magic = 7 + level * 2 + Math.floor(gear / 19);
  let defense = 5 + Math.floor(level * 1.45) + Math.floor(gear / 28);
  const speed = 6 + Math.floor(level / 3) + Math.floor((npc.skill ?? 5) / 2);

  if (role === 'tank') {
    maxHp = Math.round(maxHp * 1.12);
    defense = Math.round(defense * 1.18);
    attack = Math.round(attack * 0.9);
  }
  if (role === 'healer') {
    maxHp = Math.round(maxHp * 0.98);
    magic = Math.round(magic * 1.12);
    defense = Math.round(defense * 0.94);
  }
  if (role === 'magicDps') magic = Math.round(magic * 1.12);
  if (role === 'physicalDps') attack = Math.round(attack * 1.1);

  return { maxHp, maxMana, attack, magic, defense, speed, role };
};

const makeNpcCombatant = (npc: NpcPlayer, teamId: CombatTeamId, index: number): CombatantV2 => {
  const stats = npcStats(npc);
  const pvp = ['PVP_PLAYER', 'HARDCORE', 'GUILD_PLAYER', 'LEADER'].includes(npc.roleFocus) || npc.playstyle === 'pvp';
  const aggression = aggressionFromRole(stats.role, pvp);
  return {
    id: `${teamId}_${npc.id}_${index}`,
    sourceId: npc.id,
    name: npc.name,
    kind: 'npcPlayer',
    controller: 'npc',
    teamId,
    level: npc.level,
    classId: npc.classId,
    role: stats.role,
    maxHp: stats.maxHp,
    hp: stats.maxHp,
    maxMana: stats.maxMana,
    mana: stats.maxMana,
    attack: stats.attack,
    magic: stats.magic,
    defense: stats.defense,
    speed: stats.speed,
    shield: 0,
    gearScore: npc.gearScore,
    skill: npc.skill ?? 5,
    aggression,
    targetPriority: targetPriorityFromRole(stats.role),
    threat: {},
    cooldowns: {},
    defending: false,
    alive: true,
    damageDealt: 0,
    damageTaken: 0,
    healingDone: 0,
    kills: 0,
  };
};

export const calculateCombatantPower = (combatant: CombatantV2) => {
  const roleBonus = combatant.role === 'healer' ? 1.04 : combatant.role === 'tank' ? 1.03 : 1;
  return Math.round(
    (combatant.maxHp * 0.45 +
      combatant.attack * 4.2 +
      combatant.magic * 3.7 +
      combatant.defense * 4.8 +
      combatant.speed * 8 +
      (combatant.gearScore ?? 0) * 0.15 +
      (combatant.skill ?? 5) * 12) * roleBonus,
  );
};

export const calculateTeamPower = (team: CombatTeamV2) =>
  team.members.reduce((sum, member) => sum + calculateCombatantPower(member), 0);

const chooseByClass = (pool: NpcPlayer[], classId: string, used: Set<string>) =>
  pool.find((npc) => npc.classId === classId && !used.has(npc.id));

const pickArenaAllies = (server: ServerState, rng: Rng) => {
  const used = new Set<string>();
  const basePool = [...server.npcs]
    .filter((npc) => Math.abs(npc.level - server.player.level) <= 5)
    .filter((npc) => !server.player.guildId || !npc.guildId || npc.guildId === server.player.guildId)
    .sort((a, b) =>
      Math.abs(a.level - server.player.level) - Math.abs(b.level - server.player.level) ||
      Math.abs(a.arenaRating - server.player.arenaRating) - Math.abs(b.arenaRating - server.player.arenaRating) ||
      (b.gearScore ?? 0) - (a.gearScore ?? 0),
    );

  const fallback = [...server.npcs].sort((a, b) =>
    Math.abs(a.level - server.player.level) - Math.abs(b.level - server.player.level) ||
    Math.abs(a.arenaRating - server.player.arenaRating) - Math.abs(b.arenaRating - server.player.arenaRating),
  );

  const pool = basePool.length >= 2 ? basePool : fallback;
  const picks: NpcPlayer[] = [];

  if (server.player.classId !== 'priest') {
    const healer = chooseByClass(pool, 'priest', used);
    if (healer) {
      picks.push(healer);
      used.add(healer.id);
    }
  }

  if (server.player.classId !== 'warrior') {
    const tank = chooseByClass(pool, 'warrior', used);
    if (tank) {
      picks.push(tank);
      used.add(tank.id);
    }
  }

  for (const npc of pool) {
    if (picks.length >= 2) break;
    if (used.has(npc.id)) continue;
    picks.push(npc);
    used.add(npc.id);
  }

  while (picks.length < 2 && fallback.length > 0) {
    const npc = rng.pick(fallback.filter((entry) => !used.has(entry.id)));
    if (!npc) break;
    picks.push(npc);
    used.add(npc.id);
  }

  return picks.slice(0, 2);
};

const pickArenaEnemies = (server: ServerState, allies: NpcPlayer[], teamPower: number, rng: Rng) => {
  const blocked = new Set(allies.map((npc) => npc.id));
  const pvpPool = [...server.npcs]
    .filter((npc) => !blocked.has(npc.id))
    .filter((npc) => ['PVP_PLAYER', 'HARDCORE', 'GUILD_PLAYER', 'LEADER'].includes(npc.roleFocus) || npc.playstyle === 'pvp')
    .sort((a, b) =>
      Math.abs(a.level - server.player.level) - Math.abs(b.level - server.player.level) ||
      Math.abs(a.arenaRating - server.player.arenaRating) - Math.abs(b.arenaRating - server.player.arenaRating),
    );

  const fallback = [...server.npcs]
    .filter((npc) => !blocked.has(npc.id))
    .sort((a, b) => Math.abs(a.level - server.player.level) - Math.abs(b.level - server.player.level));

  const pool = pvpPool.length >= 3 ? pvpPool : fallback;
  const selected: NpcPlayer[] = [];
  const used = new Set<string>();

  for (const npc of pool) {
    if (selected.length >= 3) break;
    if (used.has(npc.id)) continue;
    selected.push(npc);
    used.add(npc.id);
  }

  while (selected.length < 3 && fallback.length > 0) {
    const npc = rng.pick(fallback.filter((entry) => !used.has(entry.id)));
    if (!npc) break;
    selected.push(npc);
    used.add(npc.id);
  }

  const sorted = selected.sort((a, b) => {
    const ap = calculateCombatantPower(makeNpcCombatant(a, 'teamB', 0));
    const bp = calculateCombatantPower(makeNpcCombatant(b, 'teamB', 0));
    return Math.abs(ap * 3 - teamPower) - Math.abs(bp * 3 - teamPower);
  });

  return sorted.slice(0, 3);
};

const syncLegacyCombat = (combat: CombatState): CombatState => {
  if (!combat.teamA || !combat.teamB) return combat;
  const playerUnit = combat.teamA.members.find((member) => member.controller === 'player') ?? combat.teamA.members[0];
  const enemyAlive = combat.teamB.members.filter((member) => member.alive);
  const enemyHp = combat.teamB.members.reduce((sum, member) => sum + Math.max(0, member.hp), 0);
  const enemyMaxHp = combat.teamB.members.reduce((sum, member) => sum + member.maxHp, 0);
  const enemyAttack = Math.round(combat.teamB.members.reduce((sum, member) => sum + member.attack + member.magic * 0.5, 0) / Math.max(1, combat.teamB.members.length));
  const enemyDefense = Math.round(combat.teamB.members.reduce((sum, member) => sum + member.defense, 0) / Math.max(1, combat.teamB.members.length));

  return {
    ...combat,
    player: createLegacyCombatant(playerUnit),
    enemy: {
      id: 'arena_3v3_enemy_team',
      name: enemyAlive.length > 0 ? `Команда соперника · ${enemyAlive.length}/3` : 'Команда соперника',
      level: Math.round(combat.teamB.members.reduce((sum, member) => sum + member.level, 0) / Math.max(1, combat.teamB.members.length)),
      maxHp: Math.max(1, enemyMaxHp),
      hp: Math.max(0, enemyHp),
      maxMana: 0,
      mana: 0,
      attack: Math.max(1, enemyAttack),
      magic: 0,
      defense: Math.max(1, enemyDefense),
      speed: 0,
      shield: 0,
      cooldowns: {},
      defending: false,
    },
    partyMembers: combat.teamA.members.map((member) => ({
      id: member.id,
      name: member.name,
      classId: member.classId ?? 'ranger',
      role: member.role ?? roleFromClass(member.classId),
      maxHp: member.maxHp,
      hp: member.hp,
      maxMana: member.maxMana,
      mana: member.mana,
      damageLastRound: 0,
      damageTakenLastRound: 0,
      healingLastRound: 0,
    })),
  };
};

export const startArena3v3Combat = (server: ServerState, rng: Rng): CombatState | null => {
  if (server.npcs.length < 5) return null;
  const player = makePlayerCombatant(server);
  const allies = pickArenaAllies(server, rng);
  if (allies.length < 2) return null;
  const teamA: CombatTeamV2 = {
    id: 'teamA',
    name: 'Твоя команда',
    faction: 'arena',
    guildId: server.player.guildId,
    members: [player, ...allies.map((npc, index) => makeNpcCombatant(npc, 'teamA', index))],
  };

  const enemies = pickArenaEnemies(server, allies, calculateTeamPower(teamA), rng);
  if (enemies.length < 3) return null;
  const teamB: CombatTeamV2 = {
    id: 'teamB',
    name: 'Команда соперника',
    faction: 'arena',
    members: enemies.map((npc, index) => makeNpcCombatant(npc, 'teamB', index)),
  };

  const combat: CombatState = {
    id: uid('arena3v3', rng),
    source: 'arena',
    sourceId: 'arena_3v3',
    enemyNpcId: enemies[0].id,
    enemyNpcIds: enemies.map((npc) => npc.id),
    allyNpcIds: allies.map((npc) => npc.id),
    arenaMode: '3v3',
    player: createLegacyCombatant(player),
    enemy: {
      id: 'arena_3v3_enemy_team',
      name: 'Команда соперника',
      level: Math.round(enemies.reduce((sum, npc) => sum + npc.level, 0) / 3),
      maxHp: teamB.members.reduce((sum, member) => sum + member.maxHp, 0),
      hp: teamB.members.reduce((sum, member) => sum + member.hp, 0),
      maxMana: 0,
      mana: 0,
      attack: Math.round(teamB.members.reduce((sum, member) => sum + member.attack, 0) / 3),
      magic: Math.round(teamB.members.reduce((sum, member) => sum + member.magic, 0) / 3),
      defense: Math.round(teamB.members.reduce((sum, member) => sum + member.defense, 0) / 3),
      speed: Math.round(teamB.members.reduce((sum, member) => sum + member.speed, 0) / 3),
      shield: 0,
      cooldowns: {},
      defending: false,
    },
    partyNpcIds: allies.map((npc) => npc.id),
    partyMembers: [],
    teamA,
    teamB,
    activeCombatantId: player.id,
    winnerTeamId: undefined,
    recentEvents: [],
    round: 1,
    turn: 1,
    log: [
      `Арена 3v3. Союзники: ${allies.map((npc) => npc.name).join(', ')}.`,
      `Противники: ${enemies.map((npc) => npc.name).join(', ')}.`,
      `Power: ${calculateTeamPower(teamA)} vs ${calculateTeamPower(teamB)}.`,
    ],
    status: 'active',
  };

  return syncLegacyCombat(combat);
};

const alive = (team: CombatTeamV2) => team.members.filter((member) => member.alive && member.hp > 0);

const chooseTarget = (enemies: CombatantV2[], actor: CombatantV2, rng: Rng) => {
  const aliveEnemies = enemies.filter((enemy) => enemy.alive && enemy.hp > 0);
  if (aliveEnemies.length === 0) return undefined;
  if (actor.targetId) {
    const current = aliveEnemies.find((enemy) => enemy.id === actor.targetId);
    if (current && rng.chance(actor.aggression === 'reckless' ? 0.45 : 0.72)) return current;
  }
  if (actor.targetPriority === 'lowestHp' || actor.aggression === 'aggressive' || actor.aggression === 'reckless') {
    return [...aliveEnemies].sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];
  }
  if (actor.targetPriority === 'enemyHealer') {
    return aliveEnemies.find((enemy) => enemy.role === 'healer') ?? rng.pick(aliveEnemies);
  }
  if (actor.targetPriority === 'enemyTank') {
    return aliveEnemies.find((enemy) => enemy.role === 'tank') ?? rng.pick(aliveEnemies);
  }
  return rng.pick(aliveEnemies);
};

const chooseHealTarget = (allies: CombatantV2[]) =>
  allies
    .filter((ally) => ally.alive && ally.hp > 0 && ally.hp < ally.maxHp * 0.58)
    .sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];

const applyMember = (team: CombatTeamV2, member: CombatantV2) => ({
  ...team,
  members: team.members.map((entry) => (entry.id === member.id ? member : entry)),
});

const applyDamageToTeam = (team: CombatTeamV2, targetId: string, damage: number, sourceId: string) => {
  let killed = false;
  const members = team.members.map((member) => {
    if (member.id !== targetId) return member;
    const nextHp = Math.max(0, member.hp - damage);
    killed = member.hp > 0 && nextHp <= 0;
    return {
      ...member,
      hp: nextHp,
      alive: nextHp > 0,
      damageTaken: member.damageTaken + damage,
      threat: { ...member.threat, [sourceId]: (member.threat[sourceId] ?? 0) + damage },
    };
  });
  return { team: { ...team, members }, killed };
};

const applyHealingToTeam = (team: CombatTeamV2, targetId: string, amount: number) => ({
  ...team,
  members: team.members.map((member) =>
    member.id === targetId
      ? { ...member, hp: Math.min(member.maxHp, member.hp + amount), alive: true }
      : member,
  ),
});

const resolveActor = (
  actor: CombatantV2,
  own: CombatTeamV2,
  enemy: CombatTeamV2,
  actionId: string,
  rng: Rng,
): { own: CombatTeamV2; enemy: CombatTeamV2; actor: CombatantV2; lines: string[] } => {
  if (!actor.alive || actor.hp <= 0) return { own, enemy, actor, lines: [] };

  let currentActor = { ...actor, defending: false };
  const lines: string[] = [];

  const healTarget = currentActor.role === 'healer' ? chooseHealTarget(own.members) : undefined;
  if (healTarget && (currentActor.controller !== 'player' || actionId !== 'basic')) {
    const heal = clamp(currentActor.magic * 0.78 + (currentActor.skill ?? 5) * 3 + rng.int(4, 14), 6, currentActor.maxHp);
    own = applyHealingToTeam(own, healTarget.id, heal);
    currentActor = { ...currentActor, mana: Math.max(0, currentActor.mana - 10), healingDone: currentActor.healingDone + heal, targetId: healTarget.id };
    own = applyMember(own, currentActor);
    lines.push(`${currentActor.name}: лечение ${healTarget.name} +${heal}.`);
    return { own, enemy, actor: currentActor, lines };
  }

  const target = chooseTarget(enemy.members, currentActor, rng);
  if (!target) return { own, enemy, actor: currentActor, lines: [] };
  currentActor.targetId = target.id;

  let raw = currentActor.classId === 'mage' || currentActor.classId === 'priest'
    ? currentActor.magic
    : currentActor.attack;
  let actionName = 'атака';

  if (currentActor.controller === 'player' && actionId !== 'basic' && !actionId.startsWith('consume:')) {
    const skill = getSkillById(actionId);
    if (skill && currentActor.mana >= skill.manaCost) {
      currentActor.mana -= skill.manaCost;
      actionName = skill.name;
      const damageEffect = skill.effects.find((effect) => effect.type === 'DAMAGE');
      const healEffect = skill.effects.find((effect) => effect.type === 'HEAL');
      if (healEffect) {
        const selfHeal = clamp((healEffect.scale === 'magic' ? currentActor.magic : currentActor.attack) * healEffect.value + rng.int(5, 16), 4, currentActor.maxHp);
        own = applyHealingToTeam(own, currentActor.id, selfHeal);
        currentActor = { ...currentActor, healingDone: currentActor.healingDone + selfHeal };
        lines.push(`${currentActor.name}: ${skill.name} +${Math.round(selfHeal)} HP.`);
      }
      if (damageEffect) raw = (damageEffect.scale === 'magic' ? currentActor.magic : currentActor.attack) * damageEffect.value;
    }
  }

  const hitChance = Math.max(0.66, Math.min(0.96, 0.82 + (currentActor.speed - target.speed) * 0.012));
  if (!rng.chance(hitChance)) {
    own = applyMember(own, currentActor);
    lines.push(`${currentActor.name}: ${actionName}, промах по ${target.name}.`);
    return { own, enemy, actor: currentActor, lines };
  }

  const critChance = currentActor.aggression === 'reckless' ? 0.18 : currentActor.aggression === 'aggressive' ? 0.13 : 0.08;
  const crit = rng.chance(critChance);
  const damageMod = aggressionDamageMod(currentActor.aggression);
  const defenseMod = aggressionDefenseMod(target.aggression);
  const damage = Math.max(
    1,
    Math.round((raw * damageMod + rng.int(-3, 5)) * (crit ? 1.45 : 1) - target.defense * defenseMod * 0.48),
  );

  const result = applyDamageToTeam(enemy, target.id, damage, currentActor.id);
  enemy = result.team;
  currentActor = {
    ...currentActor,
    damageDealt: currentActor.damageDealt + damage,
    kills: currentActor.kills + (result.killed ? 1 : 0),
  };
  own = applyMember(own, currentActor);
  lines.push(`${currentActor.name}: ${actionName} по ${target.name} — ${damage}${crit ? ' · крит' : ''}.`);
  if (result.killed) lines.push(`${target.name} выбит.`);
  return { own, enemy, actor: currentActor, lines };
};

const finishIfNeeded = (server: ServerState, combat: CombatState, rng: Rng): { server: ServerState; combat: CombatState } => {
  if (!combat.teamA || !combat.teamB) return { server, combat };
  const aAlive = alive(combat.teamA).length > 0;
  const bAlive = alive(combat.teamB).length > 0;
  if (aAlive && bAlive) return { server, combat: syncLegacyCombat(combat) };

  const playerWon = aAlive && !bAlive;
  if (combat.source === 'guild_war') return playerWon ? finishGuildWarVictoryV2(server, combat, rng) : finishGuildWarDefeatV2(server, combat, rng);
  const enemyNpcIds = combat.enemyNpcIds ?? [];
  const allyNpcIds = combat.allyNpcIds ?? [];
  const enemyAvgRating = enemyNpcIds.length
    ? Math.round(enemyNpcIds.reduce((sum, id) => sum + (server.npcs.find((npc) => npc.id === id)?.arenaRating ?? 1000), 0) / enemyNpcIds.length)
    : 1000;
  const ratingDelta = playerWon
    ? Math.max(16, Math.min(46, 26 + Math.round((enemyAvgRating - server.player.arenaRating) / 45) + rng.int(-3, 6)))
    : -Math.max(10, Math.min(32, 18 + Math.round((server.player.arenaRating - enemyAvgRating) / 70) + rng.int(-2, 5)));
  const xp = playerWon ? Math.max(8, Math.floor(26 + server.player.level * 2.2)) : Math.max(2, Math.floor(8 + server.player.level * 0.8));
  const gold = playerWon ? rng.int(24, 46) + Math.floor(server.player.level * 3) : rng.int(4, 12);

  let player = addPlayerXp(server.player, xp);
  const fullStats = getPlayerStats(player);
  player = {
    ...player,
    arenaRating: Math.max(100, player.arenaRating + ratingDelta),
    gold: player.gold + gold,
    hp: fullStats.hp,
    mana: fullStats.mana,
  };

  const nextServer: ServerState = {
    ...server,
    player,
    npcs: server.npcs.map((npc) => {
      if (allyNpcIds.includes(npc.id)) return { ...npc, arenaRating: Math.max(100, npc.arenaRating + (playerWon ? rng.int(3, 8) : -rng.int(3, 7))) };
      if (enemyNpcIds.includes(npc.id)) return { ...npc, arenaRating: Math.max(100, npc.arenaRating + (playerWon ? -rng.int(8, 18) : rng.int(4, 11))) };
      return npc;
    }),
  };

  const reward: RewardSummary = {
    xp,
    gold,
    items: [],
    lines: [
      playerWon ? 'Арена 3v3: победа.' : 'Арена 3v3: поражение.',
      `Рейтинг: ${ratingDelta > 0 ? '+' : ''}${ratingDelta}.`,
      `Текущий рейтинг: ${player.arenaRating}.`,
      `XP: +${xp}.`,
      `Gold: +${gold}.`,
      'HP и Mana восстановлены.',
    ],
  };

  return {
    server: nextServer,
    combat: syncLegacyCombat({
      ...combat,
      status: playerWon ? 'victory' : 'defeat',
      winnerTeamId: playerWon ? 'teamA' : 'teamB',
      reward: playerWon ? reward : undefined,
      player: { ...combat.player, hp: player.hp, mana: player.mana, level: player.level },
      log: [...combat.log, playerWon ? `Победа 3v3. Рейтинг +${ratingDelta}.` : `Поражение 3v3. Рейтинг ${ratingDelta}.`].slice(-80),
    }),
  };
};

export const resolveArena3v3Round = (server: ServerState, combat: CombatState, actionId: string, rng: Rng): { server: ServerState; combat: CombatState } => {
  if (combat.status !== 'active' || combat.arenaMode !== '3v3' || !combat.teamA || !combat.teamB) {
    return { server, combat };
  }

  let teamA: CombatTeamV2 = {
    ...combat.teamA,
    members: combat.teamA.members.map((member) => ({ ...member, alive: member.hp > 0 })),
  };
  let teamB: CombatTeamV2 = {
    ...combat.teamB,
    members: combat.teamB.members.map((member) => ({ ...member, alive: member.hp > 0 })),
  };

  const lines: string[] = [];
  const order = [...teamA.members, ...teamB.members]
    .filter((member) => member.alive && member.hp > 0)
    .sort((a, b) => b.speed - a.speed || a.name.localeCompare(b.name));

  for (const actorSnapshot of order) {
    if (alive(teamA).length === 0 || alive(teamB).length === 0) break;
    const ownTeam = actorSnapshot.teamId === 'teamA' ? teamA : teamB;
    const enemyTeam = actorSnapshot.teamId === 'teamA' ? teamB : teamA;
    const actor = ownTeam.members.find((member) => member.id === actorSnapshot.id);
    if (!actor || !actor.alive || actor.hp <= 0) continue;

    const resolved = resolveActor(actor, ownTeam, enemyTeam, actor.controller === 'player' ? actionId : 'auto', rng);
    if (actorSnapshot.teamId === 'teamA') {
      teamA = resolved.own;
      teamB = resolved.enemy;
    } else {
      teamB = resolved.own;
      teamA = resolved.enemy;
    }
    lines.push(...resolved.lines);
  }

  const nextCombat = syncLegacyCombat({
    ...combat,
    teamA,
    teamB,
    round: (combat.round ?? combat.turn) + 1,
    turn: combat.turn + 1,
    recentEvents: lines.slice(-8),
    log: [...combat.log, `Раунд ${combat.turn}.`, ...lines].slice(-80),
  });

  return finishIfNeeded(server, nextCombat, rng);
};
