import type { GuildWar, GuildWarKillRecord, GuildWarTopKiller, GuildWarVote, Id, NpcPlayer, ServerState } from '../types/game';
import type { Rng } from '../engine/rng';
import { uid } from '../engine/rng';
import { addNews } from '../engine/news';
import { initializeGuildRelations, getGuildRelationValue, updateGuildRelations, changeGuildRelation, createGuildRelationValueMap, getGuildRelationValueFromMap } from './guildRelationSystem';
import { rebalanceGuildRoster } from './guildRosterSystem';
import { assignInitialNpcLocations, moveNpcPlayers, handleWarNpcEncountersAfterNpcMovement, canPlayerAttackWarNpc } from './npcLocationSystem';
import { growNpcAfterDuel, makeKillRecord, resolveNpcDuel, resolvePlayerNpcDuel } from './pvpSimulationSystem';
import { normalizeGuildAndNpcIdentities } from './guildIdentitySystem';

const clampDuration = (days: number) => Math.max(7, Math.min(30, Math.round(days)));
const totalMinute = (day: number, minute: number) => (day - 1) * 1440 + minute;
const reached = (server: ServerState, day: number, minute: number) => totalMinute(server.serverDay, server.currentMinute) >= totalMinute(day, minute);
export type GuildWarTickMode = 'interactive' | 'summary';

const buildActiveWarCountMap = (server: ServerState) => {
  const map = new Map<Id, number>();
  (server.guildWars ?? []).forEach((war) => {
    if (war.status !== 'active' && war.status !== 'scheduled' && war.status !== 'pending_votes') return;
    map.set(war.attackerGuildId, (map.get(war.attackerGuildId) ?? 0) + 1);
    map.set(war.defenderGuildId, (map.get(war.defenderGuildId) ?? 0) + 1);
  });
  return map;
};

const activeCount = (server: ServerState, guildId: Id) => (server.guildWars ?? []).filter((war) => (war.status === 'active' || war.status === 'scheduled' || war.status === 'pending_votes') && (war.attackerGuildId === guildId || war.defenderGuildId === guildId)).length;
export const getGuildActiveWars = (server: ServerState, guildId: Id) => (server.guildWars ?? []).filter((war) => war.status === 'active' && (war.attackerGuildId === guildId || war.defenderGuildId === guildId));
export const getGuildWarEnemies = (server: ServerState, guildId: Id) => getGuildActiveWars(server, guildId).map((war) => war.attackerGuildId === guildId ? war.defenderGuildId : war.attackerGuildId);
export const areGuildsAtWar = (server: ServerState, guildAId: Id, guildBId: Id) => (server.guildWars ?? []).some((war) => war.status === 'active' && ((war.attackerGuildId === guildAId && war.defenderGuildId === guildBId) || (war.attackerGuildId === guildBId && war.defenderGuildId === guildAId)));

const startScheduledGuildWars = (server: ServerState): ServerState => ({
  ...server,
  guildWars: (server.guildWars ?? []).map((war) =>
    war.status === 'scheduled' && reached(server, war.startsDay ?? war.declaredDay, war.startsMinute ?? war.declaredMinute)
      ? { ...war, status: 'active' as const, lastSimulatedDay: server.serverDay, lastSimulatedMinute: server.currentMinute }
      : war,
  ),
});

const voteYesChance = (server: ServerState, vote: GuildWarVote, npcId: Id) => {
  const npc = server.npcs.find((entry) => entry.id === npcId);
  const guild = server.guilds.find((entry) => entry.id === vote.guildId);
  const target = server.guilds.find((entry) => entry.id === vote.targetGuildId);
  const relation = getGuildRelationValue(server, vote.guildId, vote.targetGuildId);
  let chance = 0.42 + Math.max(-0.35, Math.min(0.35, -relation / 180));
  if (guild?.guildFocus === 'pvp') chance += 0.22;
  if (guild?.guildFocus === 'pve') chance -= 0.18;
  if (target?.guildFocus === 'pve' && guild?.guildFocus === 'pvp') chance -= 0.08;
  if (npc?.playstyle === 'pvp') chance += 0.14;
  if (npc?.playstyle === 'pve') chance -= 0.12;
  if (activeCount(server, vote.guildId) >= 2) chance -= 0.45;
  return Math.max(0.05, Math.min(0.95, chance));
};

