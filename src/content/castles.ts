import type { Castle, SiegeMap } from '../types/game';

const buildMap = (id: string, variant: 'high-a' | 'high-b' | 'high-c'): SiegeMap => {
  const cells: SiegeMap['cells'] = [];
  for (let y = 0; y < 10; y += 1) {
    for (let x = 0; x < 10; x += 1) {
      let type: SiegeMap['cells'][number]['type'] = 'floor';
      const border = x === 0 || y === 0 || x === 9 || y === 9;

      const crossWall = variant === 'high-a'
        ? ((x === 4 || x === 5) && y >= 2 && y <= 7 && y !== 4 && y !== 5)
        : variant === 'high-b'
          ? ((y === 4 || y === 5) && x >= 2 && x <= 7 && x !== 4 && x !== 5)
          : ((x === 3 && y >= 2 && y <= 7 && y !== 5) || (x === 6 && y >= 2 && y <= 7 && y !== 4));

      const mazeWall = variant === 'high-a'
        ? ((y === 2 && x >= 2 && x <= 3) || (y === 7 && x >= 6 && x <= 7) || (x === 2 && y >= 5 && y <= 6) || (x === 7 && y >= 3 && y <= 4))
        : variant === 'high-b'
          ? ((x === 2 && y >= 2 && y <= 4) || (x === 7 && y >= 5 && y <= 7) || (y === 2 && x >= 5 && x <= 6) || (y === 7 && x >= 3 && x <= 4))
          : ((y === 3 && x >= 4 && x <= 5) || (y === 6 && x >= 4 && x <= 5) || (x === 1 && y === 5) || (x === 8 && y === 4));

      if (border || crossWall || mazeWall) type = 'wall';
      if ((x === 1 && y === 1) || (x === 8 && y === 8) || (x === 1 && y === 8) || (x === 8 && y === 1)) type = 'spawn';
      if ((x === 4 || x === 5) && (y === 4 || y === 5)) type = 'center';
      if ((x === 4 && y === 1) || (x === 5 && y === 8) || (x === 1 && y === 4) || (x === 8 && y === 5)) type = 'gate';
      if ((x === 2 && y === 2) || (x === 7 && y === 7)) type = 'tower';

      cells.push({ x, y, type });
    }
  }
  return { id, width: 10, height: 10, cells };
};

export const SIEGE_MAPS: SiegeMap[] = [
  buildMap('high_castle_maze_01', 'high-a'),
  buildMap('high_castle_maze_02', 'high-b'),
  buildMap('high_castle_maze_03', 'high-c'),
];

export const DEFAULT_CASTLES: Castle[] = [
  {
    id: 'virspire_citadel',
    name: 'Virspire Citadel',
    tier: 'max',
    levelRange: [60, 60],
    nextSiegeDay: 1,
    nextSiegeMinute: 0,
    registeredGuildIds: [],
    mapId: 'high_castle_maze_01',
    history: [],
  },
  {
    id: 'glass_crown_fortress',
    name: 'Glass Crown Fortress',
    tier: 'max',
    levelRange: [60, 60],
    nextSiegeDay: 3,
    nextSiegeMinute: 0,
    registeredGuildIds: [],
    mapId: 'high_castle_maze_02',
    history: [],
  },
  {
    id: 'dragonspire_hold',
    name: 'Dragonspire Hold',
    tier: 'max',
    levelRange: [60, 60],
    nextSiegeDay: 5,
    nextSiegeMinute: 0,
    registeredGuildIds: [],
    mapId: 'high_castle_maze_03',
    history: [],
  },
];

export const CASTLE_SIEGE_WEEKDAYS: Record<string, 0 | 2 | 4> = {
  virspire_citadel: 0,
  glass_crown_fortress: 2,
  dragonspire_hold: 4,
};

export const getSiegeMapById = (id?: string) => SIEGE_MAPS.find((map) => map.id === id) ?? SIEGE_MAPS[0];
