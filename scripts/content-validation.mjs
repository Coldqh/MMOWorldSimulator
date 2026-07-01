import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (filePath) => fs.readFileSync(path.join(root, filePath), 'utf8');
const exists = (filePath) => fs.existsSync(path.join(root, filePath));

const pass = [];
const warn = [];
const fail = [];

const ok = (condition, message) => condition ? pass.push(message) : fail.push(message);
const warning = (condition, message) => { if (!condition) warn.push(message); };

// sanity guard phrases:
// set definition ids are unique
// references existing loot table
// references existing mob
// references existing zone
// sourceId points to existing instance

const requiredFiles = [
  'src/content/itemContent.ts',
  'src/content/itemSetDefinitions.ts',
  'src/content/itemFactories.ts',
  'src/content/world.ts',
  'src/content/worldBase.ts',
  'src/content/worldExtraContent.ts',
  'src/content/worldFinalize.ts',
  'src/content/lootFinalize.ts',
  'src/content/mobDefinitions.ts',
  'src/content/worldRebalance.ts',
  'src/content/worldExtraRaids.ts',
];

requiredFiles.forEach((filePath) => ok(exists(filePath), `required content file exists: ${filePath}`));

const source = (...files) => files.filter(exists).map(read).join('\n');

const itemSetSource = read('src/content/itemSetDefinitions.ts');
const itemContentSource = source(
  'src/content/itemContent.ts',
  'src/content/itemBaseDefinitions.ts',
  'src/content/questItems.ts',
  'src/content/itemFactories.ts',
  'src/content/itemFinalize.ts',
  'src/content/itemLegacy.ts',
);
const worldBaseSource = read('src/content/worldBase.ts');
const worldExtraSource = read('src/content/worldExtraContent.ts');
const worldRebalanceSource = read('src/content/worldRebalance.ts');
const worldExtraRaidsSource = read('src/content/worldExtraRaids.ts');
const expansionSource = exists('src/content/level60Expansion.ts') ? read('src/content/level60Expansion.ts') : '';
const worldGlue = source(
  'src/content/world.ts',
  'src/content/worldFinalize.ts',
  'src/content/lootFinalize.ts',
  'src/content/worldRebalance.ts',
  'src/content/worldExtraRaids.ts',
);

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

const objectsFromArrays = (sources) =>
  sources.flatMap(([text, names]) => names.flatMap((name) => extractObjects(findArrayBody(text, name))));

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

const unique = (entries, label) => {
  const seen = new Set();
  const duplicates = [];
  entries.forEach((entry) => {
    if (!entry.id) return;
    if (seen.has(entry.id)) duplicates.push(entry.id);
    seen.add(entry.id);
  });
  ok(duplicates.length === 0, `${label} ids are unique${duplicates.length ? ': ' + duplicates.join(', ') : ''}`);
};

const setDefinitions = objectsFromArrays([[itemSetSource, ['GENERAL_SET_DEFINITIONS', 'DUNGEON_SET_DEFINITIONS', 'RAID_SET_DEFINITIONS']]])
  .map((raw) => ({
    id: stringProp(raw, 'id'),
    prefix: stringProp(raw, 'prefix'),
    familyName: stringProp(raw, 'familyName'),
    level: numberProp(raw, 'level'),
    rarity: stringProp(raw, 'rarity'),
    sourceType: stringProp(raw, 'sourceType'),
    sourceId: stringProp(raw, 'sourceId'),
    shape: stringProp(raw, 'shape'),
    raw,
  }))
  .filter((entry) => entry.id);

const lootTables = objectsFromArrays([
  [worldBaseSource, ['BASE_LOOT_TABLES']],
  [worldExtraSource, ['EXTRA_LOOT_TABLES']],
  [expansionSource, ['EXPANSION_LOOT_TABLES']],
]).map((raw) => ({ id: stringProp(raw, 'id'), raw })).filter((entry) => entry.id);

const zones = objectsFromArrays([
  [worldBaseSource, ['BASE_ZONES']],
  [worldExtraSource, ['EXTRA_ZONES']],
  [expansionSource, ['EXPANSION_ZONES']],
]).map((raw) => {
  const range = levelRangeProp(raw) ?? [NaN, NaN];
  return {
    id: stringProp(raw, 'id'),
    min: range[0],
    max: range[1],
    spotIds: stringArrayProp(raw, 'spotIds'),
    raw,
  };
}).filter((entry) => entry.id);

