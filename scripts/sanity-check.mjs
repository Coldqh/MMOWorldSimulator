import fs from 'node:fs';

const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';
const exists = (path) => fs.existsSync(path);

const files = {
  packageJson: read('package.json'),
  saveLoad: read('src/engine/saveLoad.ts'),
  version: read('src/engine/version.ts'),
  versionJson: read('public/version.json'),
  sw: read('public/sw.js'),
  character: read('src/ui/screens/CharacterScreen.tsx'),
  dungeon: read('src/ui/screens/DungeonScreen.tsx'),
  partyFinder: read('src/ui/screens/PartyFinderScreen.tsx'),
  combat: read('src/systems/combatSystem.ts'),
  dungeonSystem: read('src/systems/dungeonSystem.ts'),
  worldFinalize: read('src/content/worldFinalize.ts'),
};

const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

assert(files.packageJson.includes('"version": "0.5.10"'), 'package version is 0.5.10');
assert(files.saveLoad.includes("SAVE_VERSION = '0.5.10'"), 'save version is 0.5.10');
assert(files.saveLoad.includes('mmoworldsimulator.save.v0.5.9'), '0.5.9 legacy save key exists');
assert(files.version.includes("APP_VERSION = '0.5.10'"), 'APP_VERSION is 0.5.10');
assert(files.versionJson.includes('"version": "0.5.10"'), 'version.json is 0.5.10');
assert(files.sw.includes("mmows-v0.5.10"), 'service worker cache is v0.5.10');

const actionPanelMatches = files.character.match(/section-title">Действия/g) ?? [];
assert(actionPanelMatches.length === 1, 'CharacterScreen has one Actions block');
assert((files.character.match(/Восстановить/g) ?? []).length === 1, 'recover button appears once');
assert((files.character.match(/Пропустить день/g) ?? []).length === 1, 'skip day button appears once');

assert(files.worldFinalize.includes('normalizeBossFloors'), 'world finalizer normalizes boss floors');
assert(files.worldFinalize.includes('slice(-3)'), 'world finalizer keeps exactly 3 boss floors');
assert(files.worldFinalize.includes("tags: Array.from(new Set([...mob.tags, 'boss']))"), 'boss floor mobs are tagged boss');
assert(files.dungeonSystem.includes("floor.type === 'boss'") && files.dungeonSystem.includes('forceAllowLoot'), 'boss floors force loot in dungeon system');
assert(files.combat.includes('forceAllowLoot = false'), 'combat supports forceAllowLoot');
assert(files.combat.includes('isBossEncounter'), 'combat uses boss encounter flag');
assert(files.combat.includes('playerClassItems') && files.combat.includes('combat.player.classId'), 'boss party drop prioritizes player class');
assert(files.combat.includes('generalFallback'), 'boss party drop has class fallback');

assert(files.dungeon.includes('sortInstancesForPlayer'), 'DungeonScreen sorts instances');
assert(files.dungeon.includes('sortedDungeons.map'), 'DungeonScreen renders sorted dungeons');
assert(files.partyFinder.includes('sortInstancesForPlayer'), 'PartyFinderScreen sorts instances');
assert(files.partyFinder.includes('highestAvailable'), 'PartyFinderScreen auto-selects highest available instance');
assert(files.partyFinder.includes('listingLevel(b) - listingLevel(a)'), 'PartyFinder listings sorted by level');

assert(!files.pwa?.includes?.('window.location.replace'), 'PWA still avoids auto replace reload');

if (fail.length) {
  console.error('Sanity failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}

console.log('Sanity passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
