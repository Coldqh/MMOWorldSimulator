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


var questSystemSource = read('src/systems/questSystem.ts');
ok(questSystemSource.includes('unlockContentIds'), 'quest reward content unlock is wired');

var unlockQuestlinesSource = read('src/content/unlockQuestlines.ts');
ok(unlockQuestlinesSource.includes('UNLOCK_QUESTS'), 'unlock questlines are wired');
ok(unlockQuestlinesSource.includes('unlockTargetId'), 'unlock quest target id is wired');


var gameStoreSource = read('src/state/gameStore.ts');
ok(gameStoreSource.includes('(server.unlockedContent ?? []).includes'), 'unlock content save compatibility is wired');

var questGiverCardSource = read('src/ui/components/QuestGiverCard.tsx');
ok(questGiverCardSource.includes('cleanQuestTitle'), 'quest giver cleans duplicated unlock icons');
ok(questGiverCardSource.includes('locationText.trim() !=='), 'quest giver avoids duplicated location text');

var questLogSource = read('src/ui/components/QuestLogPanel.tsx');
ok(questLogSource.includes('Открывает:'), 'quest log explains unlock target');
ok(questLogSource.includes('Задача:'), 'quest log explains what to do');


var unlockQuestlinesSource = read('src/content/unlockQuestlines.ts');
ok(unlockQuestlinesSource.includes('Цели: '), 'unlock quests include explicit target names');
ok(unlockQuestlinesSource.includes('getMobById'), 'unlock quests resolve mob names');

var questLogSource = read('src/ui/components/QuestLogPanel.tsx');
ok(questLogSource.includes('objectiveTargetText'), 'quest log shows objective target names');

var questGiverCardSource = read('src/ui/components/QuestGiverCard.tsx');
ok(questGiverCardSource.includes('objectiveTargetText'), 'quest giver shows objective target names');


var itemFactoriesSource = read('src/content/itemFactories.ts');
ok(itemFactoriesSource.includes('bindOnPickup'), 'generated dungeon/raid set items are BoP');

var itemFinalizeSource = read('src/content/itemFinalize.ts');
ok(itemFinalizeSource.includes('FINALIZE_BIND_RULES_V1'), 'gear bind rules are wired');

var marketSource = read('src/systems/marketSystem.ts');
ok(marketSource.includes('bindType !== "bindOnPickup"'), 'market excludes BoP gear');

var itemSystemSource = read('src/systems/itemSystem.ts');
ok(itemSystemSource.includes('getActiveSetBonuses'), 'set bonuses are wired');

var dungeonSource = read('src/systems/dungeonSystem.ts');
ok(dungeonSource.includes('pickInstanceGearReward'), 'dungeon and raid gear rewards are wired');


var unlockQuestlinesSource = read('src/content/unlockQuestlines.ts');
ok(unlockQuestlinesSource.includes("id: 'unlock_' + base"), 'single unlock quest per instance is wired');
ok(!unlockQuestlinesSource.includes("_probe"), 'old two-step unlock probe quest is removed');
ok(!unlockQuestlinesSource.includes("_open"), 'old two-step unlock open quest is removed');

var dungeonSource = read('src/systems/dungeonSystem.ts');
ok(dungeonSource.includes('Math.min(60'), 'dungeon rest is capped at 60 minutes');

var combatSource = read('src/systems/combatSystem.ts');
ok(combatSource.includes('COMBAT_TURN_MINUTES = 5'), 'combat action time cost is 5 minutes');

var enhancementSource = read('src/systems/enhancementSystem.ts');
ok(enhancementSource.includes('MAX_ENHANCEMENT_LEVEL = 12'), 'max enhancement is +12');

var srcFiles = [
  'src/content/unlockQuestlines.ts',
  'src/ui/components/QuestGiverCard.tsx',
  'src/ui/components/QuestLogPanel.tsx',
  'src/systems/combatSystem.ts',
  'src/systems/dungeonSystem.ts',
].map(read).join('\n');

ok(!/Р’|Р°|Рµ|СЏ|СЂ|С‚|Рё|Рѕ|РЅ|Рґ|Р»|С†|С‡|С€|С‰/.test(srcFiles), 'core UI files do not contain mojibake markers');
console.log('core ux timing unlock repair is wired');


var gameStoreSource = read('src/state/gameStore.ts');
ok(gameStoreSource.includes('sanitizeMojibakeText'), 'runtime mojibake sanitizer is wired');
ok(gameStoreSource.includes('simulateServerForMinutes(rested.server, rested.minutes'), 'dungeon rest consumes real minutes');
ok(!gameStoreSource.includes('Без траты времени'), 'old no-time rest text is removed');
ok(gameStoreSource.includes('const timeCost = 0;'), 'old combat finish time cost is removed');

var dungeonSource = read('src/systems/dungeonSystem.ts');
ok(dungeonSource.includes('Math.min(60'), 'dungeon rest cap is 60 minutes');

var combatSource = read('src/systems/combatSystem.ts');
ok(combatSource.includes('COMBAT_TURN_MINUTES = 5'), 'normal combat action advances 5 minutes');

var arena3v3Source = read('src/systems/arena3v3System.ts');
ok(arena3v3Source.includes('ARENA_TEAM_ROUND_MINUTES = 5'), 'team arena round advances 5 minutes');
ok(!arena3v3Source.includes('applyArenaRoleScaling'), 'arena hidden stat scaling is removed');

console.log('real combat time rest text repair is wired');


var itemSystem0754 = read('src/systems/itemSystem.ts');
ok(itemSystem0754.includes('getEnhancementMultiplier(instance.enhancement)'), 'enhancement scales item stats by percent');
ok(!itemSystem0754.includes('enhancementBonus'), 'flat enhancement stat bonus is removed');

var formulas0754 = read('src/balance/formulas.ts');
ok(formulas0754.includes('getEnhancementMultiplier'), 'enhancement multiplier exists');
ok(!formulas0754.includes('calculateEnhancementValue(enhancement'), 'gear score does not use flat enhancement value');

var pvpStats0754 = read('src/systems/pvpStatSystem.ts');
ok(!pvpStats0754.includes('missingGear'), 'NPC hidden missingGear stat boost is removed');
ok(!pvpStats0754.includes('displayedGear'), 'NPC displayedGear stat boost is removed');

var arena0754 = read('src/systems/arena3v3System.ts');
ok(!arena0754.includes('applyArenaRoleScaling'), 'arena hidden role scaling is removed');
ok(!arena0754.includes('gearPulse'), 'arena gearPulse is removed');

var duel0754 = read('src/systems/pvpDuelSystem.ts');
ok(!duel0754.includes('Object.values(server.player.equipment'), 'PvP fake player gear score is removed');
ok(duel0754.includes('getGearScore(server.player.equipment)'), 'PvP uses real player gear score');

var npcLocation0754 = read('src/systems/npcLocationSystem.ts');
ok(!npcLocation0754.includes('СѓС€С'), 'npc location mojibake is removed');

var castle0754 = read('src/ui/components/CastlePanel.tsx');
ok(!castle0754.includes('<small>{last.scoreSummary}</small>'), 'castle UI does not show raw scoreSummary debug');
console.log('real unified stats replacement is wired');
