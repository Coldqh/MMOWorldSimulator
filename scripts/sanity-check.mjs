import fs from 'node:fs';

const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';
const files = {
  pkg: read('package.json'),
  version: read('src/engine/version.ts'),
  types: read('src/types/game.ts'),
  guildRuntime: read('src/systems/guildRuntimeSystem.ts'),
  castles: read('src/content/castles.ts'),
  siege: read('src/systems/siegeSystem.ts'),
};
const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

assert(files.pkg.includes('"version": "0.7.25"'), 'package version 0.7.25');
assert(files.version.includes("APP_VERSION = '0.7.25'"), 'APP_VERSION 0.7.25');

assert(files.guildRuntime.includes('memberIds: [server.player.id]'), 'player guild starts with only player');
assert(files.guildRuntime.includes('leaderId: server.player.id'), 'player is GM');
assert(files.guildRuntime.includes('deputyId: undefined'), 'no random deputy on creation');
assert(files.guildRuntime.includes('officerIds: []'), 'no random officers on creation');
assert(files.guildRuntime.includes('repairFreshPlayerGuildLeadership'), 'fresh corrupted player guild repair exists');
assert(files.guildRuntime.includes("message: `${cleanName} создана. Ты ГМ. Участников: 1.`"), 'creation message confirms solo guild');

assert(files.types.includes('createdByPlayer?: boolean;'), 'Guild has createdByPlayer flag');
assert(files.types.includes('founderPlayerId?: Id;'), 'Guild has founderPlayerId');
assert(files.types.includes('createdDay?: number;') && files.types.includes('createdMinute?: number;'), 'Guild has created time');

assert(!files.castles.includes('Redstone Keep') && !files.castles.includes('Moonhill Fort') && !files.castles.includes('Ashen Gate'), 'mid castles removed');
assert(files.castles.includes('Virspire Citadel') && files.castles.includes('Glass Crown Fortress') && files.castles.includes('Dragonspire Hold'), 'three high castles remain');
assert(files.castles.includes('virspire_citadel: 0') && files.castles.includes('glass_crown_fortress: 2') && files.castles.includes('dragonspire_hold: 4'), 'siege weekdays Mon/Wed/Fri');
assert(files.castles.includes('nextSiegeMinute: 0'), 'sieges are at 00:00');
assert(files.siege.includes('MAX_GUILDS_PER_SIEGE = 4'), 'siege max guild count preserved');
assert(files.siege.includes('MAX_ROSTER_SIZE = 10'), 'siege roster size is 10');
assert(files.siege.includes('eligibleNpcGuildsForCastle'), 'NPC guild auto-registration exists');
assert(files.siege.includes('autoRegisterNpcGuildsForSieges'), 'auto registration is called');
assert(files.siege.includes('chooseRosterMembers'), 'strongest roster picker exists');
assert(files.siege.includes('guild.level >= 20'), 'only high guilds can register');
assert(!files.siege.includes("castle.tier === 'mid'"), 'mid tier registration removed');

if (fail.length) {
  console.error('Sanity failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}
console.log('Sanity passed:');
ok.forEach((msg) => console.log(`- ${msg}`));

const gameStoreImportHardfix = fs.readFileSync('src/state/gameStore.ts', 'utf8');
if (!gameStoreImportHardfix.startsWith('import { create } from "zustand";')) {
  console.error('Sanity failed: gameStore canonical import block missing');
  process.exit(1);
}
const corruptedImportNeedles = [
  'import { SAVE_VERSION, arenaRankName',
  'ITEMS, createGuildWarDeclareVote, createNewGame',
  'createRng, ensureSoloNpcPool, equipInventoryItem',
  'attackWarEnemyNpc as resolveWarEnemyNpcAttack, refreshContracts',
];
for (const needle of corruptedImportNeedles) {
  if (gameStoreImportHardfix.includes(needle)) {
    console.error('Sanity failed: corrupted gameStore import remains: ' + needle);
    process.exit(1);
  }
}
if (!gameStoreImportHardfix.includes('repairFreshPlayerGuildLeadership,')) {
  console.error('Sanity failed: repairFreshPlayerGuildLeadership import missing');
  process.exit(1);
}
console.log('Sanity passed: v0.7.25 gameStore import hardfix');
