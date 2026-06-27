import type { Castle, SiegeMap } from '../types/game';

const buildMap = (id: string, variant: 'mid' | 'high'): SiegeMap => {
  const cells: SiegeMap['cells'] = [];
  for (let y = 0; y < 10; y += 1) {
    for (let x = 0; x < 10; x += 1) {
      let type: SiegeMap['cells'][number]['type'] = 'floor';
      const border = x === 0 || y === 0 || x === 9 || y === 9;
      const midWall = variant === 'mid'
        ? ((x === 4 || x === 5) && y >= 2 && y <= 7 && y !== 4 && y !== 5)
        : ((y === 4 || y === 5) && x >= 2 && x <= 7 && x !== 4 && x !== 5);
      const mazeWall = variant === 'mid'
        ? ((y === 2 && x >= 2 && x <= 3) || (y === 7 && x >= 6 && x <= 7) || (x === 2 && y >= 5 && y <= 6) || (x === 7 && y >= 3 && y <= 4))
        : ((x === 2 && y >= 2 && y <= 4) || (x === 7 && y >= 5 && y <= 7) || (y === 2 && x >= 5 && x <= 6) || (y === 7 && x >= 3 && x <= 4));

      if (border || midWall || mazeWall) type = 'wall';
      if ((x === 1 && y === 1) || (x === 8 && y === 8) || (x === 1 && y === 8) || (x === 8 && y === 1)) type = 'spawn';
      if ((x === 4 || x === 5) && (y === 4 || y === 5)) type = 'center';
      if ((x === 4 && y === 1) || (x === 5 && y === 8)) type = 'gate';
      if ((x === 1 && y === 4) || (x === 8 && y === 5)) type = 'tower';

      cells.push({ x, y, type });
    }
  }
  return { id, width: 10, height: 10, cells };
};

export const SIEGE_MAPS: SiegeMap[] = [
  buildMap('mid_castle_maze_01', 'mid'),
  buildMap('high_castle_maze_01', 'high'),
];

export const DEFAULT_CASTLES: Castle[] = [
  {
    id: 'redstone_keep',
    name: 'Redstone Keep',
    tier: 'mid',
    levelRange: [10, 19],
    nextSiegeDay: 3,
    nextSiegeMinute: 20 * 60,
    registeredGuildIds: [],
    mapId: 'mid_castle_maze_01',
    history: [],
  },
  {
    id: 'moonhill_fort',
    name: 'Moonhill Fort',
    tier: 'mid',
    levelRange: [10, 19],
    nextSiegeDay: 4,
    nextSiegeMinute: 20 * 60,
    registeredGuildIds: [],
    mapId: 'mid_castle_maze_01',
    history: [],
  },
  {
    id: 'ashen_gate',
    name: 'Ashen Gate',
    tier: 'mid',
    levelRange: [10, 19],
    nextSiegeDay: 5,
    nextSiegeMinute: 20 * 60,
    registeredGuildIds: [],
    mapId: 'mid_castle_maze_01',
    history: [],
  },
  {
    id: 'virspire_citadel',
    name: 'Virspire Citadel',
    tier: 'high',
    levelRange: [20, 20],
    nextSiegeDay: 6,
    nextSiegeMinute: 21 * 60,
    registeredGuildIds: [],
    mapId: 'high_castle_maze_01',
    history: [],
  },
  {
    id: 'glass_crown_fortress',
    name: 'Glass Crown Fortress',
    tier: 'high',
    levelRange: [20, 20],
    nextSiegeDay: 7,
    nextSiegeMinute: 21 * 60,
    registeredGuildIds: [],
    mapId: 'high_castle_maze_01',
    history: [],
  },
  {
    id: 'dragonspire_hold',
    name: 'Dragonspire Hold',
    tier: 'high',
    levelRange: [20, 20],
    nextSiegeDay: 8,
    nextSiegeMinute: 21 * 60,
    registeredGuildIds: [],
    mapId: 'high_castle_maze_01',
    history: [],
  },
];

export const getSiegeMapById = (id?: string) => SIEGE_MAPS.find((map) => map.id === id) ?? SIEGE_MAPS[0];
