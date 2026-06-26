export const RUNTIME_VERSION = '0.7.0';

const RESET_FLAG_KEY = `mmoworldsimulator.runtimeReset.v${RUNTIME_VERSION}`;
const ASYNC_CLEANUP_FLAG_KEY = `mmoworldsimulator.runtimeAsyncCleanup.v${RUNTIME_VERSION}`;
export const RESET_FLAG_VALUE = 'done';
export const CURRENT_SAVE_KEY = `mmoworldsimulator.save.v${RUNTIME_VERSION}`;

const debug = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.warn('[MMOWS runtime reset]', ...args);
};

const withTimeout = async <T>(task: Promise<T>, ms = 1500): Promise<T | null> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      task,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

export function hasRuntimeResetCompleted(): boolean {
  try {
    return localStorage.getItem(RESET_FLAG_KEY) === RESET_FLAG_VALUE;
  } catch {
    return true;
  }
}

export function clearOldLocalStorageKeys(): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      const isOldSave =
        key.startsWith('mmoworldsimulator.save.') ||
        key.startsWith('mmoworldsimulator.save.v') ||
        key.startsWith('mmoworldsimulator.save.broken') ||
        key.startsWith('mmoworldsimulator.save.rescue');
      const isOldDebug =
        key.startsWith('mmoworldsimulator.debug.') ||
        key.startsWith('mmoworldsimulator.market.') ||
        key.startsWith('mmoworldsimulator.repair.') ||
        key.startsWith('mmows_reload_guard');

      if ((isOldSave || isOldDebug) && key !== CURRENT_SAVE_KEY) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    debug('localStorage cleanup failed', error);
  }
}

export function prepareRuntimeResetBeforeAppImport(): void {
  if (hasRuntimeResetCompleted()) return;

  try {
    clearOldLocalStorageKeys();
  } catch (error) {
    debug('sync runtime reset failed', error);
  } finally {
    try {
      localStorage.setItem(RESET_FLAG_KEY, RESET_FLAG_VALUE);
    } catch (error) {
      debug('reset flag write failed', error);
    }
  }
}

export async function clearOldServiceWorkers(): Promise<void> {
  try {
    if (!('serviceWorker' in navigator)) return;
    const registrations = await withTimeout(navigator.serviceWorker.getRegistrations(), 1500);
    if (!registrations) return;
    await withTimeout(Promise.all(registrations.map((registration) => registration.unregister())), 1500);
  } catch (error) {
    debug('service worker cleanup failed', error);
  }
}

export async function clearOldCaches(): Promise<void> {
  try {
    if (!('caches' in window)) return;
    const keys = await withTimeout(caches.keys(), 1500);
    if (!keys) return;
    await withTimeout(
      Promise.all(
        keys
          .filter((key) => key.startsWith('mmows-') || key.startsWith('mmoworldsimulator-'))
          .map((key) => caches.delete(key)),
      ),
      1500,
    );
  } catch (error) {
    debug('cache cleanup failed', error);
  }
}

export async function clearOldSavesAndCaches(): Promise<void> {
  clearOldLocalStorageKeys();
  await clearOldServiceWorkers();
  await clearOldCaches();
}

export async function runDeferredRuntimeCleanup(): Promise<void> {
  try {
    if (localStorage.getItem(ASYNC_CLEANUP_FLAG_KEY) === RESET_FLAG_VALUE) return;
  } catch {
    return;
  }

  try {
    await clearOldSavesAndCaches();
  } catch (error) {
    debug('deferred runtime cleanup failed', error);
  } finally {
    try {
      localStorage.setItem(ASYNC_CLEANUP_FLAG_KEY, RESET_FLAG_VALUE);
    } catch (error) {
      debug('async cleanup flag write failed', error);
    }
  }
}

export async function runRuntimeResetIfNeeded(): Promise<void> {
  prepareRuntimeResetBeforeAppImport();
  void runDeferredRuntimeCleanup();
}
