import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const exists = (path) => fs.existsSync(path);

const files = {
  packageJson: read('package.json'),
  types: read('src/types/game.ts'),
  items: read('src/content/items.ts'),
  itemBase: read('src/content/itemBaseDefinitions.ts'),
  itemSets: read('src/content/itemSetDefinitions.ts'),
  itemFactories: read('src/content/itemFactories.ts'),
  itemFinalize: read('src/content/itemFinalize.ts'),
  itemLegacy: read('src/content/itemLegacy.ts'),
  world: read('src/content/world.ts'),
  worldBase: exists('src/content/worldBase.ts') ? read('src/content/worldBase.ts') : '',
  worldExtra: exists('src/content/worldExtraContent.ts') ? read('src/content/worldExtraContent.ts') : '',
  mobCards: exists('src/content/mobCards.ts') ? read('src/content/mobCards.ts') : '',
  lootFinalize: exists('src/content/lootFinalize.ts') ? read('src/content/lootFinalize.ts') : '',
  worldFinalize: exists('src/content/worldFinalize.ts') ? read('src/content/worldFinalize.ts') : '',
  saveLoad: read('src/engine/saveLoad.ts'),
  createNewGame: read('src/engine/createNewGame.ts'),
  market: read('src/systems/marketSystem.ts'),
  combat: read('src/systems/combatSystem.ts'),
  dungeon: read('src/systems/dungeonSystem.ts'),
  itemSystem: read('src/systems/itemSystem.ts'),
  progression: read('src/systems/progressionSystem.ts'),
  library: read('src/ui/screens/LibraryScreen.tsx'),
  modal: read('src/ui/components/ResultModal.tsx'),
  balanceConfig: read('src/balance/balanceConfig.ts'),
  formulas: read('src/balance/formulas.ts'),
};

const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);
const duplicates = (list) => [...new Set(list.filter((id, index) => list.indexOf(id) !== index))];
const idsFrom = (text, re) => [...text.matchAll(re)].map((m) => m[1]);

assert(files.packageJson.includes('"version": "0.5.5"'), 'package version is 0.5.5');
assert(files.saveLoad.includes("SAVE_VERSION = '0.5.5'"), 'save version is 0.5.5');
assert(files.saveLoad.includes('mmoworldsimulator.save.v0.5.4'), '0.5.4 save key is legacy');

['worldBase.ts', 'worldExtraContent.ts', 'mobCards.ts', 'lootFinalize.ts', 'worldFinalize.ts'].forEach((name) =>
  assert(exists(`src/content/${name}`), `${name} exists`),
);

[
  /v0\.3/,
  /v0\.4/,
  /v0\.5 final/,
  /canonicalization pass/,
  /MOBS\.push/,
  /DUNGEONS\.push/,
  /ITEMS\.push/,
  /cardGsV050/,
  /cardGoldPerValue/,
  /setTableToInstanceSet/,
  /canonicalReplaceTableSetGear/,
].forEach((pattern) => assert(!pattern.test(files.world), `world.ts has no ${pattern}`));

assert(files.world.includes('finalizeWorldContent') && files.world.includes('BASE_MOBS') && files.world.includes('EXTRA_MOBS'), 'world.ts is a thin content collector');
assert(!files.world.includes('calculateCardPrice') && !files.world.includes('calculateGoldRewardForMob'), 'world.ts has no balance/card formulas');

const worldContent = `${files.worldBase}\n${files.worldExtra}`;
const mobIds = idsFrom(worldContent, /id:\s*['`]([^'`]+)['`],\s*name:\s*['`][^'`]+['`],\s*level:\s*\d+/g);
const spotIds = idsFrom(worldContent, /id:\s*['`]([^'`]+)['`],\s*zoneId:\s*['`][^'`]+['`],\s*name:\s*['`][^'`]+['`],\s*levelRange/g);
const zoneIds = idsFrom(worldContent, /id:\s*['`]([^'`]+)['`],\s*name:\s*['`][^'`]+['`],\s*levelRange:\s*\[/g);
const dungeonIds = idsFrom(worldContent, /id:\s*['`]([^'`]+)['`],\s*zoneId:\s*['`][^'`]+['`],\s*name:\s*['`][^'`]+['`],\s*levelRange:\s*\[[^\]]+\],\s*partySize/g);
const lootIds = idsFrom(worldContent, /id:\s*['`](lt_[^'`]+)['`],\s*entries/g);

