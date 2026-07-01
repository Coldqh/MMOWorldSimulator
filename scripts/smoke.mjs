import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (filePath) => fs.readFileSync(path.join(root, filePath), 'utf8');
const parseJson = (filePath) => JSON.parse(read(filePath));

const pass = [];
const fail = [];
const assert = (condition, message) => condition ? pass.push(message) : fail.push(message);

const pkg = parseJson('package.json');
const publicVersion = parseJson('public/version.json');
const versionTs = read('src/engine/version.ts');
const saveLoad = read('src/engine/saveLoad.ts');
const types = read('src/types/game.ts');
const balanceConfig = read('src/balance/balanceConfig.ts');
const formulas = read('src/balance/formulas.ts');
const createNewGame = read('src/engine/createNewGame.ts');
const guildRuntime = read('src/systems/guildRuntimeSystem.ts');
const guildScreen = fs.existsSync(path.join(root, 'src/ui/screens/GuildScreen.tsx')) ? read('src/ui/screens/GuildScreen.tsx') : '';
const arenaBracket = fs.existsSync(path.join(root, 'src/systems/arenaBracketSystem.ts')) ? read('src/systems/arenaBracketSystem.ts') : '';
const marketSystem = read('src/systems/marketSystem.ts');
const castles = fs.existsSync(path.join(root, 'src/content/castles.ts')) ? read('src/content/castles.ts') : '';
const siegeSystem = fs.existsSync(path.join(root, 'src/systems/siegeSystem.ts')) ? read('src/systems/siegeSystem.ts') : '';

assert(pkg.version === '0.7.38', 'package version is 0.7.38');
assert(versionTs.includes("APP_VERSION = '0.7.38'") || versionTs.includes('APP_VERSION = "0.7.38"'), 'APP_VERSION is 0.7.38');
assert(publicVersion.version === '0.7.38', 'public version is 0.7.38');
assert(saveLoad.includes("SAVE_VERSION = '0.7.0'") || saveLoad.includes('SAVE_VERSION = "0.7.0"'), 'SAVE_VERSION unchanged');

assert(types.includes('export type GuildTier = "low" | "mid" | "high" | "max";'), 'GuildTier includes max');
assert(types.includes('tier?: GuildTier;'), 'Guild tier uses GuildTier');
assert(types.includes('tier: "mid" | "high" | "max";'), 'Castle tier supports max');

assert(balanceConfig.includes('export const MAX_LEVEL = 60;'), 'MAX_LEVEL is 60');
assert(balanceConfig.includes("high: { min: 41, max: 59 }"), 'high band is 41-59');
assert(balanceConfig.includes("max: { min: 60, max: 60 }"), 'max band is 60');
assert(balanceConfig.includes("LEVEL_BAND_ORDER: GuildTier[] = ['low', 'mid', 'high', 'max']"), 'level band order includes max');

assert(formulas.includes('safe <= 45 ? XP_CURVE.high : XP_CURVE.late'), 'XP curve has 60-ready bands');
assert(formulas.includes('safeLevel >= 60'), 'arena rating has max level branch');
assert(formulas.includes('safeLevel >= 41'), 'arena rating has high level branch');

assert(createNewGame.includes('import { LEVEL_BANDS, MAX_LEVEL }'), 'createNewGame imports level bands');
assert(createNewGame.includes("const guildTierForIndex = (index: number): GuildTier"), 'createNewGame uses GuildTier');
assert(createNewGame.includes("if (tier === 'max') return MAX_LEVEL"), 'max guild NPCs are level 60');
assert(createNewGame.includes("if (tier === 'high') return randomLevelInTier('high', rng)"), 'high guild NPCs use high band');
assert(!createNewGame.includes("if (tier === 'high') return 20"), 'createNewGame has no high return 20');
assert(createNewGame.includes("tier === 'max'"), 'createNewGame handles max tier');

assert(guildRuntime.includes('GuildTier'), 'guildRuntime uses GuildTier');
assert(guildRuntime.includes("{ tier: 'max', count:"), 'solo pool has max tier');
assert(guildRuntime.includes("(['max', 'high', 'mid', 'low'] as const)"), 'guild war seeding includes max tier');
assert(guildRuntime.includes("const normalizedTier: GuildTier = tier === 'mid' || tier === 'high' || tier === 'max'"), 'player guild runtime accepts max tier');

assert(guildScreen.includes('type PlayerGuildTier = GuildTier'), 'GuildScreen uses GuildTier');
assert(guildScreen.includes('{ id: "max", label: "Max", minLevel: 60 }'), 'GuildScreen has max guild tier option');
assert(guildScreen.includes('Max только на 60 уровне'), 'GuildScreen explains max tier');

assert(arenaBracket.includes("export type ArenaBracketId = 'low' | 'mid' | 'high' | 'max';"), 'arena bracket supports max');
assert(arenaBracket.includes("{ id: 'high', name: 'Хай арена', levelRange: [41, 59] }"), 'arena high is 41-59');
assert(arenaBracket.includes("{ id: 'max', name: 'Макс арена', levelRange: [60, 60] }"), 'arena max is 60');

assert(marketSystem.includes('MAX_LEVEL'), 'market imports MAX_LEVEL');
assert(marketSystem.includes('Math.min(MAX_LEVEL, playerLevel + 4)'), 'market player band uses MAX_LEVEL');

if (castles) {
  assert(castles.includes("tier: 'max'"), 'default castles are max tier');
  assert(castles.includes('levelRange: [60, 60]'), 'default castles require level 60');
}

if (siegeSystem) {
  assert(siegeSystem.includes("castle.tier === 'max'"), 'siege allows max castles');
  assert(siegeSystem.includes("guild.tier === 'max'"), 'siege checks max guild tier');
}

if (fail.length) {
  console.error('Smoke failed:');
  fail.forEach((message) => console.error('- ' + message));
  console.error(`${pass.length} checks passed before failure.`);
  process.exit(1);
}

console.log('Smoke passed:');
pass.forEach((message) => console.log('- ' + message));
