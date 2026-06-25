import fs from 'node:fs';

const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';

const files = {
  packageJson: read('package.json'),
  saveLoad: read('src/engine/saveLoad.ts'),
  version: read('src/engine/version.ts'),
  versionJson: read('public/version.json'),
  sw: read('public/sw.js'),
  gameStore: read('src/state/gameStore.ts'),
  appShell: read('src/ui/layout/AppShell.tsx'),
};

const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

assert(files.packageJson.includes('"version": "0.6.6"'), 'package version is 0.6.6');
assert(files.saveLoad.includes("SAVE_VERSION = '0.6.6'"), 'save version is 0.6.6');
assert(files.saveLoad.includes('mmoworldsimulator.save.v0.6.5'), '0.6.5 legacy save key exists');
assert(files.version.includes("APP_VERSION = '0.6.6'"), 'APP_VERSION is 0.6.6');
assert(files.versionJson.includes('"version": "0.6.6"'), 'version.json is 0.6.6');
assert(files.sw.includes("mmows-v0.6.6"), 'service worker cache is 0.6.6');

assert(files.gameStore.includes('location: { mode: "city" }'), 'travelToCity sets city location');
assert(files.gameStore.includes('location: { mode: "zone", zoneId }'), 'travelToZone sets zone location');
assert(files.gameStore.includes('location: { mode: "spot", zoneId: spot.zoneId, spotId }'), 'enterSpot sets spot location');
assert(files.gameStore.includes('location: { mode: "zone", zoneId: server.location.zoneId }'), 'leaveSpot returns to zone location');

const travelToZoneBlock = files.gameStore.match(/travelToZone: \(zoneId\) => \{[\s\S]*?\n  \},\n\n  enterSpot:/)?.[0] ?? '';
assert(travelToZoneBlock.includes('location: { mode: "zone", zoneId }'), 'travelToZone block really mutates location');
assert(!travelToZoneBlock.includes('const moved: ServerState = {\n      ...server,\n    };'), 'old broken travelToZone moved block removed');

const bottomBlock = files.appShell.match(/const bottomNav:[\s\S]*?\];/)?.[0] ?? '';
assert(!bottomBlock.includes("'guild'"), 'bottom nav still has no guild');

if (fail.length) {
  console.error('Sanity failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}

console.log('Sanity passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
