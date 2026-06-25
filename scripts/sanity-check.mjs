import fs from 'node:fs';

const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';
const exists = (path) => fs.existsSync(path);

const files = {
  packageJson: read('package.json'),
  saveLoad: read('src/engine/saveLoad.ts'),
  version: read('src/engine/version.ts'),
  main: read('src/main.tsx'),
  pwa: read('src/engine/pwa.ts'),
  sw: read('public/sw.js'),
  versionJson: read('public/version.json'),
  updateBanner: read('src/ui/components/UpdateBanner.tsx'),
  app: read('src/app/App.tsx'),
  errorBoundary: read('src/app/ErrorBoundary.tsx'),
  index: read('index.html'),
  styles: read('src/ui/styles.css'),
  vite: read('vite.config.ts'),
  types: read('src/types/game.ts'),
  partyFinder: read('src/systems/partyFinderSystem.ts'),
  partyScreen: read('src/ui/screens/PartyFinderScreen.tsx'),
  appShell: read('src/ui/layout/AppShell.tsx'),
};

const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

assert(files.packageJson.includes('"version": "0.5.7"'), 'package version is 0.5.7');
assert(files.saveLoad.includes("SAVE_VERSION = '0.5.7'"), 'save version is 0.5.7');
assert(files.saveLoad.includes('mmoworldsimulator.save.v0.5.6'), '0.5.6 legacy save key exists');
assert(files.version.includes("APP_VERSION = '0.5.7'"), 'APP_VERSION is 0.5.7');
assert(files.versionJson.includes('"version": "0.5.7"'), 'public version.json is 0.5.7');

assert(exists('public/sw.js'), 'service worker exists');
assert(files.sw.includes("mmows-v0.5.7"), 'service worker cache uses v0.5.7');
assert(!/install[\s\S]{0,260}skipWaiting\(\)/.test(files.sw), 'service worker does not auto skipWaiting during install');
assert(files.sw.includes("event.data.type === 'SKIP_WAITING'") || files.sw.includes('SKIP_WAITING'), 'service worker skipWaiting is message-driven');
assert(files.sw.includes('clients.claim'), 'service worker claims clients after activation');
assert(files.sw.includes('caches.keys') && files.sw.includes('startsWith'), 'service worker cleans old mmows caches');

assert(!files.main.includes('navigator.serviceWorker.register'), 'main.tsx does not register service worker directly');
assert(files.pwa.includes('navigator.serviceWorker.register'), 'pwa.ts owns service worker registration');
assert(files.pwa.includes('registerPromise'), 'pwa registration is idempotent');
assert(!files.pwa.includes('window.location.replace'), 'pwa.ts does not use location.replace');
assert(!files.pwa.includes('?updated='), 'pwa.ts does not mutate URL with updated timestamp');
assert(files.pwa.includes('controllerchange'), 'pwa.ts handles controllerchange');
assert(files.pwa.includes('controllerChangeSeen'), 'controllerchange has repeat guard');
assert(files.pwa.includes('window.location.reload()'), 'manual update can reload page');
assert(files.pwa.includes('mmows_reload_guard'), 'manual reload has session guard');

assert(files.updateBanner.includes('registerPwa') && files.updateBanner.includes('checkRemoteVersion'), 'UpdateBanner uses central PWA registration');
assert(files.app.includes('ErrorBoundary'), 'App is wrapped in ErrorBoundary');
assert(files.errorBoundary.includes('componentDidCatch'), 'ErrorBoundary catches React crashes');

assert(files.types.includes('partyFinderListings: PartyFinderListing[]'), 'Party Finder state still exists');
assert(files.partyFinder.includes('refreshPartyFinderListings'), 'Party Finder system still exists');
assert(files.partyScreen.includes('PartyFinderScreen'), 'Party Finder screen still exists');
assert(files.appShell.includes('PartyFinderScreen'), 'AppShell still wires Party Finder');

assert(files.index.includes('manifest.webmanifest'), 'index links manifest');
assert(!/https?:\/\/(?!registry\.npmjs\.org)/i.test(files.index), 'index has no external CDN URLs');
assert(!/@import\s+url\(["']?https?:\/\//i.test(files.styles), 'CSS has no remote font imports');
assert(files.vite.includes("base: './'") || files.vite.includes('base:"./"') || files.vite.includes("base:'./'"), 'vite uses relative base path');

if (fail.length) {
  console.error('Sanity failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}

console.log('Sanity passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
