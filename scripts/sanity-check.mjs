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
  objectiveSystem: read('src/systems/objectiveSystem.ts'),
  questSystem: read('src/systems/questSystem.ts'),
  contractSystem: read('src/systems/contractSystem.ts'),
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

assert(files.packageJson.includes('"version": "0.7.3"'), 'package version remains 0.7.3');
assert(files.version.includes("APP_VERSION = '0.7.3'"), 'APP_VERSION remains 0.7.3');
assert(files.versionJson.includes('"version": "0.7.3"'), 'version.json remains 0.7.3');
assert(files.sw.includes("CACHE_NAME = 'mmows-v0.7.3'"), 'service worker cache remains 0.7.3');
assert(files.manifest.includes('"version": "0.7.3"'), 'manifest remains 0.7.3');

assert(files.saveLoad.includes("export const loadGame"), 'saveLoad exports loadGame');
assert(files.saveLoad.includes("SAVE_VERSION = '0.7.0'"), 'save format remains 0.7.0');
assert(files.saveLoad.includes("SAVE_KEY = 'mmoworldsimulator.save.v0.7.0'"), 'save key remains v0.7.0');

[
  'create',
  'SAVE_VERSION',
  'loadGame',
  'saveGame',
  'clearSave',
  'flushSaveGame',
  'backupRescueSave',
  'createNewGame',
  'createEmptyServer',
  'ensureServerRoster',
  'createRng',
  'uid',
  'advanceServerClock',
  'getItemById',
  'normalizeLegacyItemId',
  'ITEMS',
  'getDungeonById',
  'getSpotById',
  'getZoneById',
  'startSpotCombat',
  'createPlayerCombatant',
  'resolveCombatAction',
  'startDungeonFloorCombat',
  'completeDungeonFloor',
  'resolveDungeonEventFloor',
  'restInDungeon',
  'enhanceItem',
  'createPlayerPartyListing',
  'joinPartyListing as joinPartyFinderListing',
  'waitPartyListing as waitPartyFinderListing',
  'leavePartyListing as leavePartyFinderListing',
  'cancelPartyListing as cancelPartyFinderListing',
  'startPartyFromListing',
  'acceptPartyApplicant as acceptPartyFinderApplicant',
  'rejectPartyApplicant as rejectPartyFinderApplicant',
  'refreshPartyFinderListings',
  'repairServerRuntime',
  'validateServerRuntime',
].forEach((name) => assert(importBlock.includes(name), `gameStore import block includes ${name}`));

assert(files.gameStore.includes('const simulateServerForMinutes ='), 'gameStore has local simulateServerForMinutes fallback');
assert(files.gameStore.includes('const savedServer = loadGame();'), 'gameStore calls imported loadGame');
assert(files.gameStore.includes('server ?? createEmptyServer()'), 'safeNormalizeServer still has fallback empty server');
assert(files.main.includes('renderBootError'), 'visible boot error remains');
assert(!files.main.includes('await runRuntimeResetIfNeeded()'), 'boot does not await async runtime reset');

assert(files.architecture.includes('content = static game data'), 'ARCHITECTURE.md documents layers');
assert(files.architecture.includes('SAVE_KEY = mmoworldsimulator.save.v0.7.0'), 'ARCHITECTURE.md documents save key');
assert(files.architecture.includes('MarketScreen may call repairMarket action'), 'ARCHITECTURE.md documents market boundary');
assert(files.architecture.includes('currentDungeonRun.partyNpcIds'), 'ARCHITECTURE.md documents party source');

assert(files.objectiveSystem.includes('advanceObjectiveProgress'), 'shared objective helper exists');
assert(files.objectiveSystem.includes('isObjectiveProgressComplete'), 'shared objective completion helper exists');
assert(files.questSystem.includes("from './objectiveSystem'"), 'questSystem uses objectiveSystem');
assert(files.questSystem.includes('advanceObjectiveProgress'), 'questSystem uses shared progress helper');
assert(files.contractSystem.includes("from './objectiveSystem'"), 'contractSystem uses objectiveSystem');
assert(files.contractSystem.includes('advanceObjectiveProgress'), 'contractSystem uses shared progress helper');

assert(files.actionTypes.includes('interface UiAction'), 'UI action type exists');
assert(files.contractActions.includes('getContractActions'), 'contract action factory exists');
assert(files.contractPanel.includes('getContractActions'), 'ContractListPanel renders generated actions');
assert(!files.contractPanel.includes("contract.status === 'available' &&"), 'ContractListPanel no longer hardcodes available buttons');
assert(!files.contractPanel.includes("contract.status === 'active' &&"), 'ContractListPanel no longer hardcodes active buttons');
assert(!files.contractPanel.includes("contract.status === 'readyToClaim' &&"), 'ContractListPanel no longer hardcodes claim button');

assert(files.validateContent.includes('validateContent'), 'content validator exists');
assert(files.validateContent.includes('duplicate_id'), 'content validator checks duplicate ids');
assert(files.validateContent.includes('loot_item_ref_missing'), 'content validator checks loot item refs');
assert(files.validateContent.includes('quest_dungeon_ref_missing'), 'content validator checks quest dungeon refs');
assert(files.validateContent.includes('dungeon_floor_mob_ref_missing'), 'content validator checks dungeon floor mob refs');

assert(files.marketScreen.includes('type MarketCategory = "all"'), 'market all-filter still exists');
assert(files.marketScreen.includes('visibleGroups'), 'market debug visibleGroups still exists');
assert(files.marketScreen.includes('repairMarket'), 'MarketScreen still calls store repair action only');
assert(!files.pwa.includes('window.location.replace'), 'PWA still has no forced location.replace');

const contentFiles = walk('src/content').filter((file) => file.endsWith('.ts'));
const dangerousContentMutations = contentFiles
  .map((file) => ({ file, text: read(file) }))
  .filter(({ file, text }) => {
    const normalized = text.replace(/\/\/.*$/gm, '');
    const mutatesExportedArray = /(ITEMS|MOBS|SPOTS|ZONES|DUNGEONS|RAIDS|QUESTS|QUEST_GIVERS|LOOT_TABLES)\.push\s*\(/.test(normalized);
    return mutatesExportedArray && !file.endsWith('validateContent.ts');
  });
assert(dangerousContentMutations.length === 0, `no runtime push into exported content arrays (${dangerousContentMutations.map((entry) => entry.file).join(', ')})`);

const actionFiles = walk('src/ui/actions').filter((file) => file.endsWith('.ts'));
assert(actionFiles.length >= 2, 'ui/actions layer exists');

if (fail.length) {
  console.error('Sanity failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}

console.log('Sanity passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
