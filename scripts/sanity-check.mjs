import fs from 'node:fs';

const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';

const files = {
  packageJson: read('package.json'),
  saveLoad: read('src/engine/saveLoad.ts'),
  version: read('src/engine/version.ts'),
  versionJson: read('public/version.json'),
  sw: read('public/sw.js'),
  combatSystem: read('src/systems/combatSystem.ts'),
  lootSystem: read('src/systems/lootSystem.ts'),
};

const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

assert(files.packageJson.includes('"version": "0.6.12"'), 'package version is 0.6.12');
assert(files.saveLoad.includes("SAVE_VERSION = '0.6.12'"), 'save version is 0.6.12');
assert(files.saveLoad.includes('mmoworldsimulator.save.v0.6.11'), '0.6.11 legacy save key exists');
assert(files.version.includes("APP_VERSION = '0.6.12'"), 'APP_VERSION is 0.6.12');
assert(files.versionJson.includes('"version": "0.6.12"'), 'version.json is 0.6.12');
assert(files.sw.includes("mmows-v0.6.12"), 'service worker cache is v0.6.12');

assert(!files.combatSystem.includes('enemy.attack / 5'), 'old /5 spot attack nerf removed');
assert(!files.combatSystem.includes('enemy.magic / 5'), 'old /5 spot magic nerf removed');
assert(files.combatSystem.includes('minPenetratingAttack'), 'spot mobs have penetration floor');
assert(files.combatSystem.includes('playerDefense'), 'spot mob damage accounts for player defense');

assert(files.lootSystem.includes("item.rarity === 'common'") && files.lootSystem.includes('0.3'), 'common equipment drop is 30%');
assert(files.lootSystem.includes("item.rarity === 'uncommon'") && files.lootSystem.includes('0.2'), 'uncommon equipment drop is 20%');
assert(files.lootSystem.includes("item.rarity === 'rare'") && files.lootSystem.includes('0.1'), 'rare equipment drop is 10%');
assert(files.lootSystem.includes("item.rarity === 'epic'") && files.lootSystem.includes('return 0'), 'epic equipment drop chance is 0 in mob loot');
assert(files.lootSystem.includes('bestEquipmentDrop'), 'only best rarity equipment drop selected');
assert(files.lootSystem.includes('return equipment ? [...normalDrops, equipment] : normalDrops'), 'max one equipment item returned');
assert(!files.lootSystem.includes('0.05'), 'old 5% purple equipment chance removed');
assert(!files.lootSystem.includes('rarityScore'), 'lootSystem does not depend on external rarityScore export');

if (fail.length) {
  console.error('Sanity failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}

console.log('Sanity passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
