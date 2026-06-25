# MMO World Simulator v0.5.3

Balance Core Patch.

- Adds `src/balance/*` as the single balance layer.
- Moves XP, rewards, item price, card price, Gear Score, NPC wealth and arena rating to balance formulas.
- Fixes Glass Catacombs canonical set id to `dungeon_glass_catacomb`.
- Keeps First Wyrm as canonical 10-piece legendary set.
- Rebuilds final item/card price pass from balance formulas.
- Expands `npm run sanity` with balance and content invariants.
