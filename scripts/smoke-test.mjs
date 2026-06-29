import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = process.cwd();
const srcDir = path.join(root, 'src');
const buildDir = path.join(root, 'scripts', '.smoke-build');

const read = (filePath) => fs.readFileSync(path.join(root, filePath), 'utf8');
const totalMinute = (day, minute) => (Math.max(1, day) - 1) * 1440 + Math.max(0, minute);

const collectSourceFiles = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(fullPath);
    if (!entry.isFile()) return [];
    if (entry.name.endsWith('.d.ts')) return [];
    return entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') ? [fullPath] : [];
  });
};

const withJsExtension = (sourceFile, specifier) => {
  if (!specifier.startsWith('.')) return specifier;
  if (specifier.endsWith('.js') || specifier.endsWith('.css')) return specifier;

  const resolved = path.resolve(path.dirname(sourceFile), specifier);
  if (fs.existsSync(`${resolved}.ts`) || fs.existsSync(`${resolved}.tsx`)) return `${specifier}.js`;
  if (fs.existsSync(path.join(resolved, 'index.ts')) || fs.existsSync(path.join(resolved, 'index.tsx'))) {
    return `${specifier.replace(/\/$/, '')}/index.js`;
  }
  return specifier;
};

const rewriteRelativeImports = (sourceFile, outputText) => outputText
  .replace(/(from\s*['"])(\.{1,2}\/[^'"]+)(['"])/g, (_match, prefix, specifier, suffix) => `${prefix}${withJsExtension(sourceFile, specifier)}${suffix}`)
  .replace(/(import\s*\(\s*['"])(\.{1,2}\/[^'"]+)(['"]\s*\))/g, (_match, prefix, specifier, suffix) => `${prefix}${withJsExtension(sourceFile, specifier)}${suffix}`);

const buildSmokeModules = () => {
  fs.rmSync(buildDir, { recursive: true, force: true });
  fs.mkdirSync(buildDir, { recursive: true });

  for (const sourceFile of collectSourceFiles(srcDir)) {
    const relative = path.relative(srcDir, sourceFile);
    const outFile = path.join(buildDir, relative).replace(/\.(tsx|ts)$/, '.js');
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    const transpiled = ts.transpileModule(fs.readFileSync(sourceFile, 'utf8'), {
      fileName: sourceFile,
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.ES2020,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
      reportDiagnostics: true,
    });
    fs.writeFileSync(outFile, rewriteRelativeImports(sourceFile, transpiled.outputText), 'utf8');
  }
};

const importBuilt = (relativePath) => import(pathToFileURL(path.join(buildDir, relativePath)).href);

const onlyPlayerGuildMembers = (server, guildId) => {
  const guild = server.guilds.find((entry) => entry.id === guildId);
  const npcMembers = server.npcs.filter((npc) => npc.guildId === guildId).map((npc) => npc.id);
  return {
    guild,
    npcMembers,
    ok: Boolean(
      guild &&
      guild.memberIds.length === 1 &&
      guild.memberIds[0] === server.player.id &&
      guild.leaderId === server.player.id &&
      (guild.officerIds ?? []).length === 0 &&
      npcMembers.length === 0,
    ),
  };
};

const prepareHighTierPlayerGuildServer = (server) => {
  const targetGuild = server.guilds.find((guild) => guild.tier === 'high');
  if (!targetGuild) throw new Error('Smoke fixture could not find a high-tier guild.');
  const memberNpcIds = server.npcs
    .filter((npc) => npc.level >= 20)
    .slice(0, 4)
    .map((npc) => npc.id);
  if (memberNpcIds.length < 4) throw new Error('Smoke fixture could not find enough level 20 NPCs.');

  const memberIds = [server.player.id, ...memberNpcIds];
  return {
    ...server,
    serverDay: 5,
    currentMinute: 0,
    player: { ...server.player, level: 20, guildId: targetGuild.id },
    npcs: server.npcs.map((npc) => memberNpcIds.includes(npc.id) ? { ...npc, level: 20, guildId: targetGuild.id } : npc),
    guilds: server.guilds.map((guild) => guild.id === targetGuild.id
      ? {
          ...guild,
          tier: 'high',
          minLevel: 20,
          level: 1,
          memberIds,
          leaderId: server.player.id,
          deputyId: undefined,
          officerIds: [],
        }
      : guild),
  };
};

