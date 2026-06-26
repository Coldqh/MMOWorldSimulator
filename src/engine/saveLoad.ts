import type { ServerState } from '../types/game';

export const SAVE_VERSION = '0.7.0';
export const SAVE_KEY = 'mmoworldsimulator.save.v0.7.0';

const BROKEN_SAVE_PREFIX = 'mmoworldsimulator.save.broken.v0.7.0';
const DEBUG_PREFIX = 'mmoworldsimulator.debug.v0.7.0';

let pendingSave: (ServerState & { savedAt?: number }) | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

const canUseStorage = () => {
  try {
    return typeof localStorage !== 'undefined';
  } catch {
    return false;
  }
};

const now = () => Date.now();

const backupBrokenSave = (raw: string, reason: string) => {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(`${BROKEN_SAVE_PREFIX}.${reason}.${now()}`, raw);
  } catch {
    // ignore backup failure
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const isValidV070Shape = (value: unknown): value is ServerState => {
  if (!isRecord(value)) return false;
  if (value.version !== SAVE_VERSION) return false;
  if (!isRecord(value.player)) return false;
  if (typeof value.player.name !== 'string') return false;
  if (typeof value.player.level !== 'number' || value.player.level < 1) return false;
  if (!Array.isArray(value.npcs)) return false;
  if (!Array.isArray(value.guilds)) return false;
  if (!Array.isArray(value.market)) return false;
  if (!isRecord(value.location)) return false;
  return true;
};

const normalizeForWrite = (server: ServerState): ServerState & { savedAt: number } => ({
  ...server,
  version: SAVE_VERSION,
  savedAt: now(),
});

const writeCurrentSave = (server: ServerState & { savedAt?: number }) => {
  if (!canUseStorage()) return;
  localStorage.setItem(SAVE_KEY, JSON.stringify(server));
};

export const backupRescueSave = (server: unknown, reason = 'manual') => {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(`${DEBUG_PREFIX}.backup.${reason}.${now()}`, JSON.stringify(server));
  } catch {
    // ignore
  }
};

export const flushSaveGame = () => {
  if (!pendingSave || !canUseStorage()) return;

  const next = pendingSave;
  pendingSave = null;

  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }

  try {
    const currentRaw = localStorage.getItem(SAVE_KEY);
    const current = currentRaw ? JSON.parse(currentRaw) as { savedAt?: number } : null;
    if (current?.savedAt && next.savedAt && current.savedAt > next.savedAt) return;
  } catch {
    // write next below
  }

  writeCurrentSave(next);
};

export const saveGame = (server: ServerState) => {
  if (!canUseStorage()) return;

  const normalized = normalizeForWrite(server);
  pendingSave = normalized;
  writeCurrentSave(normalized);

  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSaveGame, 150);
};

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushSaveGame);
  window.addEventListener('pagehide', flushSaveGame);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushSaveGame();
  });
}

export const loadGame = (): ServerState | null => {
  if (!canUseStorage()) return null;

  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!isValidV070Shape(parsed)) {
      const parsedVersion = isRecord(parsed) && typeof parsed.version === 'string'
        ? parsed.version.replaceAll('.', '_')
        : 'invalid_shape';
      backupBrokenSave(raw, parsedVersion);
      return null;
    }
    return parsed;
  } catch {
    backupBrokenSave(raw, 'corrupted_json');
    return null;
  }
};

export const clearSave = () => {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }

  pendingSave = null;
  if (!canUseStorage()) return;

  localStorage.removeItem(SAVE_KEY);
  Object.keys(localStorage)
    .filter((key) => key.startsWith(DEBUG_PREFIX) || key.startsWith(BROKEN_SAVE_PREFIX))
    .forEach((key) => localStorage.removeItem(key));
};

export const exportSave = () => {
  if (!canUseStorage()) return null;
  return localStorage.getItem(SAVE_KEY);
};

export const importSave = (raw: string): ServerState | null => {
  try {
    const parsed = JSON.parse(raw);
    if (!isValidV070Shape(parsed)) return null;
    saveGame(parsed);
    return parsed;
  } catch {
    return null;
  }
};
