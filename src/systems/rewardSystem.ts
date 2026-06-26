import type { Player, ServerState } from '../types/game';
import { addInventoryItem } from './itemSystem';
import { addPlayerXp } from './progressionSystem';

export type RewardSource =
  | 'quest'
  | 'contract'
  | 'dungeon'
  | 'raid'
  | 'combat'
  | 'system';

export interface RewardLike {
  xp: number;
  gold: number;
  items?: Array<{ itemId: string; amount: number }>;
  reputation?: number;
}

export interface ApplyRewardOptions {
  includeItems?: boolean;
  includeReputation?: boolean;
}

export const canApplyReward = (_server: ServerState, _reward: RewardLike) => true;

export const formatRewardLines = (reward: RewardLike) => [
  `XP +${reward.xp}`,
  `Gold +${reward.gold}`,
  ...(reward.reputation ? [`Reputation +${reward.reputation}`] : []),
  ...(reward.items ?? []).map((item) => `${item.itemId} ×${item.amount}`),
];

export const createRewardSummary = (reward: RewardLike) => ({
  xp: reward.xp,
  gold: reward.gold,
  items: reward.items ?? [],
  reputation: reward.reputation ?? 0,
  lines: formatRewardLines(reward),
});

export const applyRewardToPlayer = (
  player: Player,
  reward: RewardLike,
  options: ApplyRewardOptions = {},
): Player => {
  const includeItems = options.includeItems ?? true;
  const includeReputation = options.includeReputation ?? true;

  let next = addPlayerXp(player, reward.xp);
  next = {
    ...next,
    gold: next.gold + reward.gold,
    reputation: includeReputation ? next.reputation + (reward.reputation ?? 0) : next.reputation,
  };

  if (includeItems) {
    (reward.items ?? []).forEach((item) => {
      next = {
        ...next,
        inventory: addInventoryItem(next.inventory, item.itemId, item.amount, 0),
      };
    });
  }

  return next;
};

export const applyReward = (
  server: ServerState,
  reward: RewardLike,
  _source: RewardSource,
  options: ApplyRewardOptions = {},
): ServerState => ({
  ...server,
  player: applyRewardToPlayer(server.player, reward, options),
});
