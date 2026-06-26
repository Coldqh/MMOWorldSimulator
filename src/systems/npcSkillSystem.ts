import type { NpcPlayer } from '../types/game';
import type { Rng } from '../engine/rng';

export const clampNpcSkill = (skill: number) => Math.max(1, Math.min(10, Math.round(Number.isFinite(skill) ? skill : 5)));

export const getNpcSkillModifier = (skill: number): number => {
  const clamped = clampNpcSkill(skill);
  return 0.6 + ((clamped - 1) / 9) * 0.8;
};

export const inferNpcSkill = (npc: Partial<NpcPlayer>, rng: Rng): number => {
  const focus = npc.roleFocus;
  let min = 2;
  let max = 5;
  if (focus === 'PVP_PLAYER') { min = 5; max = 8; }
  if (focus === 'HARDCORE' || focus === 'RAIDER') { min = 6; max = 9; }
  if (focus === 'LEADER') { min = 7; max = 10; }
  if ((npc.level ?? 1) >= 20) min = Math.max(min, 5);
  const rare = rng.next();
  if (rare < 0.02) return 1;
  if (rare > 0.985) return 10;
  return clampNpcSkill(rng.int(min, max));
};

export const increaseNpcSkill = (
  npc: NpcPlayer,
  reason: 'pvp_win' | 'pvp_loss' | 'simulated' | 'player_attack' | 'npc_attack_player',
  rng: Rng,
): NpcPlayer => {
  const current = clampNpcSkill(npc.skill ?? inferNpcSkill(npc, rng));
  if (current >= 10) return { ...npc, skill: 10 };
  const focusBonus = npc.playstyle === 'pvp' || npc.roleFocus === 'PVP_PLAYER' || npc.roleFocus === 'HARDCORE' ? 0.04 : 0;
  const chance = reason === 'pvp_win' || reason === 'simulated' ? 0.09 + focusBonus : reason === 'pvp_loss' ? 0.03 + focusBonus / 2 : 0.05 + focusBonus;
  return rng.chance(chance) ? { ...npc, skill: clampNpcSkill(current + 1) } : { ...npc, skill: current };
};
