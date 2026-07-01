import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (filePath) => fs.readFileSync(path.join(root, filePath), 'utf8');
const exists = (filePath) => fs.existsSync(path.join(root, filePath));

const pass = [];
const fail = [];
const warn = [];

const ok = (condition, message) => condition ? pass.push(message) : fail.push(message);
const warning = (condition, message) => { if (!condition) warn.push(message); };

const requiredFiles = [
  'src/content/level60Expansion.ts',
  'src/content/world.ts',
  'src/content/mobDefinitions.ts',
  'src/content/itemContent.ts',
  'src/content/itemSetDefinitions.ts',
  'src/content/quests.ts',
  'src/content/questGivers.ts',
];

requiredFiles.forEach((filePath) => ok(exists(filePath), `expansion rule file exists: ${filePath}`));

const expansionSource = exists('src/content/level60Expansion.ts') ? read('src/content/level60Expansion.ts') : '';
const itemSetSource = exists('src/content/itemSetDefinitions.ts') ? read('src/content/itemSetDefinitions.ts') : '';
const mobDefinitionsSource = exists('src/content/mobDefinitions.ts') ? read('src/content/mobDefinitions.ts') : '';
const itemContentSource = exists('src/content/itemContent.ts') ? read('src/content/itemContent.ts') : '';
const worldSource = exists('src/content/world.ts') ? read('src/content/world.ts') : '';
const questsSource = exists('src/content/quests.ts') ? read('src/content/quests.ts') : '';
const questGiversSource = exists('src/content/questGivers.ts') ? read('src/content/questGivers.ts') : '';

const findArrayBody = (text, name) => {
  const marker = `export const ${name}`;
  const start = text.indexOf(marker);
  if (start < 0) return '';
  const equals = text.indexOf('=', start);
  if (equals < 0) return '';
  const open = text.indexOf('[', equals);
  if (open < 0) return '';

  let depth = 0;
  let quote = null;
  let escape = false;
  let lineComment = false;
  let blockComment = false;

  for (let i = open; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (lineComment) {
      if (ch === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (ch === '*' && next === '/') {
        blockComment = false;
        i += 1;
      }
      continue;
    }
    if (quote) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === '\\') {
        escape = true;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '/' && next === '/') {
      lineComment = true;
      i += 1;
      continue;
    }
    if (ch === '/' && next === '*') {
      blockComment = true;
      i += 1;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '[') depth += 1;
    if (ch === ']') {
      depth -= 1;
      if (depth === 0) return text.slice(open + 1, i);
    }
  }
  return '';
};

const extractObjects = (arrayBody) => {
  const result = [];
  let depth = 0;
  let quote = null;
  let escape = false;
  let start = -1;

  for (let i = 0; i < arrayBody.length; i += 1) {
    const ch = arrayBody[i];

    if (quote) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === '\\') {
        escape = true;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }

    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch;
      continue;
    }

    if (ch === '{') {
      if (depth === 0) start = i;
      depth += 1;
    }
    if (ch === '}') {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        result.push(arrayBody.slice(start, i + 1));
        start = -1;
      }
    }
  }
  return result;
};

