import fs from 'node:fs';

const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';

const files = {
  pkg: read('package.json'),
  version: read('src/engine/version.ts'),
  saveLoad: read('src/engine/saveLoad.ts'),
  gameStore: read('src/state/gameStore.ts'),
  guildRuntime: read('src/systems/guildRuntimeSystem.ts'),
  guildScreen: read('src/ui/screens/GuildScreen.tsx'),
  guildWarPanel: read('src/ui/components/GuildWarPanel.tsx'),
  types: read('src/types/game.ts'),
};

const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

const simulatorMatches = files.gameStore.match(/const simulateServerForMinutes\s*=/g) ?? [];

assert(files.pkg.includes('"version": "0.7.16"'), 'package version 0.7.16');
assert(files.version.includes("APP_VERSION = '0.7.16'"), 'APP_VERSION 0.7.16');
assert(files.saveLoad.includes("SAVE_VERSION = '0.7.0'"), 'save line remains 0.7.0');
assert(simulatorMatches.length === 1, `exactly one simulateServerForMinutes declaration, found ${simulatorMatches.length}`);
assert(files.guildRuntime.includes("count: 33, min: 1, max: 8"), '33 low solo NPCs');
assert(files.guildRuntime.includes("count: 33, min: 9, max: 16"), '33 mid solo NPCs');
assert(files.guildRuntime.includes("count: 34, min: 17, max: 20"), '34 high solo NPCs');
assert(files.guildRuntime.includes("sameTierWarCount(next, tier) < 2"), 'ensures two active wars per tier');
assert(files.guildRuntime.includes("finishExpiredWars"), 'expired wars are finished before reseeding');
assert(files.guildRuntime.includes("simulateGuildWarsEveryHalfHour"), 'war sim helper exists');
assert(files.gameStore.includes("simulateGuildWarsEveryHalfHour(next, rng, minutes)"), 'war sim wired in time advance');
assert(files.gameStore.includes("maybeGeneratePlayerGuildApplication(next, rng)"), 'guild applications wired in time advance');
assert(files.guildScreen.includes('type MainGuildTab = "guilds" | "wars"'), 'top-level guild/wars tab exists');
assert(files.guildScreen.includes('setMainTab("wars")'), 'guild screen can switch to wars');
assert(files.guildWarPanel.includes('Профиль войны'), 'war profile UI exists');
assert(files.guildWarPanel.includes('топ-5'), 'war top-5 UI exists');
assert(files.guildWarPanel.includes('конец:'), 'war end date visible');
assert(files.guildWarPanel.includes('war.attackerKills') && files.guildWarPanel.includes('war.defenderKills'), 'war panel uses real kill fields');
assert(files.types.includes('applicantNpcId?: Id;'), 'guild application applicant field exists');
assert(!files.gameStore.includes('},}));'), 'gameStore malformed tail absent');
assert(files.gameStore.trimEnd().endsWith('}));'), 'gameStore closes cleanly');

if (fail.length) {
  console.error('Sanity failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}

console.log('Sanity passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
