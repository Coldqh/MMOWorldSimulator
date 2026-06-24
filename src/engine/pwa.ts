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
    const registration = await navigator.serviceWorker.register(`${baseUrl}sw.js?app=${APP_VERSION}`);
    registrationRef = registration;

    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          dispatchUpdate({ version: APP_VERSION, currentVersion: APP_VERSION, reason: 'service-worker' });
        }
      });
    });

    if (registration.waiting && navigator.serviceWorker.controller) {
      dispatchUpdate({ version: APP_VERSION, currentVersion: APP_VERSION, reason: 'service-worker' });
    }

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return;
      reloading = true;
      window.location.replace(`${baseUrl}?updated=${Date.now()}`);
    });

    return registration;
  } catch {
    return null;
  }
};

export const checkRemoteVersion = async () => {
  try {
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
  } catch {
    return null;
  }
};

export const applyLatestVersion = async () => {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
      registrationRef = null;
    }

    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } finally {
    window.location.replace(`${baseUrl}?updated=${Date.now()}`);
  }
};
