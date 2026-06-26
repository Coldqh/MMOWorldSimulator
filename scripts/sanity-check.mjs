import fs from 'node:fs';

const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';

const files = {
  pkg: read('package.json'),
  version: read('src/engine/version.ts'),
  gameStore: read('src/state/gameStore.ts'),
  saveLoad: read('src/engine/saveLoad.ts'),
};

const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

assert(files.pkg.includes('"version": "0.7.8"'), 'package version 0.7.8');
assert(files.version.includes("APP_VERSION = '0.7.8'"), 'APP_VERSION 0.7.8');
assert(files.saveLoad.includes("SAVE_VERSION = '0.7.0'"), 'save line remains 0.7.0');
assert(!files.gameStore.includes('},}));'), 'gameStore has no malformed Zustand close },}));');
assert(files.gameStore.trimEnd().endsWith('}));'), 'gameStore ends with Zustand close }));');
assert((files.gameStore.match(/openGuildProfile:/g) ?? []).length === 1, 'openGuildProfile defined once');
assert((files.gameStore.match(/openGuildRoster:/g) ?? []).length === 1, 'openGuildRoster defined once');
assert(files.gameStore.includes('ACTION_NPC_PROFILE:'), 'NPC profile actions preserved');

if (fail.length) {
  console.error('Sanity failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}

console.log('Sanity passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
