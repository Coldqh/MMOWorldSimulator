import fs from 'node:fs';

const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';
const files = {
  pkg: read('package.json'),
  types: read('src/types/game.ts'),
  gameStore: read('src/state/gameStore.ts'),
  createNewGame: read('src/engine/createNewGame.ts'),
  runtimeValidation: read('src/engine/runtimeValidation.ts'),
  guildWar: read('src/systems/guildWarSystem.ts'),
  guildRoster: read('src/systems/guildRosterSystem.ts'),
  guildRelation: read('src/systems/guildRelationSystem.ts'),
  npcSkill: read('src/systems/npcSkillSystem.ts'),
  npcLocation: read('src/systems/npcLocationSystem.ts'),
  pvp: read('src/systems/pvpSimulationSystem.ts'),
  guildScreen: read('src/ui/screens/GuildScreen.tsx'),
  worldScreen: read('src/ui/screens/WorldScreen.tsx'),
  guildWarPanel: read('src/ui/components/GuildWarPanel.tsx'),
  locationNpcList: read('src/ui/components/LocationNpcList.tsx'),
  saveLoad: read('src/engine/saveLoad.ts'),
  sw: read('public/sw.js'),
};
const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

assert(files.pkg.includes('"version": "0.7.6"'), 'package version is 0.7.6');
assert(files.saveLoad.includes("SAVE_KEY = 'mmoworldsimulator.save.v0.7.0'"), 'save key unchanged');
assert(files.sw.includes("CACHE_NAME = 'mmows-v0.7.3'"), 'service worker cache unchanged');
assert(files.types.includes('export type GuildFocus'), 'GuildFocus type exists');
assert(files.types.includes('guildRelations: GuildRelation[]'), 'ServerState has guildRelations');
assert(files.types.includes('guildWars: GuildWar[]'), 'ServerState has guildWars');
assert(files.types.includes('guildWarVotes: GuildWarVote[]'), 'ServerState has guildWarVotes');
assert(files.types.includes('skill?: number'), 'NPC skill field exists');
assert(files.types.includes('playstyle?: NpcPlaystyle'), 'NPC playstyle field exists');
assert(files.guildRoster.includes('rebalanceGuildRoster'), 'guild roster rebalance helper exists');
assert(files.guildRelation.includes('initializeGuildRelations'), 'guild relations initializer exists');
assert(files.guildWar.includes('createGuildWarDeclareVote'), 'war declare vote function exists');
assert(files.guildWar.includes('simulateActiveGuildWars'), 'active war simulation exists');
assert(files.guildWar.includes('attackWarEnemyNpc'), 'player attack action system exists');
assert(files.npcLocation.includes('getNpcPlayersInLocation'), 'location npc system exists');
assert(files.pvp.includes('resolveNpcDuel'), 'pvp duel resolver exists');
assert(files.pvp.includes('getNpcSkillModifier'), 'skill modifier affects pvp');
assert(files.createNewGame.includes('initializeGuildWarsCore'), 'createNewGame initializes guild wars core');
assert(files.gameStore.includes('normalizeGuildWarsCore'), 'gameStore migration normalizes guild wars');
assert(files.gameStore.includes('tickGuildWars'), 'server tick integrates guild wars');
assert(files.gameStore.includes('declareGuildWar'), 'store declareGuildWar action exists');
assert(files.gameStore.includes('voteGuildWar'), 'store voteGuildWar action exists');
assert(files.gameStore.includes('attackWarEnemyNpc'), 'store attackWarEnemyNpc action exists');
assert(files.runtimeValidation.includes('guild_wars_missing'), 'runtime validation checks guild wars');
assert(files.guildScreen.includes('GuildWarPanel'), 'guild screen shows guild war panel');
assert(files.guildScreen.includes('ServerGuildWarList'), 'guild list shows server wars');
assert(files.worldScreen.includes('LocationNpcList'), 'world screen uses location NPC list');
assert(files.locationNpcList.includes('danger-button'), 'enemy NPC attack button exists');

if (fail.length) {
  console.error('Sanity failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}
console.log('Sanity passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
