import type { NewsEntry, NewsType, ServerState } from '../types/game';
import type { Rng } from './rng';
import { uid } from './rng';

export const addNews = (
  server: ServerState,
  rng: Rng,
  type: NewsType,
  text: string,
  important = false
): ServerState => {
  const entry: NewsEntry = {
    id: uid('news', rng),
    day: server.serverDay,
    minute: server.currentMinute,
    type,
    text,
    important
  };

  return {
    ...server,
    worldNews: [entry, ...server.worldNews].slice(0, 120)
  };
};
