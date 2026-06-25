# MMO World Simulator patch v0.5.4

Legacy Cleanup + Balance Update.

## Main changes

- `src/content/items.ts` is now a thin collector.
- Item base definitions moved to `src/content/itemBaseDefinitions.ts`.
- Set declarations moved to `src/content/itemSetDefinitions.ts`.
- Generated set factories moved to `src/content/itemFactories.ts`.
- Legacy item id migration moved to `src/content/itemLegacy.ts`.
- Final item balance moved to `src/content/itemFinalize.ts`.
- Balance coefficients tuned in `src/balance/balanceConfig.ts`.
- Sanity checks expanded in `scripts/sanity-check.mjs`.
- App/save/PWA version bumped to `0.5.4`.

## Checks

Run locally:

```powershell
npm install --registry=https://registry.npmjs.org/ --no-audit --no-fund
npm run typecheck
npm run build
npm run sanity
```
