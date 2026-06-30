import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (filePath) => fs.readFileSync(path.join(root, filePath), 'utf8');

const pass = [];
const fail = [];
const assert = (condition, message) => condition ? pass.push(message) : fail.push(message);

const between = (text, startNeedle, endNeedle) => {
  const start = text.indexOf(startNeedle);
  if (start < 0) return '';
  const end = text.indexOf(endNeedle, start + startNeedle.length);
  return end >= 0 ? text.slice(start, end) : text.slice(start);
};

const pkg = JSON.parse(read('package.json'));
const gameTypes = read('src/types/game.ts');
const gameStore = read('src/state/gameStore.ts');
const partyFinderSystem = read('src/systems/partyFinderSystem.ts');
const guildWarSystem = read('src/systems/guildWarSystem.ts');
const appShell = read('src/ui/layout/AppShell.tsx');
const contentNpc = read('src/content/npc.ts');
const createNewGame = read('src/engine/createNewGame.ts');
const npcSkillSystem = read('src/systems/npcSkillSystem.ts');

const storeImpl = between(gameStore, 'export const useGameStore = create<GameStore>', '));');
const partyActions = between(storeImpl, 'refreshPartyFinder:', 'joinGuild:');
const bottomNav = between(appShell, 'const bottomNav', 'const sideNav');
const sideNav = between(appShell, 'const sideNav', 'const cityOnlyScreens');
const applicantPicker = between(partyFinderSystem, 'const pickNpcApplicantForPlayerListing =', 'const pickNpcForListing =');
const refreshBlock = between(storeImpl, 'refreshPartyFinder:', 'createPartyListing:');

const legacyTokens = ['PVE_FARMER', 'RAIDER', 'PVP_PLAYER', 'GUILD_PLAYER', 'COLLECTOR', 'TRADER', 'CASUAL', 'HARDCORE', 'LEADER', 'DRAMA', 'NEWBIE'];

assert(pkg.version === '0.7.33', 'package version is 0.7.33');
assert(gameTypes.includes('export type RoleFocus = "pve" | "pvp" | "mixed";'), 'RoleFocus is pve/pvp/mixed');
assert(gameTypes.includes('export type NpcPlaystyle = "pve" | "pvp" | "mixed";'), 'NpcPlaystyle is pve/pvp/mixed');
assert(gameTypes.includes('export type GuildType = "PVE" | "PVP" | "MIXED";'), 'GuildType is PVE/PVP/MIXED');

assert(!legacyTokens.some((token) => gameTypes.includes(token)), 'legacy npc focus types removed from game types');
assert(!legacyTokens.some((token) => contentNpc.includes(token)), 'legacy npc focus types removed from npc content');
assert(!legacyTokens.some((token) => createNewGame.includes(token)), 'legacy npc focus types removed from new game generator');
assert(!legacyTokens.some((token) => npcSkillSystem.includes(token)), 'legacy npc focus types removed from npc skill system');

assert(!bottomNav.includes('goals'), 'bottom nav has no goals');
assert(sideNav.includes("{ id: 'goals', label: '🎯 Цели' }"), 'side nav has goals');

assert(/commitFast\s*\(\s*set\s*,\s*refreshPartyFinderListings\s*\(\s*server\s*,\s*rng\s*\)\s*\)/.test(refreshBlock), 'refreshPartyFinder is fast');
assert(!partyActions.includes('commit(set,'), 'Party Finder action block has no full commit');

assert(partyFinderSystem.includes('pickNpcApplicantForPlayerListing'), 'NPC applicant picker exists');
assert(partyFinderSystem.includes('const explainNoPlayerApplicant ='), 'NPC applicant no-candidate reason helper exists');
assert(!applicantPicker.includes('.sort('), 'NPC applicant picker does not sort all NPCs');

assert(guildWarSystem.includes('npcsByGuildId'), 'guild war uses guild NPC index');
assert(!guildWarSystem.includes('Math.min(6, rawDuelTicks)'), 'guild war is not capped to 6 duels');

if (fail.length) {
  console.error('Smoke failed:');
  fail.forEach((message) => console.error('- ' + message));
  console.error(`${pass.length} checks passed before failure.`);
  process.exit(1);
}

console.log('Smoke passed:');
pass.forEach((message) => console.log('- ' + message));
