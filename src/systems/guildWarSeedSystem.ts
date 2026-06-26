import type { ServerState } from '../types/game';
import { createRng } from '../engine/rng';
import { getGuildRelationValue } from './guildRelationSystem';
import { normalizeGuildFocus } from './guildIdentitySystem';

const hasActiveWar = (server: ServerState, a: string, b: string) =>
  (server.guildWars ?? []).some((war: any) =>
    war.status === 'active' &&
    ((war.attackerGuildId === a && war.defenderGuildId === b) ||
      (war.attackerGuildId === b && war.defenderGuildId === a)),
  );

const makeSeedWar = (server: ServerState, attackerGuildId: string, defenderGuildId: string, index: number) => ({
  id: `seed_war_${server.seed}_${attackerGuildId}_${defenderGuildId}_${index}`,
  attackerGuildId,
  defenderGuildId,
  declaredByGuildId: attackerGuildId,
  status: 'active',
  reason: 'low_relation',
  source: 'seed',
  declaredDay: Math.max(1, server.serverDay - 1),
  declaredMinute: 0,
  startedDay: server.serverDay,
  startedMinute: 0,
  endDay: server.serverDay + 3,
  endMinute: 0,
  durationDays: 3,
  attackerScore: 0,
  defenderScore: 0,
  kills: [],
  topKillers: [],
});

export const seedInitialGuildWarsIfNeeded = (server: ServerState): ServerState => {
  const existingActive = (server.guildWars ?? []).filter((war: any) => war.status === 'active');
  if (existingActive.length > 0) return server;

  const guilds = server.guilds ?? [];
  if (guilds.length < 2) return {
    ...server,
    guildWars: server.guildWars ?? [],
    guildWarVotes: server.guildWarVotes ?? [],
  };

  const rng = createRng((server.seed ?? 1) + 770900 + server.serverDay);
  const candidates: Array<{ a: string; b: string; score: number }> = [];

  for (const a of guilds) {
    for (const b of guilds) {
      if (a.id >= b.id) continue;
      const aFocus = normalizeGuildFocus(a.guildFocus ?? a.type ?? a.focus);
      const bFocus = normalizeGuildFocus(b.guildFocus ?? b.type ?? b.focus);
      const outgoing = getGuildRelationValue(server, a.id, b.id);
      const incoming = getGuildRelationValue(server, b.id, a.id);
      const average = Math.round((outgoing + incoming) / 2);
      let score = -average;
      if (aFocus === 'pvp' && bFocus === 'pvp') score += 45;
      if (aFocus === 'pvp' || bFocus === 'pvp') score += 15;
      if (aFocus === 'pve' && bFocus === 'pve') score -= 25;
      if (score >= 35 || average <= -35) candidates.push({ a: a.id, b: b.id, score });
    }
  }

  const sorted = candidates.sort((left, right) => right.score - left.score || left.a.localeCompare(right.a));
  const targetCount = Math.max(1, Math.min(3, Math.floor(guilds.length / 8) || 1));
  const selected: Array<{ a: string; b: string }> = [];
  const used = new Set<string>();

  for (const candidate of sorted) {
    if (selected.length >= targetCount) break;
    if (used.has(candidate.a) || used.has(candidate.b)) continue;
    if (hasActiveWar(server, candidate.a, candidate.b)) continue;
    selected.push(candidate);
    used.add(candidate.a);
    used.add(candidate.b);
  }

  if (selected.length === 0) {
    const pvpGuilds = guilds.filter((guild) => normalizeGuildFocus(guild.guildFocus ?? guild.type ?? guild.focus) === 'pvp');
    const pool = pvpGuilds.length >= 2 ? pvpGuilds : guilds;
    const attacker = rng.pick(pool);
    const defender = rng.pick(pool.filter((guild) => guild.id !== attacker.id));
    if (attacker && defender) selected.push({ a: attacker.id, b: defender.id });
  }

  return {
    ...server,
    guildWars: [
      ...(server.guildWars ?? []),
      ...selected.map((entry, index) => makeSeedWar(server, entry.a, entry.b, index) as any),
    ],
    guildWarVotes: server.guildWarVotes ?? [],
  };
};
