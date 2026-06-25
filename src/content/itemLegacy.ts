const nearestLevel = (level: number, pool: number[]) =>
  pool.reduce((best, current) => Math.abs(current - level) < Math.abs(best - level) ? current : best, pool[0]);

const legacyCardIds: Record<string, string> = {
  wolf_card: 'card_gray_wolf',
  slime_card: 'card_green_slime',
  redcap_card: 'card_redcap_raider',
  moon_wisp_card: 'card_moon_wisp',
};

export const normalizeLegacyItemId = (id: string): string => {
  if (legacyCardIds[id]) return legacyCardIds[id];

  const wyrmShared = id.match(/^wyrmspire_gold_(warrior|ranger|mage|priest)_(head|chest|legs|boots|ring|amulet)$/);
  if (wyrmShared) return `wyrmspire_gold_${wyrmShared[2]}`;

  const wyrmOldShared = id.match(/^wyrmspire_(warrior|ranger|mage|priest)_(head|chest|legs|boots|ring|amulet)$/);
  if (wyrmOldShared) return `wyrmspire_${wyrmOldShared[1]}_${wyrmOldShared[2]}`;

  const glassDuplicate = id.match(/^glass_catacomb_epic_(warrior|ranger|mage|priest)_(weapon|head|chest|legs|boots|ring|amulet)$/);
  if (glassDuplicate) {
    const slotMap: Record<string, string> = { head: 'chest', boots: 'legs' };
    return `glass_catacomb_${glassDuplicate[1]}_${slotMap[glassDuplicate[2]] ?? glassDuplicate[2]}`;
  }

  const thornCrypt = id.match(/^thorn_crypt_(warrior|ranger|mage|priest)_(weapon|head|chest|legs|boots|ring|amulet)$/);
  if (thornCrypt) return `old_lantern_${thornCrypt[1]}_${thornCrypt[2]}`;

  const glassTrimmed = id.match(/^glass_catacomb_(warrior|ranger|mage|priest)_(head|boots)$/);
  if (glassTrimmed) return `glass_catacomb_${glassTrimmed[1]}_${glassTrimmed[2] === 'head' ? 'chest' : 'legs'}`;

  const oldSet = id.match(/^set_(common|uncommon|rare|epic)_(warrior|ranger|mage|priest)_(\d+)_(weapon|head|chest|legs|boots|ring|amulet)$/);
  if (oldSet) {
    const [, rarity, classId, rawLevel, slot] = oldSet;
    const level = Number(rawLevel);
    const pools: Record<string, number[]> = {
      common: [1, 5, 10, 15, 20],
      uncommon: [3, 8, 13, 18],
      rare: [5, 10, 15, 20],
      epic: [10, 20],
    };
    const mappedRarity = rarity === 'epic' ? 'rare' : rarity;
    return `set_${mappedRarity}_${classId}_${nearestLevel(level, pools[mappedRarity])}_${slot}`;
  }

  return id;
};

export const normalizeLegacySetId = (setId?: string) => {
  if (!setId) return setId;
  if (setId === 'dungeon_thorn_crypt') return 'dungeon_old_lantern';
  if (setId === 'dungeon_glass_catacomb_epic') return 'dungeon_glass_catacomb';
  if (/^epic_(warrior|ranger|mage|priest)_/.test(setId)) return setId.replace(/^epic_/, 'rare_');
  return setId;
};
