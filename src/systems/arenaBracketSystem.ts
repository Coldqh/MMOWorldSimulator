import type { Id, NpcPlayer, Player, ServerState } from '../types/game';

export type ArenaBracketId = 'low' | 'mid' | 'high' | 'max';

export interface ArenaBracketDefinition {
  id: ArenaBracketId;
  name: string;
  levelRange: [number, number];
}

export const ARENA_BRACKETS: ArenaBracketDefinition[] = [
  { id: 'low', name: 'Лоу арена', levelRange: [1, 20] },
  { id: 'mid', name: 'Мид арена', levelRange: [21, 40] },
  { id: 'high', name: 'Хай арена', levelRange: [41, 59] },
  { id: 'max', name: 'Макс арена', levelRange: [60, 60] },
];

export const getArenaBracketByLevel = (level: number): ArenaBracketDefinition =>
  ARENA_BRACKETS.find((bracket) => level >= bracket.levelRange[0] && level <= bracket.levelRange[1]) ?? ARENA_BRACKETS[0];

export const getArenaBracketById = (id: ArenaBracketId): ArenaBracketDefinition =>
  ARENA_BRACKETS.find((bracket) => bracket.id === id) ?? ARENA_BRACKETS[0];

export const isLevelInArenaBracket = (level: number, bracketId: ArenaBracketId) => {
  const bracket = getArenaBracketById(bracketId);
  return level >= bracket.levelRange[0] && level <= bracket.levelRange[1];
};

export const arenaRankName = (rating: number) => {
  if (rating >= 2400) return 'Mythic';
  if (rating >= 2100) return 'Diamond';
  if (rating >= 1800) return 'Platinum';
  if (rating >= 1500) return 'Gold';
  if (rating >= 1200) return 'Silver';
  return 'Bronze';
};

export const arenaRankIcon = (rating: number) => {
  if (rating >= 2400) return '🔮';
  if (rating >= 2100) return '💎';
  if (rating >= 1800) return '🟣';
  if (rating >= 1500) return '🥇';
  if (rating >= 1200) return '🥈';
  return '🥉';
};

export const arenaRankOrder = (rating: number) => {
  if (rating >= 2400) return 6;
  if (rating >= 2100) return 5;
  if (rating >= 1800) return 4;
  if (rating >= 1500) return 3;
  if (rating >= 1200) return 2;
  return 1;
};

export const getGuildPvpRankName = (rating: number) => arenaRankName(rating);
export const getGuildPvpRankIcon = (rating: number) => arenaRankIcon(rating);

export const getCharacterArenaRating = (entry: Player | NpcPlayer) => entry.arenaRating ?? 1000;

export const getArenaLadder = (server: ServerState, bracketId: ArenaBracketId) => {
  const playerBracket = isLevelInArenaBracket(server.player.level, bracketId);
  const entries = [
    ...(playerBracket ? [{ id: server.player.id, name: server.player.name, level: server.player.level, rating: server.player.arenaRating, isPlayer: true }] : []),
    ...server.npcs
      .filter((npc) => isLevelInArenaBracket(npc.level, bracketId))
      .map((npc) => ({ id: npc.id, name: npc.name, level: npc.level, rating: npc.arenaRating, npc, isPlayer: false })),
  ];
  return entries.sort((a, b) =>
    b.rating - a.rating ||
    arenaRankOrder(b.rating) - arenaRankOrder(a.rating) ||
    b.level - a.level ||
    a.name.localeCompare(b.name),
  );
};

export const getPlayerArenaRankInBracket = (server: ServerState, bracketId: ArenaBracketId) =>
  getArenaLadder(server, bracketId).findIndex((entry) => entry.id === server.player.id) + 1;

export const getArenaBracketOpponentPool = (server: ServerState, bracketId: ArenaBracketId) =>
  server.npcs
    .filter((npc) => isLevelInArenaBracket(npc.level, bracketId))
    .sort((a, b) => Math.abs(a.arenaRating - server.player.arenaRating) - Math.abs(b.arenaRating - server.player.arenaRating));

export const getArenaBracketIdForPlayer = (server: ServerState): ArenaBracketId => getArenaBracketByLevel(server.player.level).id;

export const getCharacterBracketLabel = (level: number) => {
  const bracket = getArenaBracketByLevel(level);
  return `${bracket.name} · Lv. ${bracket.levelRange[0]}-${bracket.levelRange[1]}`;
};

export const formatArenaRank = (rating: number) => `${arenaRankIcon(rating)} ${arenaRankName(rating)} · ${rating}`;
