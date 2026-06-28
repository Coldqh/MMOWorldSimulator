import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const failures = [];

const files = {
  store: read('src/state/gameStore.ts'),
  time: read('src/engine/time.ts'),
  siege: read('src/systems/siegeSystem.ts'),
  combatPanel: read('src/ui/components/CombatPanel.tsx'),
  combatMode: fs.existsSync('src/ui/combatUiMode.ts') ? read('src/ui/combatUiMode.ts') : '',
  guildScreen: read('src/ui/screens/GuildScreen.tsx'),
};

const expect = (ok, message) => { if (!ok) failures.push(message); };

expect(files.time.includes('ensureTimeNotRolledBack'), 'time rollback guard missing');
expect(files.store.includes('guardTime(') && files.store.includes('simulateServerForMinutes'), 'simulateServerForMinutes does not guard tick time');
expect(files.siege.includes('getSiegeRegistrationStatus'), 'siege registration status helper missing');
expect(files.siege.includes('resolveCastleWithNoRosters') && files.siege.includes('resolveCastleBySingleRoster'), 'siege no/one roster resolution missing');
expect(files.siege.includes('isOverdueUnresolved'), 'overdue siege schedule preservation missing');
expect(files.combatMode.includes("return 'ultra'") && files.combatPanel.includes('team-ultra-compact-card'), 'ultra combat UI missing');
expect(files.combatPanel.includes('shouldRenderFloatingCombatEvents') && files.combatPanel.includes('!isLargeTeamFight'), 'large combat floating events not suppressed');
expect(files.guildScreen.includes('<CastlePanel onBack=') && files.guildScreen.includes('setMainTab("guilds")'), 'guild castle back navigation missing');

if (failures.length) {
  console.error('Architecture risk check failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Architecture risk check passed.');
