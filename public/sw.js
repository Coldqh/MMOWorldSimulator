const APP_VERSION = '0.5.1';
const CACHE_PREFIX = 'mmows-cache-';
const CACHE_NAME = `${CACHE_PREFIX}${APP_VERSION}`;
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './version.json',
  './icons/icon.svg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL).catch(() => undefined))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'CLEAR_OLD_CACHES') {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys
        .filter((key) => key.startsWith(CACHE_PREFIX))
        .map((key) => caches.delete(key))))
    );
  }
});

const isSameOriginGet = (request) => {
  try {
    const url = new URL(request.url);
    return request.method === 'GET' && url.origin === self.location.origin;
  } catch {
    return false;
  }
};

const networkFirst = async (request) => {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached || cache.match('./index.html');
  }
};

const cacheFirst = async (request) => {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    if (request.mode === 'navigate') return cache.match('./index.html');
    throw new Error('offline');
  }
};

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (!isSameOriginGet(request)) return;
  const url = new URL(request.url);
  if (url.pathname.endsWith('/version.json') || request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }
  event.respondWith(cacheFirst(request));
});
