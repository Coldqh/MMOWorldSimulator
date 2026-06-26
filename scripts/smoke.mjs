import fs from 'node:fs';
const read = (path) => fs.readFileSync(path, 'utf8');
const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);
const guildWar = read('src/systems/guildWarSystem.ts');
const roster = read('src/systems/guildRosterSystem.ts');
const location = read('src/systems/npcLocationSystem.ts');
const types = read('src/types/game.ts');
const store = read('src/state/gameStore.ts');
assert(types.includes('GuildWarKillRecord'), 'war kill record type exists');
assert(roster.includes('pvp') && roster.includes('pve') && roster.includes('hybrid'), 'guild focus/playstyle supported');
assert(guildWar.includes('activeCount') && guildWar.includes('>= 2'), 'max 2 war guard exists');
assert(guildWar.includes('clampDuration') && guildWar.includes('Math.max(7'), 'duration clamp exists');
assert(guildWar.includes('resolveGuildWarVotes'), 'vote resolution exists');
assert(guildWar.includes('simulateActiveGuildWars'), '30 minute simulation exists');
assert(guildWar.includes('recordGuildWarKill'), 'kill recording exists');
assert(location.includes('canPlayerAttackWarNpc'), 'location attack availability exists');
assert(store.includes('handleWarNpcEncountersOnPlayerLocationEnter'), 'location entry encounter hook exists');
if (fail.length) {
  console.error('Smoke failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}
console.log('Smoke passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
