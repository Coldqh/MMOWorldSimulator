import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const files = {
  types: read('src/types/game.ts'),
  items: read('src/content/items.ts'),
  itemBase: read('src/content/itemBaseDefinitions.ts'),
  itemSets: read('src/content/itemSetDefinitions.ts'),
  itemFactories: read('src/content/itemFactories.ts'),
  itemFinalize: read('src/content/itemFinalize.ts'),
  itemLegacy: read('src/content/itemLegacy.ts'),
  world: read('src/content/world.ts'),
  createNewGame: read('src/engine/createNewGame.ts'),
  market: read('src/systems/marketSystem.ts'),
  combat: read('src/systems/combatSystem.ts'),
  dungeon: read('src/systems/dungeonSystem.ts'),
  itemSystem: read('src/systems/itemSystem.ts'),
  progression: read('src/systems/progressionSystem.ts'),
  library: read('src/ui/screens/LibraryScreen.tsx'),
  balanceConfig: read('src/balance/balanceConfig.ts'),
  formulas: read('src/balance/formulas.ts'),
};
const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);
const duplicates = (list) => [...new Set(list.filter((id, index) => list.indexOf(id) !== index))];

const baseItemIds = [...files.itemBase.matchAll(/id:\s*['`]([^'`]+)['`]/g)].map((m) => m[1]);
const mobIds = [...files.world.matchAll(/id:\s*['`]([^'`]+)['`],\s*name:\s*['`][^'`]+['`],\s*level:\s*\d+/g)].map((m) => m[1]);
const lootEntries = [...files.world.matchAll(/itemId:\s*['`]([^'`]+)['`]/g)].map((m) => m[1]);

assert(duplicates(baseItemIds).length === 0, `unique base item ids (${duplicates(baseItemIds).join(', ') || 'ok'})`);
assert(duplicates(mobIds).length === 0, `unique literal mob ids (${duplicates(mobIds).join(', ') || 'ok'})`);
assert(files.types.includes('sourceType?: "general" | "dungeon" | "raid" | "world"'), 'ItemDefinition has source metadata');

['balanceConfig.ts', 'formulas.ts', 'balanceTypes.ts'].forEach((name) => assert(fs.existsSync(`src/balance/${name}`), `${name} exists`));
[
  'calculateItemPrice',
  'calculateCardPrice',
  'calculateGearScore',
  'calculateXpForNextLevel',
  'calculateXpRewardForMob',
  'calculateGoldRewardForMob',
  'calculateMobDifficultyScore',
  'calculateDungeonDifficultyScore',
  'calculateNpcWealth',
  'calculateNpcArenaRating',
  'calculateEnhancementValue',
  'calculateSocketValue',
].forEach((fn) => assert(files.formulas.includes(`export const ${fn}`) || files.formulas.includes(`export function ${fn}`), `${fn} exported`));

assert(files.items.includes('BASE_ITEMS') && files.items.includes('buildGeneratedItems') && files.items.includes('finalizeItems'), 'items.ts is thin collector');
assert(!/v0\.[0-9]/.test(files.items), 'items.ts has no executable historical patch comments');
assert(!files.items.includes('rebalanceItemStats'), 'items.ts has no rebalanceItemStats pass');
assert(!files.items.includes('card price') && !files.items.includes('canonical pass'), 'items.ts has no manual price/canonical passes');
assert(files.itemLegacy.includes('normalizeLegacyItemId') && files.itemLegacy.includes('dungeon_glass_catacomb_epic'), 'legacy migration lives in itemLegacy.ts');
assert(files.itemFactories.includes('createGeneralSetItems') && files.itemFactories.includes('createDungeonSetItems') && files.itemFactories.includes('createRaidSetItems'), 'set generation lives in itemFactories.ts');
assert(files.itemFinalize.includes('calculateItemPrice') && files.itemFinalize.includes('calculateCardPrice'), 'final item balance lives in itemFinalize.ts');

