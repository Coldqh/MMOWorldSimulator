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
const guildRuntime = read('src/systems/guildRuntimeSystem.ts');
const guildRelation = read('src/systems/guildRelationSystem.ts');
const guildWar = read('src/systems/guildWarSystem.ts');
const gameStore = read('src/state/gameStore.ts');
const guildScreen = fs.existsSync(path.join(root, 'src/ui/screens/GuildScreen.tsx')) ? read('src/ui/screens/GuildScreen.tsx') : '';
const balanceConfig = read('src/balance/balanceConfig.ts');
const contentValidation = read('scripts/content-validation.mjs');
const perfScale = read('scripts/perf-scale.mjs');
const sw = read('public/sw.js');
const siegeSystem = read('src/systems/siegeSystem.ts');
const castlePanel = read('src/ui/components/CastlePanel.tsx');
const rareSpawnSystem = read('src/systems/rareSpawnSystem.ts');
const activityCurrencySystem = read('src/systems/activityCurrencySystem.ts');
const characterScreen = read('src/ui/screens/CharacterScreen.tsx');
const worldScreen = read('src/ui/screens/WorldScreen.tsx');
const worldBossRaidSystem = read('src/systems/worldBossRaidSystem.ts');
const dungeonSystem = read('src/systems/dungeonSystem.ts');
const combatSystem = read('src/systems/combatSystem.ts');
const arena3v3System = read('src/systems/arena3v3System.ts');
const guildWarCombatResultSystem = read('src/systems/guildWarCombatResultSystem.ts');
const typeFile = read('src/types/game.ts');

assert(pkg.version === '0.8.0', 'package version is 0.8.0');
assert(versionTs.includes("APP_VERSION = '0.8.0'") || versionTs.includes('APP_VERSION = "0.8.0"'), 'APP_VERSION is 0.8.0');
assert(publicVersion.version === '0.8.0', 'public version is 0.8.0');
assert(saveLoad.includes("SAVE_VERSION = '0.7.54'") || saveLoad.includes('SAVE_VERSION = "0.7.54"'), 'SAVE_VERSION is 0.7.54');
assert(balanceConfig.includes('export const MAX_LEVEL = 60;'), 'MAX_LEVEL remains 60');
assert(balanceConfig.includes("high: { min: 41, max: 59 }"), 'high band remains 41-59');
assert(balanceConfig.includes("max: { min: 60, max: 60 }"), 'max band remains 60');

assert(typeFile.includes('export type ActivityCurrencyKey'), 'activity currency key type exists');
assert(typeFile.includes('raidSeals?: number;') && typeFile.includes('arenaHonor?: number;') && typeFile.includes('warCrests?: number;'), 'player activity currency fields exist');
assert(activityCurrencySystem.includes('ACTIVITY_CURRENCY_LABELS'), 'activity currency labels exist');
assert(activityCurrencySystem.includes('currencyRewardLine'), 'activity currency reward line helper exists');
assert(characterScreen.includes('Валюты активностей'), 'CharacterScreen shows activity currencies');
assert(dungeonSystem.includes("currencyRewardLine('raidSeals'"), 'raid seals reward is wired');
assert(combatSystem.includes("currencyRewardLine('arenaHonor'"), 'solo arena honor reward is wired');
assert(arena3v3System.includes("currencyRewardLine('arenaHonor'"), 'team arena honor reward is wired');
assert(guildWarCombatResultSystem.includes("currencyRewardLine('warCrests'"), 'guild war crests reward is wired');
assert(!typeFile.includes('activityCurrencies?:'), 'no nested activityCurrencies save object');

