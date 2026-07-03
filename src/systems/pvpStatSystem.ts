import type { NpcPlayer, Player, StatBlock } from '../types/game';
import { getGearScore, getPlayerStats } from './itemSystem';

export const playerLikeFromNpc = (npc: NpcPlayer): Player => ({
  id: npc.id,
  name: npc.name,
  raceId: npc.raceId,
  classId: npc.classId,
  level: npc.level,
  xp: npc.xp ?? 0,
  gold: npc.gold ?? 0,
  hp: 1,
  mana: 0,
  inventory: npc.inventory ?? [],
  equipment: npc.equipment ?? {},
  guildId: npc.guildId,
  reputation: npc.reputation ?? 0,
  arenaRating: npc.arenaRating ?? 1000,
});

export const getNpcEffectiveGearScore = (npc: NpcPlayer) => getGearScore(npc.equipment ?? {});

export const getNpcPlayerEquivalentStats = (npc: NpcPlayer): StatBlock => getPlayerStats(playerLikeFromNpc(npc));

export const getNpcPvpDebugLine = (npc: NpcPlayer) => {
  const stats = getNpcPlayerEquivalentStats(npc);
  return npc.name + ': Lv.' + npc.level + ' ' + npc.classId + ' GS ' + getNpcEffectiveGearScore(npc) + ' HP ' + stats.hp + ' ATK ' + stats.attack + ' MAG ' + stats.magic + ' DEF ' + stats.defense;
};
