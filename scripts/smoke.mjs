import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (filePath) => fs.readFileSync(path.join(root, filePath), 'utf8');
const parseJson = (filePath) => JSON.parse(read(filePath));

const pass = [];
const fail = [];
const assert = (condition, message) => condition ? pass.push(message) : fail.push(message);

const between = (text, startNeedle, endNeedle) => {
  const start = text.indexOf(startNeedle);
  if (start < 0) return '';
  const end = text.indexOf(endNeedle, start + startNeedle.length);
  return end >= 0 ? text.slice(start, end) : text.slice(start);
};

const pkg = parseJson('package.json');
const publicVersion = parseJson('public/version.json');
const versionTs = read('src/engine/version.ts');
const saveLoad = read('src/engine/saveLoad.ts');
const gameStore = read('src/state/gameStore.ts');
const guildWarSystem = read('src/systems/guildWarSystem.ts');
const guildRelationSystem = read('src/systems/guildRelationSystem.ts');
const itemContent = read('src/content/itemContent.ts');
const worldContent = read('src/content/world.ts');
const balanceConfig = read('src/balance/balanceConfig.ts');
const formulas = read('src/balance/formulas.ts');
const appShell = read('src/ui/layout/AppShell.tsx');
const siegeSystem = fs.existsSync(path.join(root, 'src/systems/siegeSystem.ts')) ? read('src/systems/siegeSystem.ts') : '';

const simulateBlock = between(gameStore, 'const simulateServerForMinutes =', 'const normalizeServer');
const commitBlock = between(gameStore, 'const commit = (', 'const commitFast =');
const skipDayBlock = between(gameStore, '  skipDay: () => {', '  exportSave:');
const skipHourBlock = between(gameStore, '  skipHour: () => {', '  skipDay:');
const tickGuildWarsBlock = between(guildWarSystem, 'export const tickGuildWars =', '};');
const startArenaBlock = between(gameStore, 'startArena: () => {', 'startArena3v3:');
const bottomNav = between(appShell, 'const bottomNav', 'const sideNav');

const legacyRoleTokens = ['PVE_FARMER', 'RAIDER', 'PVP_PLAYER', 'GUILD_PLAYER', 'COLLECTOR', 'TRADER', 'CASUAL', 'HARDCORE', 'LEADER', 'DRAMA', 'NEWBIE'];

assert(pkg.version === '0.7.37', 'package version is 0.7.37');
assert(versionTs.includes("APP_VERSION = '0.7.37'") || versionTs.includes('APP_VERSION = "0.7.37"'), 'APP_VERSION is 0.7.37');
assert(publicVersion.version === '0.7.37', 'public version is 0.7.37');
assert(saveLoad.includes("SAVE_VERSION = '0.7.0'") || saveLoad.includes('SAVE_VERSION = "0.7.0"'), 'SAVE_VERSION unchanged');

assert(itemContent.includes('export const ITEM_BY_ID = new Map'), 'ITEM_BY_ID index exists');
assert(itemContent.includes('ITEM_BY_ID.get(normalizeLegacyItemId(id))'), 'getItemById uses ITEM_BY_ID');
assert(!/export const getItemById = \(id: string\) => ITEMS\.find/.test(itemContent), 'getItemById does not scan ITEMS');

assert(worldContent.includes('export const ALL_INSTANCES = [...DUNGEONS, ...RAIDS]'), 'ALL_INSTANCES exists');
assert(worldContent.includes('export const MOB_BY_ID = new Map'), 'MOB_BY_ID exists');
assert(worldContent.includes('export const SPOT_BY_ID = new Map'), 'SPOT_BY_ID exists');
assert(worldContent.includes('export const ZONE_BY_ID = new Map'), 'ZONE_BY_ID exists');
assert(worldContent.includes('export const LOOT_TABLE_BY_ID = new Map'), 'LOOT_TABLE_BY_ID exists');
assert(worldContent.includes('export const DUNGEON_BY_ID = new Map'), 'DUNGEON_BY_ID exists');
assert(worldContent.includes('export const RAID_BY_ID = new Map'), 'RAID_BY_ID exists');
assert(worldContent.includes('export const ALL_INSTANCES_BY_ID = new Map'), 'ALL_INSTANCES_BY_ID exists');
assert(worldContent.includes('getDungeonById = (id: string) => ALL_INSTANCES_BY_ID.get(id)'), 'getDungeonById uses ALL_INSTANCES_BY_ID');
assert(!worldContent.includes('[...DUNGEONS, ...RAIDS].find'), 'getDungeonById does not allocate array per call');

