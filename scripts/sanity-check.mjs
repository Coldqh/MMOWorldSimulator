import fs from 'node:fs';

const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';

const files = {
  packageJson: read('package.json'),
  saveLoad: read('src/engine/saveLoad.ts'),
  gameStore: read('src/state/gameStore.ts'),
  questSystem: read('src/systems/questSystem.ts'),
  contractSystem: read('src/systems/contractSystem.ts'),
  lootSystem: read('src/systems/lootSystem.ts'),
  partyFinderSystem: read('src/systems/partyFinderSystem.ts'),
  version: read('src/engine/version.ts'),
  versionJson: read('public/version.json'),
  manifest: read('public/manifest.webmanifest'),
  sw: read('public/sw.js'),
};

const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

const count = (text, needle) => text.split(needle).length - 1;

assert(files.packageJson.includes('"version": "0.7.5"'), 'package version is 0.7.5');
assert(files.version.includes("APP_VERSION = '0.7.5'"), 'APP_VERSION is 0.7.5');
assert(files.versionJson.includes('"version": "0.7.5"'), 'version.json is 0.7.5');
assert(files.manifest.includes('"version": "0.7.5"'), 'manifest version is 0.7.5');

assert(files.saveLoad.includes("SAVE_VERSION = '0.7.0'"), 'save version remains 0.7.0');
assert(files.saveLoad.includes("SAVE_KEY = 'mmoworldsimulator.save.v0.7.0'"), 'save key remains v0.7.0');
assert(!files.saveLoad.includes('.replaceAll('), 'saveLoad avoids replaceAll for tsconfig target');
assert(files.saveLoad.includes(".split('.').join('_')"), 'saveLoad uses split/join fallback');

assert(files.gameStore.includes('getRaceById'), 'gameStore imports/uses getRaceById');
assert(files.gameStore.includes('const simulateServerForMinutes = (server: ServerState, minutes: number, _rng?: unknown): ServerState'), 'simulateServerForMinutes accepts optional third arg');

assert(count(files.questSystem, "from './objectiveSystem'") === 1, 'questSystem has one objectiveSystem import');
assert(count(files.contractSystem, "from './objectiveSystem'") === 1, 'contractSystem has one objectiveSystem import');
assert(count(files.questSystem, 'advanceObjectiveProgress') >= 2, 'questSystem still uses objective helper');
assert(count(files.contractSystem, 'advanceObjectiveProgress') >= 2, 'contractSystem still uses objective helper');

assert(files.lootSystem.includes('mythic:'), 'lootSystem rarityRank includes mythic');
assert(files.partyFinderSystem.includes("export { getClassPartyRole } from './partyRoleSystem';"), 'partyFinderSystem re-exports getClassPartyRole for UI');

assert(files.sw.includes("CACHE_NAME = 'mmows-v0.7.3'") || files.sw.includes("CACHE_NAME = 'mmows-v0.7.2'") || files.sw.includes("CACHE_NAME = 'mmows-v0.7.1'"), 'service worker cache not rewritten by compile fix');

if (fail.length) {
  console.error('Sanity failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}

console.log('Sanity passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
