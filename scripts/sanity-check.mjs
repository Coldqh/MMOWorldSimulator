import fs from 'node:fs';

const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';
const files = {
  pkg: read('package.json'),
  version: read('src/engine/version.ts'),
  types: read('src/types/game.ts'),
  arena3v3: read('src/systems/arena3v3System.ts'),
  combat: read('src/systems/combatSystem.ts'),
  npcLocation: read('src/systems/npcLocationSystem.ts'),
  pvpDuel: read('src/systems/pvpDuelSystem.ts'),
  locationNpcList: read('src/ui/components/LocationNpcList.tsx'),
  gameStore: read('src/state/gameStore.ts'),
};

const fail = [];
const ok = [];
const assert = (cond, msg) => cond ? ok.push(msg) : fail.push(msg);

assert(files.pkg.includes('"version": "0.7.20"'), 'package version 0.7.20');
assert(files.version.includes("APP_VERSION = '0.7.20'"), 'APP_VERSION 0.7.20');
assert(files.types.includes('"guild_war"'), 'CombatSource has guild_war');
assert(files.types.includes('lastWarAttackDay?: number;') && files.types.includes('lastWarAttackMinute?: number;'), 'player war attack cooldown fields exist');

assert(files.arena3v3.includes("if (role === 'tank') return pvp ? 'reckless' : 'aggressive';"), 'tank aggression highest');
assert(files.arena3v3.includes("if (role === 'physicalDps' || role === 'magicDps') return pvp ? 'aggressive' : 'balanced';"), 'dps aggression middle');
assert(files.arena3v3.includes("if (role === 'healer') return 'defensive';"), 'healer aggression lowest');
assert(!files.arena3v3.includes("role !== 'healer'"), 'old narrowing bug removed');

assert(files.pvpDuel.includes('startWarNpcDuelCombat'), 'war npc duel combat starter exists');
assert(files.pvpDuel.includes("source: 'guild_war'"), 'war npc duel uses guild_war source');
assert(files.combat.includes('finishGuildWarVictory'), 'combat has guild war victory finish');
assert(files.combat.includes('finishGuildWarDefeat'), 'combat has guild war defeat finish');
assert(files.combat.includes("if (combat.source === 'guild_war') return finishGuildWarVictory"), 'guild war victory routed');
assert(files.combat.includes("if (combat.source === 'guild_war') return finishGuildWarDefeat"), 'guild war defeat routed');
assert(files.combat.includes("location: { mode: 'city' }"), 'guild war defeat sends player to city');
assert(files.combat.includes("locationMode: 'city'"), 'guild war victory sends npc to city');

assert(files.npcLocation.includes('getWarAttackCooldownMinutes'), 'war attack cooldown helper exists');
assert(files.npcLocation.includes('npc.level >= zone.levelRange[0]'), 'zone min level enforced');
assert(files.npcLocation.includes('npc.level >= spot.levelRange[0]'), 'spot min level enforced');
assert(!files.npcLocation.includes('zone.levelRange[0] - 2'), 'old zone underlevel tolerance removed');
assert(!files.npcLocation.includes('spot.levelRange[0] - 2'), 'old spot underlevel tolerance removed');
assert(files.npcLocation.includes('if (getWarAttackCooldownMinutes(server) > 0) return server;'), 'npc auto encounter blocked by cooldown');

assert(files.locationNpcList.includes('КД ${cooldownText}') || files.locationNpcList.includes('КД '), 'button shows cooldown');
assert(files.locationNpcList.includes('disabled={!canAttack}'), 'attack button disabled on cooldown');

assert(files.gameStore.includes('startWarNpcDuelCombat'), 'store starts real duel combat');
assert(files.gameStore.includes('lastWarAttackDay: server.serverDay'), 'store writes cooldown day');
assert(files.gameStore.includes('lastWarAttackMinute: server.currentMinute'), 'store writes cooldown minute');
assert(!files.gameStore.includes('resolveWarEnemyNpcAttack(server, npcId, rng)'), 'old instant simulated attack removed');
assert(!files.gameStore.includes('type: "pvp"') && !files.gameStore.includes("type: 'pvp'"), 'invalid modal type pvp removed');
assert((files.gameStore.match(/const simulateServerForMinutes\s*=/g) ?? []).length === 1, 'no duplicate simulateServerForMinutes');
assert(!files.gameStore.includes('},}));'), 'gameStore malformed tail absent');

if (fail.length) {
  console.error('Sanity failed:');
  fail.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}

console.log('Sanity passed:');
ok.forEach((msg) => console.log(`- ${msg}`));
