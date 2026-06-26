import fs from 'node:fs';

const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';

const files = {
  pkg: read('package.json'),
  version: read('src/engine/version.ts'),
  saveLoad: read('src/engine/saveLoad.ts'),
  guildWarSeed: read('src/systems/guildWarSeedSystem.ts'),
  runtimeValidation: read('src/engine/runtimeValidation.ts'),
  createNewGame: read('src/engine/createNewGame.ts'),
  gameStore: read('src/state/gameStore.ts'),
  guildScreen: read('src/ui/screens/GuildScreen.tsx'),
  guildWarPanel: read('src/ui/components/GuildWarPanel.tsx'),
  locationNpcList: read('src/ui/components/LocationNpcList.tsx'),
  resultModal: read('src/ui/components/ResultModal.tsx'),
};

const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

assert(files.pkg.includes('"version": "0.7.9"'), 'package version 0.7.9');
assert(files.version.includes("APP_VERSION = '0.7.9'"), 'APP_VERSION 0.7.9');
assert(files.saveLoad.includes("SAVE_VERSION = '0.7.0'"), 'save line remains 0.7.0');
assert(files.guildWarSeed.includes('seedInitialGuildWarsIfNeeded'), 'guild war seed helper exists');
assert(files.runtimeValidation.includes('seedInitialGuildWarsIfNeeded'), 'runtime validation seeds initial wars');
assert(files.createNewGame.includes('seedInitialGuildWarsIfNeeded'), 'new game seeds initial wars');
assert(files.gameStore.includes('seedInitialGuildWarsIfNeeded'), 'gameStore normalization seeds wars');
assert(files.guildScreen.includes('type GuildTab = "profile" | "roster" | "relations" | "wars" | "events"'), 'guild screen has guild subtabs');
assert(files.guildScreen.includes('setTab("profile")') || files.guildScreen.includes("setTab('profile')"), 'guild screen has profile tab');
assert(files.guildScreen.includes('ГМ') && files.guildScreen.includes('Зам') && files.guildScreen.includes('Офицеры'), 'guild profile indicators exist');
assert(files.guildScreen.includes('openGuildRelations'), 'guild screen opens relations action');
assert(files.guildWarPanel.includes("type WarTab = 'active' | 'votes' | 'history'"), 'guild war panel has subtabs');
assert(files.locationNpcList.includes('PAGE_SIZE = 10'), 'location npc list paginates by 10');
assert(files.locationNpcList.includes('aEnemy') && files.locationNpcList.includes('bEnemy'), 'location npc list sorts enemies first');
assert(!files.locationNpcList.includes('Gear {npc.gearScore}'), 'location npc list does not show gear');
assert(files.resultModal.includes('ACTION_GUILD_RELATIONS:'), 'modal supports guild relations action');
assert(files.gameStore.includes('openGuildRelations'), 'gameStore has openGuildRelations action');
assert(!files.gameStore.includes('},}));'), 'gameStore tail is valid');

if (fail.length) {
  console.error('Sanity failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}

console.log('Sanity passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
