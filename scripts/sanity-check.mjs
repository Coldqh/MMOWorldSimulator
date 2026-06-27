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

const firstImportBlock = files.gameStore.slice(0, files.gameStore.indexOf('interface GameStore {'));
const zustandImport = firstImportBlock.match(/import\s+\{([\s\S]*?)\}\s+from\s+["']zustand["'];/)?.[1] ?? '';
const simulatorMatches = files.gameStore.match(/const simulateServerForMinutes\s*=/g) ?? [];
const warProfileActionMatches = files.gameStore.match(/openGuildWarProfile:/g) ?? [];

assert(files.pkg.includes('"version": "0.7.18"'), 'package version 0.7.18');
assert(files.version.includes("APP_VERSION = '0.7.18'"), 'APP_VERSION 0.7.18');
assert(files.saveLoad.includes("SAVE_VERSION = '0.7.0'"), 'SAVE_VERSION remains 0.7.0');

assert(files.gameStore.startsWith('import { create } from "zustand";'), 'gameStore starts with clean zustand import');
assert(zustandImport.trim() === 'create', 'zustand import only contains create');
assert(!firstImportBlock.includes('from "../engine/createNewGame";\nimport { ITEMS,'), 'no merged createNewGame/items import corruption');
assert(!firstImportBlock.includes('from "../content/world";\nimport { createRng,'), 'no merged world/rng import corruption');
assert(!firstImportBlock.includes('from "../systems/enhancementSystem";\nimport { attackWarEnemyNpc'), 'no merged enhancement/system import corruption');
assert(firstImportBlock.includes('SAVE_VERSION') && firstImportBlock.includes('from "../engine/saveLoad";'), 'SAVE_VERSION imported from saveLoad');
assert(firstImportBlock.includes('buildGuildWarProfileLines') && firstImportBlock.includes('from "../systems/guildRuntimeSystem";'), 'war profile builder imported from guildRuntimeSystem');

assert(simulatorMatches.length === 1, `exactly one simulateServerForMinutes declaration, found ${simulatorMatches.length}`);
assert(warProfileActionMatches.length >= 2, 'openGuildWarProfile exists in type and implementation');
assert(files.gameStore.includes('openGuildWarProfile: (warId) => {'), 'openGuildWarProfile implementation exists');
assert(files.gameStore.includes('buildGuildWarProfileLines(server, war)'), 'war profile modal uses shared profile lines');
assert(files.guildRuntime.includes('export const buildGuildWarProfileLines'), 'war profile line builder exported');
assert(files.guildRuntime.includes("title: 'Война завершена'"), 'war finished notification exists');
assert(files.guildScreen.includes('showServerWars ? <ServerGuildWarList /> : <GuildWarPanel />'), 'guild screen war visibility rule exists');
assert(files.guildWarPanel.includes("type ServerTab = 'active' | 'history'"), 'server wars active/history tabs exist');
assert(files.guildWarPanel.includes('isLeader &&'), 'declare war hidden unless GM');
assert(!files.guildWarPanel.includes('Профиль войны</div>'), 'war profile is modal, not inline panel');
assert(!files.gameStore.includes('},}));'), 'gameStore malformed tail absent');
assert(files.gameStore.trimEnd().endsWith('}));'), 'gameStore closes cleanly');

if (fail.length) {
  console.error('Sanity failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}

console.log('Sanity passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
