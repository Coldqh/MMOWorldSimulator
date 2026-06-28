export type CombatUiMode = 'normal' | 'compact' | 'ultra';

export const getCombatUiMode = (combat: {
  teamA?: { members?: unknown[] };
  teamB?: { members?: unknown[] };
} | null | undefined): CombatUiMode => {
  const total =
    (combat?.teamA?.members?.length ?? 0) +
    (combat?.teamB?.members?.length ?? 0);

  if (total >= 20) return 'ultra';
  if (total >= 10) return 'compact';
  return 'normal';
};

export const shouldRenderFloatingCombatEvents = (mode: CombatUiMode) => mode === 'normal';
export const shouldRenderManaInTeamCard = (mode: CombatUiMode) => mode === 'normal';
export const getCombatLogLimit = (mode: CombatUiMode) => mode === 'ultra' ? 5 : mode === 'compact' ? 8 : 24;
