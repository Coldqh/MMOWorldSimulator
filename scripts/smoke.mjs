import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

const pkg = read('package.json');
const gameStore = read('src/state/gameStore.ts');
const simulatorMatches = gameStore.match(/const simulateServerForMinutes\s*=/g) ?? [];

assert(pkg.includes('"version": "0.7.15"'), 'version bumped');
assert(simulatorMatches.length === 1, 'duplicate simulateServerForMinutes removed');
assert(gameStore.includes('simulateGuildWarsEveryHalfHour(next, rng, minutes)'), 'war sim survives');
assert(gameStore.includes('maybeGeneratePlayerGuildApplication(next, rng)'), 'guild applications survive');
assert(gameStore.trimEnd().endsWith('}));'), 'gameStore closes cleanly');

if (fail.length) {
  console.error('Smoke failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}

console.log('Smoke passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
