import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

const packageJson = read('package.json');
const gameStore = read('src/state/gameStore.ts');
const saveLoad = read('src/engine/saveLoad.ts');
const main = read('src/main.tsx');
const marketScreen = read('src/ui/screens/MarketScreen.tsx');
const questSystem = read('src/systems/questSystem.ts');
const contractSystem = read('src/systems/contractSystem.ts');
const contractPanel = read('src/ui/components/ContractListPanel.tsx');
const architecture = read('ARCHITECTURE.md');

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

assert(packageJson.includes('"version": "0.7.3"'), 'package version unchanged');
assert(saveLoad.includes('export const loadGame'), 'loadGame export exists');
assert(saveLoad.includes("SAVE_KEY = 'mmoworldsimulator.save.v0.7.0'"), 'save key remains v0.7.0');
assert(gameStore.includes('const simulateServerForMinutes ='), 'simulateServerForMinutes fallback exists');
assert(main.includes('renderBootError'), 'boot error is visible');
assert(!main.includes('await runRuntimeResetIfNeeded()'), 'boot does not block on runtime cleanup');

assert(marketScreen.includes('visibleGroups'), 'market all-filter/debug guard still exists');
assert(marketScreen.includes('repairMarket'), 'market repair remains store action call');
assert(questSystem.includes('advanceObjectiveProgress'), 'quest objectives update through shared logic');
assert(contractSystem.includes('advanceObjectiveProgress'), 'contract objectives update through shared logic');
assert(contractPanel.includes('getContractActions'), 'contract buttons come from UI action source');
assert(architecture.includes('Required checks before merge'), 'architecture doc has merge checks');

if (fail.length) {
  console.error('Smoke failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}

console.log('Smoke passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
