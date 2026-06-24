export interface Rng {
  seed: number;
  next: () => number;
  int: (min: number, max: number) => number;
  pick: <T>(items: T[]) => T;
  chance: (value: number) => boolean;
}

export const createRng = (seed: number): Rng => {
  let state = seed >>> 0;

  const next = () => {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    seed,
    next,
    int: (min, max) => Math.floor(next() * (max - min + 1)) + min,
    pick: (items) => items[Math.floor(next() * items.length)],
    chance: (value) => next() < value
  };
};

export const uid = (prefix: string, rng: Rng) => `${prefix}_${Math.floor(rng.next() * 1_000_000_000).toString(36)}`;
