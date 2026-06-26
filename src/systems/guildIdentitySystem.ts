import type { Guild, GuildFocus, NpcPlayer, NpcPlaystyle, ServerState } from '../types/game';

export const normalizeGuildFocus = (value?: string, fallback: GuildFocus = 'hybrid'): GuildFocus => {
  const normalized = String(value ?? '').toLowerCase();
  if (normalized === 'pvp' || normalized === 'pve' || normalized === 'hybrid') return normalized;
  if (normalized === 'hardcore') return 'pvp';
  if (normalized === 'casual' || normalized === 'newbie') return 'pve';
  if (normalized === 'trade' || normalized === 'mixed') return 'hybrid';
  return fallback;
};

export const guildFocusToLegacyType = (focus: GuildFocus): Guild['type'] => {
  if (focus === 'pvp') return 'PVP';
  if (focus === 'pve') return 'PVE';
  return 'MIXED';
};

export const guildFocusLabel = (focus?: string) => {
  const normalized = normalizeGuildFocus(focus);
  if (normalized === 'pvp') return 'PvP';
  if (normalized === 'pve') return 'PvE';
  return 'Смешанная';
};

export const normalizeNpcPlaystyle = (value?: string, fallback: NpcPlaystyle = 'solo'): NpcPlaystyle => {
  const normalized = String(value ?? '').toLowerCase();
  if (normalized === 'pvp' || normalized === 'pve' || normalized === 'solo') return normalized;
  if (normalized === 'hybrid') return 'solo';
  if (normalized === 'hardcore') return 'pvp';
  if (normalized === 'raider' || normalized === 'farmer') return 'pve';
  return fallback;
};

export const npcPlaystyleLabel = (value?: string) => {
  const normalized = normalizeNpcPlaystyle(value);
  if (normalized === 'pvp') return 'PvP';
  if (normalized === 'pve') return 'PvE';
  return 'Одиночка';
};

export const roleFocusToPlaystyle = (roleFocus?: string): NpcPlaystyle => {
  if (roleFocus === 'PVP_PLAYER' || roleFocus === 'HARDCORE' || roleFocus === 'LEADER') return 'pvp';
  if (roleFocus === 'RAIDER' || roleFocus === 'PVE_FARMER' || roleFocus === 'GUILD_PLAYER') return 'pve';
  return 'solo';
};

export const playstyleToRoleFocus = (playstyle: NpcPlaystyle): NpcPlayer['roleFocus'] => {
  if (playstyle === 'pvp') return 'PVP_PLAYER';
  if (playstyle === 'pve') return 'PVE_FARMER';
  return 'CASUAL';
};

export const cleanGuildIdentity = (guild: Guild, index = 0): Guild => {
  const fallback: GuildFocus = index % 3 === 0 ? 'pvp' : index % 3 === 1 ? 'pve' : 'hybrid';
  const guildFocus = normalizeGuildFocus(guild.guildFocus ?? guild.type ?? guild.focus, fallback);
  return {
    ...guild,
    guildFocus,
    type: guildFocusToLegacyType(guildFocus),
    focus: guildFocus,
  };
};

export const cleanNpcIdentity = (npc: NpcPlayer, guild?: Guild): NpcPlayer => {
  const guildFocus = normalizeGuildFocus(guild?.guildFocus ?? guild?.type);
  const playstyle: NpcPlaystyle = guild
    ? guildFocus === 'pvp'
      ? 'pvp'
      : guildFocus === 'pve'
        ? 'pve'
        : normalizeNpcPlaystyle(npc.playstyle, roleFocusToPlaystyle(npc.roleFocus))
    : 'solo';

  return {
    ...npc,
    playstyle,
    roleFocus: playstyleToRoleFocus(playstyle),
  };
};

export const normalizeGuildAndNpcIdentities = (server: ServerState): ServerState => {
  const guilds = (server.guilds ?? []).map(cleanGuildIdentity);
  const guildById = new Map(guilds.map((guild) => [guild.id, guild]));
  const npcs = (server.npcs ?? []).map((npc) => cleanNpcIdentity(npc, npc.guildId ? guildById.get(npc.guildId) : undefined));
  const guildsWithCleanMembers = guilds.map((guild) => ({
    ...guild,
    memberIds: (guild.memberIds ?? []).filter((id) => id === server.player.id || npcs.some((npc) => npc.id === id && npc.guildId === guild.id)),
  }));
  return { ...server, guilds: guildsWithCleanMembers, npcs };
};
