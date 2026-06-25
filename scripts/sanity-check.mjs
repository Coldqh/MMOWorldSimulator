import fs from 'node:fs';

const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';

const files = {
  packageJson: read('package.json'),
  saveLoad: read('src/engine/saveLoad.ts'),
  version: read('src/engine/version.ts'),
  versionJson: read('public/version.json'),
  sw: read('public/sw.js'),
  types: read('src/types/game.ts'),
  createNewGame: read('src/engine/createNewGame.ts'),
  contractSystem: read('src/systems/contractSystem.ts'),
  contractsScreen: read('src/ui/screens/ContractsScreen.tsx'),
  appShell: read('src/ui/layout/AppShell.tsx'),
  gameStore: read('src/state/gameStore.ts'),
};

const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

assert(files.packageJson.includes('"version": "0.6.8"'), 'package version is 0.6.8');
assert(files.saveLoad.includes("SAVE_VERSION = '0.6.8'"), 'save version is 0.6.8');
assert(files.saveLoad.includes('mmoworldsimulator.save.v0.6.7'), '0.6.7 legacy save key exists');
assert(files.saveLoad.includes('mmoworldsimulator.save.v0.6.6'), '0.6.6 legacy save key exists');
assert(files.version.includes("APP_VERSION = '0.6.8'"), 'APP_VERSION is 0.6.8');
assert(files.versionJson.includes('"version": "0.6.8"'), 'version.json is 0.6.8');
assert(files.sw.includes("mmows-v0.6.8"), 'service worker cache is v0.6.8');

assert(!files.gameStore.includes('collectOwnedItemIdsconst collectOwnedItemIds'), 'duplicate collectOwnedItemIds bug is removed');
const interfaceBlock = files.gameStore.match(/interface GameStore \{[\s\S]*?\n\}/)?.[0] ?? '';
assert(interfaceBlock.includes('travelToCity: () => void;'), 'GameStore interface has travelToCity signature');
assert(interfaceBlock.includes('travelToZone: (zoneId: string) => void;'), 'GameStore interface has travelToZone signature');
assert(!interfaceBlock.includes('const { server, combat } = get();'), 'GameStore interface has no implementation body');
assert(interfaceBlock.includes('acceptContract: (contractId: string) => void;'), 'GameStore interface has acceptContract');
assert(interfaceBlock.includes('claimContract: (contractId: string) => void;'), 'GameStore interface has claimContract');

assert(files.gameStore.includes('location: { mode: "zone", zoneId }'), 'travelToZone sets location');
assert(files.gameStore.includes('location: { mode: "spot", zoneId: spot.zoneId, spotId }'), 'enterSpot sets location');
assert(files.gameStore.includes('location: { mode: "zone", zoneId: server.location.zoneId }'), 'leaveSpot sets zone');
assert(files.gameStore.includes('location: { mode: "city" }'), 'travelToCity sets city');

assert(files.types.includes('ContractCategory') && files.types.includes('ContractDefinition'), 'contract types exist');
assert(files.types.includes('contracts: ContractDefinition[]'), 'ServerState has contracts');
assert(files.types.includes('| "contracts"'), 'ScreenId has contracts');
assert(files.createNewGame.includes('contracts: []'), 'new game initializes contracts');

assert(files.contractSystem.includes('generateDailyContracts') && files.contractSystem.includes('generateWeeklyContracts'), 'contract generators exist');
assert(files.contractSystem.includes('nextSlotFor'), 'contract replacement slot logic exists');
assert(files.contractSystem.includes('3 - dailyLive') && files.contractSystem.includes('3 - weeklyLive'), 'daily/weekly stay at 3 live contracts');
assert(files.contractSystem.includes('makeKillContract') && files.contractSystem.includes('makeDungeonContract') && files.contractSystem.includes('makeArenaContract'), 'kill/dungeon/arena contracts exist');
assert(files.contractSystem.includes('getGameDayOfWeekName'), 'weekday system exists');
assert(files.contractSystem.includes('getNextDailyReset') && files.contractSystem.includes('server.serverDay + 1'), 'daily reset exists');
assert(files.contractSystem.includes('getNextWeeklyReset') && files.contractSystem.includes('Воскресенье'), 'weekly Sunday reset exists');
assert(files.contractSystem.includes('updateContractsOnMobKill'), 'mob kill progress exists');
assert(files.contractSystem.includes('updateContractsOnDungeonComplete'), 'dungeon progress exists');
assert(files.contractSystem.includes('updateContractsOnArenaResult'), 'arena progress exists');

assert(files.contractsScreen.includes('Ежедневные') && files.contractsScreen.includes('Еженедельные'), 'contracts screen tabs exist');
assert(files.appShell.includes('ContractsScreen') && files.appShell.includes('contracts: <ContractsScreen />'), 'AppShell wires contracts screen');
assert((files.appShell.match(/const bottomNav:[\s\S]*?\];/)?.[0] ?? '').includes("'quests'"), 'bottom nav still has quests');
assert(!((files.appShell.match(/const bottomNav:[\s\S]*?\];/)?.[0] ?? '').includes("'guild'")), 'bottom nav has no guild');
assert(!((files.appShell.match(/const bottomNav:[\s\S]*?\];/)?.[0] ?? '').includes("'contracts'")), 'bottom nav has no contracts');

if (fail.length) {
  console.error('Sanity failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}

console.log('Sanity passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
