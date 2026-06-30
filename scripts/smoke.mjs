import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (filePath) => fs.readFileSync(path.join(root, filePath), 'utf8');
const pass = [];
const fail = [];
const assert = (condition, message) => condition ? pass.push(message) : fail.push(message);

const takeBetween = (text, startNeedle, endNeedle) => {
  const start = text.indexOf(startNeedle);
  if (start < 0) return '';
  const fromStart = text.slice(start);
  const end = fromStart.indexOf(endNeedle);
  return end >= 0 ? fromStart.slice(0, end) : fromStart;
};

const packageJson = JSON.parse(read('package.json'));
const gameStore = read('src/state/gameStore.ts');
const partyFinderSystem = read('src/systems/partyFinderSystem.ts');
const guildWarSystem = read('src/systems/guildWarSystem.ts');
const appShell = read('src/ui/layout/AppShell.tsx');

const partyActions = takeBetween(gameStore, 'refreshPartyFinder:', 'joinGuild:');
const bottomNav = takeBetween(appShell, 'const bottomNav', 'const sideNav');
const sideNav = takeBetween(appShell, 'const sideNav', 'const cityOnlyScreens');

assert(packageJson.version === '0.7.32', 'package version is 0.7.32');
assert(!bottomNav.includes('goals'), 'bottom nav has no goals');
assert(sideNav.includes("{ id: 'goals', label: '🎯 Цели' }"), 'side nav has goals');
assert(partyActions.includes('commitFast(set, refreshPartyFinderListings'), 'refreshPartyFinder is fast');
assert(!partyActions.includes('commit(set,'), 'Party Finder action block has no full commit');
assert(partyFinderSystem.includes('pickNpcApplicantForPlayerListing'), 'NPC applicant picker exists');
assert(!takeBetween(partyFinderSystem, 'const pickNpcApplicantForPlayerListing', 'const pickNpcForListing').includes('.sort('), 'NPC applicant picker does not sort all NPCs');
assert(partyFinderSystem.includes("listing.leaderType !== 'npc' || listing.visibility !== 'public'"), 'accepted NPC leaves public NPC groups');
assert(guildWarSystem.includes('npcsByGuildId'), 'guild war uses guild NPC index');
assert(!guildWarSystem.includes('const attackers = next.npcs.filter((npc) => npc.guildId === currentWar.attackerGuildId)'), 'guild war no repeated attacker filter');

if (fail.length) {
  console.error('Smoke failed:');
  fail.forEach((message) => console.error('- ' + message));
  console.error(`${pass.length} checks passed before failure.`);
  process.exit(1);
}

console.log('Smoke passed:');
pass.forEach((message) => console.log('- ' + message));