assert(balanceConfig.includes('pve:') && balanceConfig.includes('pvp:') && balanceConfig.includes('mixed:'), 'role focus multipliers use pve/pvp/mixed');
assert(formulas.includes("roleFocus ?? 'mixed'"), 'role focus formulas default to mixed');
assert(startArenaBlock.includes("npc.roleFocus === 'pvp' || npc.roleFocus === 'mixed'"), 'arena pool uses pvp/mixed roleFocus');

for (const token of legacyRoleTokens) {
  assert(!balanceConfig.includes(token), `balanceConfig has no legacy role token ${token}`);
  assert(!formulas.includes(token), `formulas has no legacy role token ${token}`);
  assert(!startArenaBlock.includes(token), `startArena has no legacy role token ${token}`);
}

assert(gameStore.includes("type ServerTickMode = 'interactive' | 'summary'"), 'ServerTickMode exists');
assert(/mode:\s*ServerTickMode\s*=\s*'interactive'/.test(simulateBlock), 'simulateServerForMinutes has mode parameter');
assert(skipDayBlock.includes("simulateServerForMinutes(server, minutes, rng, 'summary')"), 'skipDay uses summary simulation');
assert(skipDayBlock.includes('commitFastDeferredSave'), 'skipDay uses deferred save');
assert(!skipHourBlock.includes("'summary'"), 'skipHour stays interactive');

assert(commitBlock.includes('normalizeQuestStates(safeNormalizeServer(server, "light"))'), 'commit uses single light normalize pipeline');
assert(!commitBlock.includes('seedActiveGuildWarsIfEmpty('), 'commit does not duplicate guild war seeding');
assert(!commitBlock.includes('ensureSoloNpcPool('), 'commit does not duplicate solo NPC repair');
assert(!commitBlock.includes('seedInitialGuildWarsIfNeeded('), 'commit does not duplicate initial guild war seed');
assert(!commitBlock.includes('repairServerRuntime('), 'commit does not duplicate runtime repair');
assert(!commitBlock.includes('refreshContracts('), 'commit does not duplicate contract refresh');

assert(simulateBlock.includes("mode === 'interactive'"), 'simulateServerForMinutes has interactive branch');
assert(simulateBlock.includes('!hasOpenGuildWarRuntime(next)'), 'summary guild war seeding has guard');
assert(guildWarSystem.includes("export type GuildWarTickMode = 'interactive' | 'summary'"), 'GuildWarTickMode exists');
assert(/mode:\s*GuildWarTickMode\s*=\s*'interactive'/.test(tickGuildWarsBlock), 'tickGuildWars has mode parameter');
assert(tickGuildWarsBlock.includes("mode === 'summary' ? server : moveNpcPlayers"), 'summary mode skips NPC movement');
assert(tickGuildWarsBlock.includes("if (mode !== 'summary')"), 'summary mode skips war location encounters');

assert(guildWarSystem.includes('simulateActiveGuildWarsSummary'), 'simulateActiveGuildWarsSummary exists');
assert(!guildWarSystem.includes('Math.min(6, rawDuelTicks)'), 'guild war tick is not capped to 6 duels');
assert(guildWarSystem.includes('sampleDuels = Math.max(1, Math.min(12, dueDuels))'), 'summary wars sample duels');
assert(guildWarSystem.includes('killRecords: [...war.killRecords, ...records].slice(-250)'), 'summary wars cap kill records');

assert(guildRelationSystem.includes('const guildById = new Map'), 'guild relations uses guildById');
assert(saveLoad.includes('options: { immediate?: boolean }'), 'saveGame supports immediate option');
assert(saveLoad.includes('options.immediate !== false'), 'saveGame can defer immediate write');
assert(!/const bottomNav:[\s\S]*goals[\s\S]*const sideNav/.test(appShell), 'bottom nav has no goals');

if (siegeSystem.includes('interface SiegeLookupContext')) {
  assert(siegeSystem.includes('const createSiegeLookupContext'), 'siege lookup context builder exists');
  assert(siegeSystem.includes('rosterCache: Map<string, Id[]>'), 'siege roster cache exists');
  assert(siegeSystem.includes('powerCache: Map<Id, number>'), 'siege power cache exists');
}

if (fail.length) {
  console.error('Smoke failed:');
  fail.forEach((message) => console.error('- ' + message));
  console.error(`${pass.length} checks passed before failure.`);
  process.exit(1);
}

console.log('Smoke passed:');
pass.forEach((message) => console.log('- ' + message));
