import { ITEMS } from './items.js';
import { QUESTS } from './quests.js';
import { QUEST_GIVERS } from './questGivers.js';
import { DUNGEONS, LOOT_TABLES, MOBS, RAIDS, SPOTS, ZONES } from './world.js';
import { getMobCardId } from './mobCards.js';
const duplicateIds = (kind, ids) => {
    const seen = new Set();
    const issues = [];
    ids.forEach((id) => {
        if (seen.has(id)) {
            issues.push({ severity: 'error', code: 'duplicate_id', message: `${kind} duplicate id: ${id}`, id });
        }
        seen.add(id);
    });
    return issues;
};
const has = (set, id) => Boolean(id && set.has(id));
export const validateContent = () => {
    const issues = [];
    const itemIds = new Set(ITEMS.map((item) => item.id));
    const mobIds = new Set(MOBS.map((mob) => mob.id));
    const spotIds = new Set(SPOTS.map((spot) => spot.id));
    const zoneIds = new Set(ZONES.map((zone) => zone.id));
    const lootTableIds = new Set(LOOT_TABLES.map((table) => table.id));
    const dungeonIds = new Set([...DUNGEONS, ...RAIDS].map((dungeon) => dungeon.id));
    const questIds = new Set(QUESTS.map((quest) => quest.id));
    const questGiverIds = new Set(QUEST_GIVERS.map((giver) => giver.id));
    issues.push(...duplicateIds('item', ITEMS.map((item) => item.id)));
    issues.push(...duplicateIds('mob', MOBS.map((mob) => mob.id)));
    issues.push(...duplicateIds('spot', SPOTS.map((spot) => spot.id)));
    issues.push(...duplicateIds('zone', ZONES.map((zone) => zone.id)));
    issues.push(...duplicateIds('lootTable', LOOT_TABLES.map((table) => table.id)));
    issues.push(...duplicateIds('dungeon', [...DUNGEONS, ...RAIDS].map((dungeon) => dungeon.id)));
    issues.push(...duplicateIds('quest', QUESTS.map((quest) => quest.id)));
    issues.push(...duplicateIds('questGiver', QUEST_GIVERS.map((giver) => giver.id)));
    MOBS.forEach((mob) => {
        const cardId = getMobCardId(mob);
        if (!has(itemIds, cardId)) {
            issues.push({ severity: 'error', code: 'mob_card_ref_missing', message: `${mob.id} has no generated card ${cardId}`, id: mob.id });
        }
        if (!has(lootTableIds, mob.lootTableId)) {
            issues.push({ severity: 'error', code: 'mob_loot_ref_missing', message: `${mob.id} references missing loot table ${mob.lootTableId}`, id: mob.id });
        }
    });
    LOOT_TABLES.forEach((table) => {
        table.entries.forEach((entry) => {
            if (!has(itemIds, entry.itemId)) {
                issues.push({ severity: 'error', code: 'loot_item_ref_missing', message: `${table.id} references missing item ${entry.itemId}`, id: table.id });
            }
        });
    });
    SPOTS.forEach((spot) => {
        if (!has(zoneIds, spot.zoneId)) {
            issues.push({ severity: 'error', code: 'spot_zone_ref_missing', message: `${spot.id} references missing zone ${spot.zoneId}`, id: spot.id });
        }
        spot.mobIds.forEach((mobId) => {
            if (!has(mobIds, mobId)) {
                issues.push({ severity: 'error', code: 'spot_mob_ref_missing', message: `${spot.id} references missing mob ${mobId}`, id: spot.id });
            }
        });
    });
    ZONES.forEach((zone) => {
        zone.spotIds.forEach((spotId) => {
            if (!has(spotIds, spotId)) {
                issues.push({ severity: 'error', code: 'zone_spot_ref_missing', message: `${zone.id} references missing spot ${spotId}`, id: zone.id });
            }
        });
    });
    [...DUNGEONS, ...RAIDS].forEach((dungeon) => {
        if (!has(zoneIds, dungeon.zoneId)) {
            issues.push({ severity: 'error', code: 'dungeon_zone_ref_missing', message: `${dungeon.id} references missing zone ${dungeon.zoneId}`, id: dungeon.id });
        }
        if (!has(mobIds, dungeon.bossMobId)) {
            issues.push({ severity: 'error', code: 'dungeon_boss_ref_missing', message: `${dungeon.id} references missing boss mob ${dungeon.bossMobId}`, id: dungeon.id });
        }
        if (!has(lootTableIds, dungeon.lootTableId)) {
            issues.push({ severity: 'error', code: 'dungeon_loot_ref_missing', message: `${dungeon.id} references missing loot table ${dungeon.lootTableId}`, id: dungeon.id });
        }
        dungeon.floors.forEach((floor) => {
            floor.mobIds.forEach((mobId) => {
                if (!has(mobIds, mobId)) {
                    issues.push({ severity: 'error', code: 'dungeon_floor_mob_ref_missing', message: `${dungeon.id}/${floor.id} references missing mob ${mobId}`, id: dungeon.id });
                }
            });
        });
    });
    QUEST_GIVERS.forEach((giver) => {
        if (!has(zoneIds, giver.zoneId) && giver.zoneId !== 'starting_city') {
            issues.push({ severity: 'error', code: 'quest_giver_zone_ref_missing', message: `${giver.id} references missing zone ${giver.zoneId}`, id: giver.id });
        }
        giver.questIds.forEach((questId) => {
            if (!has(questIds, questId)) {
                issues.push({ severity: 'error', code: 'quest_giver_quest_ref_missing', message: `${giver.id} references missing quest ${questId}`, id: giver.id });
            }
        });
    });
    QUESTS.forEach((quest) => {
        if (!has(questGiverIds, quest.giverId)) {
            issues.push({ severity: 'error', code: 'quest_giver_ref_missing', message: `${quest.id} references missing giver ${quest.giverId}`, id: quest.id });
        }
        (quest.prerequisiteQuestIds ?? []).forEach((questId) => {
            if (!has(questIds, questId)) {
                issues.push({ severity: 'error', code: 'quest_prerequisite_ref_missing', message: `${quest.id} references missing prerequisite ${questId}`, id: quest.id });
            }
        });
        quest.objectives.forEach((objective) => {
            if (objective.type === 'kill') {
                if (objective.targetId && !has(mobIds, objective.targetId)) {
                    issues.push({ severity: 'error', code: 'quest_kill_mob_ref_missing', message: `${quest.id} references missing mob ${objective.targetId}`, id: quest.id });
                }
                (objective.targetIds ?? []).forEach((mobId) => {
                    if (!has(mobIds, mobId)) {
                        issues.push({ severity: 'error', code: 'quest_kill_mob_ref_missing', message: `${quest.id} references missing mob ${mobId}`, id: quest.id });
                    }
                });
            }
            if (objective.type === 'collect' && objective.itemId && !has(itemIds, objective.itemId)) {
                issues.push({ severity: 'error', code: 'quest_collect_item_ref_missing', message: `${quest.id} references missing item ${objective.itemId}`, id: quest.id });
            }
            if (objective.type === 'dungeon' && objective.dungeonId && !has(dungeonIds, objective.dungeonId)) {
                issues.push({ severity: 'error', code: 'quest_dungeon_ref_missing', message: `${quest.id} references missing dungeon ${objective.dungeonId}`, id: quest.id });
            }
            if (objective.type === 'talk' && objective.targetId && !has(questGiverIds, objective.targetId)) {
                issues.push({ severity: 'error', code: 'quest_talk_ref_missing', message: `${quest.id} references missing quest giver ${objective.targetId}`, id: quest.id });
            }
        });
        (quest.reward.items ?? []).forEach((reward) => {
            if (!has(itemIds, reward.itemId)) {
                issues.push({ severity: 'error', code: 'quest_reward_item_ref_missing', message: `${quest.id} rewards missing item ${reward.itemId}`, id: quest.id });
            }
        });
    });
    return issues;
};
export const assertContentValid = () => {
    const issues = validateContent();
    const errors = issues.filter((issue) => issue.severity === 'error');
    if (errors.length > 0) {
        throw new Error(errors.map((issue) => `${issue.code}: ${issue.message}`).join('\n'));
    }
    return issues;
};