const spots = objectsFromArrays([
  [worldBaseSource, ['BASE_SPOTS']],
  [worldExtraSource, ['EXTRA_SPOTS']],
  [expansionSource, ['EXPANSION_SPOTS']],
]).map((raw) => {
  const range = levelRangeProp(raw) ?? [NaN, NaN];
  return {
    id: stringProp(raw, 'id'),
    zoneId: stringProp(raw, 'zoneId'),
    min: range[0],
    max: range[1],
    mobIds: stringArrayProp(raw, 'mobIds'),
    raw,
  };
}).filter((entry) => entry.id);

const mobs = objectsFromArrays([
  [worldBaseSource, ['BASE_MOBS']],
  [worldExtraSource, ['EXTRA_MOBS']],
  [worldRebalanceSource, ['REBALANCE_MOBS']],
  [expansionSource, ['EXPANSION_MOBS']],
]).map((raw) => ({
  id: stringProp(raw, 'id'),
  name: stringProp(raw, 'name'),
  level: numberProp(raw, 'level'),
  lootTableId: stringProp(raw, 'lootTableId'),
  tags: stringArrayProp(raw, 'tags'),
  raw,
})).filter((entry) => entry.id);

const instances = objectsFromArrays([
  [worldBaseSource, ['BASE_DUNGEONS', 'BASE_RAIDS']],
  [worldExtraSource, ['EXTRA_DUNGEONS']],
  [worldExtraRaidsSource, ['EXTRA_RAIDS']],
  [expansionSource, ['EXPANSION_DUNGEONS', 'EXPANSION_RAIDS']],
]).map((raw) => {
  const range = levelRangeProp(raw) ?? [NaN, NaN];
  return {
    id: stringProp(raw, 'id'),
    zoneId: stringProp(raw, 'zoneId'),
    min: range[0],
    max: range[1],
    contentType: stringProp(raw, 'contentType'),
    bossMobId: stringProp(raw, 'bossMobId'),
    lootTableId: stringProp(raw, 'lootTableId'),
    floorMobIds: floorMobIds(raw),
    raw,
  };
}).filter((entry) => entry.id);

const allowedRarities = new Set(['common', 'uncommon', 'rare', 'epic', 'legendary']);
const allowedSourceTypes = new Set(['general', 'dungeon', 'raid']);
const allowedShapes = new Set(['full_class_28', 'glass_20', 'first_wyrm_10']);

ok(setDefinitions.length > 0, 'set definitions are discoverable');
ok(lootTables.length > 0, 'loot tables are discoverable');
ok(zones.length > 0, 'zones are discoverable');
ok(spots.length > 0, 'spots are discoverable');
ok(mobs.length > 0, 'mobs are discoverable');
ok(instances.length > 0, 'instances are discoverable');

unique(setDefinitions, 'set definition');
unique(lootTables, 'loot table');
unique(zones, 'zone');
unique(spots, 'spot');
unique(mobs, 'mob');
unique(instances, 'instance');

const lootTableIds = new Set(lootTables.map((entry) => entry.id));
const zoneIds = new Set(zones.map((entry) => entry.id));
const spotIds = new Set(spots.map((entry) => entry.id));
const mobIds = new Set(mobs.map((entry) => entry.id));
const instanceIds = new Set(instances.map((entry) => entry.id));

setDefinitions.forEach((definition) => {
  ok(typeof definition.level === 'number' && definition.level >= 1 && definition.level <= 60, `set ${definition.id} level is within 1-60`);
  ok(allowedRarities.has(definition.rarity), `set ${definition.id} rarity is valid`);
  ok(allowedSourceTypes.has(definition.sourceType), `set ${definition.id} sourceType is valid`);
  ok(allowedShapes.has(definition.shape), `set ${definition.id} shape is valid`);
  if (definition.sourceType !== 'general') ok(Boolean(definition.sourceId), `set ${definition.id} has sourceId`);
});

zones.forEach((zone) => {
  ok(zone.min >= 1 && zone.max <= 60 && zone.min <= zone.max, `zone ${zone.id} levelRange is valid`);
  zone.spotIds.forEach((spotId) => ok(spotIds.has(spotId), `zone ${zone.id} references existing spot ${spotId}`));
});