const processNpcVotes = (server: ServerState, vote: GuildWarVote, rng: Rng): GuildWarVote => {
  const guild = server.guilds.find((entry) => entry.id === vote.guildId);
  if (!guild || vote.status !== 'active') return vote;
  const yes = new Set(vote.yesNpcIds ?? []);
  const no = new Set(vote.noNpcIds ?? []);
  guild.memberIds.filter((id) => id !== server.player.id).slice(0, 120).forEach((id) => {
    if (yes.has(id) || no.has(id)) return;
    if (rng.chance(voteYesChance(server, vote, id))) yes.add(id); else no.add(id);
  });
  return { ...vote, yesNpcIds: [...yes], noNpcIds: [...no] };
};

const createVote = (server: ServerState, rng: Rng, kind: GuildWarVote['kind'], proposerGuildId: Id, targetGuildId: Id, guildId: Id, duration: number, warId?: Id): GuildWarVote => ({
  id: uid(`guild_war_vote_${kind}`, rng),
  kind,
  proposerGuildId,
  targetGuildId,
  guildId,
  warId,
  proposedDurationDays: clampDuration(duration),
  status: 'active',
  createdDay: server.serverDay,
  createdMinute: server.currentMinute,
  endsDay: server.serverDay + 1,
  endsMinute: server.currentMinute,
  yesNpcIds: [],
  noNpcIds: [],
});

export const createGuildWarDeclareVote = (server: ServerState, proposerGuildId: Id, targetGuildId: Id, rng: Rng, duration = 7): ServerState => {
  if (proposerGuildId === targetGuildId) return server;
  if (activeCount(server, proposerGuildId) >= 2 || activeCount(server, targetGuildId) >= 2) return server;
  if ((server.guildWarVotes ?? []).some((vote) => vote.status === 'active' && vote.proposerGuildId === proposerGuildId && vote.targetGuildId === targetGuildId)) return server;
  const vote = createVote(server, rng, 'declare', proposerGuildId, targetGuildId, proposerGuildId, duration);
  return { ...server, guildWarVotes: [...(server.guildWarVotes ?? []), vote] };
};

export const castGuildWarVote = (server: ServerState, voteId: Id, playerVote: 'yes' | 'no'): ServerState => ({
  ...server,
  guildWarVotes: (server.guildWarVotes ?? []).map((vote) => vote.id === voteId && vote.status === 'active' ? { ...vote, playerVote } : vote),
});

const startWarFromAcceptVote = (server: ServerState, vote: GuildWarVote, rng: Rng): ServerState => {
  const war: GuildWar = {
    id: uid('guild_war', rng),
    attackerGuildId: vote.proposerGuildId,
    defenderGuildId: vote.targetGuildId,
    status: 'active',
    declaredDay: server.serverDay,
    declaredMinute: server.currentMinute,
    startsDay: server.serverDay,
    startsMinute: server.currentMinute,
    endsDay: server.serverDay + clampDuration(vote.proposedDurationDays),
    endsMinute: server.currentMinute,
    durationDays: clampDuration(vote.proposedDurationDays),
    extensionCount: 0,
    attackerKills: 0,
    defenderKills: 0,
    killRecords: [],
    attackerTopKillers: [],
    defenderTopKillers: [],
    lastSimulatedDay: server.serverDay,
    lastSimulatedMinute: server.currentMinute,
  };
  return addNews({ ...server, guildWars: [...(server.guildWars ?? []), war] }, rng, 'guild', 'Война объявлена.', true);
};

