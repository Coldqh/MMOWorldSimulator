import type { ServerState } from '../types/game';

export const SAVE_VERSION = '0.6.9';
const SAVE_KEY = 'mmoworldsimulator.save.v0.6.9';
const LEGACY_KEYS = [
  'mmoworldsimulator.save.v0.6.8',
  'mmoworldsimulator.save.v0.6.7',
  'mmoworldsimulator.save.v0.6.6',
  'mmoworldsimulator.save.v0.6.5',
  'mmoworldsimulator.save.v0.6.4',
  'mmoworldsimulator.save.v0.6.3',
  'mmoworldsimulator.save.v0.6.2',
  'mmoworldsimulator.save.v0.6.1',
  'mmoworldsimulator.save.v0.6.0',
  'mmoworldsimulator.save.v0.5.12',
  'mmoworldsimulator.save.v0.5.11',
  'mmoworldsimulator.save.v0.5.10',
  'mmoworldsimulator.save.v0.5.9',
  'mmoworldsimulator.save.v0.5.8',
  'mmoworldsimulator.save.v0.5.7',
  'mmoworldsimulator.save.v0.5.6',
  'mmoworldsimulator.save.v0.5.5',
  'mmoworldsimulator.save.v0.5.4',
  'mmoworldsimulator.save.v0.5.3',
  'mmoworldsimulator.save.v0.5.2',
  'mmoworldsimulator.save.v0.5.1',
  'mmoworldsimulator.save.v0.5.0',
  'mmoworldsimulator.save.v0.4.9',
  'mmoworldsimulator.save.v0.4.8',
  'mmoworldsimulator.save.v0.4.7',
  'mmoworldsimulator.save.v0.4.6',
  'mmoworldsimulator.save.v0.4.5',
  'mmoworldsimulator.save.v0.4.4',
  'mmoworldsimulator.save.v0.4.3',
  'mmoworldsimulator.save.v0.4.2',
  'mmoworldsimulator.save.v0.4.1',
  'mmoworldsimulator.save.v0.4.0',
  'mmoworldsimulator.save.v0.3.10',
  'mmoworldsimulator.save.v0.3.9',
  'mmoworldsimulator.save.v0.3.8',
  'mmoworldsimulator.save.v0.3.7',
  'mmoworldsimulator.save.v0.3.6',
  'mmoworldsimulator.save.v0.3.5',
  'mmoworldsimulator.save.v0.3.4',
  'mmoworldsimulator.save.v0.3.3',
  'mmoworldsimulator.save.v0.3.2',
  'mmoworldsimulator.save.v0.3.1',
  'mmoworldsimulator.save.v0.3.0',
  'mmoworldsimulator.save.v0.2.4',
  'mmoworldsimulator.save.v0.2.3',
  'mmoworldsimulator.save.v0.2.2',
  'mmoworldsimulator.save.v0.1.9',
  'mmoworldsimulator.save.v0.1.7',
  'mmoworldsimulator.save.v0.1.5',
  'mmoworldsimulator.save.v0.1.4',
  'mmoworldsimulator.save.v0.1.3',
  'mmoworldsimulator.save.v0.1.2',
  'mmoworldsimulator.save.v0.1.1',
  'mmoworldsimulator.save.v0.1.0',
];

const BROKEN_SAVE_KEY = 'mmoworldsimulator.save.broken';
const RESCUE_SAVE_KEY = 'mmoworldsimulator.save.rescue';

let pendingSave: ServerState | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

const canUseStorage = () => {
  try {
    return typeof localStorage !== 'undefined';
  } catch {
    return false;
  }
};

const allSaveKeys = () => [SAVE_KEY, ...LEGACY_KEYS];

const backupRaw = (key: string, raw: string) => {
  try {
    localStorage.setItem(`${BROKEN_SAVE_KEY}.${key}.${Date.now()}`, raw);
  } catch {
    // ignore storage backup failure
  }
};

