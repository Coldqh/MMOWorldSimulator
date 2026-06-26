import type { ServerState } from '../types/game';

export interface RuntimeIssue {
  severity: 'critical' | 'warning';
  code: string;
  message: string;
}
import { SAVE_VERSION } from './saveLoad';
import { getMarketDiagnostics, repairMarketIfBroken } from '../systems/marketSystem';
import { createRng } from './rng';

export const validateServerRuntime = (server: ServerState): RuntimeIssue[] => {
  const issues: RuntimeIssue[] = [];

  if (server.version !== SAVE_VERSION) issues.push({ severity: 'critical', code: 'version_mismatch', message: 'Save version is not v0.7.0' });
  if (!server.player || server.player.level < 1) issues.push({ severity: 'critical', code: 'invalid_player', message: 'Player is missing or invalid' });
  if (!Array.isArray(server.npcs) || server.npcs.length < 100) issues.push({ severity: 'warning', code: 'npc_roster_low', message: 'NPC roster is smaller than expected' });
  if (!Array.isArray(server.guilds)) issues.push({ severity: 'warning', code: 'guilds_invalid', message: 'Guild list is invalid' });
  if (!Array.isArray(server.partyFinderListings)) issues.push({ severity: 'warning', code: 'party_finder_invalid', message: 'Party Finder list is invalid' });
  if (!server.questStates || typeof server.questStates !== 'object') issues.push({ severity: 'warning', code: 'quest_states_invalid', message: 'Quest states are invalid' });
  if (!Array.isArray(server.contracts)) issues.push({ severity: 'warning', code: 'contracts_invalid', message: 'Contracts are invalid' });

  const market = getMarketDiagnostics(server);
  if (market.brokenReasons.length > 0) {
    issues.push({ severity: 'critical', code: 'market_broken', message: market.brokenReasons.join(', ') });
  }

  return issues;
};

export const repairServerRuntime = (server: ServerState): ServerState => {
  const rng = createRng(server.seed + server.serverDay * 7100 + server.currentMinute);
  const marketReady = repairMarketIfBroken(server, rng, 'runtime_validation');
  return {
    ...marketReady,
    version: SAVE_VERSION,
    player: {
      ...marketReady.player,
      level: Math.max(1, marketReady.player.level),
    },
    questStates: marketReady.questStates ?? {},
    contracts: marketReady.contracts ?? [],
    notifications: marketReady.notifications ?? [],
    partyFinderListings: marketReady.partyFinderListings ?? [],
    currentDungeonRun: marketReady.currentDungeonRun?.status === 'completed' ? undefined : marketReady.currentDungeonRun,
  };
};