assert(typeFile.includes('WorldBossRaidParticipant'), 'world boss raid participant type exists');
assert(worldBossRaidSystem.includes('WORLD_BOSS_RAID_MAX_PARTICIPANTS = 30'), 'world boss raid has 30 participant cap');
assert(worldBossRaidSystem.includes('WORLD_BOSS_RAID_TURN_MINUTES = 5'), 'world boss raid attack advances 5 minutes');
assert(worldBossRaidSystem.includes('rewardTierForRank'), 'world boss raid reward rank tiers are wired');
assert(worldBossRaidSystem.includes("rank <= 5") && worldBossRaidSystem.includes("rank <= 10"), 'world boss reward tiers are 1-5 / 6-10 / 11-30');
assert(worldBossRaidSystem.includes('addNpcRaidParticipants'), 'world boss raid NPC join system is wired');
assert(worldBossRaidSystem.includes('attackWorldBossRaid'), 'world boss raid attack action system exists');
assert(rareSpawnSystem.includes('initializeWorldBossRaid') || gameStore.includes('joinWorldBossRaid'), 'world boss raid spawn/store integration exists');
assert(gameStore.includes('joinWorldBossRaid') && gameStore.includes('attackWorldBossRaid'), 'GameStore exposes world boss raid actions');
assert(worldScreen.includes('Присоединиться') && worldScreen.includes('Рейд заполнен'), 'WorldScreen shows world boss raid join state');
assert(worldScreen.includes('HP {raid.hpPercent}%') || worldScreen.includes('HP ${raid.hpPercent}%'), 'WorldScreen shows world boss raid HP');

assert(guildRuntime.includes('export const getGuildTierMinLevel'), 'guild tier min-level helper exists');
assert(guildRuntime.includes('export const normalizeGuildTierRequirement'), 'single guild tier requirement normalizer exists');
assert(guildRuntime.includes('export const normalizeGuildTierRequirements'), 'server guild tier requirement normalizer exists');
assert(guildRuntime.includes('minLevel: getGuildTierMinLevel(tier)'), 'guild minLevel is normalized by tier');
assert(guildRuntime.includes('const requiredLevel = getGuildTierMinLevel(normalizedTier)'), 'player guild creation uses tier min-level helper');
assert(!guildRuntime.includes('\n).length;'), 'guildRuntime has no orphan relation tail');

assert(gameStore.includes('normalizeGuildTierRequirements'), 'gameStore applies guild tier requirement normalizer');

assert(guildScreen.includes('getGuildTierMinLevel'), 'GuildScreen uses tier min-level helper');
assert(guildScreen.includes('const requiredLevel = getGuildTierMinLevel(guild.tier ?? "low")'), 'GuildScreen list uses normalized required level');
assert(!guildScreen.includes('требование {guild.minLevel ?? 1}+'), 'GuildScreen does not display raw guild.minLevel');
assert(!guildScreen.includes('server.player.level < (guild.minLevel ?? 1)'), 'GuildScreen does not check raw guild.minLevel');

assert(guildRelation.includes('export const createGuildRelationValueMap'), 'guild relation value map helper exists');
assert(guildRelation.includes('export const getGuildRelationValueFromMap'), 'guild relation map lookup helper exists');
assert(guildWar.includes('const buildActiveWarCountMap'), 'guild war active count map exists');
assert(guildWar.includes('createGuildRelationValueMap(server)'), 'guild war vote creation uses relation map');
assert(guildWar.includes('getGuildRelationValueFromMap(relationMap'), 'guild war vote creation uses relation map lookup');
assert(!guildWar.includes('.sort((a, b) => getGuildRelationValue(server, guild.id, a.id) - getGuildRelationValue(server, guild.id, b.id))'), 'guild war target selection no longer sorts by repeated relation lookup');

