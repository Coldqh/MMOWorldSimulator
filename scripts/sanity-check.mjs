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

const gameStore = read('src/state/gameStore.ts');
const guildWarSystem = read('src/systems/guildWarSystem.ts');
const guildRuntimeSystem = read('src/systems/guildRuntimeSystem.ts');
const partyFinderSystem = read('src/systems/partyFinderSystem.ts');
const siegeSystem = read('src/systems/siegeSystem.ts');
const castlePanel = read('src/ui/components/CastlePanel.tsx');
const appShell = read('src/ui/layout/AppShell.tsx');
const gameTypes = read('src/types/game.ts');
const version = read('src/engine/version.ts');
const pkg = JSON.parse(read('package.json'));

const bottomNav = takeBetween(appShell, 'const bottomNav', 'const sideNav');
const sideNav = takeBetween(appShell, 'const sideNav', 'const cityOnlyScreens');
const simulateServer = takeBetween(gameStore, 'const simulateServerForMinutes', 'const normalizeServer');
const skipHour = takeBetween(gameStore, 'skipHour:', 'skipDay:');
const skipDay = takeBetween(gameStore, 'skipDay:', 'exportSave:');

const bottomNavIds = Array.from(bottomNav.matchAll(/id:\s*'([^']+)'/g)).map((match) => match[1]);

assert(pkg.version === '0.7.30', 'package.json version is 0.7.30');
assert(version.includes("APP_VERSION = '0.7.30'") || version.includes('APP_VERSION = "0.7.30"'), 'APP_VERSION is 0.7.30');

assert(appShell.includes('GoalsScreen'), 'AppShell registers GoalsScreen');
assert(sideNav.includes("{ id: 'goals', label: '🎯 Цели' }"), 'sideNav contains Goals tab');
assert(!bottomNav.includes('goals'), 'bottomNav does not contain Goals tab');
assert(bottomNavIds.length === 3 && bottomNavIds.join('|') === 'character|world|quests', 'bottomNav contains exactly Hero/World/Quests');
assert(gameTypes.includes('| "goals"'), 'ScreenId contains goals');

assert(simulateServer.includes('tickGuildWars('), 'simulateServerForMinutes runs tickGuildWars');
assert(!simulateServer.includes('simulateGuildWarsEveryHalfHour('), 'simulateServerForMinutes does not run duplicate half-hour guild war simulator');
assert(skipHour.includes('commitFast(set, next, null'), 'skipHour uses commitFast');
assert(skipDay.includes('commitFast(set, next, null'), 'skipDay uses commitFast');
assert(guildWarSystem.includes('Math.min(6') || guildWarSystem.includes('Math.min(4'), 'guild war catch-up is capped');
assert(guildRuntimeSystem.includes('Math.min(6') || guildRuntimeSystem.includes('Math.min(4'), 'legacy half-hour guild-war simulator is capped');

assert(partyFinderSystem.includes('pickNpcApplicantForPlayerListing'), 'Party Finder has player-led applicant picker');
assert(partyFinderSystem.includes('applicantIds: unique([...(listing.applicantIds ?? []), candidate.id])'), 'Party Finder wait can add NPC applicantIds');
assert(partyFinderSystem.includes('ownsPlayerListing'), 'Party Finder preserves player-led listing without full refresh');
assert(partyFinderSystem.includes("other.visibility === 'static'") && partyFinderSystem.includes("other.visibility === 'guild_internal'"), 'Party Finder does not pull NPCs from static/guild-internal groups');

assert(siegeSystem.includes('canUnregisterPlayerGuildFromCastle'), 'Siege unregister permission check exists');
assert(siegeSystem.includes('Нужен ГМ, зам или офицер.'), 'Siege unregister requires leader/deputy/officer');
assert(castlePanel.includes('canUnregisterPlayerGuildFromCastle'), 'CastlePanel uses siege unregister permission check');
assert(castlePanel.includes('unregisterCheck.ok') && castlePanel.includes('Гильдия зарегистрирована'), 'CastlePanel shows registered state without unregister button for regular members');

if (fail.length) {
  console.error('Sanity failed:');
  fail.forEach((message) => console.error('- ' + message));
  console.error(`${pass.length} checks passed before failure.`);
  process.exit(1);
}

console.log('Sanity passed:');
pass.forEach((message) => console.log('- ' + message));
