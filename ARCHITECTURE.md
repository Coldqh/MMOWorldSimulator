# MMOWorldSimulator Architecture

## 1. Project layers

```txt
content = static game data and deterministic content factories
systems = pure game logic over ServerState/content definitions
engine = boot, runtime, save/load, version, time, validation
ui = rendering and calling store actions
balance = formulas and numeric calculations
scripts = repository checks
```

Keep the layers boring. New work should follow:

```txt
content definition
system function
UI action
runtime/content validation
sanity/smoke check
```

Do not add hidden repair passes or runtime push blocks.

## 2. Content rules

Content files should export declarations or deterministic finalized arrays.

Allowed:

```txt
BASE_ITEMS
BASE_MOBS
BASE_DUNGEONS
finalizeItems([...])
finalizeWorldContent({...})
```

Avoid:

```txt
ITEMS.push(...)
MOBS.push(...)
runtime state inside content
localStorage inside content
UI imports inside content
```

Current known risk:

```txt
items.ts builds mob cards from world data, while world.ts imports ITEMS.
This is a content-level circular shape. Do not expand it further.
If it becomes unstable, split generated mob cards into a separate content build step.
```

## 3. System rules

Systems should receive input and return output.

Good:

```ts
const result = resolveCombatAction(server, combat, actionId, rng);
return result.server;
```

Bad:

```ts
localStorage.setItem(...)
window.location.reload()
document.querySelector(...)
```

System functions may import content and balance formulas. They should not import UI.

## 4. UI rules

UI renders state and calls actions.

UI should not:

```txt
generate market
repair saves
create dungeon runs directly
calculate balance formulas
mutate content arrays
```

UI action objects should come from `src/ui/actions` when a button group has status logic.

Action shape:

```ts
{
  id: string;
  label: string;
  disabled: boolean;
  reason?: string;
  kind?: "primary" | "secondary" | "danger";
}
```

## 5. Save/load rules

Current save line:

```txt
SAVE_VERSION = 0.7.0
SAVE_KEY = mmoworldsimulator.save.v0.7.0
```

Do not change the save key for small hotfixes.

Save/load belongs to `src/engine/saveLoad.ts`.

Do not read or write save data from UI or systems.

## 6. Market rules

Market system owns market generation, diagnostics, and repair.

Current protected behavior:

```txt
system sellers are valid seller refs
market repair rebuilds market only inside marketSystem/store action
MarketScreen may call repairMarket action, but must not generate listings itself
```

Do not move market generation into UI.

## 7. Quest/contract rules

Quest and contract progress should use shared objective helpers from:

```txt
src/systems/objectiveSystem.ts
```

QuestSystem owns quest state and turn-in.

ContractSystem owns daily/weekly generation, reset timing, cancel/claim behavior, and auto-complete rewards.

Do not make cancelled/completed contracts refill immediately. Reset timing owns refill.

## 8. Party/dungeon rules

PartyFinderSystem owns listing creation, applicant flow, member roles, and starting a party from a listing.

DungeonSystem owns dungeon run floors, encounters, rest, and dungeon progress.

GameStore may call both, but should not duplicate their internal logic.

There must be one source of dungeon party composition:

```txt
currentDungeonRun.partyNpcIds
currentDungeonRun.partyRoles
```

## 9. How to add a new item

1. Add definition in content item declarations or item factory.
2. Use a unique id.
3. If it belongs to a set, use a stable `setId`.
4. Ensure class tags and slot are correct.
5. Run:

```bash
npm run typecheck
npm run build
npm run sanity
npm run smoke
```

## 10. How to add a new mob

1. Add mob definition in content world declarations.
2. Reference an existing loot table.
3. Put the mob into a spot or dungeon floor.
4. If mob cards are generated, ensure the id will not collide.
5. Run sanity/smoke.

## 11. How to add a new dungeon

1. Add dungeon definition.
2. Set correct zone id.
3. Set party size.
4. Add exactly valid floor mob ids.
5. Reference an existing loot table.
6. Ensure quest/contract references use the dungeon id.
7. Run sanity/smoke.

## 12. How to add a new quest

1. Add quest definition.
2. Add it to the quest giver `questIds`.
3. Validate mob/item/dungeon/system refs.
4. Do not add runtime quest generation in UI.
5. Run sanity/smoke.

## 13. How to add a new contract

1. Add generator logic in ContractSystem only.
2. Use existing objective helper functions.
3. Do not refill cancelled/completed contracts before reset.
4. Do not put contract timing in UI.
5. Run sanity/smoke.

## 14. Required checks before merge

```bash
npm run typecheck
npm run build
npm run sanity
npm run smoke
```

If `npm run version:check` exists, run it too.

## 15. Safe cleanup policy

Small safe changes are allowed when they:

```txt
reduce duplication
do not change gameplay
do not touch save/load/PWA/market behavior
are covered by sanity or smoke
```

Large rewrites are not allowed in ordinary patches.
