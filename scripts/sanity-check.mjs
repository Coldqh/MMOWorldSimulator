import fs from 'node:fs';

const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';

const files = {
  packageJson: read('package.json'),
  saveLoad: read('src/engine/saveLoad.ts'),
  version: read('src/engine/version.ts'),
  versionJson: read('public/version.json'),
  sw: read('public/sw.js'),
  quests: read('src/content/quests.ts'),
  world: read('src/ui/screens/WorldScreen.tsx'),
};

const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

assert(files.packageJson.includes('"version": "0.6.1"'), 'package version is 0.6.1');
assert(files.saveLoad.includes("SAVE_VERSION = '0.6.1'"), 'save version is 0.6.1');
assert(files.saveLoad.includes('mmoworldsimulator.save.v0.6.0'), '0.6.0 legacy save key exists');
assert(files.version.includes("APP_VERSION = '0.6.1'"), 'APP_VERSION is 0.6.1');
assert(files.versionJson.includes('"version": "0.6.1"'), 'version.json is 0.6.1');
assert(files.sw.includes("mmows-v0.6.1"), 'service worker cache is v0.6.1');

assert(!files.quests.includes('Если идёшь за город, начни с поля'), 'old quest prose removed');
assert(!files.quests.includes('Слизь снова выползла к тракту'), 'old quest prose removed from slime quest');
assert(files.quests.includes('Цель: убить 8 слизней.'), 'quest intro is objective text');
assert(files.quests.includes('Цель: пройти Погреб Старого Фонаря.'), 'dungeon quest intro is objective text');
assert(files.quests.includes('reward: { xp: 700'), 'quest XP doubled for final quest');
assert(files.quests.includes('reward: { xp: 120'), 'quest XP doubled for basic kill quests');

assert(files.world.includes('modal-backdrop travel-modal-backdrop'), 'travel selector is modal overlay');
assert(files.world.includes('availableZonesForPlayer'), 'travel selector filters available zones');
assert(files.world.includes('.filter((zone) => level >= zone.levelRange[0])'), 'travel selector only shows level-available zones');
assert(files.world.includes('b.levelRange[0] - a.levelRange[0]'), 'travel zones sorted high to low');
assert(!files.world.includes('{travelOpen && (\\n        <section className="panel">'), 'inline travel panel removed');

if (fail.length) {
  console.error('Sanity failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}

console.log('Sanity passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
