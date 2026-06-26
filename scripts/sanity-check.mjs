import fs from 'node:fs';
const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';
const files = {
  packageJson: read('package.json'),
  runtimeReset: read('src/engine/runtimeReset.ts'),
  main: read('src/main.tsx'),
  version: read('src/engine/version.ts'),
  versionJson: read('public/version.json'),
  sw: read('public/sw.js'),
  saveLoad: read('src/engine/saveLoad.ts'),
};
const fail=[]; const ok=[]; const assert=(c,m)=>c?ok.push(m):fail.push(m);
assert(files.packageJson.includes('"version": "0.7.1"'), 'package version is 0.7.1');
assert(files.version.includes("APP_VERSION = '0.7.1'"), 'APP_VERSION is 0.7.1');
assert(files.versionJson.includes('"version": "0.7.1"'), 'version.json is 0.7.1');
assert(files.sw.includes("CACHE_NAME = 'mmows-v0.7.1'"), 'service worker cache is 0.7.1');
assert(files.saveLoad.includes("SAVE_VERSION = '0.7.0'"), 'save format remains 0.7.0');
assert(files.saveLoad.includes("SAVE_KEY = 'mmoworldsimulator.save.v0.7.0'"), 'save key remains v0.7.0');
assert(files.runtimeReset.includes('prepareRuntimeResetBeforeAppImport'), 'sync boot reset exists');
assert(files.runtimeReset.includes('runDeferredRuntimeCleanup'), 'deferred cleanup exists');
assert(files.runtimeReset.includes('withTimeout'), 'SW/cache cleanup has timeout');
assert(files.runtimeReset.includes('CURRENT_SAVE_KEY'), 'current save key is protected');
assert(files.main.includes('prepareRuntimeResetBeforeAppImport();'), 'main runs sync reset before App import');
assert(files.main.includes("await import('./app/App')"), 'App import stays dynamic after reset');
assert(files.main.includes('renderBootError'), 'boot errors render visibly instead of infinite loading');
assert(files.main.includes('runDeferredRuntimeCleanup'), 'cleanup runs after render');
assert(!files.main.includes('await runRuntimeResetIfNeeded'), 'main no longer blocks on full runtime reset');
if (fail.length) { console.error('Sanity failed:'); fail.forEach((m)=>console.error(`- ${m}`)); process.exit(1); }
console.log('Sanity passed:'); ok.forEach((m)=>console.log(`- ${m}`));
