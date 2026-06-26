import fs from 'node:fs';

const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';

const files = {
  packageJson: read('package.json'),
  saveLoad: read('src/engine/saveLoad.ts'),
  version: read('src/engine/version.ts'),
  versionJson: read('public/version.json'),
  sw: read('public/sw.js'),
  manifest: read('public/manifest.webmanifest'),
  gameStore: read('src/state/gameStore.ts'),
  main: read('src/main.tsx'),
};

const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

const importBlock = files.gameStore.slice(0, files.gameStore.indexOf('interface GameStore {'));

assert(files.packageJson.includes('"version": "0.7.3"'), 'package version is 0.7.3');
assert(files.version.includes("APP_VERSION = '0.7.3'"), 'APP_VERSION is 0.7.3');
assert(files.versionJson.includes('"version": "0.7.3"'), 'version.json is 0.7.3');
assert(files.sw.includes("CACHE_NAME = 'mmows-v0.7.3'"), 'service worker cache is 0.7.3');
assert(files.manifest.includes('"version": "0.7.3"'), 'manifest version is 0.7.3');

assert(files.saveLoad.includes("export const loadGame"), 'saveLoad exports loadGame');
assert(files.saveLoad.includes("SAVE_VERSION = '0.7.0'"), 'save format remains 0.7.0');
assert(files.saveLoad.includes("SAVE_KEY = 'mmoworldsimulator.save.v0.7.0'"), 'save key remains v0.7.0');

[
  'create',
  'SAVE_VERSION',
  'loadGame',
  'saveGame',
  'clearSave',
  'flushSaveGame',
  'backupRescueSave',
  'createNewGame',
  'createEmptyServer',
  'ensureServerRoster',
  'createRng',
  'uid',
  'advanceServerClock',
  'getItemById',
  'normalizeLegacyItemId',
  'ITEMS',
  'getDungeonById',
  'getSpotById',
  'getZoneById',
  'startSpotCombat',
  'createPlayerCombatant',
  'resolveCombatAction',
  'startDungeonFloorCombat',
  'completeDungeonFloor',
  'resolveDungeonEventFloor',
  'restInDungeon',
  'enhanceItem',
  'createPlayerPartyListing',
  'joinPartyListing as joinPartyFinderListing',
  'waitPartyListing as waitPartyFinderListing',
  'leavePartyListing as leavePartyFinderListing',
  'cancelPartyListing as cancelPartyFinderListing',
  'startPartyFromListing',
  'acceptPartyApplicant as acceptPartyFinderApplicant',
  'rejectPartyApplicant as rejectPartyFinderApplicant',
  'refreshPartyFinderListings',
  'repairServerRuntime',
  'validateServerRuntime',
].forEach((name) => assert(importBlock.includes(name), `gameStore import block includes ${name}`));

assert(files.gameStore.includes('const simulateServerForMinutes ='), 'gameStore has local simulateServerForMinutes fallback');
assert(!files.gameStore.includes('createEmptyServer is not defined'), 'literal createEmptyServer runtime error absent');
assert(!files.gameStore.includes('loadGame is not defined'), 'literal loadGame runtime error absent');
assert(files.gameStore.includes('const savedServer = loadGame();'), 'gameStore calls imported loadGame');
assert(files.gameStore.includes('server ?? createEmptyServer()'), 'safeNormalizeServer still has fallback empty server');
assert(files.main.includes('renderBootError'), 'visible boot error remains');
assert(!files.main.includes('await runRuntimeResetIfNeeded()'), 'boot does not await async runtime reset');

if (fail.length) {
  console.error('Sanity failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}

console.log('Sanity passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
