import { APP_VERSION } from './version';

export interface AppUpdateDetail {
  version: string;
  currentVersion: string;
  reason: 'service-worker' | 'version-file' | 'controllerchange';
}

export const UPDATE_EVENT = 'mmows:update-available';

const baseUrl = import.meta.env.BASE_URL || './';
const RELOAD_GUARD_KEY = 'mmows_reload_guard';
let registrationRef: ServiceWorkerRegistration | null = null;
let registerPromise: Promise<ServiceWorkerRegistration | null> | null = null;
let controllerChangeSeen = false;
let controllerListenerAttached = false;
let registrationListenersAttached = false;

const debug = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.log('[MMOWS]', ...args);
};

const dispatchUpdate = (detail: AppUpdateDetail) => {
  window.dispatchEvent(new CustomEvent<AppUpdateDetail>(UPDATE_EVENT, { detail }));
};

const attachControllerListener = () => {
  if (controllerListenerAttached || !('serviceWorker' in navigator)) return;
  controllerListenerAttached = true;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    debug('controllerchange');
    if (controllerChangeSeen) return;
    controllerChangeSeen = true;

    // Do not reload automatically here. A hard reload on controllerchange caused the v0.5.6 boot loop.
    dispatchUpdate({ version: APP_VERSION, currentVersion: APP_VERSION, reason: 'controllerchange' });
  });
};

const attachRegistrationListeners = (registration: ServiceWorkerRegistration) => {
  if (registrationListenersAttached) return;
  registrationListenersAttached = true;

  registration.addEventListener('updatefound', () => {
    debug('updatefound');
    const worker = registration.installing;
    if (!worker) return;

    worker.addEventListener('statechange', () => {
      debug('sw state', worker.state);
      if (worker.state === 'installed' && navigator.serviceWorker.controller) {
        dispatchUpdate({ version: APP_VERSION, currentVersion: APP_VERSION, reason: 'service-worker' });
      }
    });
  });
};

export const registerPwa = async () => {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return null;
  if (registerPromise) return registerPromise;

  registerPromise = navigator.serviceWorker.register(`${baseUrl}sw.js`)
    .then((registration) => {
      debug('sw registered');
      registrationRef = registration;
      attachControllerListener();
      attachRegistrationListeners(registration);

      if (registration.waiting && navigator.serviceWorker.controller) {
        dispatchUpdate({ version: APP_VERSION, currentVersion: APP_VERSION, reason: 'service-worker' });
      }

      return registration;
    })
    .catch((error) => {
      debug('sw registration failed', error);
      registerPromise = null;
      return null;
    });

  return registerPromise;
};

export const checkRemoteVersion = async () => {
  try {
    debug('version check');
    const response = await fetch(`${baseUrl}version.json?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!response.ok) return null;

    const data = await response.json() as { version?: string };
    if (data.version && data.version !== APP_VERSION) {
      dispatchUpdate({ version: data.version, currentVersion: APP_VERSION, reason: 'version-file' });
      return data.version;
    }

    return null;
  } catch (error) {
    debug('version check failed', error);
    return null;
  }
};

export const applyLatestVersion = async () => {
  try {
    if ('serviceWorker' in navigator) {
      const registration = registrationRef ?? await navigator.serviceWorker.getRegistration(baseUrl);
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      } else {
        await registration?.update().catch(() => undefined);
      }
    }

    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key.startsWith('mmows-')).map((key) => caches.delete(key)));
    }
  } finally {
    const guard = sessionStorage.getItem(RELOAD_GUARD_KEY);
    if (guard === APP_VERSION) return;

    sessionStorage.setItem(RELOAD_GUARD_KEY, APP_VERSION);
    window.location.reload();
  }
};
