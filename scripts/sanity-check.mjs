import './import-graph-check.mjs';
import fs from 'node:fs';
import path from 'node:path';

const read = (filePath) => fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
const walk = (dir) => fs.existsSync(dir)
  ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      return entry.isDirectory() ? walk(full) : [full];
    })
  : [];

const files = {
  packageJson: read('package.json'),
  saveLoad: read('src/engine/saveLoad.ts'),
  version: read('src/engine/version.ts'),
  versionJson: read('public/version.json'),
  sw: read('public/sw.js'),
  manifest: read('public/manifest.webmanifest'),
  gameStore: read('src/state/gameStore.ts'),
  main: read('src/main.tsx'),
  architecture: read('ARCHITECTURE.md'),
  items: read('src/content/items.ts'),
  itemContent: read('src/content/itemContent.ts'),
  world: read('src/content/world.ts'),
  mobDefinitions: read('src/content/mobDefinitions.ts'),
  objectiveSystem: read('src/systems/objectiveSystem.ts'),
  rewardSystem: read('src/systems/rewardSystem.ts'),
  partyRoleSystem: read('src/systems/partyRoleSystem.ts'),
  questSystem: read('src/systems/questSystem.ts'),
  contractSystem: read('src/systems/contractSystem.ts'),
  dungeonSystem: read('src/systems/dungeonSystem.ts'),
  partyFinderSystem: read('src/systems/partyFinderSystem.ts'),
  validationFacade: read('src/engine/validation.ts'),
  validateContent: read('src/content/validateContent.ts'),
  contractActions: read('src/ui/actions/contractActions.ts'),
  actionTypes: read('src/ui/actions/types.ts'),
  contractPanel: read('src/ui/components/ContractListPanel.tsx'),
  marketScreen: read('src/ui/screens/MarketScreen.tsx'),
  pwa: read('src/engine/pwa.ts'),
};

const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

const importBlock = files.gameStore.slice(0, files.gameStore.indexOf('interface GameStore {'));

assert(files.packageJson.includes('"version": "0.7.4"'), 'package version is 0.7.4');
assert(files.version.includes("APP_VERSION = '0.7.4'"), 'APP_VERSION is 0.7.4');
assert(files.versionJson.includes('"version": "0.7.4"'), 'version.json is 0.7.4');
assert(files.saveLoad.includes("SAVE_VERSION = '0.7.0'"), 'save format remains 0.7.0');
assert(files.saveLoad.includes("SAVE_KEY = 'mmoworldsimulator.save.v0.7.0'"), 'save key remains v0.7.0');
assert(files.sw.includes("CACHE_NAME = 'mmows-v0.7.3'"), 'service worker cache intentionally unchanged');
assert(files.manifest.includes('"version": "0.7.4"'), 'manifest version is 0.7.4');

[
  'createEmptyServer',
  'loadGame',
  'createRng',
  'getDungeonById',
  'startSpotCombat',
  'refreshPartyFinderListings',
  'repairServerRuntime',
].forEach((name) => assert(importBlock.includes(name), `gameStore boot import still includes ${name}`));

assert(files.items.includes("from './itemContent'"), 'items.ts is a public itemContent barrel');
assert(files.itemContent.includes('MOB_CARD_SOURCE_MOBS'), 'itemContent builds cards from neutral mob definitions');
assert(!files.itemContent.includes("from './world'"), 'itemContent does not import world index');
assert(files.world.includes("from './itemContent'"), 'world imports itemContent, not items barrel');
assert(!files.world.includes("from './items'"), 'world does not import public items barrel');
assert(files.mobDefinitions.includes('WORLD_MOB_DEFINITIONS'), 'mobDefinitions owns neutral mob source');
assert(!files.mobDefinitions.includes('ITEMS'), 'mobDefinitions does not import item content');

