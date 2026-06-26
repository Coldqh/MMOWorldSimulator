import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

const packageJson = read('package.json');
const saveLoad = read('src/engine/saveLoad.ts');
const main = read('src/main.tsx');
const gameStore = read('src/state/gameStore.ts');
const items = read('src/content/items.ts');
const itemContent = read('src/content/itemContent.ts');
const world = read('src/content/world.ts');
const rewardSystem = read('src/systems/rewardSystem.ts');
const questSystem = read('src/systems/questSystem.ts');
const contractSystem = read('src/systems/contractSystem.ts');
const dungeonSystem = read('src/systems/dungeonSystem.ts');
const partyFinderSystem = read('src/systems/partyFinderSystem.ts');
const validation = read('src/engine/validation.ts');
const contractPanel = read('src/ui/components/ContractListPanel.tsx');

assert(packageJson.includes('"version": "0.7.4"'), 'package version bumped to 0.7.4');
assert(saveLoad.includes("SAVE_KEY = 'mmoworldsimulator.save.v0.7.0'"), 'save key remains v0.7.0');
assert(main.includes('renderBootError'), 'boot error remains visible');
assert(!main.includes('await runRuntimeResetIfNeeded()'), 'boot does not block on runtime cleanup');
assert(gameStore.includes('const simulateServerForMinutes ='), 'simulateServerForMinutes fallback preserved');

assert(items.includes("from './itemContent'"), 'items barrel uses itemContent');
assert(itemContent.includes('MOB_CARD_SOURCE_MOBS'), 'mob cards use neutral mob source');
assert(!itemContent.includes("from './world'"), 'itemContent does not import world');
assert(!world.includes("from './items'"), 'world does not import items barrel');

assert(rewardSystem.includes('applyRewardToPlayer'), 'shared reward application exists');
assert(questSystem.includes("from './rewardSystem'"), 'quest rewards use shared helper');
assert(contractSystem.includes("from './rewardSystem'"), 'contract rewards use shared helper');
assert(questSystem.includes("status: 'completed'"), 'quest completion protection preserved');
assert(contractSystem.includes("status: 'claimed'"), 'contract claim protection preserved');

assert(dungeonSystem.includes("from './partyRoleSystem'"), 'dungeon uses role helper');
assert(partyFinderSystem.includes("from './partyRoleSystem'"), 'party finder uses role helper');
assert(validation.includes('runAllStaticValidation'), 'validation facade exists');
assert(validation.includes('runAllRuntimeValidation'), 'runtime validation facade exists');
assert(contractPanel.includes('getContractActions'), 'contract UI uses action source');

if (fail.length) {
  console.error('Smoke failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}

console.log('Smoke passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
