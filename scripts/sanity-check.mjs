import fs from 'node:fs';

const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';

const files = {
  pkg: read('package.json'),
  version: read('src/engine/version.ts'),
  saveLoad: read('src/engine/saveLoad.ts'),
  gameStore: read('src/state/gameStore.ts'),
  guildWarSystem: read('src/systems/guildWarSystem.ts'),
  npcLocationSystem: read('src/systems/npcLocationSystem.ts'),
};

const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

assert(files.pkg.includes('"version": "0.7.11"'), 'package version 0.7.11');
assert(files.version.includes("APP_VERSION = '0.7.11'"), 'APP_VERSION 0.7.11');
assert(files.saveLoad.includes("SAVE_VERSION = '0.7.0'"), 'save line remains 0.7.0');
assert(files.gameStore.includes('seedInitialGuildWarsIfNeeded'), 'gameStore references seedInitialGuildWarsIfNeeded');
assert(files.gameStore.includes('guildWarSeedSystem'), 'gameStore imports seedInitialGuildWarsIfNeeded');
assert(!files.guildWarSystem.includes("type: 'pvp'"), 'guildWarSystem uses valid ModalType notifications');
assert(!files.npcLocationSystem.includes("type: 'pvp'"), 'npcLocationSystem uses valid ModalType notifications');
assert(files.guildWarSystem.includes("type: 'guild'") || files.guildWarSystem.includes('type: "guild"'), 'guildWarSystem notification type guild');
assert(files.npcLocationSystem.includes("type: 'guild'") || files.npcLocationSystem.includes('type: "guild"'), 'npcLocationSystem notification type guild');
assert(!files.gameStore.includes('},}));'), 'gameStore malformed tail absent');

if (fail.length) {
  console.error('Sanity failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}

console.log('Sanity passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
