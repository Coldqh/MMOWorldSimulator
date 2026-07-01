import { getItemById } from '../content/items';
import { addNews } from '../engine/news';
import type { Rng } from '../engine/rng';
import type { EquipmentSlot, GameModal, Rarity, ServerState } from '../types/game';
import { addInventoryItem, removeInventoryItem } from './itemSystem';

export type EnhanceTarget =
  | { source: 'equipment'; slot: EquipmentSlot }
  | { source: 'inventory'; itemId: string; enhancement?: number };

export const enhanceStoneIds: Array<{ id: string; rarity: Rarity; chanceBonus: number; tier: 'low' | 'mid' | 'high' | 'max'; minLevel: number; maxLevel: number }> = [
  { id: 'sharpening_stone', rarity: 'common', chanceBonus: 0, tier: 'low', minLevel: 1, maxLevel: 20 },
  { id: 'enhance_stone_uncommon', rarity: 'uncommon', chanceBonus: 0, tier: 'mid', minLevel: 21, maxLevel: 40 },
  { id: 'enhance_stone_rare', rarity: 'rare', chanceBonus: 0, tier: 'high', minLevel: 41, maxLevel: 59 },
  { id: 'enhance_stone_legendary', rarity: 'legendary', chanceBonus: 0, tier: 'max', minLevel: 60, maxLevel: 60 },
];

const getEnhanceChance = (level: number, bonus = 0) => {
  if (level <= 2) return { success: 1, breakChance: 0, rollbackChance: 0 };
  if (level <= 5) return { success: Math.min(0.95, 0.72 + bonus), breakChance: 0, rollbackChance: 0 };
  if (level <= 8) return { success: Math.min(0.82, 0.45 + bonus), breakChance: Math.max(0, 0.03 - bonus * 0.12), rollbackChance: Math.max(0.05, 0.2 - bonus * 0.35) };
  return { success: Math.min(0.58, 0.22 + bonus), breakChance: Math.max(0.015, 0.08 - bonus * 0.18), rollbackChance: Math.max(0.08, 0.28 - bonus * 0.35) };
};

const findUsableStone = (server: ServerState, itemLevel: number) => {
  return enhanceStoneIds
    .map((stone) => {
      const amount = server.player.inventory.find((entry) => entry.itemId === stone.id && (entry.enhancement ?? 0) === 0)?.amount ?? 0;
      return { ...stone, amount, bonus: stone.chanceBonus };
    })
    .filter((stone) => stone.amount > 0 && itemLevel >= stone.minLevel && itemLevel <= stone.maxLevel)
    .sort((a, b) => a.minLevel - b.minLevel)[0];
};

export const canEnhanceWithAnyStone = (server: ServerState, itemLevel: number) => Boolean(findUsableStone(server, itemLevel));

