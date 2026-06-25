import fs from 'node:fs';

const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';
const exists = (path) => fs.existsSync(path);

const files = {
  packageJson: read('package.json'),
  types: read('src/types/game.ts'),
  world: read('src/content/world.ts'),
  worldBase: read('src/content/worldBase.ts'),
  worldExtra: read('src/content/worldExtraContent.ts'),
  worldFinalize: read('src/content/worldFinalize.ts'),
  partyFinder: read('src/systems/partyFinderSystem.ts'),
  dungeon: read('src/systems/dungeonSystem.ts'),
  npc: read('src/systems/npcSystem.ts'),
  createNewGame: read('src/engine/createNewGame.ts'),
  saveLoad: read('src/engine/saveLoad.ts'),
  gameStore: read('src/state/gameStore.ts'),
  appShell: read('src/ui/layout/AppShell.tsx'),
  partyScreen: read('src/ui/screens/PartyFinderScreen.tsx'),
  main: read('src/main.tsx'),
  index: read('index.html'),
  styles: read('src/ui/styles.css'),
  vite: read('vite.config.ts'),
  sw: read('public/sw.js'),
  manifest: read('public/manifest.webmanifest'),
};

const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);
const idsFrom = (text, re) => [...text.matchAll(re)].map((m) => m[1]);
const duplicates = (list) => [...new Set(list.filter((id, index) => list.indexOf(id) !== index))];

assert(files.packageJson.includes('"version": "0.5.6"'), 'package version is 0.5.6');
assert(files.saveLoad.includes("SAVE_VERSION = '0.5.6'"), 'save version is 0.5.6');
assert(files.saveLoad.includes('mmoworldsimulator.save.v0.5.5'), '0.5.5 legacy save key exists');

assert(files.types.includes('export type PartyRole ='), 'PartyRole type exists');
assert(files.types.includes('export interface PartyFinderListing'), 'PartyFinderListing type exists');
assert(files.types.includes('partyFinderListings: PartyFinderListing[]'), 'ServerState has partyFinderListings');
assert(files.types.includes('| "partyFinder"'), 'ScreenId contains partyFinder');

[
  'getClassPartyRole',
  'getDungeonPartyRequirement',
  'createPartyFinderListing',
  'generateNpcPartyFinderListings',
  'refreshPartyFinderListings',
  'joinPartyListing',
  'leavePartyListing',
  'cancelPartyListing',
  'startPartyFromListing',
  'canNpcJoinListing',
  'canPlayerJoinListing',
  'buildPartyRolesFromListing',
].forEach((fn) => assert(files.partyFinder.includes(`export const ${fn}`), `${fn} exported`));

assert(files.appShell.includes('PartyFinderScreen') && files.appShell.includes("partyFinder: <PartyFinderScreen />"), 'AppShell wires PartyFinderScreen');
assert(files.appShell.includes("👥 Поиск пати"), 'side navigation has Party Finder');
assert(files.partyScreen.includes('createPartyListing') && files.partyScreen.includes('joinPartyListing') && files.partyScreen.includes('startPartyListing'), 'PartyFinderScreen has player actions');

assert(files.gameStore.includes('refreshPartyFinderListings'), 'store imports party finder refresh');
assert(files.gameStore.includes('refreshPartyFinder: () => void'), 'store exposes refreshPartyFinder');
assert(files.gameStore.includes('createPartyListing:') && files.gameStore.includes('startPartyListing:'), 'store exposes party finder actions');
assert(files.createNewGame.includes('partyFinderListings: []'), 'new game initializes partyFinderListings');
assert(files.createNewGame.includes('refreshPartyFinderListings'), 'new game refreshes party finder');
assert(files.npc.includes('refreshPartyFinderListings'), 'server simulation refreshes party finder');

assert(files.dungeon.includes('findDungeonParty'), 'old findDungeonParty fallback still exists');
assert(files.worldFinalize.includes('partySize: 5') && files.worldFinalize.includes('v0.5.6'), 'world finalizer forces all dungeons to partySize 5');

assert(exists('public/sw.js'), 'service worker exists');
assert(exists('public/manifest.webmanifest'), 'manifest exists');
assert(files.main.includes('serviceWorker') && files.main.includes('register'), 'main registers service worker');
assert(files.sw.includes("mmows-v0.5.6"), 'service worker cache uses v0.5.6');
assert(files.sw.includes('caches.keys') && files.sw.includes('startsWith'), 'service worker cleans old caches');
assert(files.manifest.includes('"start_url": "./"') && files.manifest.includes('mmows-icon.svg'), 'manifest uses relative start/icon');
assert(files.index.includes('manifest.webmanifest'), 'index links manifest');
assert(!/https?:\/\/(?!registry\.npmjs\.org)/i.test(files.index), 'index has no external CDN URLs');
assert(!/@import\s+url\(["']?https?:\/\//i.test(files.styles), 'CSS has no remote font imports');
assert(files.vite.includes("base: './'") || files.vite.includes('base:"./"') || files.vite.includes("base:'./'"), 'vite uses relative base path');

const baseDungeonIds = idsFrom(files.worldBase, /id:\s*['`]([^'`]+)['`][\s\S]*?contentType:\s*['`]dungeon['`]/g);
const extraDungeonIds = idsFrom(files.worldExtra, /id:\s*['`]([^'`]+)['`][\s\S]*?contentType:\s*['`]dungeon['`]/g);
assert(duplicates([...baseDungeonIds, ...extraDungeonIds]).length === 0, 'dungeon ids are unique in static content');

const listingTypeFields = ['dungeonId', 'visibility', 'leaderId', 'memberIds', 'applicantIds', 'roles', 'requirements', 'status'];
listingTypeFields.forEach((field) => assert(files.types.includes(field), `PartyFinderListing has ${field}`));

if (fail.length) {
  console.error('Sanity failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}
console.log('Sanity passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