export const resolveGuildWarVotes = (server: ServerState, rng: Rng): ServerState => {
  let next = server;
  let votes = (server.guildWarVotes ?? []).map((vote) => processNpcVotes(next, vote, rng));
  const additions: GuildWarVote[] = [];
  votes = votes.map((vote) => {
    if (vote.status !== 'active' || !reached(next, vote.endsDay, vote.endsMinute)) return vote;
    const yes = vote.yesNpcIds.length + (vote.playerVote === 'yes' ? 1 : 0);
    const no = vote.noNpcIds.length + (vote.playerVote === 'no' ? 1 : 0);
    const passed = yes > no;
    if (!passed) {
      next = changeGuildRelation(next, vote.proposerGuildId, vote.targetGuildId, -6);
      return { ...vote, status: 'failed', resultText: 'Голосование провалено.' };
    }
    if (vote.kind === 'declare') {
      additions.push(createVote(next, rng, 'accept', vote.proposerGuildId, vote.targetGuildId, vote.targetGuildId, vote.proposedDurationDays));
    }
    if (vote.kind === 'accept') {
      next = startWarFromAcceptVote(next, vote, rng);
    }
    if (vote.kind === 'extend' && vote.warId) {
      const paired = votes.find((entry) => entry.id !== vote.id && entry.warId === vote.warId && entry.kind === 'extend' && entry.status === 'passed');
      if (paired) {
        next = { ...next, guildWars: (next.guildWars ?? []).map((war) => war.id === vote.warId ? { ...war, endsDay: Math.min(war.endsDay + vote.proposedDurationDays, war.declaredDay + 60), extensionCount: war.extensionCount + 1 } : war) };
      }
    }
    return { ...vote, status: 'passed', resultText: 'Голосование принято.' };
  });
  return { ...next, guildWarVotes: [...votes, ...additions] };
};

export const maybeCreateGuildWarVotes = (server: ServerState, rng: Rng): ServerState => {
  let next = server;
  if (!rng.chance(0.08)) return next;

  const relationMap = createGuildRelationValueMap(server);
  const activeCounts = buildActiveWarCountMap(next);
  const candidates = [...server.guilds].sort((a, b) => (a.id + server.serverDay).localeCompare(b.id + server.serverDay));

  for (const guild of candidates) {
    if ((activeCounts.get(guild.id) ?? 0) >= 2) continue;

    const aggression = guild.guildFocus === 'pvp' ? 0.8 : guild.guildFocus === 'pve' ? 0.2 : 0.5;
    if (!rng.chance(aggression)) continue;

    let target: typeof guild | undefined;
    let targetRelation = Number.POSITIVE_INFINITY;

    for (const candidateTarget of server.guilds) {
      if (candidateTarget.id === guild.id) continue;
      if ((candidateTarget.tier ?? 'low') !== (guild.tier ?? 'low')) continue;
      if ((activeCounts.get(candidateTarget.id) ?? 0) >= 2) continue;

      const relation = getGuildRelationValueFromMap(relationMap, guild.id, candidateTarget.id);
      if (relation < targetRelation || (relation === targetRelation && candidateTarget.id.localeCompare(target?.id ?? '') < 0)) {
        target = candidateTarget;
        targetRelation = relation;
      }
    }

    if (!target) continue;
    if (targetRelation > (guild.guildFocus === 'pvp' ? 10 : -25)) continue;

    next = createGuildWarDeclareVote(next, guild.id, target.id, rng, rng.int(7, 14));
    break;
  }

  return next;
};



const topKillers = (records: GuildWarKillRecord[], guildId: Id): GuildWarTopKiller[] => {
  const counts = new Map<Id, number>();
  records.filter((record) => record.killerGuildId === guildId).forEach((record) => counts.set(record.killerId, (counts.get(record.killerId) ?? 0) + 1));
  return [...counts.entries()].map(([characterId, kills]) => ({ characterId, guildId, kills })).sort((a, b) => b.kills - a.kills).slice(0, 5);
};

export const recordGuildWarKill = (server: ServerState, warId: Id, record: GuildWarKillRecord): ServerState => ({
  ...server,
  guildWars: (server.guildWars ?? []).map((war) => {
    if (war.id !== warId) return war;
    const killRecords = [...war.killRecords, record].slice(-400);
    const attackerKills = war.attackerKills + (record.killerGuildId === war.attackerGuildId ? 1 : 0);
    const defenderKills = war.defenderKills + (record.killerGuildId === war.defenderGuildId ? 1 : 0);
    return { ...war, attackerKills, defenderKills, killRecords, attackerTopKillers: topKillers(killRecords, war.attackerGuildId), defenderTopKillers: topKillers(killRecords, war.defenderGuildId), lastSimulatedDay: server.serverDay, lastSimulatedMinute: server.currentMinute };
  }),
});

