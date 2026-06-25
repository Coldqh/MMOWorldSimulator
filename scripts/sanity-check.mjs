import fs from 'node:fs';

const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';

const files = {
  packageJson: read('package.json'),
  saveLoad: read('src/engine/saveLoad.ts'),
  version: read('src/engine/version.ts'),
  versionJson: read('public/version.json'),
  sw: read('public/sw.js'),
  types: read('src/types/game.ts'),
  createNewGame: read('src/engine/createNewGame.ts'),
  gameStore: read('src/state/gameStore.ts'),
  combat: read('src/systems/combatSystem.ts'),
  quests: read('src/content/quests.ts'),
};

const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

assert(files.packageJson.includes('"version": "0.6.3"'), 'package version is 0.6.3');
assert(files.saveLoad.includes("SAVE_VERSION = '0.6.3'"), 'save version is 0.6.3');
assert(files.saveLoad.includes('mmoworldsimulator.save.v0.6.2'), '0.6.2 legacy save key exists');
assert(files.version.includes("APP_VERSION = '0.6.3'"), 'APP_VERSION is 0.6.3');
assert(files.versionJson.includes('"version": "0.6.3"'), 'version.json is 0.6.3');
assert(files.sw.includes("mmows-v0.6.3"), 'service worker cache is 0.6.3');

const runState = files.types.match(/export interface DungeonRunState \{[\s\S]*?\n\}/)?.[0] ?? '';
assert(runState.includes('bossLootCount?: number'), 'DungeonRunState has bossLootCount');
assert(runState.includes('playerClassBossLootDropped?: boolean'), 'DungeonRunState has playerClassBossLootDropped');

assert(files.createNewGame.includes('questStates: {}'), 'createNewGame initializes questStates');

const normalizeBlock = files.gameStore.match(/const baseServer: ServerState = \{[\s\S]*?\n  \};/)?.[0] ?? '';
assert((normalizeBlock.match(/currentPartyListingId:/g) ?? []).length <= 1, 'gameStore has no duplicate currentPartyListingId in baseServer');
assert((normalizeBlock.match(/location:/g) ?? []).length <= 1, 'gameStore has no duplicate location in baseServer');

const finishVictory = files.combat.match(/const finishVictory = [\s\S]*?export const applyCombatAction/)?.[0] ?? files.combat;
const isGroupIndex = finishVictory.indexOf('const isGroupInstance');
const classDropIndex = finishVictory.indexOf('const isClassDrop');
const updateIndex = finishVictory.indexOf('bossLootCount: (server.currentDungeonRun.bossLootCount ?? 0) + 1');
assert(isGroupIndex >= 0 && classDropIndex >= 0 && updateIndex > classDropIndex && classDropIndex > isGroupIndex, 'combat boss loot update happens after isGroupInstance and isClassDrop');

assert(files.quests.includes('export const getQuestById'), 'quests exports getQuestById');
assert(files.quests.includes('QUESTS.find((quest) => quest.id === id)'), 'getQuestById implementation exists');

if (fail.length) {
  console.error('Sanity failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}

console.log('Sanity passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
