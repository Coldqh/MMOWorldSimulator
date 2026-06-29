import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const packRoot = path.dirname(new URL(import.meta.url).pathname);

const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const write = (p, content) => fs.writeFileSync(path.join(root, p), content, 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
const copyFromPack = (from, to) => {
  const target = path.join(root, to);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(packRoot, from), target);
};
const die = (msg) => { throw new Error(msg); };
const replaceOnce = (content, search, replace, label) => {
  if (!content.includes(search)) die(`Pattern not found: ${label}`);
  return content.replace(search, replace);
};
const replaceRegexOnce = (content, regex, replace, label) => {
  if (!regex.test(content)) die(`Regex not found: ${label}`);
  return content.replace(regex, replace);
};

console.log('[MMOWS patch] copying selector files and optimized screens...');
copyFromPack('src/ui/selectors/marketSelectors.ts', 'src/ui/selectors/marketSelectors.ts');
copyFromPack('src/ui/selectors/partyFinderSelectors.ts', 'src/ui/selectors/partyFinderSelectors.ts');
copyFromPack('src/ui/screens/MarketScreen.tsx', 'src/ui/screens/MarketScreen.tsx');
copyFromPack('src/ui/screens/PartyFinderScreen.tsx', 'src/ui/screens/PartyFinderScreen.tsx');

console.log('[MMOWS patch] patching guild runtime tier creation...');
{
  const file = 'src/systems/guildRuntimeSystem.ts';
  let s = read(file);
  s = replaceOnce(
    s,
`export const createPlayerGuildRuntime = (
  server: ServerState,
  name: string,
  focus: GuildFocus,
): { server: ServerState; ok: boolean; message: string } => {`,
`export const createPlayerGuildRuntime = (
  server: ServerState,
  name: string,
  focus: GuildFocus,
  tier: 'low' | 'mid' | 'high' = 'low',
): { server: ServerState; ok: boolean; message: string } => {`,
    'createPlayerGuildRuntime signature',
  );
  s = replaceOnce(
    s,
`  if (server.guilds.some((guild) => guild.name.toLowerCase() === cleanName.toLowerCase())) return { server, ok: false, message: 'Гильдия с таким названием уже есть.' };

  const guild: Guild = {`,
`  if (server.guilds.some((guild) => guild.name.toLowerCase() === cleanName.toLowerCase())) return { server, ok: false, message: 'Гильдия с таким названием уже есть.' };

  const tierMinLevel: Record<'low' | 'mid' | 'high', number> = { low: 1, mid: 10, high: 20 };
  const selectedTier: 'low' | 'mid' | 'high' = tier === 'high' ? 'high' : tier === 'mid' ? 'mid' : 'low';

  const guild: Guild = {`,
    'tierMinLevel insertion',
  );
  s = replaceOnce(
    s,
`    tier: 'low',
    minLevel: 1,`,
`    tier: selectedTier,
    minLevel: tierMinLevel[selectedTier],`,
    'guild tier/minLevel assignment',
  );
  write(file, s);
}

console.log('[MMOWS patch] patching game store tier + combat lightweight commit...');
{
  const file = 'src/state/gameStore.ts';
  let s = read(file);
  s = replaceOnce(
    s,
`  createPlayerGuild: (name: string, focus: GuildFocus) => void;`,
`  createPlayerGuild: (name: string, focus: GuildFocus, tier: 'low' | 'mid' | 'high') => void;`,
    'GameStore createPlayerGuild signature',
  );
  s = replaceOnce(
    s,
`  modal?: GameModal | null,
) => {
  let normalized = refreshContracts(seedActiveGuildWarsIfEmpty(ensureSoloNpcPool(seedInitialGuildWarsIfNeeded(repairServerRuntime(normalizeQuestStates(safeNormalizeServer(server, "light")))))), createRng((server.seed ?? Date.now()) + server.serverDay * 9020 + server.currentMinute));`,
`  modal?: GameModal | null,
  options: { mode?: 'normal' | 'combat' } = {},
) => {
  let normalized = options.mode === 'combat'
    ? server
    : refreshContracts(seedActiveGuildWarsIfEmpty(ensureSoloNpcPool(seedInitialGuildWarsIfNeeded(repairServerRuntime(normalizeQuestStates(safeNormalizeServer(server, "light")))))), createRng((server.seed ?? Date.now()) + server.serverDay * 9020 + server.currentMinute));`,
    'commit lightweight mode',
  );
  s = replaceOnce(
    s,
`    let modal: GameModal | null = null;

    if (result.combat.status !== "active") {`,
`    let modal: GameModal | null = null;

    if (result.combat.status === "active") {
      commit(set, nextServer, nextCombat, null, { mode: 'combat' });
      return;
    }

    if (result.combat.status !== "active") {`,
    'combat active lightweight commit branch',
  );
  s = replaceOnce(
    s,
`  createPlayerGuild: (name, focus) => {`,
`  createPlayerGuild: (name, focus, tier) => {`,
    'createPlayerGuild action args',
  );
  s = replaceOnce(
    s,
`    const result = createPlayerGuildRuntime(server, name, focus);`,
`    const result = createPlayerGuildRuntime(server, name, focus, tier);`,
    'createPlayerGuildRuntime call args',
  );
  write(file, s);
}