assert(duplicates(mobIds).length === 0, `unique mob ids (${duplicates(mobIds).join(', ') || 'ok'})`);
assert(duplicates(spotIds).length === 0, `unique spot ids (${duplicates(spotIds).join(', ') || 'ok'})`);
assert(duplicates(zoneIds).length === 0, `unique zone ids (${duplicates(zoneIds).join(', ') || 'ok'})`);
assert(duplicates(dungeonIds).length === 0, `unique dungeon ids (${duplicates(dungeonIds).join(', ') || 'ok'})`);
assert(duplicates(lootIds).length === 0, `unique loot table ids (${duplicates(lootIds).join(', ') || 'ok'})`);

[
  'getMobCardId',
  'getMobCardRarity',
  'getMobCardStats',
  'getMobCardDropChance',
  'createMobCard',
  'createMobCardsForMobs',
].forEach((fn) => assert(files.mobCards.includes(`export const ${fn}`), `${fn} exported`));
assert(files.mobCards.includes('card_${mob.id}') && files.mobCards.includes("mob.id === 'first_wyrm'") && files.mobCards.includes("'legendary'"), 'mob cards use stable ids and First Wyrm rarity');
assert(files.mobCards.includes('calculateCardPrice(card, mob)'), 'mob card price uses calculateCardPrice(card, mob)');
assert(files.items.includes('createMobCardsForMobs') && files.items.includes('ITEM_WORLD_MOBS'), 'items include generated mob cards before NPC generation');
assert(files.itemLegacy.includes("wolf_card: 'card_gray_wolf'") && files.itemLegacy.includes("slime_card: 'card_green_slime'"), 'legacy manual card ids migrate to mob card ids');

assert(files.lootFinalize.includes('INSTANCE_SET_IDS_BY_LOOT_TABLE'), 'instance set table map exists');
[
  "lt_old_lantern_dungeon: ['dungeon_old_lantern']",
  "lt_thorn_crypt: ['dungeon_thorn_crypt']",
  "lt_blackroot_raid: ['dungeon_blackroot']",
  "lt_mire_depths_dungeon: ['dungeon_mire_depths']",
  "lt_frost_vault: ['dungeon_frost_vault']",
  "lt_glass_catacomb: ['dungeon_glass_catacomb']",
  "lt_wyrmspire_raid: ['raid_wyrmspire', 'raid_wyrmspire_legendary']",
].forEach((line) => assert(files.lootFinalize.includes(line), `${line} exists`));
assert(files.lootFinalize.includes('item.setId') && !files.lootFinalize.includes('prefixes'), 'loot set gear is selected by setId');
assert(files.lootFinalize.includes('addMobCardsToLootTables') && files.lootFinalize.includes('getMobCardId(mob)'), 'mob cards are added to mob loot tables');
assert(files.lootFinalize.includes('normalizeLegacyItemId'), 'loot entries normalize legacy ids');

