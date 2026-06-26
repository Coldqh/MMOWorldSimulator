import fs from 'node:fs';

const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';

const files = {
  pkg: read('package.json'),
  version: read('src/engine/version.ts'),
  versionJson: read('public/version.json'),
  manifest: read('public/manifest.webmanifest'),
  settings: read('src/ui/screens/SettingsScreen.tsx'),
  guildIdentity: read('src/systems/guildIdentitySystem.ts'),
  guildRoster: read('src/systems/guildRosterSystem.ts'),
  guildScreen: read('src/ui/screens/GuildScreen.tsx'),
  locationNpcList: read('src/ui/components/LocationNpcList.tsx'),
  gameStore: read('src/state/gameStore.ts'),
  resultModal: read('src/ui/components/ResultModal.tsx'),
  types: read('src/types/game.ts'),
};

const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

assert(files.pkg.includes('"version": "0.7.7"'), 'package version 0.7.7');
assert(files.version.includes("APP_VERSION = '0.7.7'"), 'APP_VERSION 0.7.7');
assert(files.versionJson.includes('"version": "0.7.7"'), 'version.json 0.7.7');
assert(files.manifest.includes('"version": "0.7.7"'), 'manifest 0.7.7');

assert(files.settings.includes('app v{APP_VERSION}') && !files.settings.includes('save v{server.version}'), 'settings does not show internal save v0.7.0');
assert(files.guildIdentity.includes('normalizeGuildAndNpcIdentities'), 'guild identity cleanup helper exists');
assert(files.guildIdentity.includes("guildFocusToLegacyType"), 'guild type normalization helper exists');
assert(files.guildIdentity.includes("'solo'"), 'solo NPC playstyle exists');
assert(files.guildRoster.includes('normalizeGuildAndNpcIdentities'), 'guild roster normalizes identities');
assert(!files.guildRoster.includes("return 'hybrid';"), 'guild roster no longer assigns hybrid NPC playstyle');
assert(files.locationNpcList.includes('Lv. {npc.level}') && !files.locationNpcList.includes('Gear') && !files.locationNpcList.includes('skill'), 'location list is compact');
assert(files.guildScreen.includes('Отношения'), 'guild screen has relations tab');
assert(files.guildScreen.includes('renderNpcButton'), 'guild screen renders clickable GM/officers');
assert(!files.guildScreen.includes('raidProgress') && !files.guildScreen.includes('stability'), 'guild profile screen hides raid/stability');
assert(files.gameStore.includes('normalizeGuildAndNpcIdentities'), 'gameStore migration normalizes identities');
assert(!files.gameStore.includes('`Активность: ${npc.activityLevel}/10`'), 'NPC profile activity removed');
assert(!files.gameStore.includes('`Амбиции: ${npc.ambition}/10`'), 'NPC profile ambition removed');
assert(!files.gameStore.includes('`Риск: ${npc.risk}/10`'), 'NPC profile risk removed');
assert(files.gameStore.includes('`Skill: ${npc.skill ?? 5}/10`'), 'NPC profile shows skill');
assert(files.gameStore.includes('`Guild Type: ${guildFocusLabel(guild?.guildFocus)}`'), 'NPC profile shows guild type');
assert(files.resultModal.includes('ACTION_NPC_PROFILE:'), 'modal supports clickable NPC profile actions');
assert(files.types.includes('"solo"'), 'types allow solo playstyle');

if (fail.length) {
  console.error('Sanity failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}
console.log('Sanity passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