console.log('[MMOWS patch] patching GuildScreen tier selector...');
{
  const file = 'src/ui/screens/GuildScreen.tsx';
  let s = read(file);
  s = replaceOnce(
    s,
`  const [guildFocus, setGuildFocus] = useState<GuildFocus>("pvp");`,
`  const [guildFocus, setGuildFocus] = useState<GuildFocus>("pvp");
  const [guildTier, setGuildTier] = useState<"low" | "mid" | "high">("low");`,
    'GuildScreen guildTier state',
  );
  s = replaceOnce(
    s,
`            <select value={guildFocus} onChange={(event) => setGuildFocus(event.target.value as GuildFocus)}>
              <option value="pvp">PvP</option>
              <option value="pve">PvE</option>
              <option value="hybrid">Смешанная</option>
            </select>
            <button disabled={server.player.gold < 50000 || !guildName.trim()} onClick={() => createPlayerGuild(guildName, guildFocus)}>Создать за 50 000</button>`,
`            <select value={guildFocus} onChange={(event) => setGuildFocus(event.target.value as GuildFocus)}>
              <option value="pvp">PvP</option>
              <option value="pve">PvE</option>
              <option value="hybrid">Смешанная</option>
            </select>
            <select value={guildTier} onChange={(event) => setGuildTier(event.target.value as "low" | "mid" | "high")}>
              <option value="low">Low · 1+</option>
              <option value="mid">Mid · 10+</option>
              <option value="high">High · 20+</option>
            </select>
            <small className="muted">Tier задаёт уровень контента гильдии. Уровня гильдии больше нет.</small>
            <button disabled={server.player.gold < 50000 || !guildName.trim()} onClick={() => createPlayerGuild(guildName, guildFocus, guildTier)}>Создать за 50 000</button>`,
    'GuildScreen creation form tier selector',
  );
  write(file, s);
}

console.log('[MMOWS patch] patching party finder candidate selection...');
{
  const file = 'src/systems/partyFinderSystem.ts';
  let s = read(file);
  s = replaceOnce(
    s,
`export const canNpcJoinListing = (npc: NpcPlayer, listing: PartyFinderListing, dungeon: DungeonDefinition, server: ServerState) => {`,
`export const canNpcJoinListing = (npc: NpcPlayer, listing: PartyFinderListing, dungeon: DungeonDefinition, server: ServerState, busyNpcIds?: Set<string>) => {`,
    'canNpcJoinListing context param',
  );
  s = replaceOnce(
    s,
`  if (isNpcBusyInActiveListing(server, npc.id, listing.id)) return false;`,
`  if (busyNpcIds ? busyNpcIds.has(npc.id) : isNpcBusyInActiveListing(server, npc.id, listing.id)) return false;`,
    'busyNpcIds usage',
  );
  s = replaceOnce(
    s,
`  const candidates = server.npcs
    .filter((npc) => canNpcJoinListing(npc, listing, dungeon, server))`,
`  const busyNpcIds = new Set(
    (server.partyFinderListings ?? [])
      .filter((entry) => entry.id !== listing.id && ACTIVE_STATUSES.includes(entry.status))
      .flatMap((entry) => entry.memberIds),
  );

  const candidates = server.npcs
    .filter((npc) => canNpcJoinListing(npc, listing, dungeon, server, busyNpcIds))`,
    'pickNpcForListing busy set',
  );
  write(file, s);
}

console.log('[MMOWS patch] done. Now run: npm run typecheck && npm run build && npm run sanity && npm run smoke');