export const simulateActiveGuildWars = (server: ServerState, rng: Rng, maxDuelsPerWar = 1): ServerState => {
  let next = server;
  const npcsByGuildId = new Map<Id, NpcPlayer[]>();
  (server.npcs ?? []).forEach((npc) => {
    if (!npc.guildId) return;
    const bucket = npcsByGuildId.get(npc.guildId) ?? [];
    bucket.push(npc);
    npcsByGuildId.set(npc.guildId, bucket);
  });

  const skillWins = new Map<Id, number>();
  const skillLosses = new Map<Id, number>();
  let anyDuel = false;

  const updatedWars = (next.guildWars ?? []).map((war) => {
    if (war.status !== 'active') return war;

    const last = totalMinute(war.lastSimulatedDay ?? war.declaredDay, war.lastSimulatedMinute ?? war.declaredMinute);
    const now = Math.min(totalMinute(next.serverDay, next.currentMinute), totalMinute(war.endsDay, war.endsMinute));
    const dueDuels = Math.max(0, Math.min(maxDuelsPerWar, Math.floor((now - last) / 30)));
    if (dueDuels <= 0) return war;

    const attackers = npcsByGuildId.get(war.attackerGuildId) ?? [];
    const defenders = npcsByGuildId.get(war.defenderGuildId) ?? [];
    const simulatedAtDay = Math.floor(now / 1440) + 1;
    const simulatedAtMinute = now % 1440;

    if (attackers.length === 0 || defenders.length === 0) {
      return { ...war, lastSimulatedDay: simulatedAtDay, lastSimulatedMinute: simulatedAtMinute };
    }

    const guild = next.guilds.find((entry) => entry.id === war.attackerGuildId);
    const records: GuildWarKillRecord[] = [];
    let attackerKills = 0;
    let defenderKills = 0;

    for (let i = 0; i < dueDuels; i += 1) {
      const fighterA = rng.pick(attackers);
      const fighterB = rng.pick(defenders);
      const duel = resolveNpcDuel(fighterA, fighterB, guild?.tier ?? 'low', rng);
      const killerGuildId = duel.winner.guildId ?? war.attackerGuildId;
      const victimGuildId = duel.loser.guildId ?? war.defenderGuildId;
      if (killerGuildId === war.attackerGuildId) attackerKills += 1;
      if (killerGuildId === war.defenderGuildId) defenderKills += 1;
      skillWins.set(duel.winner.id, (skillWins.get(duel.winner.id) ?? 0) + 1);
      skillLosses.set(duel.loser.id, (skillLosses.get(duel.loser.id) ?? 0) + 1);
      records.push({
        id: `war_kill_${war.id}_${simulatedAtDay}_${simulatedAtMinute}_${i}_${duel.winner.id}_${duel.loser.id}_${rng.int(1, 999999)}`,
        day: simulatedAtDay,
        minute: simulatedAtMinute,
        killerId: duel.winner.id,
        killerGuildId,
        victimId: duel.loser.id,
        victimGuildId,
        locationId: next.location.spotId ?? next.location.zoneId,
        source: 'simulated',
      });
    }

    anyDuel = true;
    const killRecords = [...war.killRecords, ...records].slice(-400);
    return {
      ...war,
      attackerKills: war.attackerKills + attackerKills,
      defenderKills: war.defenderKills + defenderKills,
      killRecords,
      attackerTopKillers: topKillers(killRecords, war.attackerGuildId),
      defenderTopKillers: topKillers(killRecords, war.defenderGuildId),
      lastSimulatedDay: simulatedAtDay,
      lastSimulatedMinute: simulatedAtMinute,
    };
  });

  if (anyDuel) {
    next = {
      ...next,
      guildWars: updatedWars,
      npcs: next.npcs.map((npc) => {
        let updated = npc;
        const wins = skillWins.get(npc.id) ?? 0;
        const losses = skillLosses.get(npc.id) ?? 0;
        for (let i = 0; i < wins; i += 1) updated = growNpcAfterDuel(updated, true, rng);
        for (let i = 0; i < losses; i += 1) updated = growNpcAfterDuel(updated, false, rng);
        return updated;
      }),
    };
  } else {
    next = { ...next, guildWars: updatedWars };
  }

  return next;
};

