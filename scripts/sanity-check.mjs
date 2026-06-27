import fs from 'node:fs';
const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';
const files = {
  pkg: read('package.json'),
  version: read('src/engine/version.ts'),
  types: read('src/types/game.ts'),
  store: read('src/state/gameStore.ts'),
  pvpStat: read('src/systems/pvpStatSystem.ts'),
  pvpDuel: read('src/systems/pvpDuelSystem.ts'),
  arena3v3: read('src/systems/arena3v3System.ts'),
  guildWarResult: read('src/systems/guildWarCombatResultSystem.ts'),
  arenaScreen: read('src/ui/screens/ArenaScreen.tsx'),
  combatPanel: read('src/ui/components/CombatPanel.tsx'),
};
const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);
const header = files.store.slice(0, files.store.indexOf('interface GameStore {'));

assert(files.pkg.includes('"version": "0.7.23"'), 'package version 0.7.23');
assert(files.version.includes("APP_VERSION = '0.7.23'"), 'APP_VERSION 0.7.23');
assert(files.store.startsWith('import { create } from "zustand";'), 'zustand import is clean');
assert(!header.includes('SAVE_VERSION,\n  arenaRankName'), 'corrupted merged import header absent');
assert(!files.store.includes('type: "pvp"') && !files.store.includes("type: 'pvp'"), 'invalid modal pvp type absent');
assert((files.store.match(/const simulateServerForMinutes\s*=/g) ?? []).length === 1, 'one simulateServerForMinutes');
assert(files.store.trimEnd().endsWith('}));'), 'gameStore closes cleanly');

assert(files.types.includes('arenaMode?: "1v1" | "3v3" | "5v5" | "10v10" | "team";'), 'arenaMode supports 5v5 10v10 team');
assert(files.types.includes('healerId?: Id;'), 'PartyRoleMap healer optional');
assert(files.types.includes('teamA?: CombatTeamV2;') && files.types.includes('teamB?: CombatTeamV2;'), 'CombatState has team fields');

assert(files.pvpStat.includes('getNpcPlayerEquivalentStats'), 'NPC PvP player-equivalent stat helper exists');
assert(files.pvpStat.includes('getPlayerStats(playerLikeFromNpc(npc))'), 'NPC PvP stats use player stat pipeline');
assert(files.pvpStat.includes('getNpcEffectiveGearScore'), 'NPC effective gearscore helper exists');

assert(files.arena3v3.includes('startArena5v5Combat'), '5v5 arena starter exists');
assert(files.arena3v3.includes('startArena10v10Combat'), '10v10 arena starter exists');
assert(files.arena3v3.includes('resolveArenaTeamRound'), 'generic arena team round resolver exists');
assert(files.arena3v3.includes('getNpcPlayerEquivalentStats(npc)'), 'arena NPC stats use player-equivalent stats');
assert(files.arena3v3.includes("arenaMode: teamSize === 3 ? '3v3' : teamSize === 5 ? '5v5' : '10v10'"), 'arena modes are 3v3/5v5/10v10');

assert(files.pvpDuel.includes('MAX_WAR_DUEL_PARTICIPANTS = 10'), 'guild war duel participant cap 10');
assert(files.pvpDuel.includes('getNpcPlayerEquivalentStats(npc)'), 'war duel NPC stats use player-equivalent stats');
assert(files.pvpDuel.includes("arenaMode: 'team'"), 'war duels route through team combat');
assert(files.pvpDuel.includes('participantCount(combat) >= MAX_WAR_DUEL_PARTICIPANTS'), 'reinforcements obey participant cap');

assert(files.guildWarResult.includes('allocateTeamKills'), 'team kills allocated by killer units');
assert(files.guildWarResult.includes('unit.kills > 0'), 'last-hit/kill counter used for attribution');
assert(!files.guildWarResult.includes("server.player.id, npc.id, 'player_attack'") || files.guildWarResult.includes('if (combat.teamA && combat.teamB)'), 'player-only fallback not used for team fights');

assert(files.arenaScreen.includes('startArena5v5') && files.arenaScreen.includes('startArena10v10'), 'ArenaScreen exposes 5v5 and 10v10 actions');
assert(files.arenaScreen.includes('Найти бой 5v5') && files.arenaScreen.includes('Найти бой 10v10'), 'ArenaScreen buttons visible');
assert(files.combatPanel.includes('Boolean(combat.teamA && combat.teamB)'), 'CombatPanel displays team combat');

if (fail.length) {
  console.error('Sanity failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}
console.log('Sanity passed:');
ok.forEach((msg) => console.log(`- ${msg}`));

const storeSourceForV0723Hotfix = fs.readFileSync('src/state/gameStore.ts', 'utf8');
if (storeSourceForV0723Hotfix.includes('resolveArena3v3Round(server,')) {
  console.error('Sanity failed: old resolveArena3v3Round gameStore call still present');
  process.exit(1);
}
if (!storeSourceForV0723Hotfix.includes('resolveArenaTeamRound(server,')) {
  console.error('Sanity failed: resolveArenaTeamRound gameStore call missing');
  process.exit(1);
}
if (!storeSourceForV0723Hotfix.includes('entry: { itemId: string }') || !storeSourceForV0723Hotfix.includes('mobId: string') || !storeSourceForV0723Hotfix.includes('entry: { itemId: string; amount: number }')) {
  console.error('Sanity failed: v0.7.23 type annotations missing');
  process.exit(1);
}
console.log('Sanity passed: v0.7.23 typecheck hotfix');
