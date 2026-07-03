import type { ServerState } from '../types/game';

export const SAVE_VERSION = '0.7.54';
export const SAVE_KEY = 'mmoworldsimulator.save.v0.7.54';

const BROKEN_SAVE_PREFIX = 'mmoworldsimulator.save.broken.v0.7.54';
const DEBUG_PREFIX = 'mmoworldsimulator.debug.v0.7.54';

const LEGACY_SAVE_KEYS = [
  'mmoworldsimulator.save.v0.7.53',
  'mmoworldsimulator.save.v0.7.52',
  'mmoworldsimulator.save.v0.7.51',
  'mmoworldsimulator.save.v0.7.50',
  'mmoworldsimulator.save.v0.7.49',
  'mmoworldsimulator.save.v0.7.48',
  'mmoworldsimulator.save.v0.7.47',
  'mmoworldsimulator.save.v0.7.46',
  'mmoworldsimulator.save.v0.7.45',
  'mmoworldsimulator.save.v0.7.44',
  'mmoworldsimulator.save.v0.7.43',
  'mmoworldsimulator.save.v0.7.42',
  'mmoworldsimulator.save.v0.7.0',
];

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

const isCompatibleSaveShape = (value: unknown): value is ServerState => {
  if (!isRecord(value)) return false;
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

const parseRawSave = (raw: string, reason: string): ServerState | null => {
  try {
    const parsed = JSON.parse(raw);
    if (!isCompatibleSaveShape(parsed)) {
      backupBrokenSave(raw, reason);
      return null;
    }
    return parsed;
  } catch {
    backupBrokenSave(raw, `${reason}.corrupted_json`);
    return null;
  }
};

const storageKeys = () => {
  if (!canUseStorage()) return [];
  try {
    return Object.keys(localStorage);
  } catch {
    return [];
  }
};

const candidateSaveKeys = () => {
  const known = [SAVE_KEY, ...LEGACY_SAVE_KEYS];
  const discovered = storageKeys()
    .filter((key) =>
      key.startsWith('mmoworldsimulator.save.v') ||
      key.startsWith('mmoworldsimulator.debug.v') ||
      key.startsWith('mmoworldsimulator.save.broken.v')
    )
    .sort((a, b) => {
      const currentA = a === SAVE_KEY ? 0 : 1;
      const currentB = b === SAVE_KEY ? 0 : 1;
      if (currentA !== currentB) return currentA - currentB;
      return b.localeCompare(a);
    });

  return [...new Set([...known, ...discovered])];
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

export const saveGame = (
  server: ServerState,
  options: { immediate?: boolean } = {},
) => {
  if (!canUseStorage()) return;

  const normalized = normalizeForWrite(server);
  pendingSave = normalized;

  if (options.immediate !== false) {
    writeCurrentSave(normalized);
  }

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

  for (const key of candidateSaveKeys()) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;

    const parsed = parseRawSave(raw, key.split('.').join('_'));
    if (!parsed) continue;

    const migrated: ServerState = {
      ...parsed,
      version: SAVE_VERSION,
    };

    if (key !== SAVE_KEY || parsed.version !== SAVE_VERSION) {
      try {
        backupRescueSave(parsed, `migrated_from_${key.split('.').join('_')}`);
        saveGame(migrated, { immediate: true });
      } catch {
        // keep returning parsed save even if migration write fails
      }
    }

    return migrated;
  }

  return null;
};

export const clearSave = () => {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }

  pendingSave = null;
  if (!canUseStorage()) return;

  localStorage.removeItem(SAVE_KEY);
  LEGACY_SAVE_KEYS.forEach((key) => localStorage.removeItem(key));
  storageKeys()
    .filter((key) => key.startsWith(DEBUG_PREFIX) || key.startsWith(BROKEN_SAVE_PREFIX))
    .forEach((key) => localStorage.removeItem(key));
};

export const exportSave = () => {
  if (!canUseStorage()) return null;
  return localStorage.getItem(SAVE_KEY) ?? LEGACY_SAVE_KEYS.map((key) => localStorage.getItem(key)).find(Boolean) ?? null;
};

export const importSave = (raw: string): ServerState | null => {
  const parsed = parseRawSave(raw, 'import');
  if (!parsed) return null;

  const migrated: ServerState = {
    ...parsed,
    version: SAVE_VERSION,
  };

  saveGame(migrated, { immediate: true });
  return migrated;
};
