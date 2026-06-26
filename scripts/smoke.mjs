import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

const saveLoad = read('src/engine/saveLoad.ts');
const gameStore = read('src/state/gameStore.ts');
const questSystem = read('src/systems/questSystem.ts');
const contractSystem = read('src/systems/contractSystem.ts');
const lootSystem = read('src/systems/lootSystem.ts');
const partyFinderSystem = read('src/systems/partyFinderSystem.ts');

assert(!saveLoad.includes('.replaceAll('), 'replaceAll compile issue removed');
assert(gameStore.includes('_rng?: unknown'), 'simulateServerForMinutes supports legacy third arg calls');
assert(gameStore.includes("from \"../content/races\"") || gameStore.includes("from '../content/races'"), 'getRaceById import present');
assert((questSystem.match(/from ['"]\.\/objectiveSystem['"]/g) ?? []).length === 1, 'quest duplicate objective import removed');
assert((contractSystem.match(/from ['"]\.\/objectiveSystem['"]/g) ?? []).length === 1, 'contract duplicate objective import removed');
assert(lootSystem.includes('mythic:'), 'mythic rarity supported');
assert(partyFinderSystem.includes('export { getClassPartyRole }'), 'party finder role export restored');

if (fail.length) {
  console.error('Smoke failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}

console.log('Smoke passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
