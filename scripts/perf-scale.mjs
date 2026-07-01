import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

const root = process.cwd();
const read = (filePath) => fs.readFileSync(path.join(root, filePath), 'utf8');

const source = (...files) => files.map(read).join('\n');

const worldSource = source('src/content/worldBase.ts', 'src/content/worldExtraContent.ts', 'src/content/mobDefinitions.ts');
const itemSetSource = read('src/content/itemSetDefinitions.ts');
const packageJson = JSON.parse(read('package.json'));

const countMatches = (text, regex) => [...text.matchAll(regex)].length;

const counts = {
  sets: countMatches(itemSetSource, /\{\s*id:\s*'[^']+'[\s\S]*?sourceType:\s*'(general|dungeon|raid)'/g),
  lootTables: countMatches(worldSource, /\{\s*id:\s*'[^']+'\s*,\s*entries:\s*\[/g),
  zones: countMatches(worldSource, /\{\s*id:\s*'[^']+'[\s\S]*?spotIds:\s*\[/g),
  spots: countMatches(worldSource, /\{\s*id:\s*'[^']+'[\s\S]*?mobIds:\s*\[/g),
  mobs: countMatches(worldSource, /\{\s*id:\s*'[^']+'[\s\S]*?lootTableId:\s*'[^']+'[\s\S]*?tags:\s*\[/g),
  instances: countMatches(worldSource, /contentType:\s*'(dungeon|raid)'/g),
};

const start = performance.now();

const synthetic = {
  version: packageJson.version,
  multipliers: [1, 2, 3],
  counts,
  scale: {
    sets3x: counts.sets * 3,
    lootTables3x: counts.lootTables * 3,
    zones3x: counts.zones * 3,
    spots3x: counts.spots * 3,
    mobs3x: counts.mobs * 3,
    instances3x: counts.instances * 3,
  },
};

const jsonStart = performance.now();
const payload = JSON.stringify(synthetic);
const jsonMs = performance.now() - jsonStart;

const sortStart = performance.now();
const syntheticIds = Array.from({ length: Math.max(1, counts.mobs * 3 + counts.instances * 3) }, (_, index) => `synthetic_${index}`).sort((a, b) => b.localeCompare(a));
const sortMs = performance.now() - sortStart;

const scanMs = performance.now() - start;

const status = [];
const warn = [];

if (counts.mobs <= 0) status.push('fail:mobs');
if (counts.instances <= 0) status.push('fail:instances');
if (counts.sets <= 0) status.push('fail:sets');

if (payload.length > 1_000_000) warn.push('synthetic scale payload is getting large');
if (jsonMs > 50) warn.push('JSON stringify synthetic check is slow');
if (sortMs > 50) warn.push('synthetic id sort is slow');

console.log('Scale perf static check');
console.log(`version=${packageJson.version}`);
console.log(`scanMs=${scanMs.toFixed(2)}`);
console.log(`jsonMs=${jsonMs.toFixed(2)}`);
console.log(`sortMs=${sortMs.toFixed(2)}`);
console.log(`payloadBytes=${payload.length}`);
Object.entries(counts).forEach(([key, value]) => console.log(`${key}=${value}`));
Object.entries(synthetic.scale).forEach(([key, value]) => console.log(`${key}=${value}`));
if (warn.length) {
  console.log('Warnings:');
  warn.forEach((message) => console.log('- ' + message));
}

if (status.length) {
  console.error('Scale perf check failed:');
  status.forEach((message) => console.error('- ' + message));
  process.exit(1);
}

console.log('Scale perf check passed');
