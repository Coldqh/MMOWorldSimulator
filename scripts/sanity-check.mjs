import fs from 'node:fs';

const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';

const files = {
  pkg: read('package.json'),
  version: read('src/engine/version.ts'),
  saveLoad: read('src/engine/saveLoad.ts'),
  guildWarSeed: read('src/systems/guildWarSeedSystem.ts'),
  gameStore: read('src/state/gameStore.ts'),
  guildWarSystem: read('src/systems/guildWarSystem.ts'),
  combatSystem: read('src/systems/combatSystem.ts'),
  resultModal: read('src/ui/components/ResultModal.tsx'),
};

const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

assert(files.pkg.includes('"version": "0.7.13"'), 'package version 0.7.13');
assert(files.version.includes("APP_VERSION = '0.7.13'"), 'APP_VERSION 0.7.13');
assert(files.saveLoad.includes("SAVE_VERSION = '0.7.0'"), 'SAVE_VERSION remains 0.7.0');
assert(files.guildWarSeed.includes('GuildWar | null'), 'guild war normalizer can reject bad legacy war');
assert(files.guildWarSeed.includes('const attackerGuildId = war.attackerGuildId;'), 'guild war normalizer narrows attacker id');
assert(files.guildWarSeed.includes('if (!attackerGuildId || !defenderGuildId) return null;'), 'guild war normalizer guards missing guild ids');
assert(files.guildWarSeed.includes('.filter((war): war is GuildWar => Boolean(war))'), 'guild war normalizer uses type guard');
assert(files.gameStore.includes('skipHour: () => void;'), 'skipHour interface exists');
assert(files.gameStore.includes('skipHour: () => {'), 'skipHour implementation exists');
assert(files.guildWarSystem.includes('maxDuelsPerWar'), 'war sim supports half-hour duel batches');
assert(files.combatSystem.includes('combat_max_turn'), 'combat max-turn failsafe exists');
assert(files.resultModal.includes("modal.type === 'guild' ? 'Профиль'"), 'guild modal title fixed');

if (fail.length) {
  console.error('Sanity failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}

console.log('Sanity passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