assert(files.validationFacade.includes('runAllStaticValidation'), 'validation facade exports static validation');
assert(files.validationFacade.includes('runAllRuntimeValidation'), 'validation facade exports runtime validation');
assert(files.validationFacade.includes('repairRuntime'), 'validation facade exports repairRuntime');
assert(files.validateContent.includes('mob_card_ref_missing'), 'content validation checks mob cards');
assert(files.validateContent.includes('quest_reward_item_ref_missing'), 'content validation checks quest reward item refs');

assert(files.rewardSystem.includes('applyRewardToPlayer'), 'reward helper applies rewards to player');
assert(files.rewardSystem.includes('formatRewardLines'), 'reward helper formats reward lines');
assert(files.questSystem.includes("from './rewardSystem'"), 'questSystem uses rewardSystem');
assert(files.contractSystem.includes("from './rewardSystem'"), 'contractSystem uses rewardSystem');
assert(files.questSystem.includes('applyRewardToPlayer'), 'quest reward application uses helper');
assert(files.contractSystem.includes('applyRewardToPlayer'), 'contract reward application uses helper');

assert(files.objectiveSystem.includes('advanceObjectiveProgress'), 'objective helper exists');
assert(files.questSystem.includes("from './objectiveSystem'"), 'questSystem uses objectiveSystem');
assert(files.contractSystem.includes("from './objectiveSystem'"), 'contractSystem uses objectiveSystem');

assert(files.partyRoleSystem.includes('getClassPartyRole'), 'partyRoleSystem owns class role mapping');
assert(files.partyRoleSystem.includes("classId === 'warrior'") && files.partyRoleSystem.includes("classId === 'priest'"), 'role mapping stable');
assert(files.dungeonSystem.includes("from './partyRoleSystem'"), 'dungeonSystem imports role helpers');
assert(files.partyFinderSystem.includes("from './partyRoleSystem'"), 'partyFinderSystem imports role helpers');
assert(!files.dungeonSystem.includes('const classRole ='), 'dungeonSystem no longer owns local classRole mapping');
assert(!files.partyFinderSystem.includes('if (classId === \\'warrior\\')'), 'partyFinderSystem no longer duplicates warrior role mapping');

assert(files.actionTypes.includes('interface UiAction'), 'UI action type exists');
assert(files.contractActions.includes('getContractActions'), 'contract action factory exists');
assert(files.contractPanel.includes('getContractActions'), 'ContractListPanel renders generated actions');
assert(!files.contractPanel.includes("contract.status === 'available' &&"), 'ContractListPanel no longer hardcodes available buttons');

assert(files.architecture.includes('Mob definitions live in the neutral module'), 'ARCHITECTURE documents mobDefinitions rule');
assert(files.architecture.includes('Reward system'), 'ARCHITECTURE documents reward system');
assert(files.architecture.includes('Party role system'), 'ARCHITECTURE documents party role system');
assert(files.architecture.includes('Validation facade'), 'ARCHITECTURE documents validation facade');

assert(files.marketScreen.includes('repairMarket'), 'MarketScreen still calls store repair action only');
assert(files.marketScreen.includes('visibleGroups'), 'MarketScreen market debug guard intact');
assert(!files.pwa.includes('window.location.replace'), 'PWA still has no forced location.replace');

const contentFiles = walk('src/content').filter((file) => file.endsWith('.ts'));
const dangerousContentMutations = contentFiles
  .map((file) => ({ file, text: read(file) }))
  .filter(({ file, text }) => {
    const normalized = text.replace(/\/\/.*$/gm, '');
    return /(ITEMS|MOBS|SPOTS|ZONES|DUNGEONS|RAIDS|QUESTS|QUEST_GIVERS|LOOT_TABLES)\.push\s*\(/.test(normalized);
  });
assert(dangerousContentMutations.length === 0, `no runtime push into exported content arrays (${dangerousContentMutations.map((entry) => entry.file).join(', ')})`);

if (fail.length) {
  console.error('Sanity failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}

console.log('Sanity passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
