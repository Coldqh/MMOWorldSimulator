import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

const pkg = read('package.json');
const gameStore = read('src/state/gameStore.ts');
const header = gameStore.slice(0, gameStore.indexOf('interface GameStore {'));

assert(pkg.includes('"version": "0.7.18"'), 'version bumped');
assert(gameStore.startsWith('import { create } from "zustand";'), 'clean import header');
assert(!header.includes('SAVE_VERSION,\n  acceptPlayerGuildApplication'), 'bad zustand import merge removed');
assert((gameStore.match(/const simulateServerForMinutes\s*=/g) ?? []).length === 1, 'no duplicate simulator');
assert(gameStore.includes('openGuildWarProfile: (warId) => {'), 'war profile action exists');
assert(gameStore.includes('buildGuildWarProfileLines(server, war)'), 'war profile modal lines exist');
assert(gameStore.trimEnd().endsWith('}));'), 'gameStore closes cleanly');

if (fail.length) {
  console.error('Smoke failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}

console.log('Smoke passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
