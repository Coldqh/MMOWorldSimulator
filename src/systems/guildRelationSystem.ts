import type { GuildFocus, GuildRelation, ServerState } from '../types/game';
import type { Rng } from '../engine/rng';

const clampRelation = (value: number) => Math.max(-100, Math.min(100, Math.round(value)));
const key = (fromGuildId: string, toGuildId: string) => `${fromGuildId}->${toGuildId}`;

const rangeFor = (from: GuildFocus, to: GuildFocus, rng: Rng): [number, number] => {
  if (from === 'pvp' && to === 'pvp') return rng.chance(0.88) ? [-80, -20] : [0, 20];
  if (from === 'pve' && to === 'pve') return [-30, 70];
  if (from === 'pvp' && to === 'pve') return rng.chance(0.12) ? [-60, -20] : [-10, 50];
  if (from === 'pve' && to === 'pvp') return rng.chance(0.12) ? [-70, -30] : [-20, 40];
  return [-50, 50];
};

export const getGuildRelationValue = (server: ServerState, fromGuildId: string, toGuildId: string) =>
  server.guildRelations?.find((entry) => entry.fromGuildId === fromGuildId && entry.toGuildId === toGuildId)?.value ?? 0;

export const initializeGuildRelations = (server: ServerState, rng: Rng): ServerState => {
  const existing = new Map((server.guildRelations ?? []).map((entry) => [key(entry.fromGuildId, entry.toGuildId), entry]));
  const relations: GuildRelation[] = [];

  for (const from of server.guilds ?? []) {
    for (const to of server.guilds ?? []) {
      if (from.id === to.id) continue;

      const current = existing.get(key(from.id, to.id));
      if (current) {
        relations.push({
          ...current,
          value: clampRelation(current.value),
          lastChangedDay: current.lastChangedDay ?? server.serverDay,
          lastChangedMinute: current.lastChangedMinute ?? server.currentMinute,
        });
        continue;
      }

      const [min, max] = rangeFor(from.guildFocus ?? 'hybrid', to.guildFocus ?? 'hybrid', rng);
      relations.push({
        fromGuildId: from.id,
        toGuildId: to.id,
        value: clampRelation(rng.int(min, max) + (rng.chance(0.08) ? rng.int(-35, 35) : rng.int(-12, 12))),
        lastChangedDay: server.serverDay,
        lastChangedMinute: server.currentMinute,
      });
    }
  }

  return { ...server, guildRelations: relations };
};

export const updateGuildRelations = (server: ServerState, rng: Rng): ServerState => {
  const guildById = new Map((server.guilds ?? []).map((guild) => [guild.id, guild]));

  return {
    ...server,
    guildRelations: (server.guildRelations ?? []).map((entry) => {
      const from = guildById.get(entry.fromGuildId);
      const to = guildById.get(entry.toGuildId);

      let drift = 0;
      if (from?.guildFocus === 'pvp' && to?.guildFocus === 'pvp' && rng.chance(0.35)) drift -= 1;
      if (from?.guildFocus === 'pve' && to?.guildFocus === 'pve' && rng.chance(0.18)) drift += rng.pick([-1, 1]);
      if ((from?.guildFocus === 'hybrid' || to?.guildFocus === 'hybrid') && rng.chance(0.12)) drift += rng.pick([-1, 1]);

      return drift
        ? {
            ...entry,
            value: clampRelation(entry.value + drift),
            lastChangedDay: server.serverDay,
            lastChangedMinute: server.currentMinute,
          }
        : entry;
    }),
  };
};

export const changeGuildRelation = (server: ServerState, fromGuildId: string, toGuildId: string, delta: number): ServerState => ({
  ...server,
  guildRelations: (server.guildRelations ?? []).map((entry) =>
    entry.fromGuildId === fromGuildId && entry.toGuildId === toGuildId
      ? {
          ...entry,
          value: clampRelation(entry.value + delta),
          lastChangedDay: server.serverDay,
          lastChangedMinute: server.currentMinute,
        }
      : entry,
  ),
});
