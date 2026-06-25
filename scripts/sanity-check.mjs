import fs from 'node:fs';

const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';

const files = {
  packageJson: read('package.json'),
  saveLoad: read('src/engine/saveLoad.ts'),
  version: read('src/engine/version.ts'),
  versionJson: read('public/version.json'),
  sw: read('public/sw.js'),
  appShell: read('src/ui/layout/AppShell.tsx'),
  world: read('src/ui/screens/WorldScreen.tsx'),
  questGivers: read('src/content/questGivers.ts'),
  quests: read('src/content/quests.ts'),
};

const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

assert(files.packageJson.includes('"version": "0.6.5"'), 'package version is 0.6.5');
assert(files.saveLoad.includes("SAVE_VERSION = '0.6.5'"), 'save version is 0.6.5');
assert(files.saveLoad.includes('mmoworldsimulator.save.v0.6.4'), '0.6.4 legacy save key exists');
assert(files.version.includes("APP_VERSION = '0.6.5'"), 'APP_VERSION is 0.6.5');
assert(files.versionJson.includes('"version": "0.6.5"'), 'version.json is 0.6.5');
assert(files.sw.includes("mmows-v0.6.5"), 'service worker cache is 0.6.5');

const bottomBlock = files.appShell.match(/const bottomNav:[\s\S]*?\];/)?.[0] ?? '';
assert(bottomBlock.includes("'character'") && bottomBlock.includes("'world'") && bottomBlock.includes("'quests'"), 'bottom nav has hero/world/quests');
assert(!bottomBlock.includes("'guild'"), 'bottom nav has no guild');
assert(files.appShell.includes('cityOnlyScreens') && files.appShell.includes("'market'") && files.appShell.includes("'arena'") && files.appShell.includes("'enhance'"), 'city-only screen guard exists');
assert(files.appShell.includes('visibleScreen') && files.appShell.includes('screens[visibleScreen]'), 'AppShell renders world instead of city-only screens outside city');

assert(files.world.includes("openScreen('market')") && files.world.includes('Сменить локацию'), 'city screen has travel button and city actions');
assert(files.world.includes('modal-backdrop travel-modal-backdrop'), 'travel uses modal overlay');
assert(files.world.includes('availableZonesForPlayer'), 'travel shows available zones');
assert(files.world.includes("onClick={() => setTravelOpen(true)}"), 'travel modal can open from city/world movement button');

const giverNames = [...files.questGivers.matchAll(/name: '([^']+)'/g)].map((m) => m[1]);
assert(giverNames.length === 7, '7 quest givers');
assert(new Set(giverNames).size === giverNames.length, 'quest giver names are unique');
assert(files.questGivers.includes("qg_mara_vane") && files.questGivers.includes("questIds: ['quest_first_steps']"), 'Mara has only one transition quest');

const questTypes = [...files.quests.matchAll(/type: '([^']+)'/g)].map((m) => m[1]);
assert(questTypes.every((type) => ['kill', 'dungeon', 'system'].includes(type)), 'quests are only kill/dungeon/system transition');
assert(!files.quests.includes("type: 'collect'") && !files.quests.includes("type: 'talk'"), 'collect/talk quests removed for now');
assert(files.quests.includes("export const getQuestById"), 'getQuestById export exists');

['qg_old_holt','qg_brigg_colter','qg_sera_ash','qg_lyra_munn','qg_sigrid_hale','qg_arlan_voss'].forEach((giverId) => {
  const regex = new RegExp(`id: '${giverId}'[\\s\\S]*?questIds: \\[([^\\]]+)\\]`);
  const match = files.questGivers.match(regex);
  const count = match ? (match[1].match(/quest_/g) ?? []).length : 0;
  assert(count >= 3 && count <= 5, `${giverId} has 3-5 quests`);
});

if (fail.length) {
  console.error('Sanity failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}

console.log('Sanity passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
