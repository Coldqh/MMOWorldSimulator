import fs from 'node:fs';

const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';

const files = {
  packageJson: read('package.json'),
  saveLoad: read('src/engine/saveLoad.ts'),
  version: read('src/engine/version.ts'),
  versionJson: read('public/version.json'),
  sw: read('public/sw.js'),
  marketSystem: read('src/systems/marketSystem.ts'),
  marketScreen: read('src/ui/screens/MarketScreen.tsx'),
  createNewGame: read('src/engine/createNewGame.ts'),
  gameStore: read('src/state/gameStore.ts'),
};

const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

assert(files.packageJson.includes('"version": "0.6.10"'), 'package version is 0.6.10');
assert(files.saveLoad.includes("SAVE_VERSION = '0.6.10'"), 'save version is 0.6.10');
assert(files.saveLoad.includes('mmoworldsimulator.save.v0.6.9'), '0.6.9 legacy save key exists');
assert(files.version.includes("APP_VERSION = '0.6.10'"), 'APP_VERSION is 0.6.10');
assert(files.versionJson.includes('"version": "0.6.10"'), 'version.json is 0.6.10');
assert(files.sw.includes("mmows-v0.6.10"), 'service worker cache is v0.6.10');

assert(files.marketSystem.includes('MARKET_MIN_LISTINGS = 80'), 'market min listings invariant exists');
assert(files.marketSystem.includes('MARKET_MIN_ITEM_GROUPS = 25'), 'market item groups invariant exists');
assert(files.marketSystem.includes('MARKET_MIN_EQUIPMENT_LISTINGS = 40'), 'market equipment invariant exists');
assert(files.marketSystem.includes('MARKET_MIN_CONSUMABLE_MATERIAL_LISTINGS = 10'), 'market consumable/material invariant exists');
assert(files.marketSystem.includes('getMarketDiagnostics'), 'market diagnostics function exists');
assert(files.marketSystem.includes('repairMarketIfBroken'), 'market repair function exists');
assert(files.marketSystem.includes('invalidItemRefs') && files.marketSystem.includes('invalidSellerRefs'), 'market invalid refs diagnostics exist');
assert(files.marketSystem.includes('playerLevelListings'), 'player level listing invariant exists');

assert(files.createNewGame.includes('repairMarketIfBroken') && files.createNewGame.includes('"createNewGame"'), 'createNewGame repairs market');
assert(files.gameStore.includes('repairMarketIfBroken'), 'gameStore imports/calls market repair');
assert(files.gameStore.includes('repairMarket: () => void;'), 'GameStore interface has repairMarket action');
assert(files.gameStore.includes('repairMarket: () => {'), 'GameStore implementation has repairMarket action');
assert(files.gameStore.includes('"market_screen"'), 'repairMarket action marks MarketScreen repair reason');
assert(files.gameStore.includes('"migration"') || files.gameStore.includes('"normalize"'), 'normalize path has repair reason');
assert(files.gameStore.includes('market: repairedLight.market'), 'light normalize repairs market');

assert(files.marketScreen.includes('useEffect'), 'MarketScreen uses useEffect');
assert(files.marketScreen.includes('repairMarket'), 'MarketScreen calls repairMarket on open');
assert(files.marketScreen.includes('getMarketDiagnostics'), 'MarketScreen reads diagnostics');
assert(files.marketScreen.includes('Market debug'), 'MarketScreen dev debug block exists');
assert(files.marketScreen.includes('import.meta.env.DEV'), 'MarketScreen debug is dev-only');

if (fail.length) {
  console.error('Sanity failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}

console.log('Sanity passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