const commonLevels = [1, 5, 10, 15, 20];
const uncommonLevels = [3, 8, 13, 18];
const rareLevels = [5, 10, 15, 20];
const classes = ['warrior', 'ranger', 'mage', 'priest'];
const slots = ['weapon', 'head', 'chest', 'legs', 'boots', 'ring', 'amulet'];
const requiredFamilies = [
  ...commonLevels.flatMap((level) => classes.map((classId) => `common_${classId}_${level}`)),
  ...uncommonLevels.flatMap((level) => classes.map((classId) => `uncommon_${classId}_${level}`)),
  ...rareLevels.flatMap((level) => classes.map((classId) => `rare_${classId}_${level}`)),
];
const generalDefinitionsBlock = files.itemSets.match(/export const GENERAL_SET_DEFINITIONS:[\\s\\S]*?\\n\\];/);
const generalDefinitionCount = (generalDefinitionsBlock?.[0].match(/\{\s*id:\s*['`][^'`]+['`]/g) ?? []).length;
assert(generalDefinitionCount === 13, `13 general set definitions (${generalDefinitionCount})`);
assert(requiredFamilies.length === 52, '52 general class families expected');
assert(requiredFamilies.length * slots.length === 364, '364 general set items expected');
assert(files.itemFactories.includes('set_${definition.rarity}_${classId}_${definition.level}_${slot}'), 'general item id pattern includes rarity class level slot');
assert(files.itemFactories.includes('${definition.rarity}_${classId}_${definition.level}'), 'general setId pattern includes rarity class level');
assert(files.itemSets.includes("sourceId: 'general_sets'") && files.itemSets.includes("sourceName: 'Общий сет'"), 'general sets use stable source metadata');
assert(!files.itemSets.includes('dungeon_glass_catacomb_epic'), 'no active dungeon_glass_catacomb_epic set definition');
assert(!files.itemFactories.includes('glass_catacomb_epic'), 'no active glass_catacomb_epic item factory');

assert(files.itemSystem.includes('chooseNpcCardsForItem'), 'NPC card selection exists');
assert(files.itemSystem.includes("entry.type === 'card'") && files.itemSystem.includes('entry.levelReq <= level'), 'NPC cards require card type and NPC level');
assert(files.itemSystem.includes('slots <= 0') && files.itemSystem.includes('!result.includes(card.id)'), 'NPC card socket guards exist');
assert(files.itemSystem.includes('normalizeNpcEquipmentAndGear') && files.itemSystem.includes('cardIds: cards'), 'NPC normalization can fill cardIds');
assert(files.itemSystem.includes('getGearScore(equipment)') && files.itemSystem.includes('cardItems'), 'NPC gear score includes card items');
assert(files.createNewGame.includes('ensureServerRoster(server)'), 'new game normalizes final roster');
assert(files.createNewGame.includes('normalizeNpcEquipmentAndGear'), 'old NPC gear normalization is wired');

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
].forEach((fn) => assert(files.formulas.includes(`export const ${fn}`) || files.formulas.includes(`export function ${fn}`), `${fn} exported`));

assert(files.progression.includes('calculateXpForNextLevel') && !files.progression.includes('Math.max(100, level * 100)'), 'XP curve uses balance formulas');
assert(files.progression.includes('calculateNpcArenaRating') && files.progression.includes('calculateNpcWealth'), 'NPC arena/wealth use balance formulas');
assert(files.market.includes('calculateItemPrice') && files.market.includes('estimateItemPrice = (item'), 'market uses calculateItemPrice');
assert(files.combat.includes("glass_catacomb: ['dungeon_glass_catacomb']"), 'Glass Catacombs party drop maps to canonical setId');
assert(!files.combat.includes("glass_catacomb: ['dungeon_glass_catacomb_epic']"), 'combat has no old Glass Catacombs setId');
assert(files.combat.includes('pickBossPartyDrop') && files.combat.includes('instanceSetIds'), 'boss party set drop system exists');
assert(files.library.includes('source') && files.library.includes('totalCount') && files.library.includes('SetFamily'), 'library set grouping uses family/source/count');
assert(files.modal.includes('ACTION_NPC_ITEM'), 'NPC profile equipment actions render');

const activeContent = [files.world, files.worldBase, files.worldExtra, files.lootFinalize, files.itemSets, files.itemFactories, files.combat].join('\n');
assert(!activeContent.includes("'dungeon_glass_catacomb_epic'"), 'no active dungeon_glass_catacomb_epic references');
assert(!activeContent.includes('glass_catacomb_epic_'), 'no active glass_catacomb_epic item references');

if (fail.length) {
  console.error('Sanity failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}
console.log('Sanity passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
