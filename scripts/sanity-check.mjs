import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const files = {
  types: read('src/types/game.ts'),
  items: read('src/content/items.ts'),
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

const itemIds = [...files.items.matchAll(/id:\s*['`]([^'`]+)['`]/g)].map((m) => m[1]);
const mobIds = [...files.world.matchAll(/id:\s*['`]([^'`]+)['`],\s*name:\s*['`][^'`]+['`],\s*level:\s*\d+/g)].map((m) => m[1]);
const lootEntries = [...files.world.matchAll(/itemId:\s*['`]([^'`]+)['`]/g)].map((m) => m[1]);
const duplicates = (list) => [...new Set(list.filter((id, index) => list.indexOf(id) !== index))];

assert(duplicates(itemIds).length === 0, `unique literal item ids (${duplicates(itemIds).join(', ') || 'ok'})`);
assert(duplicates(mobIds).length === 0, `unique literal mob ids (${duplicates(mobIds).join(', ') || 'ok'})`);
assert(files.types.includes('sourceType?: "general" | "dungeon" | "raid" | "world"'), 'ItemDefinition has source metadata');

assert(fs.existsSync('src/balance/balanceConfig.ts') && fs.existsSync('src/balance/formulas.ts') && fs.existsSync('src/balance/balanceTypes.ts'), 'balance layer files exist');
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

assert(files.progression.includes('calculateXpForNextLevel') && !files.progression.includes('Math.max(100, level * 100)'), 'XP curve uses balance formulas');
assert(files.progression.includes('calculateNpcArenaRating') && files.progression.includes('calculateNpcWealth'), 'NPC arena/wealth use balance formulas');
assert(files.market.includes('calculateItemPrice') && files.market.includes('estimateItemPrice = (item'), 'market uses calculateItemPrice');
assert(files.itemSystem.includes('calculateGearScore') && files.itemSystem.includes('cardItems'), 'gear score uses balance formula with card items');
assert(files.world.includes('v0.5.3 Balance Core final authority pass') && files.world.includes('calculateCardPrice') && files.world.includes('calculateGoldRewardForMob'), 'world final balance pass exists');

assert(files.items.includes('raid_wyrmspire_legendary') && files.items.includes('sharedWyrmSlots'), 'First Wyrm canonical 10-piece pass exists');
assert(files.items.includes('glassCanonicalSlots') && files.items.includes('dungeon_glass_catacomb'), 'Glass Catacombs canonical 20-piece pass exists');
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
