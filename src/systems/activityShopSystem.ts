import {
  ACTIVITY_SHOP_CATALOG,
  ACTIVITY_SHOP_SET_DEFINITIONS,
  type ActivityShopCatalogEntry,
  type ActivityShopKind,
  type ActivityShopSetDefinition,
} from '../content/activityShopItems';
import { getItemById } from '../content/items';
import { addInventoryItem, getInstanceGearScore, removeInventoryItem } from './itemSystem';
import {
  ACTIVITY_CURRENCY_LABELS,
  addPlayerActivityCurrency,
  getActivityCurrencyAmount,
  spendPlayerActivityCurrency,
} from './activityCurrencySystem';
import type { ActivityCurrencyKey, GameModal, InventoryStack, ItemDefinition, Player, ServerState } from '../types/game';

export type { ActivityShopCatalogEntry, ActivityShopKind };

export type ActivityShopSetView = ActivityShopSetDefinition & {
  entries: ActivityShopCatalogEntry[];
  itemIds: string[];
};

export type ActivityShopSellQuote = {
  item: ItemDefinition;
  currencyKey: ActivityCurrencyKey;
  amount: number;
  reason: string;
};

export const ACTIVITY_SHOP_LABELS: Record<ActivityShopKind, string> = {
  pve: 'PvE магазин',
  pvp: 'PvP магазин',
};

export const getActivityShopEntries = (shop: ActivityShopKind) =>
  ACTIVITY_SHOP_CATALOG.filter((entry) => entry.shop === shop);

export const getActivityShopEntriesForPlayer = (player: Player, shop: ActivityShopKind) =>
  getActivityShopEntries(shop).filter((entry) => {
    const item = getItemById(entry.itemId);
    if (!item) return false;
    return item.classTags.length === 0 || item.classTags.includes(player.classId);
  });

export const getActivityShopSetsForPlayer = (player: Player, shop: ActivityShopKind): ActivityShopSetView[] =>
  ACTIVITY_SHOP_SET_DEFINITIONS
    .filter((set) => set.shop === shop)
    .map((set) => {
      const entries = getActivityShopEntriesForPlayer(player, shop).filter((entry) => entry.setId.startsWith(`${set.id}_`));
      return { ...set, entries, itemIds: entries.map((entry) => entry.itemId) };
    })
    .filter((set) => set.entries.length > 0);

const systemModal = (title: string, text: string, lines: string[] = []): GameModal => ({
  id: `modal_activity_shop_${Date.now()}`,
  type: 'item',
  title,
  text,
  lines,
});

const sameCards = (a: string[] = [], b: string[] = []) => [...a].sort().join('|') === [...b].sort().join('|');

const findInventoryStack = (inventory: InventoryStack[], itemId: string, enhancement = 0, cardIds: string[] = []) =>
  inventory.find((entry) => entry.itemId === itemId && (entry.enhancement ?? 0) === enhancement && sameCards(entry.cardIds ?? [], cardIds));

const catalogEntryByItemId = (itemId: string) => ACTIVITY_SHOP_CATALOG.find((entry) => entry.itemId === itemId);

const raritySellMultiplier: Record<string, number> = {
  common: 0.16,
  uncommon: 0.18,
  rare: 0.22,
  epic: 0.28,
  legendary: 0.34,
  mythic: 0.42,
  unique: 0.50,
};

const baseSetSellAmount = (item: ItemDefinition) => {
  const gs = getInstanceGearScore(item, 0);
  const rarity = raritySellMultiplier[item.rarity] ?? 0.22;
  return Math.max(1, Math.round((item.levelReq + gs / 22) * rarity));
};

const pveCurrencyForItem = (item: ItemDefinition): ActivityCurrencyKey | undefined => {
  if (!item.slot || !item.setId) return undefined;
  const shopEntry = catalogEntryByItemId(item.id);
  if (shopEntry?.shop === 'pve') return shopEntry.currencyKey;
  if (item.sourceType === 'raid') return 'raidSeals';
  if (item.sourceType === 'dungeon') return 'dungeonMarks';
  return undefined;
};

const pvpCurrencyForItem = (item: ItemDefinition): ActivityCurrencyKey | undefined => {
  if (!item.slot || !item.setId) return undefined;
  const shopEntry = catalogEntryByItemId(item.id);
  if (shopEntry?.shop === 'pvp') return shopEntry.currencyKey;
  return undefined;
};

