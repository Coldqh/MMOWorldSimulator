import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

const gameStore = read('src/state/gameStore.ts');
const pkg = read('package.json');

assert(pkg.includes('"version": "0.7.8"'), 'version bumped to 0.7.8');
assert(!gameStore.includes('},}));'), 'bad duplicated store tail removed');
assert(gameStore.trimEnd().endsWith('}));'), 'store closes cleanly');
assert(gameStore.includes('openGuildProfile'), 'guild profile action preserved');
assert(gameStore.includes('openGuildRoster'), 'guild roster action preserved');

if (fail.length) {
  console.error('Smoke failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}

console.log('Smoke passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
