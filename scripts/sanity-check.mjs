import fs from 'node:fs';

const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';

const files = {
  packageJson: read('package.json'),
  saveLoad: read('src/engine/saveLoad.ts'),
  version: read('src/engine/version.ts'),
  versionJson: read('public/version.json'),
  sw: read('public/sw.js'),
  types: read('src/types/game.ts'),
  worldBase: read('src/content/worldBase.ts'),
  worldFinalize: read('src/content/worldFinalize.ts'),
  dungeonSystem: read('src/systems/dungeonSystem.ts'),
  combat: read('src/systems/combatSystem.ts'),
};

const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

assert(files.packageJson.includes('"version": "0.5.11"'), 'package version is 0.5.11');
assert(files.saveLoad.includes("SAVE_VERSION = '0.5.11'"), 'save version is 0.5.11');
assert(files.saveLoad.includes('mmoworldsimulator.save.v0.5.10'), '0.5.10 legacy save key exists');
assert(files.version.includes("APP_VERSION = '0.5.11'"), 'APP_VERSION is 0.5.11');
assert(files.versionJson.includes('"version": "0.5.11"'), 'version.json is 0.5.11');
assert(files.sw.includes("mmows-v0.5.11"), 'service worker cache is v0.5.11');

assert(!files.worldBase.includes("'mini-boss'") && !files.worldBase.includes('"mini-boss"'), 'worldBase has no mini-boss tag');
assert(!files.worldFinalize.includes("'mini-boss'") && !files.worldFinalize.includes('"mini-boss"'), 'worldFinalize has no mini-boss tag');
assert(files.worldFinalize.includes("tags.filter((tag) => tag !== 'mini-boss')"), 'world finalizer strips legacy mini-boss tags');
assert(files.worldFinalize.includes("bossFloorMobIds"), 'world finalizer marks boss floor mobs');
assert(files.worldFinalize.includes("slice(-3)"), 'world finalizer keeps exactly 3 boss floors');

assert(files.types.includes('bossLootCount?: number'), 'DungeonRunState tracks bossLootCount');
assert(files.types.includes('playerClassBossLootDropped?: boolean'), 'DungeonRunState tracks player class boss loot guarantee');

assert(files.dungeonSystem.includes('const isBossTarget =') && files.dungeonSystem.includes('encounterIndex >= total - 1'), 'dungeon loot only on final boss-floor target');
assert(!files.dungeonSystem.includes("floor.type === 'miniBoss'"), 'dungeon system no longer treats miniBoss type as loot trigger');

assert(files.combat.includes('forcePlayerClass') && files.combat.includes('pickBossPartyDrop(combat, mobIds, rng, forcePlayerClass)'), 'combat can force class boss drop');
assert(files.combat.includes('bossDropIndex') && files.combat.includes('playerClassBossLootDropped'), 'combat tracks instance boss loot progress');
assert(files.combat.includes('isClassDrop'), 'combat detects class drop');
assert(files.combat.includes('currentDungeonRun: server.currentDungeonRun ?'), 'combat updates dungeon run boss loot state');
assert(files.combat.includes('const shouldRollLoot = !isGroupInstance || Boolean(combat.allowLoot);'), 'ordinary dungeon mobs do not roll party gear');

if (fail.length) {
  console.error('Sanity failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}

console.log('Sanity passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
