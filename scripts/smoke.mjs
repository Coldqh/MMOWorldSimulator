import fs from 'node:fs';
const main = fs.readFileSync('src/main.tsx', 'utf8');
const reset = fs.readFileSync('src/engine/runtimeReset.ts', 'utf8');
const fail=[]; const ok=[]; const assert=(c,m)=>c?ok.push(m):fail.push(m);
assert(main.includes('prepareRuntimeResetBeforeAppImport();'), 'boot does sync storage reset');
assert(main.includes("await import('./app/App')"), 'gameStore cannot load before sync reset');
assert(main.includes('renderBootError'), 'boot failure is visible');
assert(reset.includes('withTimeout'), 'async cleanup cannot hang forever');
assert(reset.includes('runDeferredRuntimeCleanup'), 'SW/cache cleanup is deferred');
assert(reset.includes('key !== CURRENT_SAVE_KEY'), 'v0.7 save is not wiped');
if (fail.length) { console.error('Smoke failed:'); fail.forEach((m)=>console.error(`- ${m}`)); process.exit(1); }
console.log('Smoke passed:'); ok.forEach((m)=>console.log(`- ${m}`));
