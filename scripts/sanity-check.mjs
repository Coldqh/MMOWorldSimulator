import fs from 'node:fs';

const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';

const files = {
  pkg: read('package.json'),
  version: read('src/engine/version.ts'),
  saveLoad: read('src/engine/saveLoad.ts'),
  types: read('src/types/game.ts'),
  gameStore: read('src/state/gameStore.ts'),
  guildRuntime: read('src/systems/guildRuntimeSystem.ts'),
  guildScreen: read('src/ui/screens/GuildScreen.tsx'),
  guildWarPanel: read('src/ui/components/GuildWarPanel.tsx'),
};

const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

assert(files.pkg.includes('"version": "0.7.14"'), 'package version 0.7.14');
assert(files.version.includes("APP_VERSION = '0.7.14'"), 'APP_VERSION 0.7.14');
assert(files.saveLoad.includes("SAVE_VERSION = '0.7.0'"), 'save line remains 0.7.0');
assert(files.types.includes('applicantNpcId?: Id;'), 'GuildApplication has applicantNpcId');
assert(files.gameStore.includes('simulateGuildWarsEveryHalfHour'), 'gameStore uses runtime war simulator');
assert(files.gameStore.includes('maybeGeneratePlayerGuildApplication'), 'gameStore generates player guild applications');
assert(files.gameStore.includes('createPlayerGuild: (name: string, focus: GuildFocus, level: number) => void;'), 'createPlayerGuild action in interface');
assert(files.gameStore.includes('acceptGuildApplicant'), 'accept guild applicant action exists');
assert(files.gameStore.includes('rejectGuildApplicant'), 'reject guild applicant action exists');
assert(files.gameStore.includes('declareWarDirectRuntime'), 'declare war uses direct runtime');
assert(files.guildRuntime.includes('ensureSoloNpcPool'), 'solo npc pool helper exists');
assert(files.guildRuntime.includes('lowNames') && files.guildRuntime.includes('midNames') && files.guildRuntime.includes('highNames'), 'solo npc groups exist');
assert(files.guildRuntime.includes('simulateGuildWarsEveryHalfHour'), 'war score runtime helper exists');
assert(files.guildRuntime.includes('attackerKills') && files.guildRuntime.includes('defenderKills'), 'war scores use real kill fields');
assert(files.guildScreen.includes('Создать гильдию'), 'guild creation UI exists');
assert(files.guildScreen.includes('Заявки одиночек'), 'guild applicant UI exists');
assert(files.guildScreen.includes('createPlayerGuild'), 'guild screen calls createPlayerGuild');
assert(files.guildWarPanel.includes("type WarTab = 'active' | 'declare' | 'votes' | 'history'"), 'declare war subtab exists');
assert(files.guildWarPanel.includes('war.attackerKills') && files.guildWarPanel.includes('war.defenderKills'), 'war panel displays real score');
assert(!files.gameStore.includes('},}));'), 'gameStore malformed tail absent');

if (fail.length) {
  console.error('Sanity failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}
console.log('Sanity passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
