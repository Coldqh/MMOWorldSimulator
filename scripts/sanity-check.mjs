import fs from 'node:fs';

const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';

const files = {
  packageJson: read('package.json'),
  saveLoad: read('src/engine/saveLoad.ts'),
  version: read('src/engine/version.ts'),
  versionJson: read('public/version.json'),
  sw: read('public/sw.js'),
  appShell: read('src/ui/layout/AppShell.tsx'),
  contractsScreen: read('src/ui/screens/ContractsScreen.tsx'),
  contractSystem: read('src/systems/contractSystem.ts'),
  contractList: read('src/ui/components/ContractListPanel.tsx'),
  gameStore: read('src/state/gameStore.ts'),
  lootSystem: read('src/systems/lootSystem.ts'),
};

const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

assert(files.packageJson.includes('"version": "0.6.11"'), 'package version is 0.6.11');
assert(files.saveLoad.includes("SAVE_VERSION = '0.6.11'"), 'save version is 0.6.11');
assert(files.saveLoad.includes('mmoworldsimulator.save.v0.6.10'), '0.6.10 legacy save key exists');
assert(files.version.includes("APP_VERSION = '0.6.11'"), 'APP_VERSION is 0.6.11');
assert(files.versionJson.includes('"version": "0.6.11"'), 'version.json is 0.6.11');
assert(files.sw.includes("mmows-v0.6.11"), 'service worker cache is v0.6.11');

assert(files.appShell.includes('getGameDayOfWeekName'), 'weekday is imported into AppShell');
assert(files.appShell.includes('{getGameDayOfWeekName(server.serverDay)}'), 'weekday is shown in topbar');
assert(files.contractsScreen.includes('Ежедневные и еженедельные задачи без описаний.'), 'contracts screen has no time display');
assert(!files.contractsScreen.includes('formatTime') && !files.contractsScreen.includes('currentMinute') && !files.contractsScreen.includes('serverDay'), 'contracts screen does not show time/day');

assert(!files.contractSystem.includes('cancelContractState(server, contractId);'), 'sanity self-check');
assert(files.contractSystem.includes('cancelContract =') && !files.contractSystem.match(/cancelContract[\s\S]*?refreshContracts/), 'cancelContract does not refresh');
assert(files.contractSystem.includes('claimContractReward') && !files.contractSystem.match(/claimContractReward[\s\S]*?refreshContracts/), 'claimContractReward does not refresh');
assert(files.contractSystem.includes('categoryNeedsFullReset'), 'contracts only reset by period');
assert(files.contractSystem.includes('status: \\'claimed\\''), 'completed contracts are auto-hidden as claimed');
assert(files.contractSystem.includes('completeContract'), 'auto-complete/auto-reward contract function exists');

assert(files.gameStore.includes('closeModal: () => {'), 'closeModal pops queued notifications');
assert(files.gameStore.includes('notificationToModal(first)'), 'queued notification becomes modal');
assert(files.gameStore.includes('Math.abs(npc.arenaRating - server.player.arenaRating) <= 50'), 'arena uses +-50 rating filter');
assert(!files.gameStore.includes('Math.abs(npc.arenaRating - server.player.arenaRating) <= 300'), 'old +-300 arena filter removed');

assert(files.lootSystem.includes("item.rarity === 'common'") && files.lootSystem.includes('0.4'), 'common equipment drop 40%');
assert(files.lootSystem.includes("item.rarity === 'uncommon'") && files.lootSystem.includes('0.2'), 'uncommon equipment drop 20%');
assert(files.lootSystem.includes("item.rarity === 'rare'") && files.lootSystem.includes('0.1'), 'rare equipment drop 10%');
assert(files.lootSystem.includes("item.rarity === 'epic'") && files.lootSystem.includes('0.05'), 'epic equipment drop 5%');
assert(files.lootSystem.includes('bestEquipmentDrop'), 'only best rarity equipment drop selected');
assert(files.lootSystem.includes('return equipment ? [...normalDrops, equipment] : normalDrops'), 'max one equipment drop returned');

if (fail.length) {
  console.error('Sanity failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}

console.log('Sanity passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
