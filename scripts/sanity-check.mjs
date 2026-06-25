import fs from 'node:fs';

const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';

const files = {
  packageJson: read('package.json'),
  saveLoad: read('src/engine/saveLoad.ts'),
  version: read('src/engine/version.ts'),
  versionJson: read('public/version.json'),
  sw: read('public/sw.js'),
  combat: read('src/systems/combatSystem.ts'),
  lobby: read('src/ui/screens/PartyLobbyScreen.tsx'),
  partyFinder: read('src/systems/partyFinderSystem.ts'),
};

const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

assert(files.packageJson.includes('"version": "0.5.12"'), 'package version is 0.5.12');
assert(files.saveLoad.includes("SAVE_VERSION = '0.5.12'"), 'save version is 0.5.12');
assert(files.saveLoad.includes('mmoworldsimulator.save.v0.5.11'), '0.5.11 legacy save key exists');
assert(files.version.includes("APP_VERSION = '0.5.12'"), 'APP_VERSION is 0.5.12');
assert(files.versionJson.includes('"version": "0.5.12"'), 'version.json is 0.5.12');
assert(files.sw.includes("mmows-v0.5.12"), 'service worker cache is v0.5.12');

assert(files.combat.includes('spot damage v0.5.12') || files.combat.includes('enemy.attack = Math.max(1, Math.round(enemy.attack / 5))'), 'spot mob damage is divided by 5');
assert(files.combat.includes('enemy.magic = Math.max(0, Math.round(enemy.magic / 5))'), 'spot mob magic damage is divided by 5');

assert(files.lobby.includes('openNpcProfile'), 'PartyLobbyScreen can open NPC profiles');
assert(files.lobby.includes('onClick={() => openNpcProfile(id)}'), 'party member NPC names are clickable');
assert(files.lobby.includes('className="text-button"'), 'clickable NPC profile uses text button');

assert(files.partyFinder.includes('Новых заявок нет'), 'wait event has no-new-applications text');
assert(files.partyFinder.includes('отправил заявку'), 'wait event has sent-application text');
assert(!files.partyFinder.includes('пока не отвечает'), 'removed old wait text: no answer');
assert(!files.partyFinder.includes('Никто подходящий не откликнулся'), 'removed old wait text: no candidates');
assert(!files.partyFinder.includes('Следующее ожидание усилит поиск'), 'removed old wait text: boosted search');
assert(!files.partyFinder.includes('Группа уже готова'), 'removed old wait text: group already ready');

if (fail.length) {
  console.error('Sanity failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}

console.log('Sanity passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
