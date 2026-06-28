export type CombatUiMode = 'normal' | 'compact' | 'ultra';

export const getCombatUiMode = (combat: {
  teamA?: { members?: unknown[] };
  teamB?: { members?: unknown[] };
} | null | undefined): CombatUiMode => {
  const totalCombatants =
    (combat?.teamA?.members?.length ?? 0) +
    (combat?.teamB?.members?.length ?? 0);

  if (totalCombatants >= 20) return 'ultra';
  if (totalCombatants >= 10) return 'compact';
  return 'normal';
};

export const shouldRenderFloatingCombatEvents = (mode: CombatUiMode) => mode === 'normal';
