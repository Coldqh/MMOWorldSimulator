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

const smokeV0727 = {
  siege: fs.readFileSync('src/systems/siegeSystem.ts', 'utf8'),
  guildWar: fs.readFileSync('src/systems/guildWarSystem.ts', 'utf8'),
  combat: fs.readFileSync('src/ui/components/CombatPanel.tsx', 'utf8'),
};
if (!smokeV0727.siege.includes('registerGuildsForCastleNow(next, castle)')) {
  console.error('Smoke failed: siege rosters are not forced at due time');
  process.exit(1);
}
if (!smokeV0727.guildWar.includes('hasOpenWarBetween') || !smokeV0727.guildWar.includes('notifyPlayerGuildWarVotes')) {
  console.error('Smoke failed: guild war duplicate/vote fix missing');
  process.exit(1);
}
if (!smokeV0727.combat.includes('team-combat-layout')) {
  console.error('Smoke failed: compact team combat layout missing');
  process.exit(1);
}
console.log('Smoke passed: v0.7.27 guild war siege ui fix');
