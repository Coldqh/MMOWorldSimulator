import type { NpcPlayer, Player, StatBlock } from '../types/game';
import { getGearScore, getPlayerStats } from './itemSystem';

const playerLikeFromNpc = (npc: NpcPlayer): Player => ({
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

export const getNpcEffectiveGearScore = (npc: NpcPlayer) => {
  const actualGear = getGearScore(npc.equipment ?? {});
  return Math.max(actualGear, npc.gearScore ?? 0);
};

export const getNpcPlayerEquivalentStats = (npc: NpcPlayer): StatBlock => {
  const stats = getPlayerStats(playerLikeFromNpc(npc));
  const actualGear = getGearScore(npc.equipment ?? {});
  const displayedGear = npc.gearScore ?? actualGear;

  if (displayedGear <= actualGear + 25 || actualGear <= 0) return stats;

  const missingGear = Math.max(0, displayedGear - actualGear);
  const classId = npc.classId;
  return {
    hp: Math.round(stats.hp + missingGear * (classId === 'warrior' ? 0.18 : classId === 'priest' ? 0.11 : 0.13)),
    mana: Math.round(stats.mana + missingGear * (classId === 'mage' || classId === 'priest' ? 0.055 : 0.018)),
    attack: Math.round(stats.attack + missingGear * (classId === 'ranger' || classId === 'warrior' ? 0.018 : 0.009)),
    magic: Math.round(stats.magic + missingGear * (classId === 'mage' || classId === 'priest' ? 0.018 : 0.006)),
    defense: Math.round(stats.defense + missingGear * (classId === 'warrior' ? 0.016 : 0.011)),
    speed: Math.round(stats.speed + missingGear * 0.002),
  };
};

export const getNpcPvpDebugLine = (npc: NpcPlayer) => {
  const stats = getNpcPlayerEquivalentStats(npc);
  return `${npc.name}: Lv.${npc.level} ${npc.classId} GS ${getNpcEffectiveGearScore(npc)} HP ${stats.hp} ATK ${stats.attack} MAG ${stats.magic} DEF ${stats.defense}`;
};
