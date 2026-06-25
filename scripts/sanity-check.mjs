import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const files = {
  items: read('src/content/items.ts'),
  world: read('src/content/world.ts'),
  createNewGame: read('src/engine/createNewGame.ts'),
  market: read('src/systems/marketSystem.ts'),
  combat: read('src/systems/combatSystem.ts'),
  dungeon: read('src/systems/dungeonSystem.ts'),
  library: read('src/ui/screens/LibraryScreen.tsx'),
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
assert(files.items.includes('sourceType?:') || read('src/types/game.ts').includes('sourceType?:'), 'ItemDefinition has source metadata');
assert(files.items.includes('raid_wyrmspire_legendary') && files.items.includes('sharedWyrmSlots') && files.items.includes('canonicalRemove((item) => /^wyrmspire_gold_'), 'First Wyrm canonical 10-piece pass exists');
assert(files.items.includes('glassCanonicalSlots') && files.items.includes('dungeon_glass_catacomb'), 'Glass Catacombs canonical 20-piece pass exists');
assert(files.world.includes('canonicalReplaceTableSetGear') && files.world.includes("canonicalReplaceTableSetGear('lt_wyrmspire_raid'"), 'loot tables canonicalized from set ids');
assert(files.world.includes('card_first_wyrm') && files.world.includes('50000') && files.world.includes('* 128'), 'single final card price pass exists');
assert(files.world.includes('MOBS.forEach((mob) => {') && files.world.includes('cardId = `card_${mob.id}`'), 'cards are guaranteed for every mob');
assert(files.createNewGame.includes('normalizeMarketListings({ ...finalRoster, market: [] }'), 'new game market generated after final roster');
assert(files.market.includes('targetSellerCount') && files.market.includes('normalizeMarketListings'), 'market has normalization/fill pass');
assert(files.dungeon.includes("npc.classId === 'warrior'") && files.dungeon.includes("npc.classId === 'priest'") && files.dungeon.includes("npc.classId !== 'mage' && npc.classId !== 'ranger'"), 'dungeon finder role rules are strict');
assert(files.combat.includes('pickBossPartyDrop') && files.combat.includes('instanceSetIds'), 'boss party set drop system exists');
assert(files.library.includes('source') && files.library.includes('totalCount') && files.library.includes('SetFamily'), 'library set grouping uses family/source/count');

const unknownLoot = lootEntries.filter((id) => id.startsWith('wyrmspire_gold_') && /_(warrior|ranger|mage|priest)_(head|chest|legs|boots|ring|amulet)$/.test(id));
assert(unknownLoot.length === 0, `loot tables do not reference legacy Wyrm armor ids (${unknownLoot.join(', ') || 'ok'})`);

if (fail.length) {
  console.error('Sanity failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}
console.log('Sanity passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
