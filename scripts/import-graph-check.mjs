import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const srcRoot = path.join(root, 'src');

const walk = (dir) => fs.existsSync(dir)
  ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      return entry.isDirectory() ? walk(full) : [full];
    })
  : [];

const tsFiles = walk(srcRoot).filter((file) => /\.(ts|tsx)$/.test(file));

const toRepoPath = (file) => file.split(path.sep).join('/').replace(`${root.split(path.sep).join('/')}/`, '');

const parseImports = (text) => {
  const imports = [];
  const regex = /import(?:\s+type)?(?:[\s\S]*?)from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = regex.exec(text))) imports.push(match[1]);
  return imports;
};

const resolveImport = (fromFile, specifier) => {
  if (!specifier.startsWith('.')) return null;
  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
};

const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

const importsByFile = new Map();
for (const file of tsFiles) {
  const text = fs.readFileSync(file, 'utf8');
  const resolved = parseImports(text)
    .map((specifier) => ({ specifier, resolved: resolveImport(file, specifier) }))
    .filter((entry) => entry.resolved);
  importsByFile.set(file, resolved);
}

for (const [file, imports] of importsByFile.entries()) {
  const repoFile = toRepoPath(file);
  const fromContent = repoFile.startsWith('src/content/');
  const fromSystems = repoFile.startsWith('src/systems/');
  const fromTypes = repoFile.startsWith('src/types/');
  const fromSaveLoad = repoFile === 'src/engine/saveLoad.ts';
  const fromItemsIndex = repoFile === 'src/content/items.ts';
  const fromWorldIndex = repoFile === 'src/content/world.ts';

  imports.forEach(({ resolved }) => {
    const target = toRepoPath(resolved);
    if (fromSystems && target.startsWith('src/ui/')) {
      fail.push(`systems must not import UI: ${repoFile} -> ${target}`);
    }
    if (fromContent && target.startsWith('src/systems/')) {
      fail.push(`content must not import systems: ${repoFile} -> ${target}`);
    }
    if (fromTypes && target.startsWith('src/systems/')) {
      fail.push(`types must not import systems: ${repoFile} -> ${target}`);
    }
    if (fromSaveLoad && target.startsWith('src/ui/')) {
      fail.push(`saveLoad must not import UI: ${repoFile} -> ${target}`);
    }
    if (fromItemsIndex && target === 'src/content/world.ts') {
      fail.push('items.ts must not import world.ts');
    }
    if (fromWorldIndex && target === 'src/content/items.ts') {
      fail.push('world.ts must not import public items.ts barrel');
    }
  });
}

const itemsText = fs.existsSync('src/content/items.ts') ? fs.readFileSync('src/content/items.ts', 'utf8') : '';
const worldText = fs.existsSync('src/content/world.ts') ? fs.readFileSync('src/content/world.ts', 'utf8') : '';
const mobDefinitionsText = fs.existsSync('src/content/mobDefinitions.ts') ? fs.readFileSync('src/content/mobDefinitions.ts', 'utf8') : '';

assert(!itemsText.includes("from './world'") && !itemsText.includes('from "./world"'), 'items.ts does not import world index');
assert(!worldText.includes("from './items'") && !worldText.includes('from "./items"'), 'world.ts does not import public items barrel');
assert(mobDefinitionsText.includes('WORLD_MOB_DEFINITIONS'), 'mobDefinitions neutral module exists');
assert(!mobDefinitionsText.includes('ITEMS'), 'mobDefinitions does not import ITEMS');

if (fail.length) {
  console.error('Import graph check failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}

console.log('Import graph check passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
