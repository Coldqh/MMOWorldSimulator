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
  lobby: read('src/ui/screens/PartyLobbyScreen.tsx'),
  gameStore: read('src/state/gameStore.ts'),
  pwa: read('src/engine/pwa.ts'),
  sw: read('public/sw.js'),
};

const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

assert(files.packageJson.includes('"version": "0.5.9"'), 'package version is 0.5.9');
assert(files.saveLoad.includes("SAVE_VERSION = '0.5.9'"), 'save version is 0.5.9');
assert(files.saveLoad.includes('mmoworldsimulator.save.v0.5.8'), '0.5.8 legacy save key exists');
assert(files.version.includes("APP_VERSION = '0.5.9'"), 'APP_VERSION is 0.5.9');
assert(files.versionJson.includes('"version": "0.5.9"'), 'version.json is 0.5.9');

assert(files.types.includes('applicantIds: Id[]'), 'PartyFinderListing has applicantIds');
assert(files.types.includes('waitAttempts?: number'), 'PartyFinderListing has waitAttempts');
assert(files.types.includes('currentPartyListingId?: Id'), 'ServerState has currentPartyListingId');

assert(files.partyFinder.includes('acceptPartyApplicant'), 'acceptPartyApplicant exists');
assert(files.partyFinder.includes('rejectPartyApplicant'), 'rejectPartyApplicant exists');
assert(files.partyFinder.includes('candidate.name} подал заявку'), 'player-created wait creates applicant');
assert(files.partyFinder.includes('applicantIds: unique') && files.partyFinder.includes('memberIds: unique([...listing.memberIds, npcId])'), 'accept moves applicant into members');
assert(files.partyFinder.includes('rejectedIds: unique'), 'reject stores rejected ids');
assert(files.partyFinder.includes('forceJoin') && files.partyFinder.includes('>= 2'), 'third wait still forces response if possible');

const waitFn = files.partyFinder.match(/export const waitPartyListing[\s\S]*?export const leavePartyListing/);
assert(Boolean(waitFn), 'waitPartyListing block found');
assert(waitFn ? !/leaderType === 'player'[\s\S]{0,700}memberIds: unique\(\[\.\.\.listing\.memberIds, candidate\.id\]\)/.test(waitFn[0]) : false, 'player-created wait does not auto-add NPC member');

assert(files.lobby.includes('Заявки'), 'lobby shows applications');
assert(files.lobby.includes('Принять'), 'lobby has accept button');
assert(files.lobby.includes('Отказать'), 'lobby has reject button');
assert(!files.lobby.includes('section-title">Ожидание'), 'separate waiting section removed');
assert(!files.lobby.includes('modal-lines card-lines'), 'waiting log visual removed');

assert(files.gameStore.includes('acceptPartyApplicant: (listingId: string, npcId: string) => void'), 'store exposes acceptPartyApplicant');
assert(files.gameStore.includes('rejectPartyApplicant: (listingId: string, npcId: string) => void'), 'store exposes rejectPartyApplicant');
assert(files.gameStore.includes('acceptPartyFinderApplicant'), 'store imports accept action');
assert(files.gameStore.includes('rejectPartyFinderApplicant'), 'store imports reject action');

assert(exists('public/sw.js'), 'service worker exists');
assert(files.sw.includes("mmows-v0.5.9"), 'service worker cache is v0.5.9');
assert(!files.pwa.includes('window.location.replace'), 'PWA still avoids auto replace reload');

if (fail.length) {
  console.error('Sanity failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}

console.log('Sanity passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