assert(!castlePanel.includes('High · 20'), 'CastlePanel has no old High 20 tier text');
assert(!castlePanel.includes('Mid · 10–19'), 'CastlePanel has no old Mid 10-19 tier text');
assert(!castlePanel.includes('хай-гильдии'), 'CastlePanel has no old хай-гильдии text');
assert(!siegeSystem.includes("tier: 'high' as const"), 'normalizeCastles does not hardcode high tier');
assert(!siegeSystem.includes('levelRange: [20, 20] as [number, number]'), 'normalizeCastles does not hardcode level 20 range');
assert(!siegeSystem.includes('Нужна хай-гильдия'), 'siege registration has no old хай-гильдия reason');
assert(siegeSystem.includes('tier: base.tier'), 'normalizeCastles uses base tier');
assert(siegeSystem.includes('levelRange: base.levelRange'), 'normalizeCastles uses base level range');
assert(guildRuntime.includes('export const advanceGuildWarLifecycle'), 'guild war lifecycle helper exists');
assert(guildRuntime.includes('let next = advanceGuildWarLifecycle(server)'), 'seedActiveGuildWarsIfEmpty starts with lifecycle');
assert(guildRuntime.includes('isOpenWarStatus(war.status)'), 'sameTierWarCount counts open war statuses');
assert(guildWar.includes('const startScheduledGuildWars'), 'core guild war system starts scheduled wars');
assert(guildWar.includes('next = startScheduledGuildWars(next);'), 'tickGuildWars advances scheduled wars');

assert(sw.includes("mmows-v0.8.0"), 'service worker cache is 0.8.0');
assert(siegeSystem.includes('никто не зарегистрировался на осаду'), 'siege no-roster text is readable Russian');
assert(siegeSystem.includes('осада завершена. Победитель'), 'siege finish news is readable Russian');
assert(siegeSystem.includes("castle.tier === 'max') return guild.tier === 'max' || guild.tier === 'high'"), 'max sieges can fallback to high NPC guilds');
assert(siegeSystem.includes('const normalizeSiegeTextFields ='), 'siege normalizes old saved text fields');
assert(guildRuntime.includes('const isOpenWarStatus ='), 'guild runtime has open war status helper');
assert(guildRuntime.includes('isOpenWarStatus(war.status)'), 'guild runtime uses open war status helper');
assert(guildWar.includes("war.status === 'active' || war.status === 'scheduled'"), 'guild war finish handles scheduled wars');
assert(gameStore.indexOf('next = seedActiveGuildWarsIfEmpty(next);') < gameStore.indexOf('next = advanceServerClock(next, minutes);'), 'server tick seeds wars before advancing clock');

assert(!/const\\s+([A-Za-z_$][A-Za-z0-9_$]*)\\s*=\\s*const\\s+\\1\\s*=/.test(gameStore + siegeSystem + guildRuntime + guildWar), 'no duplicated const assignment markers');

assert(pkg.scripts?.['content:check']?.includes('scripts/content-validation.mjs'), 'content:check script runs content validation');
assert(pkg.scripts?.['perf:scale'] === 'node scripts/perf-scale.mjs', 'perf:scale script exists');
assert(contentValidation.includes('Content validation passed'), 'content validation script has pass output');
assert(contentValidation.includes('unique(setDefinitions') || contentValidation.includes('set definition ids are unique'), 'content validation checks set ids');
assert(contentValidation.includes('references existing loot table'), 'content validation checks loot tables');
assert(contentValidation.includes('references existing mob'), 'content validation checks mob references');
assert(contentValidation.includes('references existing zone'), 'content validation checks zone references');
assert(contentValidation.includes('sourceId points to existing instance'), 'content validation checks set sourceId links');
assert(perfScale.includes('Scale perf check passed'), 'perf scale script has pass output');
assert(perfScale.includes('sets3x'), 'perf scale estimates 3x set growth');
assert(perfScale.includes('instances3x'), 'perf scale estimates 3x instance growth');

if (fail.length) {
  console.error('Sanity failed:');
  fail.forEach((message) => console.error('- ' + message));
  console.error(String(pass.length) + ' checks passed before failure.');
  process.exit(1);
}

console.log('Sanity passed:');
pass.forEach((message) => console.log('- ' + message));