const objectsFromArray = (text, name) => extractObjects(findArrayBody(text, name));
const stringProp = (objectText, prop) => objectText.match(new RegExp(`${prop}:\\s*'([^']+)'`))?.[1];
const numberProp = (objectText, prop) => {
  const value = objectText.match(new RegExp(`${prop}:\\s*(\\d+)`))?.[1];
  return value ? Number(value) : undefined;
};
const levelRangeProp = (objectText) => {
  const match = objectText.match(/levelRange:\s*\[(\d+)\s*,\s*(\d+)\]/);
  return match ? [Number(match[1]), Number(match[2])] : undefined;
};
const stringArrayProp = (objectText, prop) => {
  const match = objectText.match(new RegExp(`${prop}:\\s*\\[([^\\]]*)\\]`));
  if (!match) return [];
  return match[1]
    .split(',')
    .map((part) => part.trim().replace(/^['"`]|['"`]$/g, ''))
    .filter(Boolean);
};
const floorMobIds = (objectText) =>
  [...objectText.matchAll(/mobIds:\s*\[([^\]]*)\]/g)]
    .flatMap((match) =>
      match[1]
        .split(',')
        .map((part) => part.trim().replace(/^['"`]|['"`]$/g, ''))
        .filter(Boolean),
    );

const zones = objectsFromArray(expansionSource, 'EXPANSION_ZONES').map((raw) => {
  const [min, max] = levelRangeProp(raw) ?? [NaN, NaN];
  return { id: stringProp(raw, 'id'), min, max, spotIds: stringArrayProp(raw, 'spotIds'), raw };
}).filter((entry) => entry.id);

const spots = objectsFromArray(expansionSource, 'EXPANSION_SPOTS').map((raw) => {
  const [min, max] = levelRangeProp(raw) ?? [NaN, NaN];
  return { id: stringProp(raw, 'id'), zoneId: stringProp(raw, 'zoneId'), min, max, mobIds: stringArrayProp(raw, 'mobIds'), raw };
}).filter((entry) => entry.id);

const mobs = objectsFromArray(expansionSource, 'EXPANSION_MOBS').map((raw) => ({
  id: stringProp(raw, 'id'),
  level: numberProp(raw, 'level'),
  lootTableId: stringProp(raw, 'lootTableId'),
  tags: stringArrayProp(raw, 'tags'),
  raw,
})).filter((entry) => entry.id);

const dungeons = objectsFromArray(expansionSource, 'EXPANSION_DUNGEONS').map((raw) => {
  const [min, max] = levelRangeProp(raw) ?? [NaN, NaN];
  return {
    id: stringProp(raw, 'id'),
    zoneId: stringProp(raw, 'zoneId'),
    min,
    max,
    contentType: stringProp(raw, 'contentType'),
    bossMobId: stringProp(raw, 'bossMobId'),
    lootTableId: stringProp(raw, 'lootTableId'),
    floorMobIds: floorMobIds(raw),
    raw,
  };
}).filter((entry) => entry.id);

const raids = objectsFromArray(expansionSource, 'EXPANSION_RAIDS').map((raw) => {
  const [min, max] = levelRangeProp(raw) ?? [NaN, NaN];
  const gearScore = Number(raw.match(/GS\s*(\d+)/)?.[1] ?? NaN);
  return {
    id: stringProp(raw, 'id'),
    zoneId: stringProp(raw, 'zoneId'),
    min,
    max,
    contentType: stringProp(raw, 'contentType'),
    bossMobId: stringProp(raw, 'bossMobId'),
    lootTableId: stringProp(raw, 'lootTableId'),
    floorMobIds: floorMobIds(raw),
    gearScore,
    raw,
  };
}).filter((entry) => entry.id);

const questGivers = objectsFromArray(expansionSource, 'EXPANSION_QUEST_GIVERS').map((raw) => ({
  id: stringProp(raw, 'id'),
  zoneId: stringProp(raw, 'zoneId'),
  questIds: stringArrayProp(raw, 'questIds'),
  raw,
})).filter((entry) => entry.id);

const quests = objectsFromArray(expansionSource, 'EXPANSION_QUESTS').map((raw) => ({
  id: stringProp(raw, 'id'),
  giverId: stringProp(raw, 'giverId'),
  zoneId: stringProp(raw, 'zoneId'),
  levelReq: numberProp(raw, 'levelReq'),
  type: stringProp(raw, 'type'),
  dungeonId: stringProp(raw, 'dungeonId'),
  targetIds: stringArrayProp(raw, 'targetIds'),
  raw,
})).filter((entry) => entry.id);

const setDefinitions = ['GENERAL_SET_DEFINITIONS', 'DUNGEON_SET_DEFINITIONS', 'RAID_SET_DEFINITIONS']
  .flatMap((name) => objectsFromArray(itemSetSource, name))
  .map((raw) => ({
    id: stringProp(raw, 'id'),
    level: numberProp(raw, 'level'),
    rarity: stringProp(raw, 'rarity'),
    sourceType: stringProp(raw, 'sourceType'),
    sourceId: stringProp(raw, 'sourceId'),
    raw,
  }))
  .filter((entry) => entry.id);

const byId = (entries) => new Map(entries.map((entry) => [entry.id, entry]));
const zoneById = byId(zones);
const spotById = byId(spots);
const mobById = byId(mobs);
const dungeonByZoneId = new Map();
dungeons.forEach((dungeon) => dungeonByZoneId.set(dungeon.zoneId, [...(dungeonByZoneId.get(dungeon.zoneId) ?? []), dungeon]));
const qgByZoneId = new Map();
questGivers.forEach((giver) => qgByZoneId.set(giver.zoneId, [...(qgByZoneId.get(giver.zoneId) ?? []), giver]));
const questById = byId(quests);

ok(worldSource.includes('EXPANSION_LOOT_TABLES'), 'world.ts wires expansion loot tables');
ok(worldSource.includes('EXPANSION_ZONES'), 'world.ts wires expansion zones');
ok(worldSource.includes('EXPANSION_DUNGEONS'), 'world.ts wires expansion dungeons');
ok(worldSource.includes('EXPANSION_RAIDS'), 'world.ts wires expansion raids');
ok(mobDefinitionsSource.includes('EXPANSION_MOBS'), 'mobDefinitions wires expansion mobs');
ok(mobDefinitionsSource.includes('EXPANSION_SPOTS'), 'mobDefinitions wires expansion spots');
ok(questsSource.includes('EXPANSION_QUESTS'), 'quests.ts wires expansion quests');
ok(questGiversSource.includes('EXPANSION_QUEST_GIVERS'), 'questGivers.ts wires expansion quest givers');
ok(itemContentSource.includes('createMobCardsForMobs') && mobDefinitionsSource.includes('MOB_CARD_SOURCE_MOBS'), 'mob cards are generated from world mobs');

const requiredRanges = [
  [21, 24], [25, 28], [29, 32], [33, 36], [37, 40],
  [41, 44], [45, 48], [49, 52], [53, 56], [57, 60],
];

ok(zones.length >= requiredRanges.length, 'level 21-60 has at least 10 expansion zones');

requiredRanges.forEach(([min, max]) => {
  const zone = zones.find((entry) => entry.min === min && entry.max === max);
  ok(Boolean(zone), `level range ${min}-${max} has a zone`);
  if (!zone) return;

  ok(zone.spotIds.length >= 2, `zone ${zone.id} has at least 2 spots`);
  zone.spotIds.forEach((spotId) => {
    const spot = spotById.get(spotId);
    ok(Boolean(spot), `zone ${zone.id} references expansion spot ${spotId}`);
    if (!spot) return;
    ok(spot.zoneId === zone.id, `spot ${spot.id} points back to zone ${zone.id}`);
    ok(spot.mobIds.length >= 2, `spot ${spot.id} has at least 2 mobs`);
    spot.mobIds.forEach((mobId) => ok(mobById.has(mobId), `spot ${spot.id} mob ${mobId} exists`));
  });

  ok((dungeonByZoneId.get(zone.id) ?? []).some((dungeon) => dungeon.min === min && dungeon.max === max), `zone ${zone.id} has a same-range dungeon`);
  ok((qgByZoneId.get(zone.id) ?? []).length >= 1, `zone ${zone.id} has quest giver`);
});

mobs.forEach((mob) => {
  ok(typeof mob.level === 'number' && mob.level >= 21 && mob.level <= 60, `expansion mob ${mob.id} level is 21-60`);
  ok(Boolean(mob.lootTableId), `expansion mob ${mob.id} has loot table`);
  ok(itemContentSource.includes('createMobCardsForMobs'), `expansion mob ${mob.id} has generated card path`);
});

dungeons.forEach((dungeon) => {
  ok(zoneById.has(dungeon.zoneId), `dungeon ${dungeon.id} points to expansion zone`);
  ok(mobById.has(dungeon.bossMobId), `dungeon ${dungeon.id} boss exists`);
  ok(dungeon.floorMobIds.length > 0, `dungeon ${dungeon.id} has floor mobs`);
  dungeon.floorMobIds.forEach((mobId) => ok(mobById.has(mobId), `dungeon ${dungeon.id} floor mob ${mobId} exists`));
});

const raid40 = raids.filter((raid) => raid.min === 40 && raid.max === 40);
const raid60 = raids.filter((raid) => raid.min === 60 && raid.max === 60);
ok(raid40.length === 1, 'exactly one level 40 raid exists');
ok(raid60.length === 3, 'exactly three level 60 raids exist');

const raid60GearScores = new Set(raid60.map((raid) => raid.gearScore).filter(Number.isFinite));
ok(raid60GearScores.size === 3, 'three level 60 raids have distinct gearscore gates');

raids.forEach((raid) => {
  ok(raid.contentType === 'raid', `raid ${raid.id} has contentType raid`);
  ok(zoneById.has(raid.zoneId), `raid ${raid.id} points to expansion zone`);
  ok(mobById.has(raid.bossMobId), `raid ${raid.id} boss exists`);
});

questGivers.forEach((giver) => {
  ok(zoneById.has(giver.zoneId), `quest giver ${giver.id} points to expansion zone`);
  ok(giver.questIds.length > 0, `quest giver ${giver.id} has quests`);
  giver.questIds.forEach((questId) => {
    const quest = questById.get(questId);
    ok(Boolean(quest), `quest giver ${giver.id} references quest ${questId}`);
    if (quest) ok(quest.giverId === giver.id, `quest ${quest.id} points back to giver ${giver.id}`);
  });
});

const levelsByRarity = (rarity) =>
  new Set(setDefinitions
    .filter((definition) => definition.sourceType === 'general' && definition.rarity === rarity)
    .map((definition) => definition.level));

const hasLevels = (rarity, levels) => {
  const set = levelsByRarity(rarity);
  levels.forEach((level) => ok(set.has(level), `${rarity} general set exists at level ${level}`));
};

hasLevels('common', [21, 26, 31, 36, 41, 46, 51, 56]);
hasLevels('uncommon', [23, 28, 33, 38, 43, 48, 53, 58]);
hasLevels('rare', [25, 30, 35, 40, 45, 50, 55, 60]);

setDefinitions
  .filter((definition) => definition.rarity === 'epic')
  .forEach((definition) => ok(['dungeon', 'raid'].includes(definition.sourceType), `epic set ${definition.id} is dungeon/raid only`));

setDefinitions
  .filter((definition) => definition.rarity === 'legendary')
  .forEach((definition) => ok(definition.sourceType === 'raid', `legendary set ${definition.id} is raid only`));

dungeons.forEach((dungeon) => {
  ok(setDefinitions.some((definition) => definition.rarity === 'epic' && definition.sourceType === 'dungeon' && definition.sourceId === dungeon.id), `dungeon ${dungeon.id} has epic set source`);
});

raids.forEach((raid) => {
  ok(setDefinitions.some((definition) => definition.rarity === 'epic' && definition.sourceType === 'raid' && definition.sourceId === raid.id), `raid ${raid.id} has epic set source`);
});

raid60.forEach((raid) => {
  ok(setDefinitions.some((definition) => definition.rarity === 'legendary' && definition.sourceType === 'raid' && definition.sourceId === raid.id), `level 60 raid ${raid.id} has legendary set source`);
});

if (fail.length) {
  console.error('Expansion rule validation failed:');
  fail.forEach((message) => console.error('- ' + message));
  if (warn.length) {
    console.error('Warnings:');
    warn.forEach((message) => console.error('- ' + message));
  }
  console.error(`${pass.length} checks passed before failure.`);
  process.exit(1);
}

console.log('Expansion rule validation passed:');
pass.forEach((message) => console.log('- ' + message));
if (warn.length) {
  console.log('Warnings:');
  warn.forEach((message) => console.log('- ' + message));
}