const prepareNpcSiegeServer = (server) => ({
  ...server,
  serverDay: 5,
  currentMinute: 0,
  player: { ...server.player, guildId: undefined },
  guilds: server.guilds.map((guild) => guild.tier === 'high' ? { ...guild, level: 20 } : guild),
});

export const runSmokeTest = async (label = 'Smoke') => {
  const pass = [];
  const fail = [];
  const assert = (condition, message, details = '') => {
    if (condition) pass.push(message);
    else fail.push(details ? `${message}: ${details}` : message);
  };

  try {
    buildSmokeModules();

    const { createNewGame, ensureServerRoster } = await importBuilt('engine/createNewGame.js');
    const { createRng } = await importBuilt('engine/rng.js');
    const {
      canRegisterPlayerGuildForCastle,
      normalizeSiegeState,
      tickSieges,
    } = await importBuilt('systems/siegeSystem.js');
    const {
      createPlayerGuildRuntime,
      repairFreshPlayerGuildLeadership,
    } = await importBuilt('systems/guildRuntimeSystem.js');

    const guildScreen = read('src/ui/screens/GuildScreen.tsx');
    const castlePanel = read('src/ui/components/CastlePanel.tsx');
    const gameStore = read('src/state/gameStore.ts');
    const guildRuntime = read('src/systems/guildRuntimeSystem.ts');
    const siegeSystem = read('src/systems/siegeSystem.ts');
    const gameTypes = read('src/types/game.ts');
    const runtimeValidation = read('src/engine/runtimeValidation.ts');

    let server = createNewGame('Smoke', 'human', 'warrior', 440027, true);
    server = { ...server, player: { ...server.player, gold: 100000, level: 20 } };
    const created = createPlayerGuildRuntime(server, 'Smoke Guild', 'pvp', 1);
    assert(created.ok, 'PLAYER GUILD IS CREATED FOR SMOKE');
    const playerGuildId = created.server.player.guildId;
    const immediately = onlyPlayerGuildMembers(created.server, playerGuildId);
    assert(immediately.ok, 'PLAYER GUILD STARTS PLAYER-ONLY', JSON.stringify(immediately.guild));

    const rosterNormalized = ensureServerRoster(created.server);
    const afterRoster = onlyPlayerGuildMembers(rosterNormalized, playerGuildId);
    assert(afterRoster.ok, 'PLAYER GUILD IS NOT AUTO-FILLED BY ensureServerRoster', `members=${afterRoster.guild?.memberIds.join(',')} npcMembers=${afterRoster.npcMembers.join(',')}`);

    const repaired = repairFreshPlayerGuildLeadership(rosterNormalized);
    const afterRepair = onlyPlayerGuildMembers(repaired, playerGuildId);
    assert(afterRepair.ok, 'PLAYER GUILD REPAIR REMOVES RANDOM NPC LEADERS/OFFICERS', `members=${afterRepair.guild?.memberIds.join(',')} npcMembers=${afterRepair.npcMembers.join(',')}`);

    const levelFixture = prepareHighTierPlayerGuildServer(createNewGame('SiegeLevel', 'human', 'warrior', 440028, true));
    const normalizedLevelFixture = normalizeSiegeState(levelFixture);
    const castle = normalizedLevelFixture.castles?.find((entry) => entry.id === 'virspire_citadel') ?? normalizedLevelFixture.castles?.[0];
    const eligibility = canRegisterPlayerGuildForCastle(normalizedLevelFixture, castle.id);
    assert(eligibility.ok, 'GUILD LEVEL IS NOT REQUIRED FOR HIGH CASTLE SIEGE', eligibility.reason ?? '');

    assert(gameTypes.includes('level?: number') && gameTypes.includes('legacy'), 'Guild.level IS OPTIONAL LEGACY TYPE ONLY');
    assert(!guildRuntime.includes('guild.level + 6'), 'PLAYER GUILD APPLICATIONS DO NOT USE guild.level');
    assert(!guildRuntime.includes('level: number,\n): { server'), 'createPlayerGuildRuntime DOES NOT TAKE LEVEL PARAMETER');
    assert(!guildScreen.includes('guildLevel'), 'GuildScreen HAS NO GUILD LEVEL STATE/INPUT');
    assert(!guildScreen.includes('createPlayerGuild(guildName, guildFocus, guildLevel)'), 'GuildScreen CREATES PLAYER GUILD WITHOUT LEVEL PARAMETER');
    assert(!guildScreen.includes('guild.level'), 'GuildScreen DOES NOT DISPLAY GUILD LEVEL');
    assert(!gameStore.includes('createPlayerGuild: (name: string, focus: GuildFocus, level: number)'), 'Store createPlayerGuild ACTION DOES NOT REQUIRE LEVEL');
    assert(!gameStore.includes('createPlayerGuildRuntime(server, name, focus, level)'), 'Store DOES NOT PASS LEVEL TO PLAYER GUILD CREATION');
    assert(!gameStore.includes('`Уровень: ${guild.level}`'), 'Guild profile modal DOES NOT DISPLAY GUILD LEVEL');
    assert(!siegeSystem.includes('guild.level'), 'SIEGE ELIGIBILITY DOES NOT READ guild.level');

    assert(!castlePanel.includes('window.history.back'), 'CASTLE BACK BUTTON DOES NOT USE BROWSER HISTORY');
    assert(castlePanel.includes('onBack'), 'CastlePanel ACCEPTS onBack PROP');
    assert(guildScreen.includes('<CastlePanel onBack={() => setMainTab("guilds")}'), 'GuildScreen PASSES onBack FOR MAIN CASTLES TAB');
    assert(guildScreen.includes('<CastlePanel onBack={() => setTab("profile")}'), 'GuildScreen PASSES onBack FOR PLAYER GUILD CASTLES TAB');

    const siegeStart = prepareNpcSiegeServer(createNewGame('AutoSiege', 'human', 'warrior', 440029, true));
    const registered = tickSieges(siegeStart, createRng(991), 0);
    const targetCastle = registered.castles?.find((entry) => entry.id === 'virspire_citadel') ?? registered.castles?.[0];
    const registeredRosterCount = (registered.siegeRosters ?? []).filter((roster) => roster.castleId === targetCastle.id).length;
    assert(registeredRosterCount >= 2, 'NPC GUILDS REGISTER FOR OPEN SIEGE WINDOW', `rosters=${registeredRosterCount}`);

    const dueServer = {
      ...registered,
      serverDay: targetCastle.nextSiegeDay,
      currentMinute: targetCastle.nextSiegeMinute,
    };
    const beforeHistory = targetCastle.history?.length ?? 0;
    const resolved = tickSieges(dueServer, createRng(992), totalMinute(targetCastle.nextSiegeDay, targetCastle.nextSiegeMinute) - totalMinute(registered.serverDay, registered.currentMinute));
    const resolvedCastle = resolved.castles?.find((entry) => entry.id === targetCastle.id);
    assert(resolved.currentSiegeRun?.status !== 'active', 'SIEGE AUTO-RESOLVES WITHOUT PLAYER PARTICIPATION');
    assert(Boolean(resolvedCastle?.ownerGuildId), 'AUTO-RESOLVED SIEGE SETS CASTLE OWNER');
    assert((resolvedCastle?.history?.length ?? 0) > beforeHistory, 'AUTO-RESOLVED SIEGE WRITES CASTLE HISTORY');
    assert(totalMinute(resolvedCastle?.nextSiegeDay ?? 0, resolvedCastle?.nextSiegeMinute ?? 0) > totalMinute(targetCastle.nextSiegeDay, targetCastle.nextSiegeMinute), 'AUTO-RESOLVED SIEGE SCHEDULES NEXT SIEGE');

    assert(runtimeValidation.includes('player_guild_auto_members'), 'Runtime validation CHECKS PLAYER GUILD AUTO MEMBERS');
    assert(runtimeValidation.includes('siege_stuck_without_player'), 'Runtime validation CHECKS NON-PLAYER ACTIVE SIEGE STUCK STATE');

    if (fail.length) {
      console.error(`${label} failed:`);
      fail.forEach((message) => console.error(`- ${message}`));
      console.error(`${pass.length} checks passed before failure.`);
      process.exitCode = 1;
      return { ok: false, pass, fail };
    }

    console.log(`${label} passed:`);
    pass.forEach((message) => console.log(`- ${message}`));
    return { ok: true, pass, fail };
  } finally {
    fs.rmSync(buildDir, { recursive: true, force: true });
  }
};

const invokedDirectly = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (invokedDirectly) {
  await runSmokeTest('Smoke test');
}