const safeSetItem = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const isPlausibleSave = (value: unknown): value is Partial<ServerState> & Record<string, unknown> =>
  isRecord(value) &&
  isRecord(value.player) &&
  typeof value.player.name === 'string' &&
  typeof value.player.level === 'number';

const parseSave = (key: string) => {
  if (!canUseStorage()) return null;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return null;
  }

  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!isPlausibleSave(parsed)) {
      backupRaw(key, raw);
      return null;
    }
    return { key, raw, server: parsed };
  } catch {
    backupRaw(key, raw);
    return null;
  }
};

const inventoryScore = (server: Record<string, unknown>) => {
  const player = isRecord(server.player) ? server.player : {};
  const inventory = Array.isArray(player.inventory) ? player.inventory : [];
  return inventory.length;
};

const equipmentScore = (server: Record<string, unknown>) => {
  const player = isRecord(server.player) ? server.player : {};
  const equipment = isRecord(player.equipment) ? player.equipment : {};
  return Object.values(equipment).reduce((sum, entry) => {
    if (!isRecord(entry)) return sum;
    return sum + 1000 + Number(entry.enhancement ?? 0) * 25 + String(entry.itemId ?? '').length;
  }, 0);
};

const saveScore = (server: Record<string, unknown>) => {
  const player = isRecord(server.player) ? server.player : {};
  const level = Number(player.level ?? 0);
  const xp = Number(player.xp ?? 0);
  const gold = Number(player.gold ?? 0);
  const day = Number(server.serverDay ?? 0);
  const minute = Number(server.currentMinute ?? 0);
  const savedAt = Number(server.savedAt ?? server.lastSavedAt ?? 0);
  return [
    level,
    equipmentScore(server),
    xp,
    day,
    minute,
    gold,
    inventoryScore(server),
    savedAt,
  ];
};

const compareScore = (a: number[], b: number[]) => {
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
};

const normalizeForWrite = (server: ServerState): ServerState & { savedAt: number } => ({
  ...server,
  version: SAVE_VERSION,
  savedAt: Date.now(),
});

export const backupRescueSave = (server: unknown, reason = 'unknown') => {
  if (!canUseStorage() || !server) return;
  try {
    localStorage.setItem(`${RESCUE_SAVE_KEY}.${reason}.${Date.now()}`, JSON.stringify(server));
  } catch {
    // ignore backup failure
  }
};

export const flushSaveGame = () => {
  if (!pendingSave || !canUseStorage()) return;
  const normalized = normalizeForWrite(pendingSave);
  pendingSave = null;
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  safeSetItem(SAVE_KEY, JSON.stringify(normalized));
};

export const saveGame = (server: ServerState) => {
  if (!canUseStorage()) return;
  pendingSave = { ...server, version: SAVE_VERSION };
  safeSetItem(SAVE_KEY, JSON.stringify(normalizeForWrite(server)));
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSaveGame, 220);
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

  try {
    const candidates = allSaveKeys()
      .map(parseSave)
      .filter((entry): entry is NonNullable<ReturnType<typeof parseSave>> => Boolean(entry));

    if (candidates.length === 0) return null;

    const best = candidates
      .sort((a, b) => compareScore(saveScore(b.server), saveScore(a.server)))[0];

    backupRescueSave(best.server, `selected.${best.key.replaceAll('.', '_')}`);

    const normalized = {
      ...best.server,
      version: SAVE_VERSION,
      savedAt: Date.now(),
    } as ServerState & { savedAt: number };

    safeSetItem(SAVE_KEY, JSON.stringify(normalized));
    return normalized as ServerState;
  } catch (error) {
    try {
      localStorage.setItem(`${BROKEN_SAVE_KEY}.loadGame.${Date.now()}`, String(error));
    } catch {
      // ignore
    }
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
  localStorage.removeItem(BROKEN_SAVE_KEY);
  LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
};
