import fs from 'node:fs';

const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';
const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

const pkg = read('package.json');
const version = read('src/engine/version.ts');
const siege = read('src/systems/siegeSystem.ts');
const castlePanel = read('src/ui/components/CastlePanel.tsx');
const store = read('src/state/gameStore.ts');

assert(pkg.includes('"version": "0.7.26"'), 'package version 0.7.26');
assert(version.includes("APP_VERSION = '0.7.26'"), 'APP_VERSION 0.7.26');
assert(siege.includes('REGISTRATION_DAYS_BEFORE = 3'), 'registration opens 3 days before siege');
assert(siege.includes('notifyPlayerIfRostered'), 'player roster notification exists');
assert(siege.includes('Ты в составе на осаду'), 'rostered player notification text exists');
assert(siege.includes('openDueSiege'), 'due siege opens active run instead of instant resolve');
assert(siege.includes('Осада началась'), 'siege start notification exists');
assert(siege.includes('startCurrentSiege'), 'start siege action exists');
assert(siege.includes('advanceCurrentSiege'), 'manual siege step action exists');
assert(siege.includes('isPlayerSiegeCommander'), 'player GM commander check exists');
assert(siege.includes('SiegeMoveDirection'), 'manual direction type exists');
assert(castlePanel.includes('Начать осаду'), 'CastlePanel has start siege button');
assert(castlePanel.includes("siegeStep('up')"), 'CastlePanel has manual up command');
assert(castlePanel.includes("siegeStep('right')"), 'CastlePanel has manual right command');
assert(store.includes('startSiege:'), 'store exposes startSiege action');
assert(store.includes('siegeStep:'), 'store exposes siegeStep action');
assert(store.includes('advanceCurrentSiege'), 'store imports/uses advanceCurrentSiege');
assert(store.includes('startCurrentSiege'), 'store imports/uses startCurrentSiege');

if (fail.length) {
  console.error('Sanity failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}
console.log('Sanity passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
