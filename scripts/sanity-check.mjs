import fs from 'node:fs';

const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';

const files = {
  packageJson: read('package.json'),
  saveLoad: read('src/engine/saveLoad.ts'),
  version: read('src/engine/version.ts'),
  versionJson: read('public/version.json'),
  sw: read('public/sw.js'),
  appShell: read('src/ui/layout/AppShell.tsx'),
  world: read('src/ui/screens/WorldScreen.tsx'),
};

const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

assert(files.packageJson.includes('"version": "0.6.9"'), 'package version is 0.6.9');
assert(files.saveLoad.includes("SAVE_VERSION = '0.6.9'"), 'save version is 0.6.9');
assert(files.saveLoad.includes('mmoworldsimulator.save.v0.6.8'), '0.6.8 legacy save key exists');
assert(files.version.includes("APP_VERSION = '0.6.9'"), 'APP_VERSION is 0.6.9');
assert(files.versionJson.includes('"version": "0.6.9"'), 'version.json is 0.6.9');
assert(files.sw.includes("mmows-v0.6.9"), 'service worker cache is v0.6.9');

assert(files.appShell.includes('ContractsScreen'), 'ContractsScreen import/render exists');
assert(files.appShell.includes('contracts: <ContractsScreen />'), 'contracts screen wired');
const sideBlock = files.appShell.match(/const sideNav:[\s\S]*?\];/)?.[0] ?? '';
const bottomBlock = files.appShell.match(/const bottomNav:[\s\S]*?\];/)?.[0] ?? '';
assert(sideBlock.includes("'contracts'"), 'contracts appears in side nav');
assert(sideBlock.includes('📋 Контракты'), 'contracts side nav label exists');
assert(!bottomBlock.includes("'contracts'"), 'contracts not in bottom nav');
assert(!bottomBlock.includes("'guild'"), 'guild not in bottom nav');
assert(bottomBlock.includes("'character'") && bottomBlock.includes("'world'") && bottomBlock.includes("'quests'"), 'bottom nav remains hero/world/quests');

const cityBlock = files.world.match(/server\.location\.mode === 'city'[\s\S]*?<section className="panel">[\s\S]*?<div className="section-title">Город<\/div>[\s\S]*?<div className="action-grid">([\s\S]*?)<\/div>/)?.[1] ?? '';
assert(cityBlock.includes("openScreen('market')"), 'city action grid keeps market');
assert(cityBlock.includes("openScreen('arena')"), 'city action grid keeps arena');
assert(cityBlock.includes("openScreen('enhance')"), 'city action grid keeps enhance');
assert(!cityBlock.includes("openScreen('quests')"), 'city action grid does not duplicate quests');
assert(!cityBlock.includes('setTravelOpen(true)'), 'city action grid does not duplicate change location');
assert(files.world.includes("<button onClick={() => setTravelOpen(true)} disabled={Boolean(combat)}>Сменить локацию</button>"), 'movement block still has change location button');

if (fail.length) {
  console.error('Sanity failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}

console.log('Sanity passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
