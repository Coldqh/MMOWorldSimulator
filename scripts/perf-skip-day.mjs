import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

const root = process.cwd();
const read = (filePath) => fs.readFileSync(path.join(root, filePath), 'utf8');

const start = performance.now();
const gameStore = read('src/state/gameStore.ts');
const guildWarSystem = read('src/systems/guildWarSystem.ts');
const saveLoad = read('src/engine/saveLoad.ts');
const elapsed = performance.now() - start;

const siegeSystem = read('src/systems/siegeSystem.ts');
const guildRuntimeSystem = read('src/systems/guildRuntimeSystem.ts');
const checks = {
  warSeedBeforeClock: gameStore.includes('let next = server;') && gameStore.indexOf('next = seedActiveGuildWarsIfEmpty(next);') < gameStore.indexOf('next = advanceServerClock(next, minutes);'),
  siegeTextNormalizer: siegeSystem.includes('const normalizeSiegeTextFields =') && siegeSystem.includes('никто не зарегистрировался на осаду'),
  siegeMaxCastleNormalizer: siegeSystem.includes('tier: base.tier') && siegeSystem.includes('levelRange: base.levelRange'),
  guildWarLifecycle: guildRuntimeSystem.includes('export const advanceGuildWarLifecycle') && guildRuntimeSystem.includes('isOpenWarStatus(war.status)'),
  guildTierRequirementNormalizer: gameStore.includes('normalizeGuildTierRequirements'),
  summaryMode: gameStore.includes("simulateServerForMinutes(server, minutes, rng, 'summary')"),
  deferredSave: gameStore.includes('commitFastDeferredSave(set, next'),
  summaryWars: guildWarSystem.includes('simulateActiveGuildWarsSummary'),
  noSixCap: !guildWarSystem.includes('Math.min(6, rawDuelTicks)'),
  deferredSaveApi: saveLoad.includes('options.immediate !== false'),
};

console.log('Skip day perf static check');
console.log(`scanMs=${elapsed.toFixed(2)}`);
Object.entries(checks).forEach(([key, value]) => console.log(`${key}=${value ? 'ok' : 'fail'}`));

if (Object.values(checks).some((value) => !value)) process.exit(1);
