# GitHub Pages setup

## Первый пуш

```powershell
cd C:\MMOWorldSimulator\mmoworldsimulator
git init
git branch -M main
git add .
git commit -m "MMO World Simulator v0.4.0"
git remote add origin https://github.com/<USER>/<REPO>.git
git push -u origin main
```

## Включить Pages

1. Открой репозиторий на GitHub.
2. Settings → Pages.
3. Source: GitHub Actions.
4. После push workflow сам соберёт `dist` и выложит игру.

## Следующие обновления

```powershell
cd C:\MMOWorldSimulator\mmoworldsimulator
git add .
git commit -m "Update MMO World Simulator"
git push
```

После деплоя в игре появится кнопка **Обновить**, если открыта старая версия.

## Offline

Игра ставится как PWA, кеширует сборку и продолжает открываться без интернета после первого онлайн-запуска.
Сейв хранится локально в браузере. Для страховки используй Настройки → Экспорт.
