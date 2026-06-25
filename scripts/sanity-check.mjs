import fs from 'node:fs';

const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';

const files = {
  packageJson: read('package.json'),
  saveLoad: read('src/engine/saveLoad.ts'),
  version: read('src/engine/version.ts'),
  versionJson: read('public/version.json'),
  sw: read('public/sw.js'),
  world: read('src/content/world.ts'),
  worldRebalance: read('src/content/worldRebalance.ts'),
  items: read('src/content/items.ts'),
  itemSets: read('src/content/itemSetDefinitions.ts'),
  itemLegacy: read('src/content/itemLegacy.ts'),
  questGivers: read('src/content/questGivers.ts'),
  quests: read('src/content/quests.ts'),
  worldScreen: read('src/ui/screens/WorldScreen.tsx'),
};

const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

assert(files.packageJson.includes('"version": "0.6.2"'), 'package version is 0.6.2');
assert(files.saveLoad.includes("SAVE_VERSION = '0.6.2'"), 'save version is 0.6.2');
assert(files.saveLoad.includes('mmoworldsimulator.save.v0.6.1'), '0.6.1 legacy save key exists');
assert(files.version.includes("APP_VERSION = '0.6.2'"), 'APP_VERSION is 0.6.2');
assert(files.versionJson.includes('"version": "0.6.2"'), 'version.json is 0.6.2');
assert(files.sw.includes("mmows-v0.6.2"), 'service worker cache is v0.6.2');

assert(files.saveLoad.includes('saveScore') && files.saveLoad.includes('compareScore'), 'save loader chooses best save by progress');
assert(files.saveLoad.includes('localStorage.setItem(SAVE_KEY, JSON.stringify(normalized))'), 'load migrates best save to current key');
assert(files.saveLoad.includes("window.addEventListener('pagehide'") && files.saveLoad.includes('visibilitychange'), 'save flushes on pagehide/visibilitychange');

assert(files.world.includes('rebalanceWorldContent') && files.world.includes('REBALANCE_MOBS'), 'world applies rebalance layer');
assert(files.items.includes('REBALANCE_MOBS') && files.items.includes('REMOVED_MOB_IDS'), 'mob cards include rebalance mobs and exclude removed mobs');

assert(files.worldRebalance.includes("REMOVED_ZONE_IDS = new Set(['iron_quarry', 'skyfall_pass'])"), 'iron quarry and skyfall pass removed');
assert(files.worldRebalance.includes("REMOVED_DUNGEON_IDS = new Set(['thorn_crown_crypt'])"), 'thorn crypt removed');
assert(files.worldRebalance.includes("REMOVED_MOB_IDS = new Set(['thorn_crown_hound', 'thorn_crown_acolyte'])"), 'unused thorn mobs removed');
assert(files.worldRebalance.includes("levelRange: [1, 4]") && files.worldRebalance.includes("levelRange: [5, 8]") && files.worldRebalance.includes("levelRange: [9, 12]") && files.worldRebalance.includes("levelRange: [13, 16]") && files.worldRebalance.includes("levelRange: [17, 19]") && files.worldRebalance.includes("levelRange: [20, 20]"), 'zone level bands exist');
assert(files.worldRebalance.includes("zoneId: 'ashen_mire'") && files.worldRebalance.includes("name: 'Дозор Чёрного Короля'"), 'black king dungeon moved to ashen mire');
assert(files.worldRebalance.includes("zoneId: 'moonwood'") && files.worldRebalance.includes("mire_depths"), 'mire depths moved to moonwood');
assert(files.worldRebalance.includes("glass_catacomb") && files.worldRebalance.includes("zoneId: 'wyrmspire_peak'"), 'glass catacomb level 20 zone');

assert(!files.itemSets.includes("id: 'dungeon_thorn_crypt'"), 'thorn crypt set definition removed');
assert(files.itemLegacy.includes('thorn_crypt_') && files.itemLegacy.includes('old_lantern_'), 'old thorn gear migrates to lower old lantern gear');
assert(files.itemLegacy.includes("setId === 'dungeon_thorn_crypt'") && files.itemLegacy.includes("'dungeon_old_lantern'"), 'old thorn set id migrates');

assert((files.questGivers.match(/type: 'quest_giver'/g) ?? []).length === 7, '7 quest givers');
['starting_city','greenfield','redcap_hills','ashen_mire','moonwood','frostspire_ridge','wyrmspire_peak'].forEach((zone) =>
  assert(files.questGivers.includes(`zoneId: '${zone}'`), `quest giver exists in ${zone}`)
);

assert(files.worldScreen.includes('spotLevelText') && files.worldScreen.includes('getMobById(mobId)?.level'), 'spot level display uses mob levels');
assert(files.worldScreen.includes('modal-backdrop travel-modal-backdrop'), 'travel remains modal overlay');
assert(files.worldScreen.includes('availableZonesForPlayer'), 'travel filters available zones');

if (fail.length) {
  console.error('Sanity failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}

console.log('Sanity passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
