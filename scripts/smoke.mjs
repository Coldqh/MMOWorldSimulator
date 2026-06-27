import fs from 'node:fs';
const read = (path) => fs.readFileSync(path, 'utf8');
const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);
const pkg = read('package.json');
const store = read('src/state/gameStore.ts');
const pvpDuel = read('src/systems/pvpDuelSystem.ts');
const arena3v3 = read('src/systems/arena3v3System.ts');
const guildPanel = read('src/ui/components/GuildWarPanel.tsx');
const combatPanel = read('src/ui/components/CombatPanel.tsx');
const styles = read('src/ui/styles.css');

assert(pkg.includes('"version": "0.7.22"'), 'version bumped');
assert(store.startsWith('import { create } from "zustand";'), 'clean import header');
assert(pvpDuel.includes('teamA: CombatTeamV2') && pvpDuel.includes('teamB: CombatTeamV2'), 'war duels are team combat');
assert(pvpDuel.includes('Враги · ${enemies.length}'), 'group enemy label fixed');
assert(arena3v3.includes("combat.source === 'guild_war'"), 'guild war uses team resolver result path');
assert(guildPanel.includes('MVP') && guildPanel.includes('victory-text') && guildPanel.includes('defeat-text'), 'war history result UI');
assert(combatPanel.includes('Boolean(combat.teamA && combat.teamB)'), 'CombatPanel displays team combat');
assert(styles.includes('.ally-name'), 'ally name green css exists');
assert(store.trimEnd().endsWith('}));'), 'gameStore closes cleanly');

if (fail.length) {
  console.error('Smoke failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}
console.log('Smoke passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