const addTopKillerKills = (
  list: GuildWarTopKiller[] = [],
  characterId: Id,
  guildId: Id,
  kills: number,
): GuildWarTopKiller[] => {
  if (kills <= 0) return list;
  const map = new Map(list.map((entry) => [entry.characterId, { ...entry }]));
  const current = map.get(characterId) ?? { characterId, guildId, kills: 0 };
  current.kills += kills;
  map.set(characterId, current);
  return [...map.values()]
    .sort((a, b) => b.kills - a.kills || a.characterId.localeCompare(b.characterId))
    .slice(0, 5);
};

export const simulateActiveGuildWarsSummary = (server: ServerState, rng: Rng, maxDuelsPerWar = 1): ServerState => {
  let next = server;
  const npcsByGuildId = new Map<Id, NpcPlayer[]>();
  (server.npcs ?? []).forEach((npc) => {
    if (!npc.guildId) return;
    const bucket = npcsByGuildId.get(npc.guildId) ?? [];
    bucket.push(npc);
    npcsByGuildId.set(npc.guildId, bucket);
  });

  const guildById = new Map((server.guilds ?? []).map((guild) => [guild.id, guild]));
  const skillWinners = new Set<Id>();
  const skillLosers = new Set<Id>();
  let anyDuel = false;

  const updatedWars = (next.guildWars ?? []).map((war) => {
    if (war.status !== 'active') return war;

    const last = totalMinute(war.lastSimulatedDay ?? war.declaredDay, war.lastSimulatedMinute ?? war.declaredMinute);
    const now = Math.min(totalMinute(next.serverDay, next.currentMinute), totalMinute(war.endsDay, war.endsMinute));
    const dueDuels = Math.max(0, Math.min(maxDuelsPerWar, Math.floor((now - last) / 30)));
    if (dueDuels <= 0) return war;

    const attackers = npcsByGuildId.get(war.attackerGuildId) ?? [];
    const defenders = npcsByGuildId.get(war.defenderGuildId) ?? [];
    const simulatedAtDay = Math.floor(now / 1440) + 1;
    const simulatedAtMinute = now % 1440;

    if (attackers.length === 0 || defenders.length === 0) {
      return { ...war, lastSimulatedDay: simulatedAtDay, lastSimulatedMinute: simulatedAtMinute };
    }

    const attackerGuild = guildById.get(war.attackerGuildId);
    const records: GuildWarKillRecord[] = [];
    let attackerKills = 0;
    let defenderKills = 0;
    let attackerTopKillers = war.attackerTopKillers ?? [];
    let defenderTopKillers = war.defenderTopKillers ?? [];

    const sampleDuels = Math.max(1, Math.min(12, dueDuels));
    const baseKills = Math.floor(dueDuels / sampleDuels);
    const extraKills = dueDuels % sampleDuels;

    for (let i = 0; i < sampleDuels; i += 1) {
      const killAmount = baseKills + (i < extraKills ? 1 : 0);
      if (killAmount <= 0) continue;

      const fighterA = rng.pick(attackers);
      const fighterB = rng.pick(defenders);
      const duel = resolveNpcDuel(fighterA, fighterB, attackerGuild?.tier ?? 'low', rng);
      const killerGuildId = duel.winner.guildId ?? war.attackerGuildId;
      const victimGuildId = duel.loser.guildId ?? war.defenderGuildId;

      if (killerGuildId === war.attackerGuildId) {
        attackerKills += killAmount;
        attackerTopKillers = addTopKillerKills(attackerTopKillers, duel.winner.id, killerGuildId, killAmount);
      }
      if (killerGuildId === war.defenderGuildId) {
        defenderKills += killAmount;
        defenderTopKillers = addTopKillerKills(defenderTopKillers, duel.winner.id, killerGuildId, killAmount);
      }

      skillWinners.add(duel.winner.id);
      skillLosers.add(duel.loser.id);

      records.push({
        id: `war_kill_summary_${war.id}_${simulatedAtDay}_${simulatedAtMinute}_${i}_${duel.winner.id}_${duel.loser.id}_${killAmount}_${rng.int(1, 999999)}`,
        day: simulatedAtDay,
        minute: simulatedAtMinute,
        killerId: duel.winner.id,
        killerGuildId,
        victimId: duel.loser.id,
        victimGuildId,
        locationId: next.location.spotId ?? next.location.zoneId,
        source: 'simulated',
      });
    }

    anyDuel = true;
    return {
      ...war,
      attackerKills: war.attackerKills + attackerKills,
      defenderKills: war.defenderKills + defenderKills,
      killRecords: [...war.killRecords, ...records].slice(-250),
      attackerTopKillers,
      defenderTopKillers,
      lastSimulatedDay: simulatedAtDay,
      lastSimulatedMinute: simulatedAtMinute,
    };
  });

  if (!anyDuel) return { ...next, guildWars: updatedWars };

  const touched = new Set<Id>([...skillWinners, ...skillLosers]);
  return {
    ...next,
    guildWars: updatedWars,
    npcs: next.npcs.map((npc) => {
      if (!touched.has(npc.id)) return npc;
      let updated = npc;
      if (skillWinners.has(npc.id)) updated = growNpcAfterDuel(updated, true, rng);
      if (skillLosers.has(npc.id)) updated = growNpcAfterDuel(updated, false, rng);
      return updated;
    }),
  };
};

