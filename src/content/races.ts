import type { RaceDefinition } from '../types/game';

export const RACES: RaceDefinition[] = [
  {
    id: 'human',
    name: 'Человек',
    description: 'Баланс статов.',
    statBonus: { hp: 8, mana: 5, attack: 1, magic: 1, defense: 1, speed: 1 },
    tags: ['balanced', 'starter']
  },
  {
    id: 'elf',
    name: 'Эльф',
    description: 'Мана, магия, скорость.',
    statBonus: { hp: -4, mana: 18, attack: 0, magic: 3, defense: 0, speed: 2 },
    tags: ['mana', 'speed']
  },
  {
    id: 'dwarf',
    name: 'Дворф',
    description: 'HP и защита.',
    statBonus: { hp: 22, mana: -5, attack: 1, magic: 0, defense: 3, speed: -1 },
    tags: ['durable', 'frontline']
  },
  {
    id: 'beastkin',
    name: 'Зверолюд',
    description: 'Атака и скорость.',
    statBonus: { hp: 5, mana: 0, attack: 2, magic: 0, defense: 0, speed: 3 },
    tags: ['farm', 'pvp']
  }
];

export const getRaceById = (id: string) => RACES.find((entry) => entry.id === id);
