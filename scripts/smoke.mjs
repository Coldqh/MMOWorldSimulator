import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

const pkg = read('package.json');
const gameStore = read('src/state/gameStore.ts');
const guildRuntime = read('src/systems/guildRuntimeSystem.ts');
const guildScreen = read('src/ui/screens/GuildScreen.tsx');

assert(pkg.includes('"version": "0.7.14"'), 'version bumped');
assert(gameStore.includes('simulateGuildWarsEveryHalfHour'), 'war runtime connected');
assert(gameStore.includes('createPlayerGuildRuntime'), 'create guild runtime connected');
assert(guildRuntime.includes('player_guild_app_'), 'player guild applications generated');
assert(guildScreen.includes('Создать за 50 000'), 'guild creation button exists');
assert(gameStore.trimEnd().endsWith('}));'), 'gameStore closes cleanly');

if (fail.length) {
  console.error('Smoke failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}
console.log('Smoke passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
