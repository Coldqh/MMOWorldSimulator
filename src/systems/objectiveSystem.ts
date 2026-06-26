export interface ObjectiveProgressLike {
  required: number;
  current?: number;
}

export const getObjectiveProgress = (objective: ObjectiveProgressLike) =>
  objective.current ?? 0;

export const isObjectiveProgressComplete = (objective: ObjectiveProgressLike) =>
  getObjectiveProgress(objective) >= objective.required;

export const advanceObjectiveProgress = <T extends ObjectiveProgressLike>(
  objective: T,
  amount = 1,
): T => ({
  ...objective,
  current: Math.min(objective.required, getObjectiveProgress(objective) + amount),
});

export const haveObjectivesChanged = <T>(
  before: T[],
  after: T[],
) => JSON.stringify(before) !== JSON.stringify(after);
