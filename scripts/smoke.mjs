import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

const pkg = read('package.json');
const types = read('src/types/game.ts');
const arena3v3 = read('src/systems/arena3v3System.ts');
const combat = read('src/systems/combatSystem.ts');
const location = read('src/systems/npcLocationSystem.ts');
const store = read('src/state/gameStore.ts');

assert(pkg.includes('"version": "0.7.20"'), 'version bumped');
assert(types.includes('"guild_war"'), 'guild war combat source exists');
assert(types.includes('lastWarAttackDay?: number;'), 'cooldown persists on player');
assert(arena3v3.includes("role === 'tank'") && arena3v3.includes("'reckless'"), 'tank aggression fixed');
assert(combat.includes('finishGuildWarVictory') && combat.includes('finishGuildWarDefeat'), 'duel finish handlers exist');
assert(location.includes('getWarAttackCooldownMinutes'), 'cooldown helper exists');
assert(location.includes('npc.level >= zone.levelRange[0]') && location.includes('npc.level >= spot.levelRange[0]'), 'strict npc location min level');
assert(store.includes('startWarNpcDuelCombat(server, npcId, rng)'), 'attack button starts real combat');
assert(!store.includes('type: "pvp"') && !store.includes("type: 'pvp'"), 'invalid modal type gone');
assert(store.trimEnd().endsWith('}));'), 'gameStore closes cleanly');

if (fail.length) {
  console.error('Smoke failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}

console.log('Smoke passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
