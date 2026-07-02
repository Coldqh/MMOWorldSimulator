import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (filePath) => fs.readFileSync(path.join(root, filePath), 'utf8');
const exists = (filePath) => fs.existsSync(path.join(root, filePath));

const pass = [];
const warn = [];
const fail = [];

const ok = (condition, message) => condition ? pass.push(message) : fail.push(message);
const warning = (condition, message) => { if (!condition) warn.push(message); };

const requiredFiles = [
  'src/engine/serverIndexes.ts',
  'src/content/itemPools.ts',
  'src/systems/itemSystem.ts',
  'src/systems/npcLocationSystem.ts',
  'src/systems/progressionSystem.ts',
];

requiredFiles.forEach((filePath) => ok(exists(filePath), `runtime scale file exists: ${filePath}`));

const source = (...files) => files.filter(exists).map(read).join('\n');
const runtimeSource = source(
  'src/engine/serverIndexes.ts',
  'src/content/itemPools.ts',
  'src/systems/itemSystem.ts',
  'src/systems/npcLocationSystem.ts',
  'src/systems/progressionSystem.ts',
);

ok(runtimeSource.includes('createServerIndexes'), 'server runtime index helper is wired');
ok(runtimeSource.includes('getNpcEquipmentCandidates'), 'NPC equipment generation uses item pools');
ok(runtimeSource.includes('getNpcCardCandidates'), 'NPC card generation uses item pools');
ok(runtimeSource.includes('ZONE_BY_ID.get'), 'NPC location access uses zone lookup map');
ok(runtimeSource.includes('SPOT_BY_ID.get'), 'NPC location access uses spot lookup map');

var createNewGameSource = read('src/engine/createNewGame.ts');
ok(createNewGameSource.includes('NPC_TARGET_COUNT = 1000'), 'NPC roster target is 1000');
ok(createNewGameSource.includes("tier: 'low', ratio: 0.15"), 'NPC low tier target is 15%');
ok(createNewGameSource.includes("tier: 'mid', ratio: 0.25"), 'NPC mid tier target is 25%');
ok(createNewGameSource.includes("tier: 'high', ratio: 0.30"), 'NPC high tier target is 30%');
ok(createNewGameSource.includes("tier: 'max', ratio: 0.30"), 'NPC max tier target is 30%');
ok(createNewGameSource.includes('NPC_UNGUILDED_RATIO = 0.20'), 'NPC unguilded target is 20% per tier');
ok(createNewGameSource.includes('ensureNpcGuildCapacity'), 'NPC guild capacity helper is wired');