export const finishExpiredGuildWars = (server: ServerState, rng: Rng): ServerState => {
  const guildById = new Map((server.guilds ?? []).map((guild) => [guild.id, guild]));
  const finishedWars: GuildWar[] = [];

  const wars = (server.guildWars ?? []).map((war) => {
    if ((war.status === 'active' || war.status === 'scheduled') && reached(server, war.endsDay, war.endsMinute)) {
      const finished = { ...war, status: 'finished' as const };
      finishedWars.push(finished);
      return finished;
    }

    return war;
  });

  if (finishedWars.length === 0) return server;

  let next: ServerState = { ...server, guildWars: wars, notifications: [...(server.notifications ?? [])] };

  finishedWars.forEach((war, index) => {
    const attacker = guildById.get(war.attackerGuildId);
    const defender = guildById.get(war.defenderGuildId);
    const attackerName = attacker?.name ?? war.attackerGuildId;
    const defenderName = defender?.name ?? war.defenderGuildId;
    const winner = war.attackerKills === war.defenderKills
      ? 'ничья'
      : war.attackerKills > war.defenderKills
        ? attackerName
        : defenderName;
    const score = String(war.attackerKills) + '–' + String(war.defenderKills);
    const title = 'Война завершена';
    const text = attackerName + ' vs ' + defenderName;

    next = {
      ...next,
      notifications: [
        ...(next.notifications ?? []),
        {
          id: `guild_war_finished_${war.id}_${next.serverDay}_${next.currentMinute}_${index}`,
          type: 'guild',
          title,
          text,
          lines: [
            'Победитель: ' + winner,
            'Счёт: ' + score,
            'Длительность: ' + String(war.durationDays ?? Math.max(1, war.endsDay - war.declaredDay)) + ' дн.',
          ],
        },
      ],
    };

    next = addNews(next, rng, 'guild', `${title}: ${attackerName} vs ${defenderName}. Счёт ${score}. Победитель: ${winner}.`, false);
  });

  return next;
};

