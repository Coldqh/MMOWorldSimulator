import fs from 'node:fs';

const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';
const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

const guildRuntime = read('src/systems/guildRuntimeSystem.ts');
const castles = read('src/content/castles.ts');
const siege = read('src/systems/siegeSystem.ts');

assert(read('package.json').includes('"version": "0.7.25"'), 'version bumped');
assert(guildRuntime.includes('memberIds: [server.player.id]') && guildRuntime.includes('leaderId: server.player.id'), 'player-created guild is solo + player GM');
assert(guildRuntime.includes('deputyId: undefined') && guildRuntime.includes('officerIds: []'), 'no random leadership');
assert(!castles.includes('Redstone Keep') && castles.includes('Virspire Citadel'), 'only high castles');
assert(castles.includes('CASTLE_SIEGE_WEEKDAYS'), 'weekday schedule map exists');
assert(siege.includes('nextScheduledDay'), 'weekly schedule helper exists');
assert(siege.includes('autoRegisterNpcGuildsForSieges'), 'NPC guilds auto-register');
assert(siege.includes('memberIds: chooseRosterMembers'), 'rosters use strongest members');
assert(siege.includes('MAX_ROSTER_SIZE = 10'), 'rosters are 10 strongest');

if (fail.length) {
  console.error('Smoke failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}
console.log('Smoke passed:');
ok.forEach((msg) => console.log(`- ${msg}`));

const gameStoreSmokeImportHardfix = fs.readFileSync('src/state/gameStore.ts', 'utf8');
if (gameStoreSmokeImportHardfix.includes('import { SAVE_VERSION, arenaRankName') || gameStoreSmokeImportHardfix.includes('from "../systems/enhancementSystem";\nimport {\n  attackWarEnemyNpc')) {
  console.error('Smoke failed: corrupted gameStore imports remain');
  process.exit(1);
}
console.log('Smoke passed: v0.7.25 gameStore import hardfix');