var enhancementSource = read('src/systems/enhancementSystem.ts');
ok((enhancementSource.match(/tier: '/g) ?? []).length >= 20, '20 enhancement stones are wired');
ok(enhancementSource.includes("tier: 'low', minLevel: 1, maxLevel: 20"), 'low enhancement stone tier is wired');
ok(enhancementSource.includes("tier: 'mid', minLevel: 21, maxLevel: 40"), 'mid enhancement stone tier is wired');
ok(enhancementSource.includes("tier: 'high', minLevel: 41, maxLevel: 59"), 'high enhancement stone tier is wired');
ok(enhancementSource.includes("tier: 'max', minLevel: 60, maxLevel: 60"), 'max enhancement stone tier is wired');
ok(enhancementSource.includes('rarityScore[stone.rarity]'), 'enhancement stone rarity gate is wired');

var guildRosterSource = read('src/systems/guildRosterSystem.ts');
ok(guildRosterSource.includes("return 'max'"), 'max guild roster tier is wired');
ok(guildRosterSource.includes('byTier.max'), 'max guild roster bucket is wired');

var goalsSource = read('src/systems/playerGoalsSystem.ts');
ok(goalsSource.includes('MAX_LEVEL'), 'goals use max level');
ok(!goalsSource.includes('20 / 20'), 'goals no longer hardcode level 20 cap');

var enhancementSource = read('src/systems/enhancementSystem.ts');
ok(enhancementSource.includes("tier: 'low', minLevel: 1, maxLevel: 20"), 'low enhancement stone tier is wired');
ok(enhancementSource.includes("tier: 'mid', minLevel: 21, maxLevel: 40"), 'mid enhancement stone tier is wired');
ok(enhancementSource.includes("tier: 'high', minLevel: 41, maxLevel: 59"), 'high enhancement stone tier is wired');
ok(enhancementSource.includes("tier: 'max', minLevel: 60, maxLevel: 60"), 'max enhancement stone tier is wired');

const itemSystem = read('src/systems/itemSystem.ts');
warning(!itemSystem.includes('const usable = ITEMS'), 'itemSystem still scans ITEMS directly for NPC gear');
warning(!itemSystem.includes('const cards = ITEMS'), 'itemSystem still scans ITEMS directly for NPC cards');

const hotFiles = [
  'src/systems/partyFinderSystem.ts',
  'src/systems/dungeonSystem.ts',
  'src/systems/guildWarSystem.ts',
  'src/systems/npcLocationSystem.ts',
  'src/systems/progressionSystem.ts',
];

const hotspotCount = hotFiles
  .filter(exists)
  .map((file) => {
    const text = read(file);
    return {
      file,
      npcFinds: (text.match(/server\.npcs\.find/g) ?? []).length,
      npcFilters: (text.match(/server\.npcs\s*\n?\s*\.filter/g) ?? []).length,
      npcSorts: (text.match(/server\.npcs\][\s\S]*?\.sort/g) ?? []).length,
    };
  });

hotspotCount.forEach((entry) => {
  console.log(`${entry.file}: npcFinds=${entry.npcFinds} npcFilters=${entry.npcFilters} npcSorts=${entry.npcSorts}`);
  warning(entry.npcFinds <= 6, `${entry.file} has many server.npcs.find calls`);
  warning(entry.npcFilters <= 6, `${entry.file} has many server.npcs.filter calls`);
});

if (fail.length) {
  console.error('Runtime scale check failed:');
  fail.forEach((message) => console.error('- ' + message));
  if (warn.length) {
    console.error('Warnings:');
    warn.forEach((message) => console.error('- ' + message));
  }
  process.exit(1);
}

console.log('Runtime scale check passed:');
pass.forEach((message) => console.log('- ' + message));
if (warn.length) {
  console.log('Warnings:');
  warn.forEach((message) => console.log('- ' + message));
}


var marketSource = read('src/systems/marketSystem.ts');
ok(marketSource.includes('MARKET_MIN_MID_PLUS_GROUPS'), 'market mid-plus coverage diagnostics are wired');
ok(marketSource.includes('MARKET_MIN_HIGH_PLUS_GROUPS'), 'market high-plus coverage diagnostics are wired');
ok(marketSource.includes('MARKET_MIN_MAX_GROUPS'), 'market max coverage diagnostics are wired');
ok(marketSource.includes('MARKET_MIN_ENHANCEMENT_STONE_GROUPS'), 'market enhancement stone coverage diagnostics are wired');

var marketSelectorSource = read('src/ui/selectors/marketSelectors.ts');
ok(marketSelectorSource.includes('MarketLevelBand'), 'market level band filter is wired');
ok(marketSelectorSource.includes('marketBandForLevelReq'), 'market level band selector is wired');


var marketSource = read('src/systems/marketSystem.ts');
ok(marketSource.includes('addListingsForPool(out, enhancementStones'), 'market explicit enhancement stone pool is wired');
ok(marketSource.includes('addListingsForPool(out, uniqueById(midPlusItems)'), 'market explicit mid-plus pool is wired');
ok(marketSource.includes('addListingsForPool(out, uniqueById(highPlusItems)'), 'market explicit high-plus pool is wired');
ok(marketSource.includes('addListingsForPool(out, uniqueById(maxItems)'), 'market explicit max pool is wired');
ok(marketSource.includes('availableMarketCoverage'), 'market dynamic coverage thresholds are wired');


var dungeonSource = read('src/systems/dungeonSystem.ts');
ok(dungeonSource.includes('DUNGEON_DIFFICULTY_CONFIG'), 'dungeon run difficulty is wired');
ok(dungeonSource.includes('completeDungeonRunReward'), 'dungeon completion reward is wired');
ok(dungeonSource.includes('Dungeon Marks'), 'dungeon marks reward is wired');
ok(dungeonSource.includes('lastDungeonRunResult'), 'dungeon last result state is wired');

var dungeonScreenSource = read('src/ui/screens/DungeonScreen.tsx');
ok(dungeonScreenSource.includes('Dungeon Run 2.0'), 'dungeon run 2.0 screen is wired');
ok(dungeonScreenSource.includes('Dungeon Marks'), 'dungeon marks UI is wired');
