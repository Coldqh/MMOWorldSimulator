import fs from 'node:fs';
const read = (path) => fs.readFileSync(path, 'utf8');
const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);
const pkg = read('package.json');
const store = read('src/state/gameStore.ts');
const pvpStat = read('src/systems/pvpStatSystem.ts');
const pvpDuel = read('src/systems/pvpDuelSystem.ts');
const arena = read('src/systems/arena3v3System.ts');
const arenaScreen = read('src/ui/screens/ArenaScreen.tsx');

assert(pkg.includes('"version": "0.7.23"'), 'version bumped');
assert(store.startsWith('import { create } from "zustand";'), 'clean import header');
assert(store.includes('startArena5v5: () => void;') && store.includes('startArena10v10: () => void;'), 'store exposes 5v5/10v10');
assert(store.includes('resolveArenaTeamRound'), 'store routes team combat resolver');
assert(pvpStat.includes('getPlayerStats(playerLikeFromNpc(npc))'), 'NPC PvP stats use player pipeline');
assert(pvpDuel.includes('MAX_WAR_DUEL_PARTICIPANTS = 10'), 'war duel cap 10');
assert(pvpDuel.includes('arenaMode: \'team\''), 'war duel uses team mode');
assert(arena.includes('startArena5v5Combat') && arena.includes('startArena10v10Combat'), 'team arena starts exist');
assert(arenaScreen.includes('Найти бой 5v5') && arenaScreen.includes('Найти бой 10v10'), 'team arena buttons exist');
assert(store.trimEnd().endsWith('}));'), 'gameStore closes cleanly');

if (fail.length) {
  console.error('Smoke failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}
console.log('Smoke passed:');
ok.forEach((msg) => console.log(`- ${msg}`));

const smokeStoreSourceForV0723Hotfix = fs.readFileSync('src/state/gameStore.ts', 'utf8');
if (smokeStoreSourceForV0723Hotfix.includes('resolveArena3v3Round(server,')) {
  console.error('Smoke failed: old resolveArena3v3Round gameStore call still present');
  process.exit(1);
}
if (!smokeStoreSourceForV0723Hotfix.includes('resolveArenaTeamRound(server,')) {
  console.error('Smoke failed: resolveArenaTeamRound gameStore call missing');
  process.exit(1);
}
console.log('Smoke passed: v0.7.23 typecheck hotfix');
