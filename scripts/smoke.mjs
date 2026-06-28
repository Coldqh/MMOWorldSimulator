import fs from 'node:fs';

const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';
const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

const siege = read('src/systems/siegeSystem.ts');
const castlePanel = read('src/ui/components/CastlePanel.tsx');
const store = read('src/state/gameStore.ts');

assert(read('package.json').includes('"version": "0.7.26"'), 'version bumped');
assert(siege.includes('registrationWindowOpen'), 'registration window exists');
assert(siege.includes('autoRegisterNpcGuildsForOpenSieges'), 'NPC guilds register only for open sieges');
assert(siege.includes('currentSiegeRun: run'), 'due siege creates active run');
assert(!siege.includes('return finishSiege(server, castle, { ...run, status: \\'finished\\''), 'due siege is not instantly finished');
assert(castlePanel.includes('Начать осаду') && castlePanel.includes('Идти вверх'), 'interactive siege UI exists');
assert(store.includes('startSiege: () =>') && store.includes('siegeStep: (direction) =>'), 'store actions exist');

if (fail.length) {
  console.error('Smoke failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}
console.log('Smoke passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