assert(files.itemSets.includes("id: 'raid_wyrmspire_legendary'") && files.itemSets.includes("shape: 'first_wyrm_10'"), 'First Wyrm set definition is 10-piece shape');
assert(files.itemFactories.includes('createFirstWyrmItems') && files.itemFactories.includes('FIRST_WYRM_SHARED_SLOTS'), 'First Wyrm factory uses 4 weapons + shared pieces');
assert(files.itemSets.includes("id: 'dungeon_glass_catacomb'") && files.itemSets.includes("shape: 'glass_20'"), 'Glass Catacombs set definition is 20-piece shape');
assert(!files.itemSets.includes('dungeon_glass_catacomb_epic'), 'no active dungeon_glass_catacomb_epic set definition');
assert(!files.itemFactories.includes('glass_catacomb_epic'), 'no active glass_catacomb_epic item factory');

assert(files.progression.includes('calculateXpForNextLevel') && !files.progression.includes('Math.max(100, level * 100)'), 'XP curve uses balance formulas');
assert(files.progression.includes('calculateNpcArenaRating') && files.progression.includes('calculateNpcWealth'), 'NPC arena/wealth use balance formulas');
assert(files.market.includes('calculateItemPrice') && files.market.includes('estimateItemPrice = (item'), 'market uses calculateItemPrice');
assert(files.itemSystem.includes('calculateGearScore') && files.itemSystem.includes('cardItems'), 'gear score uses balance formula with card items');
assert(files.world.includes('calculateCardPrice') && files.world.includes('calculateGoldRewardForMob'), 'world uses balance formulas for final content values');

assert(!files.combat.includes("glass_catacomb: ['dungeon_glass_catacomb_epic']"), 'combat uses canonical Glass Catacombs setId');
assert(files.combat.includes("glass_catacomb: ['dungeon_glass_catacomb']"), 'Glass Catacombs party drop maps to canonical setId');
assert(files.world.includes("canonicalReplaceTableSetGear('lt_glass_catacomb', ['dungeon_glass_catacomb'])"), 'Glass Catacombs loot table canonicalized');
assert(files.world.includes("canonicalReplaceTableSetGear('lt_wyrmspire_raid', ['raid_wyrmspire', 'raid_wyrmspire_legendary'])"), 'Wyrm raid loot table canonicalized');

assert(files.world.includes('cardId = `card_${mob.id}`') && files.world.includes('ensureLootTable(mob.lootTableId)'), 'cards are guaranteed for every mob after final MOBS list');
assert(files.world.includes('card_first_wyrm') && files.world.includes('50000') && files.world.includes('390'), 'First Wyrm card stable value exists');
assert(files.combat.includes('pickBossPartyDrop') && files.combat.includes('instanceSetIds'), 'boss party set drop system exists');
assert(files.combat.includes('allowLoot: (source !==') && files.combat.includes('isBoss'), 'instance loot allowed on boss encounters');
assert(files.dungeon.includes("npc.classId === 'warrior'") && files.dungeon.includes("npc.classId === 'priest'") && files.dungeon.includes("npc.classId !== 'mage' && npc.classId !== 'ranger'"), 'dungeon finder role rules are strict');
assert(files.createNewGame.includes('normalizeMarketListings({ ...finalRoster, market: [] }'), 'new game market generated after final roster');
assert(files.market.includes('targetSellerCount') && files.market.includes('normalizeMarketListings'), 'market has normalization/fill pass');
assert(files.library.includes('source') && files.library.includes('totalCount') && files.library.includes('SetFamily'), 'library set grouping uses family/source/count');

const legacyWyrmLoot = lootEntries.filter((id) => /^wyrmspire_gold_(warrior|ranger|mage|priest)_(head|chest|legs|boots|ring|amulet)$/.test(id));
assert(legacyWyrmLoot.length === 0, `loot tables do not reference legacy Wyrm armor ids (${legacyWyrmLoot.join(', ') || 'ok'})`);
assert(!files.world.includes("'dungeon_glass_catacomb_epic'"), 'world has no dungeon_glass_catacomb_epic set references');
assert(!files.combat.includes("'dungeon_glass_catacomb_epic'"), 'combat has no dungeon_glass_catacomb_epic set references');

if (fail.length) {
  console.error('Sanity failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}
console.log('Sanity passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
