# MMO World Simulator

Solo simulator of a living old-school fantasy MMO server.

## Dev

```powershell
npm install
npm run dev
```

## Build

```powershell
npm run build
```

## GitHub Pages

See `GITHUB_PAGES_SETUP.md`.

## Offline / PWA

Version `0.4.0` adds:

- Service Worker cache.
- Web App Manifest.
- Offline launch after first online load.
- Save persistence through reloads through localStorage.
- Version check through `version.json`.
- Update button when a newer version is deployed.
