# 0.8.0d — Activity Shops, Boss Raid, Cards & Combat Time Fixes

## Что исправлено

1. PvE/PvP shop gear теперь генерируется через общий budget предметов, а не отдельную слабую формулу.
2. PvE/PvP магазины показывают сеты, а элементы покупаются из отдельного окна сета.
3. Добавлена продажа предметов за activity currencies:
   - PvE shop принимает PvE shop gear, dungeon set gear и raid set gear.
   - PvP shop принимает Arena/Guild War shop gear.
   - Обычный рынок за gold по-прежнему не продаёт BoP.
4. World boss raid вынесен в отдельное боевое окно в стиле 1v1: игрок слева, босс справа, HP, место, урон, топ-5.
5. World boss raid damage/ranking теперь сильнее учитывает gearScore NPC/игрока.
6. Карты больше не имеют скрытого множителя 0.42: отображаемый GS карты равен GS, который она даёт при вставке.
7. В WorldScreen больше не выводится `spot.timeCostMinutes` / время фарма спота.
8. Обычный combat round теперь двигает мировое время на 5 минут. Командная арена и world boss raid уже используют свои 5 минут и не дублируются.

## Проверки

Прогнано на текущей базе:

```powershell
npm run typecheck
npm run build
npm run smoke
npm run sanity
npm run smoke:test
npm run content:check
npm run perf:scale
npm run perf:runtime
npm run perf:skip-day
npm run import:graph
```

Все проверки зелёные.

## Изменённые файлы

```text
src/content/activityShopItems.ts
src/systems/activityShopSystem.ts
src/balance/formulas.ts
src/systems/combatSystem.ts
src/systems/worldBossRaidSystem.ts
src/state/gameStore.ts
src/ui/screens/MarketScreen.tsx
src/ui/screens/WorldScreen.tsx
scripts/smoke.mjs
scripts/sanity-check.mjs
```

## Ручная проверка

1. Открыть Рынок → PvE магазин: должны быть сетовые карточки, а не длинный список вещей.
2. Кликнуть сет: открывается окно с элементами и кнопками покупки.
3. Купить предмет, потом проверить продажу за валюту в этом же магазине.
4. Открыть PvP магазин: проверить Arena/Guild War сеты и продажу PvP-сетовых предметов.
5. Открыть World boss: вступить, открыть бой, проверить отдельное боевое окно.
6. Нажать атаку world boss: время должно сдвинуться на 5 минут, ход рейда увеличиться.
7. Обычный бой в споте/данже/рейде/арене: каждый раунд должен давать +5 минут.
8. Открыть карту: в профиле должна быть строка `При вставке: +X Gear Score`.
9. Открыть спот: время фарма 100+ минут больше не должно отображаться.
