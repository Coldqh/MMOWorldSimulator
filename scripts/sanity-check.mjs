import fs from 'node:fs';
const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';
const files = {
  pkg: read('package.json'),
  version: read('src/engine/version.ts'),
  types: read('src/types/game.ts'),
  store: read('src/state/gameStore.ts'),
  progression: read('src/systems/progressionSystem.ts'),
  arenaBracket: read('src/systems/arenaBracketSystem.ts'),
  arenaScreen: read('src/ui/screens/ArenaScreen.tsx'),
  npcLocation: read('src/systems/npcLocationSystem.ts'),
  pvpDuel: read('src/systems/pvpDuelSystem.ts'),
  guildWarResult: read('src/systems/guildWarCombatResultSystem.ts'),
  locationNpcList: read('src/ui/components/LocationNpcList.tsx'),
  combat: read('src/systems/combatSystem.ts'),
  arena3v3: read('src/systems/arena3v3System.ts'),
};
const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);
const header = files.store.slice(0, files.store.indexOf('interface GameStore {'));
const zustandImport = header.match(/import\s+\{([\s\S]*?)\}\s+from\s+["']zustand["'];/)?.[1]?.trim();

assert(files.pkg.includes('"version": "0.7.21"'), 'package version 0.7.21');
assert(files.version.includes("APP_VERSION = '0.7.21'"), 'APP_VERSION 0.7.21');
assert(files.store.startsWith('import { create } from "zustand";'), 'gameStore starts with clean zustand import');
assert(zustandImport === 'create', 'zustand imports only create');
assert(!header.includes('SAVE_VERSION,\n  arenaRankName'), 'corrupted zustand import absent');
assert(!header.includes('from "../content/world";\nimport { createRng'), 'merged world/rng import absent');
assert(!header.includes('from "../systems/arena3v3System";\nimport {'), 'merged arena3v3 import absent');
assert(!header.includes('from "../engine/runtimeValidation";\nimport { backupRescueSave'), 'merged runtimeValidation import absent');
assert(header.includes('SAVE_VERSION') && header.includes('from "../engine/saveLoad";'), 'SAVE_VERSION imported from saveLoad');
assert(header.includes('startWarNpcDuelCombat') && header.includes('from "../systems/pvpDuelSystem";'), 'pvp duel imports correct');
assert(header.includes('getArenaBracketOpponentPool') && header.includes('from "../systems/arenaBracketSystem";'), 'arena bracket imports correct');
assert((files.store.match(/const simulateServerForMinutes\s*=/g) ?? []).length === 1, 'one simulateServerForMinutes');

assert(files.arenaBracket.includes("levelRange: [1, 9]") && files.arenaBracket.includes("levelRange: [10, 19]") && files.arenaBracket.includes("levelRange: [20, 20]"), 'arena brackets are low 1-9, mid 10-19, high 20');
assert(files.arenaBracket.includes("Mythic") && files.arenaBracket.includes("Diamond") && files.arenaBracket.includes("Bronze"), 'arena ranks include mythic/diamond/bronze');
assert(files.types.includes('lastWarAttackDay?: number;') && files.types.includes('lastWarAttackMinute?: number;'), 'war attack cooldown persisted');
assert(files.types.includes('healerId?: Id;'), 'healerId optional');
assert(files.types.includes('"guild_war"'), 'CombatSource has guild_war');
assert(files.pvpDuel.includes('startWarNpcAmbushCombat'), 'npc ambush combat exists');
assert(files.pvpDuel.includes('maybeAddWarDuelReinforcements'), 'turn reinforcements exist');
assert(files.pvpDuel.includes('...(healerCandidate ? { healerId: healerCandidate } : {})'), 'pvp role map omits missing healer');
assert(files.guildWarResult.includes('finishGuildWarVictoryV2') && files.guildWarResult.includes('finishGuildWarDefeatV2'), 'guild war result handlers exist');
assert(files.combat.includes('finishGuildWarVictoryV2') && files.combat.includes('finishGuildWarDefeatV2'), 'combat routes guild war results');
assert(files.store.includes('maybeAddWarDuelReinforcements'), 'store applies per-turn reinforcements');
assert(files.store.includes('startWarNpcAmbushCombat'), 'store starts npc ambush combat');
assert(files.store.includes('markWarAttackCooldown'), 'store marks war attack cooldown');
assert(files.npcLocation.includes('npc.level >= zone.levelRange[0]') && files.npcLocation.includes('npc.level >= spot.levelRange[0]'), 'strict NPC location min levels');
assert(files.locationNpcList.includes('success-text ally-name'), 'guildmates colored green');
assert(files.locationNpcList.includes('КД ${cooldownText}'), 'cooldown shown on attack button');
assert(files.arena3v3.includes("if (role === 'tank') return pvp ? 'reckless' : 'aggressive';"), 'tank aggression highest');
assert(!files.store.includes('type: "pvp"') && !files.store.includes("type: 'pvp'"), 'invalid modal pvp type absent');
assert(files.store.trimEnd().endsWith('}));'), 'gameStore closes cleanly');

if (fail.length) {
  console.error('Sanity failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}
console.log('Sanity passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
