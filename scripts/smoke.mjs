import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

const gameStore = read('src/state/gameStore.ts');
const saveLoad = read('src/engine/saveLoad.ts');
const main = read('src/main.tsx');
const importBlock = gameStore.slice(0, gameStore.indexOf('interface GameStore {'));

const requiredRuntimeImports = [
  'createNewGame',
  'createEmptyServer',
  'ensureServerRoster',
  'loadGame',
  'saveGame',
  'SAVE_VERSION',
  'createRng',
  'uid',
  'getDungeonById',
  'getSpotById',
  'getZoneById',
  'startSpotCombat',
  'resolveCombatAction',
  'enhanceItem',
  'refreshPartyFinderListings',
  'repairServerRuntime',
];

requiredRuntimeImports.forEach((name) => assert(importBlock.includes(name), `runtime import present: ${name}`));

assert(saveLoad.includes('export const loadGame'), 'loadGame export exists');
assert(gameStore.includes('const simulateServerForMinutes ='), 'simulateServerForMinutes fallback exists');
assert(main.includes('renderBootError'), 'boot error is visible');
assert(!main.includes('await runRuntimeResetIfNeeded()'), 'boot does not block on runtime cleanup');

if (fail.length) {
  console.error('Smoke failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}

console.log('Smoke passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
