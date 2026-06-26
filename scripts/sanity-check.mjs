import fs from 'node:fs';

const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';

const files = {
  packageJson: read('package.json'),
  saveLoad: read('src/engine/saveLoad.ts'),
  runtimeReset: read('src/engine/runtimeReset.ts'),
  main: read('src/main.tsx'),
  version: read('src/engine/version.ts'),
  versionJson: read('public/version.json'),
  sw: read('public/sw.js'),
  manifest: read('public/manifest.webmanifest'),
  gameStore: read('src/state/gameStore.ts'),
};

const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

assert(files.packageJson.includes('"version": "0.7.2"'), 'package version is 0.7.2');
assert(files.saveLoad.includes("export const loadGame"), 'saveLoad exports loadGame');
assert(files.saveLoad.includes("export const saveGame"), 'saveLoad exports saveGame');
assert(files.saveLoad.includes("export const clearSave"), 'saveLoad exports clearSave');
assert(files.saveLoad.includes("export const exportSave"), 'saveLoad exports exportSave');
assert(files.saveLoad.includes("export const importSave"), 'saveLoad exports importSave');
assert(files.saveLoad.includes("export const backupRescueSave"), 'saveLoad exports backupRescueSave');
assert(files.saveLoad.includes("SAVE_VERSION = '0.7.0'"), 'save format remains 0.7.0 across hotfixes');
assert(files.saveLoad.includes("SAVE_KEY = 'mmoworldsimulator.save.v0.7.0'"), 'save key remains v0.7.0');
assert(!files.saveLoad.includes('LEGACY_KEYS'), 'legacy save keys not restored');

const saveImport = files.gameStore.match(/import \{[\s\S]*?\} from ["']\.\.\/engine\/saveLoad["'];/)?.[0] ?? '';
assert(saveImport.includes('loadGame'), 'gameStore imports loadGame');
assert(saveImport.includes('saveGame'), 'gameStore imports saveGame');
assert(saveImport.includes('clearSave'), 'gameStore imports clearSave');
assert(saveImport.includes('flushSaveGame'), 'gameStore imports flushSaveGame');
assert(!files.gameStore.includes('loadGame is not defined'), 'literal loadGame runtime error not present');
assert(files.gameStore.includes('const savedServer = loadGame();') || files.gameStore.includes('loadGame()'), 'gameStore calls imported loadGame');

assert(files.runtimeReset.includes('prepareRuntimeResetBeforeAppImport'), 'sync runtime reset exists');
assert(files.runtimeReset.includes('runDeferredRuntimeCleanup'), 'deferred cleanup exists');
assert(files.runtimeReset.includes('withTimeout'), 'deferred cleanup has timeout');
assert(files.main.includes('prepareRuntimeResetBeforeAppImport();'), 'main does sync reset before App import');
assert(files.main.includes("await import('./app/App')"), 'main dynamically imports App');
assert(files.main.includes('renderBootError'), 'main renders visible boot error');
assert(!files.main.includes('await runRuntimeResetIfNeeded()'), 'main does not block boot on async reset');

assert(files.version.includes("APP_VERSION = '0.7.2'"), 'APP_VERSION is 0.7.2');
assert(files.versionJson.includes('"version": "0.7.2"'), 'version.json is 0.7.2');
assert(files.sw.includes("CACHE_NAME = 'mmows-v0.7.2'"), 'service worker cache is 0.7.2');
assert(files.manifest.includes('"version": "0.7.2"'), 'manifest version is 0.7.2');

if (fail.length) {
  console.error('Sanity failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}

console.log('Sanity passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
