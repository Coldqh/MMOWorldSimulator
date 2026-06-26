import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

const gameStore = read('src/state/gameStore.ts');
const guildWarSystem = read('src/systems/guildWarSystem.ts');
const npcLocationSystem = read('src/systems/npcLocationSystem.ts');
const pkg = read('package.json');

assert(pkg.includes('"version": "0.7.11"'), 'version bumped');
assert(gameStore.includes('seedInitialGuildWarsIfNeeded'), 'war seed import/reference present');
assert(!guildWarSystem.includes("type: 'pvp'"), 'guild war notification type fixed');
assert(!npcLocationSystem.includes("type: 'pvp'"), 'location notification type fixed');
assert(gameStore.trimEnd().endsWith('}));'), 'gameStore closes cleanly');

if (fail.length) {
  console.error('Smoke failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}

console.log('Smoke passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
