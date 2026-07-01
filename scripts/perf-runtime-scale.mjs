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

const requiredFiles = [
  'src/engine/serverIndexes.ts',
  'src/content/itemPools.ts',
  'src/systems/itemSystem.ts',
  'src/systems/npcLocationSystem.ts',
  'src/systems/progressionSystem.ts',
];

requiredFiles.forEach((filePath) => ok(exists(filePath), `runtime scale file exists: ${filePath}`));

const source = (...files) => files.filter(exists).map(read).join('\n');
const runtimeSource = source(
  'src/engine/serverIndexes.ts',
  'src/content/itemPools.ts',
  'src/systems/itemSystem.ts',
  'src/systems/npcLocationSystem.ts',
  'src/systems/progressionSystem.ts',
);

ok(runtimeSource.includes('createServerIndexes'), 'server runtime index helper is wired');
ok(runtimeSource.includes('getNpcEquipmentCandidates'), 'NPC equipment generation uses item pools');
ok(runtimeSource.includes('getNpcCardCandidates'), 'NPC card generation uses item pools');
ok(runtimeSource.includes('ZONE_BY_ID.get'), 'NPC location access uses zone lookup map');
ok(runtimeSource.includes('SPOT_BY_ID.get'), 'NPC location access uses spot lookup map');

const itemSystem = read('src/systems/itemSystem.ts');
warning(!itemSystem.includes('const usable = ITEMS'), 'itemSystem still scans ITEMS directly for NPC gear');
warning(!itemSystem.includes('const cards = ITEMS'), 'itemSystem still scans ITEMS directly for NPC cards');

const hotFiles = [
  'src/systems/partyFinderSystem.ts',
  'src/systems/dungeonSystem.ts',
  'src/systems/guildWarSystem.ts',
  'src/systems/npcLocationSystem.ts',
  'src/systems/progressionSystem.ts',
];

const hotspotCount = hotFiles
  .filter(exists)
  .map((file) => {
    const text = read(file);
    return {
      file,
      npcFinds: (text.match(/server\.npcs\.find/g) ?? []).length,
      npcFilters: (text.match(/server\.npcs\s*\n?\s*\.filter/g) ?? []).length,
      npcSorts: (text.match(/server\.npcs\][\s\S]*?\.sort/g) ?? []).length,
    };
  });

hotspotCount.forEach((entry) => {
  console.log(`${entry.file}: npcFinds=${entry.npcFinds} npcFilters=${entry.npcFilters} npcSorts=${entry.npcSorts}`);
  warning(entry.npcFinds <= 6, `${entry.file} has many server.npcs.find calls`);
  warning(entry.npcFilters <= 6, `${entry.file} has many server.npcs.filter calls`);
});

if (fail.length) {
  console.error('Runtime scale check failed:');
  fail.forEach((message) => console.error('- ' + message));
  if (warn.length) {
    console.error('Warnings:');
    warn.forEach((message) => console.error('- ' + message));
  }
  process.exit(1);
}

console.log('Runtime scale check passed:');
pass.forEach((message) => console.log('- ' + message));
if (warn.length) {
  console.log('Warnings:');
  warn.forEach((message) => console.log('- ' + message));
}
