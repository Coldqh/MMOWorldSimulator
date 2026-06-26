import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

const pkg = read('package.json');
const saveLoad = read('src/engine/saveLoad.ts');
const locationNpcList = read('src/ui/components/LocationNpcList.tsx');
const guildScreen = read('src/ui/screens/GuildScreen.tsx');
const guildWarSeed = read('src/systems/guildWarSeedSystem.ts');
const gameStore = read('src/state/gameStore.ts');

assert(pkg.includes('"version": "0.7.9"'), 'version bumped');
assert(saveLoad.includes("SAVE_VERSION = '0.7.0'"), 'save compatibility untouched');
assert(locationNpcList.includes('PAGE_SIZE = 10'), 'npc location pagination enabled');
assert(locationNpcList.includes('return bEnemy - aEnemy'), 'enemy guild NPCs sorted first');
assert(guildScreen.includes('Профиль'), 'guild profile tab title exists');
assert(guildScreen.includes('Отношения'), 'guild relations tab exists');
assert(guildScreen.includes('Войны'), 'guild wars tab exists');
assert(guildWarSeed.includes('existingActive.length > 0'), 'war seeding does not duplicate active wars');
assert(gameStore.includes('openGuildRelations'), 'guild relations modal action exists');

if (fail.length) {
  console.error('Smoke failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}

console.log('Smoke passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
