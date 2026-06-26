import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

const pkg = read('package.json');
const seed = read('src/systems/guildWarSeedSystem.ts');

assert(pkg.includes('"version": "0.7.13"'), 'version bumped');
assert(seed.includes('GuildWar | null'), 'seed normalizer return type fixed');
assert(seed.includes('attackerGuildId,'), 'required attacker id narrowed');
assert(seed.includes('defenderGuildId,'), 'required defender id narrowed');

if (fail.length) {
  console.error('Smoke failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}

console.log('Smoke passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
