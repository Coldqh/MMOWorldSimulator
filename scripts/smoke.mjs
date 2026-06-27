import fs from 'node:fs';

const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';
const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

const store = read('src/state/gameStore.ts');
const types = read('src/types/game.ts');
const siege = read('src/systems/siegeSystem.ts');
const combatPanel = read('src/ui/components/CombatPanel.tsx');
const arena3v3 = read('src/systems/arena3v3System.ts');

assert(read('package.json').includes('"version": "0.7.24"'), 'version bumped');
assert(store.includes('Boolean(combat.teamA && combat.teamB)'), 'all team combats use team resolver');
assert(arena3v3.includes('floatingEvents'), 'team combat creates visual events');
assert(combatPanel.includes('floating-event-stack'), 'CombatPanel renders visual events');
assert(types.includes('CastleHistoryEntry') && types.includes('SiegeUnit'), 'siege types are present');
assert(siege.includes('MAX_SIEGE_TURNS = 200'), 'siege cannot run forever');
assert(siege.includes('winnerGuildId'), 'siege winner is stored');
assert(siege.includes('mvpId'), 'siege mvp is stored');
assert(store.includes('registerSiegeRoster') && store.includes('unregisterSiegeRoster'), 'store exposes castle roster actions');

if (fail.length) {
  console.error('Smoke failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}
console.log('Smoke passed:');
ok.forEach((msg) => console.log(`- ${msg}`));

const arenaV0724SmokeHotfix = fs.readFileSync('src/systems/arena3v3System.ts', 'utf8');
if (!arenaV0724SmokeHotfix.includes('flatMap<CombatFloatingEvent>') || !arenaV0724SmokeHotfix.includes('const events: CombatFloatingEvent[]')) {
  console.error('Smoke failed: v0.7.24 CombatFloatingEvent type narrowing fix missing');
  process.exit(1);
}
console.log('Smoke passed: v0.7.24 typecheck hotfix');

const arenaV0724SmokeHardfix = fs.readFileSync('src/systems/arena3v3System.ts', 'utf8');
const rngImportV0724SmokeHardfix = [...arenaV0724SmokeHardfix.matchAll(/import\s+type\s+\{([\s\S]*?)\}\s+from\s+['"]\.\.\/engine\/rng['"];/g)];
if (rngImportV0724SmokeHardfix.length !== 1 || rngImportV0724SmokeHardfix[0][1].includes('CombatFloatingEvent')) {
  console.error('Smoke failed: CombatFloatingEvent imported from engine/rng');
  process.exit(1);
}
console.log('Smoke passed: v0.7.24 arena import hardfix');
