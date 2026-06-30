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
const appShell = read('src/ui/layout/AppShell.tsx');

const simulateBlock = between(gameStore, 'const simulateServerForMinutes =', 'const normalizeServer');
const skipDayBlock = between(gameStore, '  skipDay: () => {', '  exportSave:');
const skipHourBlock = between(gameStore, '  skipHour: () => {', '  skipDay:');
const tickGuildWarsBlock = between(guildWarSystem, 'export const tickGuildWars =', '};');
const bottomNav = between(appShell, 'const bottomNav', 'const sideNav');

assert(pkg.version === '0.7.34', 'package version is 0.7.34');
assert(versionTs.includes("APP_VERSION = '0.7.34'") || versionTs.includes('APP_VERSION = "0.7.34"'), 'APP_VERSION is 0.7.34');
assert(publicVersion.version === '0.7.34', 'public version is 0.7.34');
assert(saveLoad.includes("SAVE_VERSION = '0.7.0'") || saveLoad.includes('SAVE_VERSION = "0.7.0"'), 'SAVE_VERSION unchanged');

assert(gameStore.includes("type ServerTickMode = 'interactive' | 'summary'"), 'ServerTickMode exists');
assert(/mode:\s*ServerTickMode\s*=\s*'interactive'/.test(simulateBlock), 'simulateServerForMinutes has mode parameter');
assert(skipDayBlock.includes("simulateServerForMinutes(server, minutes, rng, 'summary')"), 'skipDay uses summary simulation');
assert(skipDayBlock.includes('commitFastDeferredSave'), 'skipDay uses deferred save');
assert(!skipHourBlock.includes("'summary'"), 'skipHour stays interactive');

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

if (fail.length) {
  console.error('Sanity failed:');
  fail.forEach((message) => console.error('- ' + message));
  console.error(`${pass.length} checks passed before failure.`);
  process.exit(1);
}

console.log('Sanity passed:');
pass.forEach((message) => console.log('- ' + message));
