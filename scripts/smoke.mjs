import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

const saveLoad = read('src/engine/saveLoad.ts');
const gameStore = read('src/state/gameStore.ts');
const main = read('src/main.tsx');

const saveImport = gameStore.match(/import \{[\s\S]*?\} from ["']\.\.\/engine\/saveLoad["'];/)?.[0] ?? '';

assert(saveLoad.includes('export const loadGame'), 'loadGame export exists');
assert(saveImport.includes('loadGame'), 'loadGame import exists');
assert(saveImport.includes('saveGame'), 'saveGame import exists');
assert(saveImport.includes('clearSave'), 'clearSave import exists');
assert(saveImport.includes('flushSaveGame'), 'flushSaveGame import exists');
assert(saveLoad.includes("SAVE_KEY = 'mmoworldsimulator.save.v0.7.0'"), 'save key remains v0.7.0');
assert(main.includes('prepareRuntimeResetBeforeAppImport();'), 'boot uses sync reset');
assert(main.includes("await import('./app/App')"), 'App imports after sync reset');
assert(!main.includes('await runRuntimeResetIfNeeded()'), 'boot does not await async cleanup');
assert(main.includes('renderBootError'), 'boot errors render visibly');

if (fail.length) {
  console.error('Smoke failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}

console.log('Smoke passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
