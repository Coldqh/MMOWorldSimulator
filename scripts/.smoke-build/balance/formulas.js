import { CARD_PRICE, DUNGEON_DIFFICULTY, ENHANCEMENT_VALUE, GEAR_SCORE, GOLD_REWARD, ITEM_PRICE, ITEM_TYPE_POWER, MAX_LEVEL, MOB_TAG_POWER, RARITY_POWER, RARITY_SCORE, ROLE_ARENA_MULTIPLIER, ROLE_WEALTH_MULTIPLIER, SLOT_POWER, XP_CURVE } from './balanceConfig.js';
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const statScore = (stats = {}) => Object.values(stats).reduce((sum, value) => sum + Math.abs(Number(value) || 0), 0);
export const positiveStatScore = (stats = {}) => Object.values(stats).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
export const getRarityPower = (rarity) => RARITY_POWER[rarity] ?? 1;
export const getLevelPower = (level) => Math.pow(clamp(level, 1, MAX_LEVEL), 1.32);
export const getSlotPower = (slot) => slot ? (SLOT_POWER[slot] ?? 1) : 1;
export const getItemTypePower = (type) => ITEM_TYPE_POWER[type] ?? 1;
export const calculateItemStatBudget = (input) => {
    const level = getLevelPower(input.level);
    const rarity = getRarityPower(input.rarity);
    const type = getItemTypePower(input.type);
    const slot = getSlotPower(input.slot);
    return Math.round((level * rarity * type * slot) / 3.1);
};
export const calculateEnhancementValue = (enhancement = 0, item) => {
    const safe = Math.max(0, enhancement || 0);
    if (safe <= 0)
        return 0;
    const rarity = item ? Math.max(1, RARITY_SCORE[item.rarity] ?? 1) : 1;
    const high = Math.max(0, safe - ENHANCEMENT_VALUE.highStart);
    return Math.round(safe * ENHANCEMENT_VALUE.linear * (1 + rarity * 0.04) + high * high * ENHANCEMENT_VALUE.highBonus);
};
export const calculateSocketValue = (_item, socketSlots = 0) => Math.round(Math.max(0, socketSlots) * GEAR_SCORE.socket * (1 + ((RARITY_SCORE[_item.rarity] ?? 1) - 1) * 0.12));
export const calculateItemPrice = (item) => {
    if (!item.tradeable || item.type === 'quest')
        return 0;
    if (item.type === 'card')
        return calculateCardPrice(item);
    const statValue = positiveStatScore(item.stats);
    const rarity = getRarityPower(item.rarity);
    const type = getItemTypePower(item.type);
    const slot = getSlotPower(item.slot);
    const source = item.sourceType === 'raid' ? ITEM_PRICE.raid : item.sourceType === 'dungeon' ? ITEM_PRICE.dungeon : 1;
    const set = item.setId ? ITEM_PRICE.set : 1;
    const base = ITEM_PRICE.base + item.levelReq * item.levelReq * ITEM_PRICE.levelSquare + statValue * ITEM_PRICE.statPower + (item.socketSlots ?? 0) * ITEM_PRICE.socket;
    const value = Math.round(base * rarity * type * slot * source * set);
    if (item.rarity === 'legendary')
        return Math.max(ITEM_PRICE.legendaryFloor, value);
    if (item.type === 'consumable')
        return Math.max(4, Math.round(value * 0.4));
    if (item.type === 'material')
        return Math.max(8, Math.round(value * 0.55));
    return Math.max(1, value);
};
const cardGearValue = (card) => {
    if (card.id === CARD_PRICE.firstWyrmId)
        return CARD_PRICE.firstWyrmGearScore;
    return Math.max(1, Math.round(statScore(card.stats) * 1.35 +
        (RARITY_SCORE[card.rarity] ?? 1) * 18 +
        Math.max(1, card.levelReq) * 5.4));
};
export const calculateCardPrice = (card, linkedMob) => {
    if (card.id === CARD_PRICE.firstWyrmId)
        return CARD_PRICE.firstWyrmPrice;
    const gs = cardGearValue(card);
    const mobMultiplier = linkedMob?.tags.includes('raid') && linkedMob.tags.includes('boss')
        ? CARD_PRICE.raidMultiplier
        : linkedMob?.tags.includes('boss') || linkedMob?.tags.includes('mini-boss')
            ? CARD_PRICE.bossMultiplier
            : 1;
    return Math.max(128, Math.round(gs * CARD_PRICE.perGearScore * mobMultiplier));
};
export const calculateGearScore = (item, enhancement = 0, cardIds = []) => {
    const cardPower = cardIds.reduce((sum, card) => {
        if (typeof card === 'string')
            return sum + GEAR_SCORE.cardStringFallback;
        return sum + cardGearValue(card) * 0.42;
    }, 0);
    const base = statScore(item.stats) * GEAR_SCORE.stat +
        item.levelReq * GEAR_SCORE.level +
        (RARITY_SCORE[item.rarity] ?? 1) * GEAR_SCORE.rarity +
        getSlotPower(item.slot) * 7 +
        (item.socketSlots ?? 0) * GEAR_SCORE.socket;
    return Math.max(1, Math.round(base + calculateEnhancementValue(enhancement, item) + cardPower));
};
export const calculateXpForNextLevel = (level) => {
    const safe = clamp(level, 1, MAX_LEVEL);
    const band = safe <= 5 ? XP_CURVE.early : safe <= 10 ? XP_CURVE.mid : safe <= 15 ? XP_CURVE.high : XP_CURVE.late;
    return Math.round(XP_CURVE.base + band * Math.pow(safe, XP_CURVE.exponent));
};
const tagMultiplier = (tags = []) => tags.reduce((value, tag) => value * (MOB_TAG_POWER[tag] ?? 1), 1);
export const calculateMobStatBudget = (input) => Math.round((input.level * input.level * 8 + input.level * 32) * tagMultiplier(input.tags));
export const calculateMobDifficultyScore = (mob) => {
    const stats = mob.stats;
    const raw = stats.hp * 0.08 + Math.max(stats.attack, stats.magic) * 5 + stats.defense * 4 + stats.speed * 2 + stats.mana * 0.015;
    return Math.round(raw * tagMultiplier(mob.tags));
};
export const calculateXpRewardForMob = (mob, playerLevel) => {
    const diff = clamp(mob.level - playerLevel, -10, 10);
    const levelFactor = diff < 0 ? Math.max(0.08, 1 + diff * 0.16) : Math.min(1.95, 1 + diff * 0.11);
    const difficulty = calculateMobDifficultyScore(mob);
    const base = 5 + mob.level * 4 + difficulty * 0.026;
    return Math.max(1, Math.round(base * levelFactor));
};
export const calculateGoldRewardForMob = (mob) => {
    const difficulty = calculateMobDifficultyScore(mob);
    const base = GOLD_REWARD.base + mob.level * mob.level * GOLD_REWARD.levelSquare + difficulty * GOLD_REWARD.statScale;
    const value = Math.max(1, Math.round(base * (mob.tags.includes('raid') ? 1.8 : mob.tags.includes('boss') ? 1.45 : mob.tags.includes('elite') ? 1.2 : 1)));
    return [Math.max(1, Math.round(value * 0.72)), Math.max(2, Math.round(value * 1.34))];
};
export const calculateDungeonDifficultyScore = (dungeon) => {
    const level = (dungeon.levelRange[0] + dungeon.levelRange[1]) / 2;
    const content = dungeon.contentType === 'raid' ? DUNGEON_DIFFICULTY.raid : DUNGEON_DIFFICULTY.dungeon;
    return Math.round(level * level * content + dungeon.floors.length * 100 * DUNGEON_DIFFICULTY.floor);
};
export const calculateNpcWealth = (level, gearScore, roleFocus) => {
    const role = ROLE_WEALTH_MULTIPLIER[roleFocus ?? 'CASUAL'] ?? 1;
    return Math.round((90 + level * level * 68 + gearScore * 9.2) * role);
};
export const calculateNpcArenaRating = (level, gearScore, roleFocus) => {
    const role = ROLE_ARENA_MULTIPLIER[roleFocus ?? 'CASUAL'] ?? 1;
    let base = 620 + level * 34 + gearScore * 0.075;
    if (level >= 20)
        base = 1680 + Math.max(0, gearScore - 1700) * 0.19;
    else if (level >= 19)
        base = 1550 + gearScore * 0.09;
    else if (level >= 15)
        base = 1240 + (level - 15) * 70 + gearScore * 0.058;
    else if (level >= 10)
        base = 1000 + (level - 10) * 54 + gearScore * 0.042;
    return Math.max(100, Math.round(base * role));
};
