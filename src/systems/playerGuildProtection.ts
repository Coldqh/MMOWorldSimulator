import type { Guild, Id, ServerState } from '../types/game';

export const isPlayerCreatedGuild = (guild?: Guild): boolean =>
  Boolean(guild && (guild.createdByPlayer || guild.id.startsWith('guild_player_')));

const acceptedApplicantIds = (server: ServerState, guildId: Id) =>
  new Set(
    (server.guildApplications ?? [])
      .filter((app) => app.guildId === guildId && app.status === 'accepted' && app.applicantNpcId)
      .map((app) => app.applicantNpcId!),
  );

export const allowedPlayerGuildMemberIds = (server: ServerState, guild: Guild): Id[] => {
  const accepted = acceptedApplicantIds(server, guild.id);
  const acceptedNpcIds = new Set((server.npcs ?? []).filter((npc) => accepted.has(npc.id)).map((npc) => npc.id));
  const members: Id[] = [];
  if (server.player.guildId === guild.id || guild.memberIds.includes(server.player.id)) members.push(server.player.id);
  guild.memberIds.forEach((id) => {
    if (acceptedNpcIds.has(id)) members.push(id);
  });
  return Array.from(new Set(members));
};

export const sanitizePlayerCreatedGuild = (server: ServerState, guild: Guild): Guild => ({
  ...guild,
  memberIds: allowedPlayerGuildMemberIds(server, guild),
  leaderId: server.player.guildId === guild.id || guild.memberIds.includes(server.player.id) ? server.player.id : undefined,
  deputyId: undefined,
  officerIds: [],
  tier: guild.tier ?? 'low',
  minLevel: guild.minLevel ?? 1,
  createdByPlayer: true,
  founderPlayerId: guild.founderPlayerId ?? server.player.id,
});

export const protectPlayerCreatedGuilds = (server: ServerState): ServerState => {
  const protectedGuildIds = new Set((server.guilds ?? []).filter(isPlayerCreatedGuild).map((guild) => guild.id));
  if (protectedGuildIds.size === 0) return server;

  const sanitizedGuilds = server.guilds.map((guild) => isPlayerCreatedGuild(guild) ? sanitizePlayerCreatedGuild(server, guild) : guild);
  const allowedNpcGuild = new Map<Id, Id>();
  sanitizedGuilds
    .filter(isPlayerCreatedGuild)
    .forEach((guild) => {
      guild.memberIds
        .filter((id) => id !== server.player.id)
        .forEach((id) => allowedNpcGuild.set(id, guild.id));
    });

  return {
    ...server,
    guilds: sanitizedGuilds,
    npcs: server.npcs.map((npc) => {
      if (!npc.guildId || !protectedGuildIds.has(npc.guildId)) return npc;
      return allowedNpcGuild.get(npc.id) === npc.guildId
        ? npc
        : { ...npc, guildId: undefined, playstyle: npc.playstyle ?? 'mixed' };
    }),
  };
};
