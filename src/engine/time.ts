import type { ServerState } from '../types/game';

export const MINUTES_IN_DAY = 24 * 60;

export const formatTime = (minute: number) => {
  const normalized = ((minute % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;
  const hours = Math.floor(normalized / 60).toString().padStart(2, '0');
  const minutes = (normalized % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const advanceServerClock = (server: ServerState, minutes: number): ServerState => {
  const total = server.currentMinute + minutes;
  const extraDays = Math.floor(total / MINUTES_IN_DAY);
  return {
    ...server,
    serverDay: server.serverDay + extraDays,
    currentMinute: total % MINUTES_IN_DAY
  };
};
