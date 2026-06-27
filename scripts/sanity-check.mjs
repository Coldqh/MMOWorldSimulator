import fs from 'node:fs';

const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';
const files = {
  pkg: read('package.json'),
  version: read('src/engine/version.ts'),
  types: read('src/types/game.ts'),
  store: read('src/state/gameStore.ts'),
  combatPanel: read('src/ui/components/CombatPanel.tsx'),
  arena3v3: read('src/systems/arena3v3System.ts'),
  pvpDuel: read('src/systems/pvpDuelSystem.ts'),
  castles: read('src/content/castles.ts'),
  siege: read('src/systems/siegeSystem.ts'),
  castlePanel: read('src/ui/components/CastlePanel.tsx'),
  guildScreen: read('src/ui/screens/GuildScreen.tsx'),
  styles: read('src/ui/styles.css'),
};
const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

assert(files.pkg.includes('"version": "0.7.24"'), 'package version 0.7.24');
assert(files.version.includes("APP_VERSION = '0.7.24'"), 'APP_VERSION 0.7.24');

assert(files.types.includes('export interface CombatFloatingEvent'), 'CombatFloatingEvent type exists');
assert(files.types.includes('floatingEvents?: CombatFloatingEvent[];'), 'CombatState has floatingEvents');
assert(files.store.includes('Boolean(combat.teamA && combat.teamB)'), 'gameStore routes all team combat through team resolver');
assert(!files.store.includes("combat.arenaMode === '3v3'"), 'old 3v3-only resolver condition removed');
assert(files.arena3v3.includes('floatingEvents'), 'team resolver writes floatingEvents');
assert(files.combatPanel.includes('floating-event-stack'), 'CombatPanel shows per-member floating events');
assert(files.combatPanel.includes('eventByMember'), 'CombatPanel attaches events to members');

assert(files.types.includes('export interface Castle'), 'Castle type exists');
assert(files.types.includes('export interface SiegeRun'), 'SiegeRun type exists');
assert(files.types.includes('castles?: Castle[];'), 'ServerState has castles');
assert(files.types.includes('siegeRosters?: SiegeRoster[];'), 'ServerState has siege rosters');
assert(files.castles.includes('Redstone Keep') && files.castles.includes('Virspire Citadel'), 'default castles exist');
assert(files.castles.includes('width: 10') && files.castles.includes('height: 10'), 'siege maps are 10x10');
assert(files.siege.includes('MAX_SIEGE_TURNS = 200'), 'siege turn cap exists');
assert(files.siege.includes('tickSieges'), 'tickSieges exists');
assert(files.siege.includes('registerPlayerGuildForCastle'), 'siege registration exists');
assert(files.store.includes('tickSieges(next, rng, minutes)'), 'simulateServerForMinutes calls tickSieges');
assert(files.store.includes('normalizeSiegeState'), 'store normalizes siege state');
assert(files.guildScreen.includes('CastlePanel'), 'GuildScreen imports CastlePanel');
assert(files.guildScreen.includes('setMainTab("castles")'), 'GuildScreen has castles tab');
assert(files.castlePanel.includes('Зарегистрировать авто-состав'), 'CastlePanel registration button exists');

assert(files.styles.includes('.siege-map'), 'siege map styles exist');
assert(files.styles.includes('.floating-event'), 'floating event styles exist');

if (fail.length) {
  console.error('Sanity failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}
console.log('Sanity passed:');
ok.forEach((msg) => console.log(`- ${msg}`));

const arenaV0724Hotfix = fs.readFileSync('src/systems/arena3v3System.ts', 'utf8');
if (!arenaV0724Hotfix.includes('CombatFloatingEvent')) {
  console.error('Sanity failed: CombatFloatingEvent import/type missing in arena3v3System');
  process.exit(1);
}
if (!arenaV0724Hotfix.includes('): CombatFloatingEvent[] =>')) {
  console.error('Sanity failed: buildFloatingEventsFromLines return type missing');
  process.exit(1);
}
if (!arenaV0724Hotfix.includes('flatMap<CombatFloatingEvent>')) {
  console.error('Sanity failed: flatMap generic missing');
  process.exit(1);
}
if (!arenaV0724Hotfix.includes('const events: CombatFloatingEvent[]')) {
  console.error('Sanity failed: events array annotation missing');
  process.exit(1);
}
console.log('Sanity passed: v0.7.24 typecheck hotfix');

const arenaV0724Hardfix = fs.readFileSync('src/systems/arena3v3System.ts', 'utf8');
const rngTypeImportsV0724 = [...arenaV0724Hardfix.matchAll(/import\s+type\s+\{([\s\S]*?)\}\s+from\s+['"]\.\.\/engine\/rng['"];/g)];
const gameTypeImportsV0724 = [...arenaV0724Hardfix.matchAll(/import\s+type\s+\{([\s\S]*?)\}\s+from\s+['"]\.\.\/types\/game['"];/g)];
if (rngTypeImportsV0724.length !== 1 || rngTypeImportsV0724[0][1].includes('CombatFloatingEvent')) {
  console.error('Sanity failed: CombatFloatingEvent import is still wrong in arena3v3System');
  process.exit(1);
}
if (gameTypeImportsV0724.length !== 1 || !gameTypeImportsV0724[0][1].includes('CombatFloatingEvent')) {
  console.error('Sanity failed: CombatFloatingEvent is missing from types/game import');
  process.exit(1);
}
if (!arenaV0724Hardfix.includes('flatMap<CombatFloatingEvent>') || !arenaV0724Hardfix.includes('const events: CombatFloatingEvent[]')) {
  console.error('Sanity failed: CombatFloatingEvent narrowing fix missing');
  process.exit(1);
}
console.log('Sanity passed: v0.7.24 arena import hardfix');
