import fs from 'node:fs';

const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';
const exists = (path) => fs.existsSync(path);

const files = {
  packageJson: read('package.json'),
  saveLoad: read('src/engine/saveLoad.ts'),
  version: read('src/engine/version.ts'),
  versionJson: read('public/version.json'),
  types: read('src/types/game.ts'),
  partyFinder: read('src/systems/partyFinderSystem.ts'),
  partyScreen: read('src/ui/screens/PartyFinderScreen.tsx'),
  lobby: read('src/ui/screens/PartyLobbyScreen.tsx'),
  dungeonScreen: read('src/ui/screens/DungeonScreen.tsx'),
  gameStore: read('src/state/gameStore.ts'),
  appShell: read('src/ui/layout/AppShell.tsx'),
  pwa: read('src/engine/pwa.ts'),
  sw: read('public/sw.js'),
};

const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

assert(files.packageJson.includes('"version": "0.5.8"'), 'package version is 0.5.8');
assert(files.saveLoad.includes("SAVE_VERSION = '0.5.8'"), 'save version is 0.5.8');
assert(files.saveLoad.includes('mmoworldsimulator.save.v0.5.7'), '0.5.7 legacy save key exists');
assert(files.version.includes("APP_VERSION = '0.5.8'"), 'APP_VERSION is 0.5.8');
assert(files.versionJson.includes('"version": "0.5.8"'), 'version.json is 0.5.8');

assert(files.types.includes('waitAttempts?: number'), 'PartyFinderListing has waitAttempts');
assert(files.types.includes('log?: string[]'), 'PartyFinderListing has log');
assert(files.types.includes('currentPartyListingId?: Id'), 'ServerState has currentPartyListingId');

assert(files.partyFinder.includes('waitPartyListing'), 'waitPartyListing exists');
assert(files.partyFinder.includes('getStartPartyListingBlockReason'), 'start block reason exists');
assert(files.partyFinder.includes('getCreatePartyListingBlockReason'), 'create block reason exists');
assert(files.partyFinder.includes('server.player.level < dungeon.levelRange[0]'), 'strict dungeon level gate exists');
assert(files.partyFinder.includes('listing.waitAttempts ?? 0'), 'waitAttempts tracked');
assert(files.partyFinder.includes('forceJoin') && files.partyFinder.includes('>= 2'), 'third wait can force NPC');
assert(files.partyFinder.includes('pickNpcForListing'), 'NPC candidate picker exists');
assert(files.partyFinder.includes('isNpcBusyInActiveListing'), 'NPC busy guard exists');
assert(files.partyFinder.includes('leaderExistsAndIsMember'), 'leader validity check exists');
assert(!/createPlayerPartyListing[\s\S]{0,900}fillListing/.test(files.partyFinder), 'player listing is not instantly filled');

assert(files.lobby.includes('PartyLobbyScreen'), 'PartyLobbyScreen exists');
assert(files.lobby.includes('Подождать'), 'lobby has wait button');
assert(files.lobby.includes('Начать данж'), 'lobby has start button');
assert(files.lobby.includes('Покинуть группу'), 'lobby has leave button');
assert(files.lobby.includes('getStartPartyListingBlockReason'), 'lobby disables start with reason');

assert(files.gameStore.includes('waitPartyListing: (listingId: string) => void'), 'store exposes waitPartyListing');
assert(files.gameStore.includes('waitPartyFinderListing'), 'store imports wait action');
assert(files.gameStore.includes('currentPartyListingId'), 'store handles currentPartyListingId');
assert(files.gameStore.includes('createPlayerPartyListing') && files.gameStore.includes('set({ activeScreen: "partyFinder" })'), 'create/join opens party finder lobby flow');

assert(!files.dungeonScreen.includes('createDungeonRun('), 'DungeonScreen does not create instant dungeon run');
assert(files.dungeonScreen.includes('startDungeon(dungeon.id)'), 'DungeonScreen still uses startDungeon action');
assert(files.gameStore.includes('startDungeon: (dungeonId) =>') && files.gameStore.includes('createPlayerPartyListing'), 'startDungeon creates party listing');

assert(files.appShell.includes('PartyLobbyScreen'), 'AppShell imports PartyLobbyScreen');
assert(files.appShell.includes('partyLobbyOpen'), 'AppShell has lobby overlay');

assert(exists('public/sw.js'), 'service worker exists');
assert(files.sw.includes("mmows-v0.5.8"), 'service worker cache is v0.5.8');
assert(!files.pwa.includes('window.location.replace'), 'PWA still avoids auto replace reload');

if (fail.length) {
  console.error('Sanity failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}

console.log('Sanity passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
