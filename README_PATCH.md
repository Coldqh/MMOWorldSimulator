# MMO World Simulator v0.5.1

Architecture cleanup for items, sets, market, cards, instance loot, library and save migration.

Install from `C:\MMOWorldSimulator` with:

```powershell
PowerShell -ExecutionPolicy Bypass -File .\apply_mmoworldsimulator_v0.5.1.ps1
```

Then in `C:\MMOWorldSimulator\mmoworldsimulator` run:

```powershell
npm install --registry=https://registry.npmjs.org/ --no-audit --no-fund
npm run typecheck
npm run build
npm run sanity
```
