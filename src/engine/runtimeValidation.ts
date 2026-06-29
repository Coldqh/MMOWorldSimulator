import type { ServerState } from '../types/game';

export interface RuntimeIssue {
  severity: 'critical' | 'warning';
  code: string;
  message: string;
}
import { SAVE_VERSION } from './saveLoad';
import { getMarketDiagnostics, repairMarketIfBroken } from '../systems/marketSystem';
import { createRng } from './rng';
import { normalizeGuildWarsCore } from '../systems/guildWarSystem';
import { allowedPlayerGuildMemberIds, isPlayerCreatedGuild, protectPlayerCreatedGuilds } from '../systems/playerGuildProtection';
import { shouldAutoResolveSiege } from '../systems/siegeSystem';

export const validateServerRuntime = (server: ServerState): RuntimeIssue[] => {
  const issues: RuntimeIssue[] = [];

  if (server.version !== SAVE_VERSION) issues.push({ severity: 'critical', code: 'version_mismatch', message: 'Save version is not v0.7.0' });
  if (!server.player || server.player.level < 1) issues.push({ severity: 'critical', code: 'invalid_player', message: 'Player is missing or invalid' });
  if (!Array.isArray(server.npcs) || server.npcs.length < 100) issues.push({ severity: 'warning', code: 'npc_roster_low', message: 'NPC roster is smaller than expected' });
  if (!Array.isArray(server.guilds)) issues.push({ severity: 'warning', code: 'guilds_invalid', message: 'Guild list is invalid' });
  if (!Array.isArray(server.partyFinderListings)) issues.push({ severity: 'warning', code: 'party_finder_invalid', message: 'Party Finder list is invalid' });
  if (!server.questStates || typeof server.questStates !== 'object') issues.push({ severity: 'warning', code: 'quest_states_invalid', message: 'Quest states are invalid' });
  if (!Array.isArray(server.contracts)) issues.push({ severity: 'warning', code: 'contracts_invalid', message: 'Contracts are invalid' });
  if (!Array.isArray(server.guildRelations) || !Array.isArray(server.guildWars) || !Array.isArray(server.guildWarVotes)) issues.push({ severity: 'warning', code: 'guild_wars_missing', message: 'Guild war fields are missing' });
  if ((server.npcs ?? []).some((npc) => !npc.skill || npc.skill < 1 || npc.skill > 10 || !npc.playstyle || !npc.locationMode)) issues.push({ severity: 'warning', code: 'npc_war_fields_missing', message: 'NPC war fields are missing' });

  (server.guilds ?? []).filter(isPlayerCreatedGuild).forEach((guild) => {
    const allowed = new Set(allowedPlayerGuildMemberIds(server, guild));
    const unexpectedMembers = (guild.memberIds ?? []).filter((id) => id !== server.player.id && !allowed.has(id));
    const unexpectedNpcLinks = (server.npcs ?? []).filter((npc) => npc.guildId === guild.id && !allowed.has(npc.id));
    if (unexpectedMembers.length > 0 || unexpectedNpcLinks.length > 0) {
      issues.push({ severity: 'critical', code: 'player_guild_auto_members', message: `${guild.name} has non-accepted NPC members` });
    }
    if (server.player.guildId === guild.id && guild.leaderId !== server.player.id) {
      issues.push({ severity: 'critical', code: 'player_guild_bad_leader', message: `${guild.name} leader is not the player` });
    }
    if ((guild.officerIds ?? []).some((id) => !allowed.has(id))) {
      issues.push({ severity: 'critical', code: 'player_guild_random_officers', message: `${guild.name} has non-accepted NPC officers` });
    }
  });

  const activeSiege = server.currentSiegeRun?.status === 'active' ? server.currentSiegeRun : undefined;
  if (activeSiege && shouldAutoResolveSiege(server, activeSiege)) {
    issues.push({ severity: 'warning', code: 'siege_stuck_without_player', message: 'Active siege is waiting even though the player is not commanding it' });
  }
  (server.castles ?? []).forEach((castle) => {
    if (castle.lastResolvedSiegeDay && (castle.history ?? []).length === 0) {
      issues.push({ severity: 'warning', code: 'castle_history_missing', message: `${castle.name} has a resolved siege without history` });
    }
  });

  const market = getMarketDiagnostics(server);
  if (market.brokenReasons.length > 0) {
    issues.push({ severity: 'critical', code: 'market_broken', message: market.brokenReasons.join(', ') });
  }

  return issues;
};

export const repairServerRuntime = (server: ServerState): ServerState => {
  const rng = createRng(server.seed + server.serverDay * 7100 + server.currentMinute);
  const marketReady = repairMarketIfBroken(server, rng, 'runtime_validation');
  const guildWarReady = protectPlayerCreatedGuilds(normalizeGuildWarsCore(protectPlayerCreatedGuilds(marketReady), rng));
  return {
    ...guildWarReady,
    version: SAVE_VERSION,
    player: {
      ...guildWarReady.player,
      level: Math.max(1, guildWarReady.player.level),
    },
    questStates: guildWarReady.questStates ?? {},
    contracts: guildWarReady.contracts ?? [],
    notifications: guildWarReady.notifications ?? [],
    partyFinderListings: guildWarReady.partyFinderListings ?? [],
    currentDungeonRun: guildWarReady.currentDungeonRun?.status === 'completed' ? undefined : guildWarReady.currentDungeonRun,
  };
};
