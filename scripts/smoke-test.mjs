import './smoke.mjs';

const gsSanitized = fs.readFileSync('src/state/gameStore.ts', 'utf8');
const gsInterfaceIndex = gsSanitized.indexOf('interface GameStore') >= 0 ? gsSanitized.indexOf('interface GameStore') : gsSanitized.indexOf('export interface GameStore');
const gsHead = gsInterfaceIndex >= 0 ? gsSanitized.slice(0, gsInterfaceIndex) : gsSanitized;
const gsBody = gsInterfaceIndex >= 0 ? gsSanitized.slice(gsInterfaceIndex) : '';
const gsBad = [
  'import { SAVE_VERSION,',
  'ITEMS, createGuildWarDeclareVote, createNewGame',
  'createRng, ensureSoloNpcPool, equipInventoryItem',
  'attackWarEnemyNpc as resolveWarEnemyNpcAttack, refreshContracts',
].filter((needle) => gsHead.includes(needle));
if (gsBad.length || /\n\s*import\s/.test(gsBody)) {
  console.error('Smoke test failed: GameStore import sanitizer checks');
  if (gsBad.length) console.error('- corrupted head imports: ' + gsBad.join(', '));
  if (/\n\s*import\s/.test(gsBody)) console.error('- import statement found after interface GameStore');
  process.exit(1);
}
if (!gsHead.includes('import { create } from "zustand";') || !gsHead.includes('SAVE_VERSION,') || !gsHead.includes('startCurrentSiege')) {
  console.error('Smoke test failed: clean required imports missing');
  process.exit(1);
}
console.log('Smoke test passed: GameStore import sanitizer checks');
