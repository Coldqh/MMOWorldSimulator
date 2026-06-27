import fs from 'node:fs';
const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';
const files = {
  pkg: read('package.json'),
  version: read('src/engine/version.ts'),
  types: read('src/types/game.ts'),
  store: read('src/state/gameStore.ts'),
  pvpDuel: read('src/systems/pvpDuelSystem.ts'),
  arena3v3: read('src/systems/arena3v3System.ts'),
  guildWarResult: read('src/systems/guildWarCombatResultSystem.ts'),
  guildWarPanel: read('src/ui/components/GuildWarPanel.tsx'),
  combatPanel: read('src/ui/components/CombatPanel.tsx'),
  locationNpcList: read('src/ui/components/LocationNpcList.tsx'),
  styles: read('src/ui/styles.css'),
};
const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

const header = files.store.slice(0, files.store.indexOf('interface GameStore {'));

assert(files.pkg.includes('"version": "0.7.22"'), 'package version 0.7.22');
assert(files.version.includes("APP_VERSION = '0.7.22'"), 'APP_VERSION 0.7.22');

assert(files.store.startsWith('import { create } from "zustand";'), 'zustand import is clean');
assert(!header.includes('SAVE_VERSION,\n  arenaRankName'), 'corrupted merged import header absent');
assert(!files.store.includes('type: "pvp"') && !files.store.includes("type: 'pvp'"), 'invalid modal pvp type absent');
assert((files.store.match(/const simulateServerForMinutes\s*=/g) ?? []).length === 1, 'one simulateServerForMinutes');
assert(files.store.trimEnd().endsWith('}));'), 'gameStore closes cleanly');

assert(files.types.includes('healerId?: Id;'), 'PartyRoleMap healer optional');
assert(files.types.includes('teamA?: CombatTeamV2;') && files.types.includes('teamB?: CombatTeamV2;'), 'CombatState has team fields');
assert(files.types.includes('"guild_war"'), 'CombatSource has guild_war');

assert(files.pvpDuel.includes('teamA: CombatTeamV2'), 'war duel builds teamA');
assert(files.pvpDuel.includes('teamB: CombatTeamV2'), 'war duel builds teamB');
assert(files.pvpDuel.includes("arenaMode: '3v3'"), 'war duel routes through team combat');
assert(!files.pvpDuel.includes("name: enemies.length === 1 ? enemies[0].name : `Группа врагов"), 'old group enemy label absent');
assert(files.pvpDuel.includes("name: enemies.length === 1 ? enemies[0].name : `Враги · ${enemies.length}`"), 'group enemy label fixed');
assert(files.pvpDuel.includes('teamA: next.teamA ? { ...next.teamA, members: [...next.teamA.members, allyUnit] }'), 'ally reinforcements update teamA');
assert(files.pvpDuel.includes('teamB: next.teamB ? { ...next.teamB, members: [...next.teamB.members, enemyUnit] }'), 'enemy reinforcements update teamB');

assert(files.arena3v3.includes("if (combat.source === 'guild_war') return playerWon ? finishGuildWarVictoryV2"), 'team combat finishes as guild war');
assert(files.guildWarResult.includes('finishGuildWarVictoryV2') && files.guildWarResult.includes('finishGuildWarDefeatV2'), 'guild war combat result exists');

assert(files.combatPanel.includes('const isTeamCombat = Boolean(combat.teamA && combat.teamB);'), 'CombatPanel shows any team combat');
assert(files.combatPanel.includes("combat.source === 'guild_war' ? 'Дуэль войны' : 'Арена 3v3'"), 'CombatPanel labels war duel');

assert(files.guildWarPanel.includes('getWarMvpId'), 'war MVP helper exists');
assert(files.guildWarPanel.includes('victory-text') && files.guildWarPanel.includes('defeat-text'), 'history victory/defeat colors used');
assert(files.guildWarPanel.includes('Победа') && files.guildWarPanel.includes('Поражение'), 'history victory/defeat labels used');
assert(files.guildWarPanel.includes('MVP'), 'war MVP shown');

assert(files.locationNpcList.includes('success-text ally-name'), 'guildmates use green nick class');
assert(files.styles.includes('.victory-text') && files.styles.includes('.defeat-text') && files.styles.includes('.ally-name'), 'styles for victory/defeat/ally names exist');

if (fail.length) {
  console.error('Sanity failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}
console.log('Sanity passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