export const getActivityShopSellQuote = (shop: ActivityShopKind, stack: InventoryStack): ActivityShopSellQuote | undefined => {
  const item = getItemById(stack.itemId);
  if (!item) return undefined;
  const currencyKey = shop === 'pve' ? pveCurrencyForItem(item) : pvpCurrencyForItem(item);
  if (!currencyKey) return undefined;
  const catalogEntry = catalogEntryByItemId(item.id);
  const amount = catalogEntry
    ? Math.max(1, Math.floor(catalogEntry.price * 0.35))
    : baseSetSellAmount(item);
  const reason = catalogEntry
    ? 'предмет из этого магазина'
    : item.sourceType === 'raid'
      ? 'рейдовый сет'
      : item.sourceType === 'dungeon'
        ? 'данжевый сет'
        : 'сетовый предмет';
  return { item, currencyKey, amount, reason };
};

export const buyActivityShopItem = (server: ServerState, entryId: string): { server: ServerState; modal: GameModal } => {
  const entry = ACTIVITY_SHOP_CATALOG.find((candidate) => candidate.id === entryId);
  if (!entry) return { server, modal: systemModal('Магазин', 'Товар не найден.') };

  const item = getItemById(entry.itemId);
  if (!item) return { server, modal: systemModal('Магазин', 'Предмет отсутствует в каталоге.') };

  const classAllowed = item.classTags.length === 0 || item.classTags.includes(server.player.classId);
  if (!classAllowed) {
    return {
      server,
      modal: systemModal('Магазин', 'Неверный класс.', [`Предмет: ${item.name}.`]),
    };
  }

  if (server.player.level < item.levelReq) {
    return {
      server,
      modal: systemModal('Магазин', 'Недостаточный уровень.', [`Нужно: Lv. ${item.levelReq}.`, `Сейчас: Lv. ${server.player.level}.`]),
    };
  }

  const balance = getActivityCurrencyAmount(server.player, entry.currencyKey);
  if (balance < entry.price) {
    return {
      server,
      modal: systemModal(
        ACTIVITY_SHOP_LABELS[entry.shop],
        'Не хватает валюты.',
        [`Цена: ${entry.price} ${ACTIVITY_CURRENCY_LABELS[entry.currencyKey]}.`, `Есть: ${balance}.`],
      ),
    };
  }

  const nextPlayer = spendPlayerActivityCurrency(
    {
      ...server.player,
      inventory: addInventoryItem(server.player.inventory, item.id, 1, 0),
    },
    entry.currencyKey,
    entry.price,
  );

  const left = getActivityCurrencyAmount(nextPlayer, entry.currencyKey);
  const lines = [
    `Куплено: ${item.name}.`,
    `Цена: ${entry.price} ${ACTIVITY_CURRENCY_LABELS[entry.currencyKey]}.`,
    `Осталось: ${left}.`,
    'Предмет добавлен в инвентарь. BoP.',
  ];

  return {
    server: { ...server, player: nextPlayer },
    modal: {
      id: `modal_activity_shop_buy_${item.id}_${Date.now()}`,
      type: 'item',
      title: ACTIVITY_SHOP_LABELS[entry.shop],
      text: item.name,
      rarity: item.rarity,
      itemId: item.id,
      lines,
    },
  };
};

export const sellActivityShopItem = (
  server: ServerState,
  shop: ActivityShopKind,
  itemId: string,
  enhancement = 0,
  cardIds: string[] = [],
): { server: ServerState; modal: GameModal } => {
  const stack = findInventoryStack(server.player.inventory, itemId, enhancement, cardIds);
  if (!stack) return { server, modal: systemModal(ACTIVITY_SHOP_LABELS[shop], 'Предмет не найден в инвентаре.') };
  const quote = getActivityShopSellQuote(shop, stack);
  if (!quote) return { server, modal: systemModal(ACTIVITY_SHOP_LABELS[shop], 'Этот предмет сюда не принимают.') };

  const inventory = removeInventoryItem(server.player.inventory, itemId, 1, enhancement, cardIds);
  const player = addPlayerActivityCurrency({ ...server.player, inventory }, quote.currencyKey, quote.amount);
  const balance = getActivityCurrencyAmount(player, quote.currencyKey);

  return {
    server: { ...server, player },
    modal: {
      id: `modal_activity_shop_sell_${itemId}_${Date.now()}`,
      type: 'item',
      title: `${ACTIVITY_SHOP_LABELS[shop]} · продажа`,
      text: quote.item.name,
      rarity: quote.item.rarity,
      itemId: quote.item.id,
      lines: [
        `Продано: ${quote.item.name}${enhancement > 0 ? ` +${enhancement}` : ''}.`,
        `Причина приёма: ${quote.reason}.`,
        `Получено: ${quote.amount} ${ACTIVITY_CURRENCY_LABELS[quote.currencyKey]}.`,
        `Баланс: ${balance}.`,
      ],
    },
  };
};
