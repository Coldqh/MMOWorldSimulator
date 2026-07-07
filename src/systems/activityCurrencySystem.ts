import type { ActivityCurrencyKey, Player } from '../types/game';

export const ACTIVITY_CURRENCY_LABELS: Record<ActivityCurrencyKey, string> = {
  dungeonMarks: 'Dungeon Marks',
  raidSeals: 'Raid Seals',
  arenaHonor: 'Arena Honor',
  warCrests: 'War Crests',
};

export const ACTIVITY_CURRENCY_ORDER: ActivityCurrencyKey[] = ['dungeonMarks', 'raidSeals', 'arenaHonor', 'warCrests'];

const safeAmount = (value: unknown) => (typeof value === 'number' && Number.isFinite(value))
  ? Math.max(0, Math.floor(value))
  : 0;

export const getActivityCurrencyAmount = (player: Player, key: ActivityCurrencyKey) => safeAmount(player[key]);

export const normalizePlayerActivityCurrencies = (player: Player): Player => ({
  ...player,
  dungeonMarks: getActivityCurrencyAmount(player, 'dungeonMarks'),
  raidSeals: getActivityCurrencyAmount(player, 'raidSeals'),
  arenaHonor: getActivityCurrencyAmount(player, 'arenaHonor'),
  warCrests: getActivityCurrencyAmount(player, 'warCrests'),
});

export const addPlayerActivityCurrency = (player: Player, key: ActivityCurrencyKey, amount: number): Player => ({
  ...player,
  [key]: getActivityCurrencyAmount(player, key) + Math.max(0, Math.floor(amount)),
});

export const addPlayerActivityCurrencies = (player: Player, rewards: Partial<Record<ActivityCurrencyKey, number>>): Player =>
  ACTIVITY_CURRENCY_ORDER.reduce((next, key) => {
    const amount = rewards[key] ?? 0;
    return amount > 0 ? addPlayerActivityCurrency(next, key, amount) : next;
  }, player);

export const spendPlayerActivityCurrency = (player: Player, key: ActivityCurrencyKey, amount: number): Player => ({
  ...player,
  [key]: Math.max(0, getActivityCurrencyAmount(player, key) - Math.max(0, Math.floor(amount))),
});

export const currencyRewardLine = (key: ActivityCurrencyKey, amount: number) =>
  `${ACTIVITY_CURRENCY_LABELS[key]}: +${Math.max(0, Math.floor(amount))}.`;