export const maybeCreateWarExtensionVotes = (server: ServerState, rng: Rng): ServerState => {
  if (!rng.chance(0.015)) return server;
  const war = (server.guildWars ?? []).find((entry) => entry.status === 'active' && entry.extensionCount < 2 && entry.endsDay - server.serverDay <= 2);
  if (!war) return server;
  const voteA = createVote(server, rng, 'extend', war.attackerGuildId, war.defenderGuildId, war.attackerGuildId, 7, war.id);
  const voteB = createVote(server, rng, 'extend', war.attackerGuildId, war.defenderGuildId, war.defenderGuildId, 7, war.id);
  return { ...server, guildWarVotes: [...(server.guildWarVotes ?? []), voteA, voteB] };
};

export const resolveGuildWarExtensionVotes = resolveGuildWarVotes;

export const attackWarEnemyNpc = (server: ServerState, npcId: Id, rng: Rng): ServerState => {
  if (!canPlayerAttackWarNpc(server, npcId) || !server.player.guildId) return server;
  const npc = server.npcs.find((entry) => entry.id === npcId);
  if (!npc?.guildId) return server;
  const war = (server.guildWars ?? []).find((entry) => entry.status === 'active' && ((entry.attackerGuildId === server.player.guildId && entry.defenderGuildId === npc.guildId) || (entry.defenderGuildId === server.player.guildId && entry.attackerGuildId === npc.guildId)));
  if (!war) return server;
  const duel = resolvePlayerNpcDuel(server, npc, rng);
  const record = duel.playerWon
    ? makeKillRecord(server, server.player.id, server.player.guildId, npc.id, npc.guildId, 'player_attack')
    : makeKillRecord(server, npc.id, npc.guildId, server.player.id, server.player.guildId, 'npc_attack_player');
  let next = { ...server, npcs: server.npcs.map((entry) => entry.id === npc.id ? growNpcAfterDuel(entry, !duel.playerWon, rng) : entry) };
  next = recordGuildWarKill(next, war.id, record);
  return { ...next, notifications: [...(next.notifications ?? []), { id: `war_player_attack_${server.serverDay}_${server.currentMinute}_${npcId}`, type: 'guild', title: duel.playerWon ? 'Победа в войне' : 'Поражение в войне', text: npc.name, lines: [`Счёт обновлён.`, `Шанс победы: ${Math.round(duel.playerChance * 100)}%`] }] };
};

export const initializeGuildWarsCore = (server: ServerState, rng: Rng): ServerState => {
  let next = normalizeGuildAndNpcIdentities(rebalanceGuildRoster(server, rng));
  next = initializeGuildRelations(next, rng);
  next = assignInitialNpcLocations(next, rng);
  return { ...next, guildWars: next.guildWars ?? [], guildWarVotes: next.guildWarVotes ?? [] };
};

export const normalizeGuildWarsCore = (server: ServerState, rng: Rng): ServerState => {
  let next = normalizeGuildAndNpcIdentities({ ...server, guildRelations: server.guildRelations ?? [], guildWars: server.guildWars ?? [], guildWarVotes: server.guildWarVotes ?? [] });
  next = rebalanceGuildRoster(next, rng);
  next = initializeGuildRelations(next, rng);
  next = assignInitialNpcLocations(next, rng);
  return next;
};

export const tickGuildWars = (
  server: ServerState,
  rng: Rng,
  minutes = 0,
  mode: GuildWarTickMode = 'interactive',
): ServerState => {
  let next = mode === 'summary' ? server : moveNpcPlayers(server, rng, minutes);
  next = startScheduledGuildWars(next);

  if (mode !== 'summary') {
    next = handleWarNpcEncountersAfterNpcMovement(next, rng);
  }

  if (minutes >= 30 || next.currentMinute % 30 === 0) {
    const rawDuelTicks = Math.floor(Math.max(0, minutes) / 30);
    const duelTicks = Math.max(1, rawDuelTicks);
    next = updateGuildRelations(next, rng);
    next = maybeCreateGuildWarVotes(next, rng);
    next = resolveGuildWarVotes(next, rng);
    next = maybeCreateWarExtensionVotes(next, rng);
    next = mode === 'summary'
      ? simulateActiveGuildWarsSummary(next, rng, duelTicks)
      : simulateActiveGuildWars(next, rng, duelTicks);
    next = finishExpiredGuildWars(next, rng);
  }

  return next;
};

