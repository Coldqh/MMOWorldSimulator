import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

const pkg = read('package.json');
const gameStore = read('src/state/gameStore.ts');
const runtime = read('src/systems/guildRuntimeSystem.ts');
const screen = read('src/ui/screens/GuildScreen.tsx');
const panel = read('src/ui/components/GuildWarPanel.tsx');

assert(pkg.includes('"version": "0.7.16"'), 'version bumped');
assert((gameStore.match(/const simulateServerForMinutes\s*=/g) ?? []).length === 1, 'no duplicate simulator');
assert(runtime.includes("count: 34, min: 17, max: 20"), '100 solo NPC pool represented as 33/33/34');
assert(runtime.includes("sameTierWarCount(next, tier) < 2"), 'two tier wars target');
assert(screen.includes('Гильдии') && screen.includes('Войны'), 'guild screen top tabs');
assert(panel.includes('Профиль войны'), 'war profile exists');
assert(gameStore.trimEnd().endsWith('}));'), 'gameStore closes cleanly');

if (fail.length) {
  console.error('Smoke failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}

console.log('Smoke passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
