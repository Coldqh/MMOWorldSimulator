import fs from 'node:fs';

const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';

const files = {
  packageJson: read('package.json'),
  saveLoad: read('src/engine/saveLoad.ts'),
  version: read('src/engine/version.ts'),
  versionJson: read('public/version.json'),
  sw: read('public/sw.js'),
  types: read('src/types/game.ts'),
  questGivers: read('src/content/questGivers.ts'),
  quests: read('src/content/quests.ts'),
  questItems: read('src/content/questItems.ts'),
  questSystem: read('src/systems/questSystem.ts'),
  world: read('src/ui/screens/WorldScreen.tsx'),
  questScreen: read('src/ui/screens/QuestScreen.tsx'),
  appShell: read('src/ui/layout/AppShell.tsx'),
  gameStore: read('src/state/gameStore.ts'),
  items: read('src/content/items.ts'),
  worldBase: read('src/content/worldBase.ts'),
};

const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

const uniq = (arr) => new Set(arr).size === arr.length;
const idsFrom = (text) => [...text.matchAll(/\bid:\s*'([^']+)'/g)].map((match) => match[1]);
const giverIds = idsFrom(files.questGivers).filter((id) => id.startsWith('qg_'));
const questIds = idsFrom(files.quests).filter((id) => id.startsWith('quest_'));
const questItemIds = idsFrom(files.questItems);

assert(files.packageJson.includes('"version": "0.6.0"'), 'package version is 0.6.0');
assert(files.saveLoad.includes("SAVE_VERSION = '0.6.0'"), 'save version is 0.6.0');
assert(files.saveLoad.includes('mmoworldsimulator.save.v0.5.12'), '0.5.12 legacy save key exists');
assert(files.version.includes("APP_VERSION = '0.6.0'"), 'APP_VERSION is 0.6.0');
assert(files.versionJson.includes('"version": "0.6.0"'), 'version.json is 0.6.0');
assert(files.sw.includes("mmows-v0.6.0"), 'service worker cache is v0.6.0');

assert(files.types.includes('WorldNpcType') && files.types.includes('"quest_giver"'), 'WorldNpcType quest_giver exists');
assert(files.types.includes('QuestDefinition') && files.types.includes('QuestObjective'), 'quest types exist');
assert(files.types.includes('questStates:'), 'ServerState has questStates');
assert(files.types.includes('| "quests"'), 'ScreenId has quests tab');

assert(giverIds.length === 5 && uniq(giverIds), '5 unique quest givers');
assert(questIds.length >= 17 && uniq(questIds), '17 unique quests');
assert(files.questGivers.includes("type: 'quest_giver'") && !files.questGivers.includes('trainer') && !files.questGivers.includes('merchant'), 'only quest_giver world NPC type');
assert(files.questGivers.includes('qg_mara_vane') && files.questGivers.includes('starting_city'), 'Mara exists in starting city');
assert(files.questGivers.includes('qg_nathan_rowl') && files.questGivers.includes('redcap_hills'), 'Nathan placed near first dungeon zone');

['slime_residue', 'wolf_pelt', 'moon_dust', 'old_lantern_key_fragment', 'old_lantern_mark'].forEach((id) =>
  assert(questItemIds.includes(id), `quest item exists: ${id}`)
);
assert(files.items.includes('QUEST_ITEMS') && files.items.includes('...QUEST_ITEMS'), 'quest items added to item registry');
assert(files.worldBase.includes('slime_residue') && files.worldBase.includes('wolf_pelt') && files.worldBase.includes('moon_dust') && files.worldBase.includes('old_lantern_key_fragment'), 'quest drops added to loot tables');

['getAvailableQuestsForGiver', 'acceptQuest', 'turnInQuest', 'updateQuestProgressOnMobKill', 'updateQuestProgressOnItemGain', 'updateQuestProgressOnDungeonComplete', 'updateQuestProgressOnSystemAction', 'talkToQuestGiver'].forEach((name) =>
  assert(files.questSystem.includes(name), `quest system function exists: ${name}`)
);

assert(files.world.includes('NPC в зоне'), 'WorldScreen shows NPC in zone');
assert(files.world.includes('QuestGiverCard'), 'WorldScreen renders QuestGiverCard');
assert(files.world.includes('quest-marker'), 'quest marker can be shown');
assert(files.questScreen.includes('Активные') && files.questScreen.includes('Завершённые'), 'QuestScreen has active/completed tabs');
assert(files.appShell.includes('QuestScreen') && files.appShell.includes('quests'), 'AppShell wires quests screen');

assert(files.gameStore.includes('acceptQuest:') && files.gameStore.includes('turnInQuest:') && files.gameStore.includes('talkToQuestGiver:'), 'store exposes quest actions');
assert(files.gameStore.includes('updateQuestProgressOnMobKill'), 'mob kill quest integration exists');
assert(files.gameStore.includes('updateQuestProgressOnItemGain'), 'item gain quest integration exists');
assert(files.gameStore.includes('updateQuestProgressOnDungeonComplete'), 'dungeon quest integration exists');
assert(files.gameStore.includes("updateQuestProgressOnSystemAction(next, 'open_party_finder')") || files.gameStore.includes("updateQuestProgressOnSystemAction(server, 'open_party_finder')"), 'party finder system quest integration exists');
assert(files.gameStore.includes("updateQuestProgressOnSystemAction(next, 'visit_greenfield')"), 'greenfield visit quest integration exists');
assert(files.gameStore.includes('questStates: server.questStates ?? {}'), 'old saves normalize questStates');

if (fail.length) {
  console.error('Sanity failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}

console.log('Sanity passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
