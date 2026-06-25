import fs from 'node:fs';

const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';

const files = {
  packageJson: read('package.json'),
  saveLoad: read('src/engine/saveLoad.ts'),
  version: read('src/engine/version.ts'),
  versionJson: read('public/version.json'),
  sw: read('public/sw.js'),
  gameStore: read('src/state/gameStore.ts'),
};

const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

assert(files.packageJson.includes('"version": "0.6.4"'), 'package version is 0.6.4');
assert(files.saveLoad.includes("SAVE_VERSION = '0.6.4'"), 'save version is 0.6.4');
assert(files.saveLoad.includes('mmoworldsimulator.save.v0.6.3'), '0.6.3 legacy save key exists');
assert(files.version.includes("APP_VERSION = '0.6.4'"), 'APP_VERSION is 0.6.4');
assert(files.versionJson.includes('"version": "0.6.4"'), 'version.json is 0.6.4');
assert(files.sw.includes("mmows-v0.6.4"), 'service worker cache is 0.6.4');

assert(files.saveLoad.includes('isPlausibleSave'), 'save loader validates save shape');
assert(files.saveLoad.includes('backupRescueSave'), 'save loader backs up selected saves');
assert(files.saveLoad.includes('try {') && files.saveLoad.includes('return null;'), 'save loader never throws on load');
assert(files.saveLoad.includes('level,') && files.saveLoad.includes('equipmentScore(server)'), 'save score prioritizes progress and gear');

assert(files.gameStore.includes('safeNormalizeServer'), 'gameStore uses safeNormalizeServer');
assert(files.gameStore.includes('backupRescueSave(savedServer') || files.gameStore.includes('backupRescueSave(server'), 'gameStore backs up failed normalize saves');
assert(!files.gameStore.includes('const initialServer = savedServer\n  ? normalizeServer(savedServer)'), 'unsafe initial normalize removed');
assert(files.gameStore.includes('safeNormalizeServer(server, "light")'), 'commit uses safe normalize');

if (fail.length) {
  console.error('Sanity failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}

console.log('Sanity passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
