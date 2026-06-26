import fs from 'node:fs';

const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';

const files = {
  packageJson: read('package.json'),
  saveLoad: read('src/engine/saveLoad.ts'),
  runtimeReset: read('src/engine/runtimeReset.ts'),
  runtimeValidation: read('src/engine/runtimeValidation.ts'),
  main: read('src/main.tsx'),
  pwa: read('src/engine/pwa.ts'),
  version: read('src/engine/version.ts'),
  versionJson: read('public/version.json'),
  sw: read('public/sw.js'),
  manifest: read('public/manifest.webmanifest'),
  marketSystem: read('src/systems/marketSystem.ts'),
  marketScreen: read('src/ui/screens/MarketScreen.tsx'),
  createNewGame: read('src/engine/createNewGame.ts'),
  gameStore: read('src/state/gameStore.ts'),
  smoke: read('scripts/smoke.mjs'),
};

const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

assert(files.packageJson.includes('"version": "0.7.0"'), 'package version is 0.7.0');
assert(files.packageJson.includes('"smoke": "node scripts/smoke.mjs"'), 'npm run smoke exists');
assert(files.saveLoad.includes("SAVE_VERSION = '0.7.0'"), 'SAVE_VERSION is 0.7.0');
assert(files.saveLoad.includes("SAVE_KEY = 'mmoworldsimulator.save.v0.7.0'"), 'only current save key exists');
assert(!files.saveLoad.includes('LEGACY_KEYS'), 'saveLoad has no LEGACY_KEYS');
assert(!files.saveLoad.includes('saveScore'), 'saveLoad has no saveScore');
assert(!files.saveLoad.includes('allSaveKeys'), 'saveLoad does not enumerate old save keys');
assert(!files.saveLoad.includes('mmoworldsimulator.save.v0.6'), 'saveLoad does not know v0.6 save keys');
assert(files.saveLoad.includes('parsed.version !== SAVE_VERSION'), 'old version saves are rejected');
assert(files.saveLoad.includes('backupBrokenSave'), 'broken/incompatible saves are backed up');
assert(files.saveLoad.includes('export const importSave'), 'v0.7 importSave exists');

assert(files.runtimeReset.includes("RUNTIME_VERSION = '0.7.0'"), 'runtimeReset version is 0.7.0');
assert(files.runtimeReset.includes('mmoworldsimulator.runtimeReset.v'), 'runtime reset flag exists');
assert(files.runtimeReset.includes('clearOldLocalStorageKeys'), 'old localStorage cleanup exists');
assert(files.runtimeReset.includes('clearOldServiceWorkers'), 'old service worker cleanup exists');
assert(files.runtimeReset.includes('clearOldCaches'), 'old cache cleanup exists');
assert(files.runtimeReset.includes('key !== CURRENT_SAVE_KEY'), 'runtime reset does not wipe current v0.7 save');

assert(files.main.includes('runRuntimeResetIfNeeded') && files.main.includes("await import('./app/App')"), 'main runs runtime reset before dynamic App import');

assert(files.version.includes("APP_VERSION = '0.7.0'"), 'APP_VERSION is 0.7.0');
assert(files.versionJson.includes('"version": "0.7.0"'), 'version.json is 0.7.0');
assert(files.sw.includes("CACHE_NAME = 'mmows-v0.7.0'"), 'service worker cache is v0.7.0');
assert(files.sw.includes("key.startsWith('mmows-')") && files.sw.includes("key !== CACHE_NAME"), 'old caches deleted on activate');
assert(files.sw.includes("request.mode === 'navigate'") && files.sw.includes("caches.match('./index.html')"), 'navigation fallback exists');
assert(!files.pwa.includes('window.location.replace'), 'pwa has no location.replace');
assert(!files.pwa.includes('controllerchange') || files.pwa.includes('Do not reload automatically'), 'controllerchange does not auto reload');

assert(files.marketSystem.includes('SYSTEM_MARKET_SELLER_IDS'), 'system market sellers exist');
assert(files.marketSystem.includes('generateFullMarket'), 'generateFullMarket exists');
assert(files.marketSystem.includes('MARKET_MIN_LISTINGS = 200'), 'market min listings 200');
assert(files.marketSystem.includes('MARKET_MIN_ITEM_GROUPS = 60'), 'market min groups 60');
assert(files.marketSystem.includes('MARKET_MIN_EQUIPMENT_LISTINGS = 100'), 'market min equipment 100');
assert(files.marketSystem.includes('MARKET_MIN_CONSUMABLE_MATERIAL_LISTINGS = 30'), 'market min consumable/material 30');
assert(files.marketSystem.includes('MARKET_MIN_PLAYER_LEVEL_LISTINGS = 30'), 'market min player-level listings 30');
assert(files.marketSystem.includes('validSellerIdsFor') && files.marketSystem.includes('...SYSTEM_MARKET_SELLER_IDS'), 'system sellers are valid refs');
assert(files.marketSystem.includes('repairMarketIfBroken') && files.marketSystem.includes('generateFullMarket(server, rng)'), 'broken market rebuilds fully');
assert(files.marketSystem.includes('too_few_listings') && files.marketSystem.includes('invalid_seller_refs'), 'market diagnostics has broken reasons');

assert(files.marketScreen.includes('type MarketCategory = "all"'), 'MarketScreen has All filter');
assert(files.marketScreen.includes('visibleGroups'), 'MarketScreen debug has visibleGroups');
assert(files.marketScreen.includes('isSystemMarketSeller'), 'MarketScreen handles system sellers');
assert(files.marketScreen.includes('Market debug'), 'MarketScreen dev debug exists');

assert(files.createNewGame.includes('generateFullMarket') || files.createNewGame.includes('repairMarketIfBroken'), 'createNewGame creates/repairs full market');
assert(files.gameStore.includes('repairMarketIfBroken'), 'gameStore has market repair');
assert(files.gameStore.includes('repairServerRuntime') || files.gameStore.includes('runtime_validation'), 'gameStore uses runtime validation/repair');

assert(files.runtimeValidation.includes('validateServerRuntime'), 'runtime validation exists');
assert(files.runtimeValidation.includes('repairServerRuntime'), 'runtime repair exists');
assert(files.runtimeValidation.includes('market_broken'), 'runtime validation checks market');

assert(files.smoke.includes('old v0.6 save rejected'), 'smoke checks old save rejection');
assert(files.smoke.includes('market thresholds restored'), 'smoke checks market repair thresholds');
assert(files.smoke.includes('level still 9'), 'smoke checks level persistence');

if (fail.length) {
  console.error('Sanity failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}

console.log('Sanity passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
