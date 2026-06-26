# MMOWorldSimulator Architecture

## Layers

```txt
content = static definitions and deterministic content factories
systems = pure gameplay logic over ServerState/content
engine = boot, version, save/load, runtime validation
ui = rendering and calling store actions
balance = numeric formulas
scripts = repository checks
```

New work should follow:

```txt
content definition
system function
UI action
validation
sanity/smoke check
```

## Content dependency rules

Content must not mutate exported arrays at runtime.

Allowed:

```txt
BASE_* definitions
deterministic finalize* functions
read-only generated definitions
```

Forbidden:

```txt
ITEMS.push(...)
MOBS.push(...)
content importing systems
content importing UI
content depending on ServerState
```

## Mob definitions and mob cards

Mob definitions live in the neutral module:

```txt
src/content/mobDefinitions.ts
```

Rules:

```txt
mobDefinitions -> world.ts
mobDefinitions -> itemContent.ts -> items.ts
```

`items.ts` must not import `world.ts`.

`world.ts` must not import the public `items.ts` barrel. If world finalization needs items, it imports `itemContent.ts` directly. This keeps the public `items/world` indexes from forming a cycle.

## Validation facade

Use:

```txt
src/engine/validation.ts
```

It re-exports:

```ts
validateContent()
validateRuntime(server)
repairRuntime(server, rng)
runAllStaticValidation()
runAllRuntimeValidation(server, rng)
```

Content validation is read-only.

Runtime repair may only change `ServerState`.

## Reward system

Reward application lives in:

```txt
src/systems/rewardSystem.ts
```

Quest and contract systems should use shared helpers for XP/gold/item/reputation rewards.

Do not duplicate XP/gold reward application in each feature.

## Objective system

Objective progress lives in:

```txt
src/systems/objectiveSystem.ts
```

Quest and contract systems should use shared helpers for progress and completion.

## Party role system

Party role mapping lives in:

```txt
src/systems/partyRoleSystem.ts
```

Stable mapping:

```txt
warrior -> tank
priest -> healer
ranger -> physicalDps
mage -> magicDps
unknown -> physicalDps fallback
```

Dungeon and party finder systems must not duplicate role mapping.

## Store boundaries

`gameStore.ts` remains the Zustand store.

Store actions should:

```txt
read current state
call a system function
commit result
```

Store actions should not grow new gameplay algorithms when a system module exists.

Derived data should move to selectors when safe.

## Save/load rules

Current save line:

```txt
SAVE_VERSION = 0.7.0
SAVE_KEY = mmoworldsimulator.save.v0.7.0
```

Do not change save key for small app patch versions.

UI and systems must not write localStorage.

## Market rules

Market generation/repair belongs to `marketSystem`.

Market UI may call the store action `repairMarket()`.

Market UI must not generate listings itself.

## Party/dungeon rules

PartyFinderSystem owns lobby and member selection.

DungeonSystem owns dungeon run/floors.

Dungeon party source:

```txt
currentDungeonRun.partyNpcIds
currentDungeonRun.partyRoles
```

## How to add a mob safely

1. Add mob definition.
2. Put it into a spot or dungeon floor.
3. Ensure its loot table exists.
4. Let mob cards generate from `mobDefinitions`.
5. Run sanity and smoke.

## How to add an item safely

1. Add item definition.
2. Use unique id.
3. If set item, add stable `setId`.
4. Ensure loot/quest refs point to existing id.
5. Run sanity and smoke.

## How to add a quest safely

1. Add quest definition.
2. Add quest id to quest giver.
3. Use valid mob/item/dungeon refs.
4. Use existing quest system progress helpers.
5. Run sanity and smoke.

## How to add a contract safely

1. Change ContractSystem generator only.
2. Use objective helpers.
3. Use reward helpers.
4. Do not refill cancelled/completed contracts before reset.
5. Run sanity and smoke.

## How to add a dungeon safely

1. Add dungeon definition.
2. Use valid zone, mob and loot table ids.
3. Use party role helpers.
4. Keep dungeon party source in `currentDungeonRun`.
5. Run sanity and smoke.

## Required checks before merge

```bash
npm run typecheck
npm run build
npm run sanity
npm run smoke
```

If `npm run version:check` exists, run it too.


## Guild Wars Core

Guild war state is owned by systems, not UI.

Files:

```txt
src/systems/guildWarSystem.ts
src/systems/guildRelationSystem.ts
src/systems/guildRosterSystem.ts
src/systems/npcSkillSystem.ts
src/systems/npcLocationSystem.ts
src/systems/pvpSimulationSystem.ts
```

Rules:

- guild relations are directed;
- guild wars start only after declare/accept votes;
- active/scheduled wars per guild are capped at 2;
- NPC skill is 1..10 and affects PvP power;
- NPC location is runtime state;
- player attacks are allowed only outside city against active-war enemy guild NPCs in the same location;
- market/save/PWA do not own guild war behavior.
