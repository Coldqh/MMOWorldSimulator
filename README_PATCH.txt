MMOWorldSimulator performance patch pack

Что внутри:
- src/ui/selectors/marketSelectors.ts
- src/ui/selectors/partyFinderSelectors.ts
- replacement src/ui/screens/MarketScreen.tsx
- replacement src/ui/screens/PartyFinderScreen.tsx
- apply_mmows_perf_patch.mjs patches gameStore, GuildScreen, guildRuntimeSystem, partyFinderSystem

Как применить:
1. Распакуй zip в корень проекта MMOWorldSimulator с заменой файлов.
2. В корне проекта выполни:
   node apply_mmows_perf_patch.mjs
3. Потом проверь:
   npm run typecheck
   npm run build
   npm run sanity
   npm run smoke
4. Если всё прошло:
   git status
   git add .
   git commit -m "Add guild tier selection and optimize market party combat hot paths"
   git push

Что правит:
- выбор tier low/mid/high при создании гильдии игрока;
- рынок: view model, seller name map, limit 80 groups, repair only when diagnostics says broken;
- party finder: view model and fewer render scans;
- party finder candidate selection: busy NPC set instead of repeated listing scans;
- combat: active combat turns use lightweight commit, without full normalize/repair pipeline on every turn.

Риски:
- Я не мог запустить npm-команды в этой среде, потому что репозиторий нельзя было клонировать через github.com.
- Если у тебя файлы уже отличаются от версии, которую я анализировал, apply script может остановиться с Pattern not found. Это специально: лучше стоп, чем тихо сломать код.
- Если script остановился, пришли строку ошибки.