spots.forEach((spot) => {
  ok(zoneIds.has(spot.zoneId), `spot ${spot.id} references existing zone ${spot.zoneId}`);
  ok(spot.min >= 1 && spot.max <= 60 && spot.min <= spot.max, `spot ${spot.id} levelRange is valid`);
  spot.mobIds.forEach((mobId) => ok(mobIds.has(mobId), `spot ${spot.id} references existing mob ${mobId}`));
});

mobs.forEach((mob) => {
  ok(typeof mob.level === 'number' && mob.level >= 1 && mob.level <= 60, `mob ${mob.id} level is within 1-60`);
  ok(lootTableIds.has(mob.lootTableId), `mob ${mob.id} references existing loot table ${mob.lootTableId}`);
});

instances.forEach((instance) => {
  ok(zoneIds.has(instance.zoneId), `${instance.contentType ?? 'instance'} ${instance.id} references existing zone ${instance.zoneId}`);
  ok(instance.min >= 1 && instance.max <= 60 && instance.min <= instance.max, `${instance.contentType ?? 'instance'} ${instance.id} levelRange is valid`);
  ok(mobIds.has(instance.bossMobId), `${instance.contentType ?? 'instance'} ${instance.id} references existing boss mob ${instance.bossMobId}`);
  ok(lootTableIds.has(instance.lootTableId), `${instance.contentType ?? 'instance'} ${instance.id} references existing loot table ${instance.lootTableId}`);
  ok(instance.floorMobIds.length > 0, `${instance.contentType ?? 'instance'} ${instance.id} has floor mobs`);
  instance.floorMobIds.forEach((mobId) => ok(mobIds.has(mobId), `${instance.contentType ?? 'instance'} ${instance.id} floor references existing mob ${mobId}`));
});

setDefinitions
  .filter((definition) => definition.sourceType !== 'general')
  .forEach((definition) => {
    ok(instanceIds.has(definition.sourceId), `set ${definition.id} sourceId points to existing instance`);
  });

ok(itemContentSource.includes('finalizeItems'), 'items pass through finalizeItems');
ok(itemContentSource.includes('buildGeneratedItems'), 'generated item factory is wired');
ok(worldGlue.includes('finalizeWorldContent'), 'world content passes through finalizeWorldContent');
ok(worldGlue.includes('finalizeLootTables'), 'loot tables pass through finalizeLootTables');
ok(worldGlue.includes('EXTRA_RAIDS'), 'EXTRA_RAIDS hook is wired');
ok(worldGlue.includes('EXTRA_RAID_PATCHES'), 'EXTRA_RAID_PATCHES hook is wired');
ok(worldGlue.includes('EXPANSION_RAIDS'), 'EXPANSION_RAIDS hook is wired');
ok(worldGlue.includes('EXPANSION_DUNGEONS'), 'EXPANSION_DUNGEONS hook is wired');
ok(!worldRebalanceSource.includes('const zones = zoneDefs;'), 'world rebalance preserves expansion zones');
ok(!worldRebalanceSource.includes('const spots = spotDefs;'), 'world rebalance preserves expansion spots');
ok(!worldRebalanceSource.includes("['old_lantern_cellar', 'blackroot_watch', 'mire_depths', 'frost_vault', 'glass_catacomb'].includes(dungeon.id)"), 'world rebalance does not whitelist old dungeons only');

warning(setDefinitions.some((definition) => definition.level > 20), 'No generated sets above level 20 yet; level 21-60 content ladder is still empty');
warning(instances.some((instance) => instance.max > 20), 'No dungeon/raid content above level 20 yet');

if (fail.length) {
  console.error('Content validation failed:');
  fail.forEach((message) => console.error('- ' + message));
  if (warn.length) {
    console.error('Warnings:');
    warn.forEach((message) => console.error('- ' + message));
  }
  console.error(`${pass.length} checks passed before failure.`);
  process.exit(1);
}

console.log('Content validation passed:');
pass.forEach((message) => console.log('- ' + message));
if (warn.length) {
  console.log('Warnings:');
  warn.forEach((message) => console.log('- ' + message));
}
