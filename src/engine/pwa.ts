import { APP_VERSION } from './version';

export interface AppUpdateDetail {
  version: string;
  currentVersion: string;
  reason: 'service-worker' | 'version-file';
}

export const UPDATE_EVENT = 'mmows:update-available';
const baseUrl = import.meta.env.BASE_URL || './';
let registrationRef: ServiceWorkerRegistration | null = null;
let reloading = false;

const dispatchUpdate = (detail: AppUpdateDetail) => {
  window.dispatchEvent(new CustomEvent<AppUpdateDetail>(UPDATE_EVENT, { detail }));
};

export const registerPwa = async () => {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const registration = await navigator.serviceWorker.register(`${baseUrl}sw.js`);
    registrationRef = registration;

    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          dispatchUpdate({ version: 'new', currentVersion: APP_VERSION, reason: 'service-worker' });
        }
      });
    });

    if (registration.waiting && navigator.serviceWorker.controller) {
      dispatchUpdate({ version: 'new', currentVersion: APP_VERSION, reason: 'service-worker' });
    }

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    });

    return registration;
  } catch {
    return null;
  }
};

export const checkRemoteVersion = async () => {
  try {
    const response = await fetch(`${baseUrl}version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) return null;
    const data = await response.json() as { version?: string };
    if (data.version && data.version !== APP_VERSION) {
      dispatchUpdate({ version: data.version, currentVersion: APP_VERSION, reason: 'version-file' });
      return data.version;
    }
    return null;
  } catch {
    return null;
  }
};

export const applyLatestVersion = async () => {
  const registrations = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistrations() : [];
  const waiting = registrationRef?.waiting ?? registrations.find((entry) => entry.waiting)?.waiting;
  if (waiting) {
    waiting.postMessage({ type: 'SKIP_WAITING' });
    return;
  }

  const controller = navigator.serviceWorker?.controller;
  controller?.postMessage({ type: 'CLEAR_OLD_CACHES' });
  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith('mmows-cache-')).map((key) => caches.delete(key)));
  }
  window.location.reload();
};
