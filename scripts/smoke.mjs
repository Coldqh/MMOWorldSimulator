import fs from 'node:fs';
const read = (path) => fs.readFileSync(path, 'utf8');
const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);
const pkg = read('package.json');
const store = read('src/state/gameStore.ts');
const header = store.slice(0, store.indexOf('interface GameStore {'));
const arena = read('src/ui/screens/ArenaScreen.tsx');
const pvpDuel = read('src/systems/pvpDuelSystem.ts');
const combat = read('src/systems/combatSystem.ts');
const brackets = read('src/systems/arenaBracketSystem.ts');

assert(pkg.includes('"version": "0.7.21"'), 'version remains 0.7.21');
assert(store.startsWith('import { create } from "zustand";'), 'clean import header');
assert(!header.includes('SAVE_VERSION,\n  arenaRankName'), 'corrupted import header absent');
assert(brackets.includes('levelRange: [1, 9]') && brackets.includes('levelRange: [10, 19]') && brackets.includes('levelRange: [20, 20]'), 'arena bracket ranges fixed');
assert(arena.includes('Лоу арена') && arena.includes('Мид арена') && arena.includes('Хай арена'), 'three arenas visible');
assert(store.includes('getArenaBracketOpponentPool'), '1v1 uses bracket pool');
assert(store.includes('startWarNpcAmbushCombat'), 'npc ambush starts combat');
assert(store.includes('maybeAddWarDuelReinforcements'), 'turn reinforcement hook exists');
assert(pvpDuel.includes('partyRoles') && pvpDuel.includes('enemyNpcIds'), 'group duel supports allies/enemies');
assert(combat.includes('finishGuildWarVictoryV2'), 'guild war victory routed');
assert(!store.includes('type: "pvp"') && !store.includes("type: 'pvp'"), 'invalid modal type absent');
assert(store.trimEnd().endsWith('}));'), 'gameStore closes cleanly');

if (fail.length) {
  console.error('Smoke failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}
console.log('Smoke passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
