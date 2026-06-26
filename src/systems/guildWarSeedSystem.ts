import type { GuildWar, ServerState } from '../types/game';
import { createRng } from '../engine/rng';
import { getGuildRelationValue } from './guildRelationSystem';
import { normalizeGuildFocus } from './guildIdentitySystem';

const hasActiveWar = (server: ServerState, a: string, b: string) =>
  (server.guildWars ?? []).some((war) =>
    war.status === 'active' &&
    ((war.attackerGuildId === a && war.defenderGuildId === b) ||
      (war.attackerGuildId === b && war.defenderGuildId === a)),
  );

const normalizeSeededWar = (server: ServerState, war: Partial<GuildWar> & Record<string, any>): GuildWar | null => {
  const attackerGuildId = war.attackerGuildId;
  const defenderGuildId = war.defenderGuildId;

  if (!attackerGuildId || !defenderGuildId) return null;

  return {
    id: war.id ?? `seed_war_${server.seed}_${attackerGuildId}_${defenderGuildId}`,
    attackerGuildId,
    defenderGuildId,
    status: war.status ?? 'active',
    declaredDay: war.declaredDay ?? Math.max(1, server.serverDay - 1),
    declaredMinute: war.declaredMinute ?? 0,
    startsDay: war.startsDay ?? war.startedDay ?? server.serverDay,
    startsMinute: war.startsMinute ?? war.startedMinute ?? 0,
    endsDay: war.endsDay ?? war.endDay ?? server.serverDay + 3,
    endsMinute: war.endsMinute ?? war.endMinute ?? 0,
    durationDays: war.durationDays ?? 3,
    extensionCount: war.extensionCount ?? 0,
    attackerKills: Number.isFinite(war.attackerKills) ? war.attackerKills : (war.attackerScore ?? 0),
    defenderKills: Number.isFinite(war.defenderKills) ? war.defenderKills : (war.defenderScore ?? 0),
    killRecords: war.killRecords ?? war.kills ?? [],
    attackerTopKillers: war.attackerTopKillers ?? [],
    defenderTopKillers: war.defenderTopKillers ?? [],
    lastSimulatedDay: war.lastSimulatedDay ?? server.serverDay,
    lastSimulatedMinute: war.lastSimulatedMinute ?? server.currentMinute,
  };
};

const makeSeedWar = (server: ServerState, attackerGuildId: string, defenderGuildId: string, index: number): GuildWar => ({
  id: `seed_war_${server.seed}_${attackerGuildId}_${defenderGuildId}_${index}`,
  attackerGuildId,
  defenderGuildId,
  status: 'active',
  declaredDay: Math.max(1, server.serverDay - 1),
  declaredMinute: 0,
  startsDay: server.serverDay,
  startsMinute: 0,
  endsDay: server.serverDay + 3,
  endsMinute: 0,
  durationDays: 3,
  extensionCount: 0,
  attackerKills: 0,
  defenderKills: 0,
  killRecords: [],
  attackerTopKillers: [],
  defenderTopKillers: [],
  lastSimulatedDay: server.serverDay,
  lastSimulatedMinute: server.currentMinute,
});

export const normalizeGuildWarScoreFields = (server: ServerState): ServerState => ({
  ...server,
  guildWars: (server.guildWars ?? [])
    .map((war: any) => normalizeSeededWar(server, war))
    .filter((war): war is GuildWar => Boolean(war)),
  guildWarVotes: server.guildWarVotes ?? [],
});

export const seedInitialGuildWarsIfNeeded = (server: ServerState): ServerState => {
  const normalized = normalizeGuildWarScoreFields(server);
  const existingActive = (normalized.guildWars ?? []).filter((war) => war.status === 'active');
  if (existingActive.length > 0) return normalized;

  const guilds = normalized.guilds ?? [];
  if (guilds.length < 2) return normalized;

  const rng = createRng((normalized.seed ?? 1) + 770900 + normalized.serverDay);
  const candidates: Array<{ a: string; b: string; score: number }> = [];

  for (const a of guilds) {
    for (const b of guilds) {
      if (a.id >= b.id) continue;
      const aFocus = normalizeGuildFocus(a.guildFocus ?? a.type ?? a.focus);
      const bFocus = normalizeGuildFocus(b.guildFocus ?? b.type ?? b.focus);
      const outgoing = getGuildRelationValue(normalized, a.id, b.id);
      const incoming = getGuildRelationValue(normalized, b.id, a.id);
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
    if (hasActiveWar(normalized, candidate.a, candidate.b)) continue;
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
    ...normalized,
    guildWars: [
      ...(normalized.guildWars ?? []),
      ...selected.map((entry, index) => makeSeedWar(normalized, entry.a, entry.b, index)),
    ],
    guildWarVotes: normalized.guildWarVotes ?? [],
  };
};
