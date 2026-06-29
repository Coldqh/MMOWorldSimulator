import { calculateItemStatBudget } from '../balance/index.js';
import { ALL_SET_DEFINITIONS, CLASS_LABEL, CLASS_MAIN_STAT, FIRST_WYRM_SHARED_SLOTS, GLASS_CATACOMB_SLOTS, SET_CLASSES, SET_SLOTS, SLOT_LABEL, } from './itemSetDefinitions.js';
const slotType = (slot) => slot === 'weapon' ? 'weapon' : slot === 'ring' || slot === 'amulet' ? 'accessory' : 'armor';
const socketSlotsFor = (rarity, type) => {
    if (type === 'card' || type === 'consumable' || type === 'material' || type === 'quest')
        return 0;
    if (rarity === 'legendary' || rarity === 'epic')
        return 2;
    if (rarity === 'rare')
        return 1;
    return 0;
};
const buildStats = (level, rarity, slot, classId) => {
    const type = slotType(slot);
    const budget = Math.max(1, calculateItemStatBudget({ level, rarity, type, slot }));
    const main = classId ? CLASS_MAIN_STAT[classId] : 'attack';
    if (slot === 'weapon')
        return { [main]: budget + Math.round(level * 0.9) };
    if (slot === 'ring' || slot === 'amulet') {
        const caster = classId === 'mage' || classId === 'priest' || !classId;
        return {
            hp: Math.max(4, budget * 3),
            mana: caster ? Math.max(3, budget * 2) : Math.max(1, budget),
            [main]: Math.max(1, Math.round(budget * 0.45)),
        };
    }
    if (slot === 'boots') {
        return { hp: budget * 3, defense: Math.max(1, Math.round(budget * 0.55)), speed: Math.max(1, rarity === 'legendary' ? 3 : rarity === 'epic' ? 2 : 1) };
    }
    return { hp: budget * 4, defense: Math.max(1, Math.round(budget * 0.75)) };
};
const itemIdFor = (definition, slot, classId) => {
    if (definition.sourceType === 'general' && classId)
        return `set_${definition.rarity}_${classId}_${definition.level}_${slot}`;
    return classId ? `${definition.prefix}_${classId}_${slot}` : `${definition.prefix}_${slot}`;
};
const setIdFor = (definition, classId) => {
    if (definition.sourceType === 'general' && classId)
        return `${definition.rarity}_${classId}_${definition.level}`;
    return definition.id;
};
export const createSetItem = (definition, slot, classId) => {
    const type = slotType(slot);
    const id = itemIdFor(definition, slot, classId);
    const name = classId
        ? `${SLOT_LABEL[slot]} ${definition.familyName} ${CLASS_LABEL[classId]}`
        : `${SLOT_LABEL[slot]} ${definition.familyName}`;
    return {
        id,
        name,
        type,
        rarity: definition.rarity,
        levelReq: definition.level,
        classTags: classId ? [classId] : [],
        slot,
        stats: buildStats(definition.level, definition.rarity, slot, classId),
        effects: [],
        socketSlots: socketSlotsFor(definition.rarity, type),
        tradeable: true,
        price: 1,
        announceIfDropped: definition.rarity !== 'common',
        setId: setIdFor(definition, classId),
        sourceType: definition.sourceType,
        sourceId: definition.sourceId,
        sourceName: definition.sourceName ?? (definition.sourceType === 'general' ? 'Общий сет' : undefined),
    };
};
export const createGeneralSetItems = (definition) => SET_CLASSES.flatMap((classId) => SET_SLOTS.map((slot) => createSetItem(definition, slot, classId)));
export const createDungeonSetItems = (definition) => {
    if (definition.shape === 'glass_20')
        return createGlassCatacombItems(definition);
    return SET_CLASSES.flatMap((classId) => SET_SLOTS.map((slot) => createSetItem(definition, slot, classId)));
};
export const createRaidSetItems = (definition) => {
    if (definition.shape === 'first_wyrm_10')
        return createFirstWyrmItems(definition);
    return SET_CLASSES.flatMap((classId) => SET_SLOTS.map((slot) => createSetItem(definition, slot, classId)));
};
export const createFirstWyrmItems = (definition) => [
    ...SET_CLASSES.map((classId) => createSetItem(definition, 'weapon', classId)),
    ...FIRST_WYRM_SHARED_SLOTS.map((slot) => createSetItem(definition, slot)),
];
export const createGlassCatacombItems = (definition) => SET_CLASSES.flatMap((classId) => GLASS_CATACOMB_SLOTS.map((slot) => createSetItem(definition, slot, classId)));
export const createMaterialItem = (id, name, rarity, price = 1) => ({
    id,
    name,
    type: 'material',
    rarity,
    levelReq: 1,
    classTags: [],
    stats: {},
    effects: [],
    socketSlots: 0,
    tradeable: true,
    price,
    announceIfDropped: false,
    sourceType: 'world',
    sourceName: 'Мир',
});
export const createCardItem = (id, name, levelReq, rarity, stats) => ({
    id,
    name,
    type: 'card',
    rarity,
    levelReq,
    classTags: [],
    stats,
    effects: [],
    socketSlots: 0,
    tradeable: true,
    price: 1,
    announceIfDropped: true,
    sourceType: 'world',
    sourceName: 'Мир',
});
export const buildGeneratedItems = () => {
    const items = [];
    for (const definition of ALL_SET_DEFINITIONS) {
        if (definition.sourceType === 'general')
            items.push(...createGeneralSetItems(definition));
        else if (definition.sourceType === 'dungeon')
            items.push(...createDungeonSetItems(definition));
        else
            items.push(...createRaidSetItems(definition));
    }
    return items;
};
