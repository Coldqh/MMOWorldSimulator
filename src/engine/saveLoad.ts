import type { ServerState } from '../types/game';

export const SAVE_VERSION = '0.4.0';
const SAVE_KEY = 'mmoworldsimulator.save.v0.4.0';
const LEGACY_KEYS = [
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
  'mmoworldsimulator.save.v0.1.0'
];
const BROKEN_SAVE_KEY = 'mmoworldsimulator.save.broken';

let pendingSave: ServerState | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

const readRawSave = () => {
  const keys = [SAVE_KEY, ...LEGACY_KEYS];
  for (const key of keys) {
    const raw = localStorage.getItem(key);
    if (raw) return { key, raw };
  }
  return null;
};

export const flushSaveGame = () => {
  if (!pendingSave) return;
  const normalized = { ...pendingSave, version: SAVE_VERSION };
  pendingSave = null;
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  localStorage.setItem(SAVE_KEY, JSON.stringify(normalized));
};

export const saveGame = (server: ServerState) => {
  pendingSave = { ...server, version: SAVE_VERSION };
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSaveGame, 220);
};

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushSaveGame);
}

export const loadGame = (): ServerState | null => {
  const saved = readRawSave();
  if (!saved) return null;

  try {
    return JSON.parse(saved.raw) as ServerState;
  } catch {
    localStorage.setItem(BROKEN_SAVE_KEY, saved.raw);
    localStorage.removeItem(saved.key);
    return null;
  }
};

export const clearSave = () => {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  pendingSave = null;
  localStorage.removeItem(SAVE_KEY);
  localStorage.removeItem(BROKEN_SAVE_KEY);
  LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
};
