import fs from 'node:fs';

const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';

const files = {
  pkg: read('package.json'),
  version: read('src/engine/version.ts'),
  saveLoad: read('src/engine/saveLoad.ts'),
  gameStore: read('src/state/gameStore.ts'),
  guildRuntime: read('src/systems/guildRuntimeSystem.ts'),
  guildScreen: read('src/ui/screens/GuildScreen.tsx'),
  guildWarPanel: read('src/ui/components/GuildWarPanel.tsx'),
};

const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

const simulatorMatches = files.gameStore.match(/const simulateServerForMinutes\s*=/g) ?? [];

assert(files.pkg.includes('"version": "0.7.15"'), 'package version 0.7.15');
assert(files.version.includes("APP_VERSION = '0.7.15'"), 'APP_VERSION 0.7.15');
assert(files.saveLoad.includes("SAVE_VERSION = '0.7.0'"), 'save line remains 0.7.0');
assert(simulatorMatches.length === 1, `exactly one simulateServerForMinutes declaration, found ${simulatorMatches.length}`);
assert(files.gameStore.includes('simulateGuildWarsEveryHalfHour(next, rng, minutes)'), 'guild war runtime simulation is wired into time skip');
assert(files.gameStore.includes('maybeGeneratePlayerGuildApplication(next, rng)'), 'player guild application generation is wired into time skip');
assert(files.gameStore.includes('createPlayerGuildRuntime'), 'create guild runtime action wired');
assert(files.gameStore.includes('declareWarDirectRuntime'), 'direct guild war declaration wired');
assert(files.guildRuntime.includes('simulateGuildWarsEveryHalfHour'), 'guild runtime war simulation helper exists');
assert(files.guildRuntime.includes('ensureSoloNpcPool'), 'solo NPC pool helper exists');
assert(files.guildScreen.includes('Создать гильдию'), 'create guild UI exists');
assert(files.guildScreen.includes('Заявки одиночек'), 'guild applications UI exists');
assert(files.guildWarPanel.includes('Объявить войну'), 'declare war subtab exists');
assert(!files.gameStore.includes('},}));'), 'gameStore malformed tail absent');
assert(files.gameStore.trimEnd().endsWith('}));'), 'gameStore closes cleanly');

if (fail.length) {
  console.error('Sanity failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}

console.log('Sanity passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
