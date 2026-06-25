import type { ServerState } from '../types/game';

export const SAVE_VERSION = '0.6.2';
const SAVE_KEY = 'mmoworldsimulator.save.v0.6.2';
const LEGACY_KEYS = [
  'mmoworldsimulator.save.v0.6.1',
  'mmoworldsimulator.save.v0.6.0',
  'mmoworldsimulator.save.v0.5.12',
  'mmoworldsimulator.save.v0.5.11',
  'mmoworldsimulator.save.v0.5.10',
  'mmoworldsimulator.save.v0.5.9',
  'mmoworldsimulator.save.v0.5.8',
  'mmoworldsimulator.save.v0.5.7',
  'mmoworldsimulator.save.v0.5.6',
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
  'mmoworldsimulator.save.v0.1.0'
];
const BROKEN_SAVE_KEY = 'mmoworldsimulator.save.broken';

let pendingSave: ServerState | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

const allSaveKeys = () => [SAVE_KEY, ...LEGACY_KEYS];

const parseSave = (key: string) => {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return { key, raw, server: JSON.parse(raw) as ServerState & { savedAt?: number; lastSavedAt?: number } };
  } catch {
    localStorage.setItem(`${BROKEN_SAVE_KEY}.${key}`, raw);
    localStorage.removeItem(key);
    return null;
  }
};

const equipmentValue = (server: any) => {
  const equipment = server?.player?.equipment ?? {};
  return Object.values(equipment).filter(Boolean).length * 1000 +
    Object.values(equipment).reduce((sum: number, entry: any) => sum + Number(entry?.enhancement ?? 0) * 10 + Number(entry?.itemId?.length ?? 0), 0);
};

const saveScore = (server: any) => {
  const player = server?.player ?? {};
  const savedAt = Number(server?.savedAt ?? server?.lastSavedAt ?? 0);
  const level = Number(player.level ?? 0);
  const xp = Number(player.xp ?? 0);
  const gold = Number(player.gold ?? 0);
  const day = Number(server?.serverDay ?? 0);
  const minute = Number(server?.currentMinute ?? 0);
  const inventory = Array.isArray(player.inventory) ? player.inventory.length : 0;
  return [
    level,
    xp,
    day,
    minute,
    equipmentValue(server),
    gold,
    inventory,
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

const normalizeForWrite = (server: ServerState) => ({
  ...server,
  version: SAVE_VERSION,
  savedAt: Date.now(),
});

export const flushSaveGame = () => {
  if (!pendingSave) return;
  const normalized = normalizeForWrite(pendingSave);
  pendingSave = null;
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  localStorage.setItem(SAVE_KEY, JSON.stringify(normalized));
};

export const saveGame = (server: ServerState) => {
  pendingSave = { ...server, version: SAVE_VERSION };
  localStorage.setItem(SAVE_KEY, JSON.stringify(normalizeForWrite(server)));
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
  const candidates = allSaveKeys()
    .map(parseSave)
    .filter((entry): entry is NonNullable<ReturnType<typeof parseSave>> => Boolean(entry));

  if (candidates.length === 0) return null;

  const best = candidates
    .sort((a, b) => compareScore(saveScore(b.server), saveScore(a.server)))[0];

  const normalized = normalizeForWrite(best.server);
  localStorage.setItem(SAVE_KEY, JSON.stringify(normalized));

  return normalized as ServerState;
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
