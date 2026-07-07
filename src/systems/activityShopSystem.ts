import { ACTIVITY_SHOP_CATALOG, type ActivityShopCatalogEntry, type ActivityShopKind } from '../content/activityShopItems';
import { getItemById } from '../content/items';
import { addInventoryItem } from './itemSystem';
import { ACTIVITY_CURRENCY_LABELS, getActivityCurrencyAmount, spendPlayerActivityCurrency } from './activityCurrencySystem';
import type { GameModal, Player, ServerState } from '../types/game';

export type { ActivityShopCatalogEntry, ActivityShopKind };

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

const systemModal = (title: string, text: string, lines: string[] = []): GameModal => ({
  id: `modal_activity_shop_${Date.now()}`,
  type: 'item',
  title,
  text,
  lines,
});

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