export const enhanceItem = (server: ServerState, target: EnhanceTarget, rng: Rng): { server: ServerState; modal: GameModal } => {
  if (server.location.mode !== 'city') {
    return { server, modal: { id: `modal_enhance_city_${server.currentMinute}`, type: 'enhance', title: 'Заточка', text: 'Нужен город.', lines: ['Заточка доступна только в городе.'] } };
  }

  const player = server.player;
  const targetInstance = target.source === 'equipment' ? player.equipment[target.slot] : undefined;
  const targetItemId = target.source === 'equipment' ? targetInstance?.itemId : target.itemId;
  const currentEnhancement = target.source === 'equipment' ? targetInstance?.enhancement ?? 0 : target.enhancement ?? 0;
  const item = targetItemId ? getItemById(targetItemId) : undefined;

  if (!item || !item.slot) {
    return { server, modal: { id: `modal_enhance_bad_${server.currentMinute}`, type: 'enhance', title: 'Заточка', text: 'Нельзя заточить.', lines: ['Только снаряжение.'] } };
  }

  const stone = findUsableStone(server, item.levelReq);
  if (!stone) {
    return { server, modal: { id: `modal_enhance_stone_${server.currentMinute}`, type: 'enhance', title: 'Заточка', text: 'Нет подходящего камня.', lines: [`Для Lv. ${item.levelReq} нужен камень своего диапазона: low 1–20, mid 21–40, high 41–59, max 60.`] } };
  }

  if (target.source === 'inventory') {
    const stack = player.inventory.find((entry) => entry.itemId === item.id && (entry.enhancement ?? 0) === currentEnhancement);
    if (!stack || stack.amount <= 0) return { server, modal: { id: `modal_enhance_missing_${server.currentMinute}`, type: 'enhance', title: 'Заточка', text: 'Предмет не найден.', lines: [] } };
  }

  let nextPlayer = { ...player, inventory: removeInventoryItem(player.inventory, stone.id, 1, 0) };
  const chance = getEnhanceChance(currentEnhancement, stone.bonus);
  const lines = [`${item.name} +${currentEnhancement}.`, `${getItemById(stone.id)?.name ?? stone.id}: -1.`, `Шанс: ${Math.round(chance.success * 100)}%.`];
  let nextServer: ServerState = { ...server, player: nextPlayer };

  if (rng.chance(chance.breakChance)) {
    if (target.source === 'equipment') nextPlayer = { ...nextPlayer, equipment: { ...nextPlayer.equipment, [target.slot]: undefined } };
    else nextPlayer = { ...nextPlayer, inventory: removeInventoryItem(nextPlayer.inventory, item.id, 1, currentEnhancement) };
    nextServer = { ...nextServer, player: nextPlayer };
    nextServer = addNews(nextServer, rng, 'enhance', `${server.player.name} сломал ${item.name} +${currentEnhancement}.`, true);
    return { server: nextServer, modal: { id: `modal_enhance_break_${rng.int(1, 999999)}`, type: 'enhance', title: 'Предмет сломан', text: item.name, lines: [...lines, 'Предмет уничтожен.'] } };
  }

  if (rng.chance(chance.success)) {
    const nextEnhancement = currentEnhancement + 1;
    if (target.source === 'equipment') nextPlayer = { ...nextPlayer, equipment: { ...nextPlayer.equipment, [target.slot]: { ...targetInstance!, enhancement: nextEnhancement } } };
    else {
      let inventory = removeInventoryItem(nextPlayer.inventory, item.id, 1, currentEnhancement);
      inventory = addInventoryItem(inventory, item.id, 1, nextEnhancement);
      nextPlayer = { ...nextPlayer, inventory };
    }
    nextServer = { ...nextServer, player: nextPlayer };
    if (nextEnhancement >= 6) nextServer = addNews(nextServer, rng, 'enhance', `${server.player.name} усилил ${item.name} до +${nextEnhancement}.`, true);
    return { server: nextServer, modal: { id: `modal_enhance_success_${rng.int(1, 999999)}`, type: 'enhance', title: 'Успех', text: item.name, lines: [...lines, `Новый уровень: +${nextEnhancement}.`] } };
  }

  let finalEnhancement = currentEnhancement;
  if (currentEnhancement >= 7 && rng.chance(chance.rollbackChance)) finalEnhancement = Math.max(0, currentEnhancement - 1);

  if (finalEnhancement !== currentEnhancement) {
    if (target.source === 'equipment') nextPlayer = { ...nextPlayer, equipment: { ...nextPlayer.equipment, [target.slot]: { ...targetInstance!, enhancement: finalEnhancement } } };
    else {
      let inventory = removeInventoryItem(nextPlayer.inventory, item.id, 1, currentEnhancement);
      inventory = addInventoryItem(inventory, item.id, 1, finalEnhancement);
      nextPlayer = { ...nextPlayer, inventory };
    }
    nextServer = { ...nextServer, player: nextPlayer };
  }

  return { server: nextServer, modal: { id: `modal_enhance_fail_${rng.int(1, 999999)}`, type: 'enhance', title: 'Провал', text: item.name, lines: [...lines, finalEnhancement !== currentEnhancement ? `Откат до +${finalEnhancement}.` : 'Уровень не изменился.'] } };
};
