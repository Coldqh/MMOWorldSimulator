import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

const pkg = read('package.json');
const settings = read('src/ui/screens/SettingsScreen.tsx');
const gameStore = read('src/state/gameStore.ts');
const guildScreen = read('src/ui/screens/GuildScreen.tsx');
const locationNpcList = read('src/ui/components/LocationNpcList.tsx');

assert(pkg.includes('"version": "0.7.7"'), 'version bumped');
assert(!settings.includes('save v{server.version}'), 'settings hides save-line version');
assert(gameStore.includes('Skill: ${npc.skill ?? 5}/10'), 'npc profile skill line');
assert(gameStore.includes('Playstyle: ${npcPlaystyleLabel(npc.playstyle)}'), 'npc profile playstyle line');
assert(gameStore.includes('Guild Type: ${guildFocusLabel(guild?.guildFocus)}'), 'npc profile guild type line');
assert(!gameStore.includes('Активность: ${npc.activityLevel}'), 'old activity profile line removed');
assert(guildScreen.includes('Отношения'), 'guild relations tab visible');
assert(locationNpcList.includes('Напасть'), 'attack button remains');
assert(!locationNpcList.includes('Gear {npc.gearScore}'), 'location list no longer shows gear');

if (fail.length) {
  console.error('Smoke failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}
console.log('Smoke passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
