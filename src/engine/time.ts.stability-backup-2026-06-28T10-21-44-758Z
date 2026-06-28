import type { ServerState } from '../types/game';

export const MINUTES_IN_DAY = 24 * 60;

export const formatTime = (minute: number) => {
  const normalized = ((minute % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;
  const hours = Math.floor(normalized / 60).toString().padStart(2, '0');
  const minutes = (normalized % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const totalGameMinutes = (server: Pick<ServerState, 'serverDay' | 'currentMinute'>) =>
  (Math.max(1, server.serverDay) - 1) * MINUTES_IN_DAY + Math.max(0, server.currentMinute);

export const compareServerTime = (
  a: Pick<ServerState, 'serverDay' | 'currentMinute'>,
  b: Pick<ServerState, 'serverDay' | 'currentMinute'>,
) => totalGameMinutes(a) - totalGameMinutes(b);

export const advanceServerClock = (server: ServerState, minutes: number): ServerState => {
  const safeMinutes = Math.max(0, Math.round(Number.isFinite(minutes) ? minutes : 0));
  const total = server.currentMinute + safeMinutes;
  const extraDays = Math.floor(total / MINUTES_IN_DAY);
  return {
    ...server,
    serverDay: server.serverDay + extraDays,
    currentMinute: ((total % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY,
    serverWeek: Math.max(1, Math.ceil((server.serverDay + extraDays) / 7)),
  };
};

export const withMonotonicTime = <T extends ServerState>(
  before: ServerState,
  after: T,
  minutes: number,
  label = 'time',
): T => {
  const safeMinutes = Math.max(0, Math.round(Number.isFinite(minutes) ? minutes : 0));
  const expected = advanceServerClock(before, safeMinutes);
  if (totalGameMinutes(after) >= totalGameMinutes(expected)) return after;

  if (typeof console !== 'undefined') {
    console.warn(`[MMOWS] ${label} rolled time back; restoring expected clock`, {
      before: { day: before.serverDay, minute: before.currentMinute },
      after: { day: after.serverDay, minute: after.currentMinute },
      expected: { day: expected.serverDay, minute: expected.currentMinute },
    });
  }

  return {
    ...after,
    serverDay: expected.serverDay,
    currentMinute: expected.currentMinute,
    serverWeek: expected.serverWeek,
  };
};
