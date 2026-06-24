import { CLASSES } from '../../content/classes';
import { ITEMS } from '../../content/items';
import { GUILD_TEMPLATES } from '../../content/npc';
import { DUNGEONS, LOOT_TABLES, MOBS, RAIDS, SPOTS, ZONES } from '../../content/world';
import { useGameStore } from '../../state/gameStore';
import { APP_VERSION } from '../../engine/version';
import { applyLatestVersion, checkRemoteVersion } from '../../engine/pwa';

export const SettingsScreen = () => {
  const server = useGameStore((state) => state.server);
  const resetGame = useGameStore((state) => state.resetGame);
  const exportSave = useGameStore((state) => state.exportSave);
  const importSave = useGameStore((state) => state.importSave);

  const counts = [
    ['NPC сейчас', server.npcs.length],
    ['NPC в гильдиях', server.npcs.filter((npc) => npc.guildId).length],
    ['Мобы', MOBS.length],
    ['Споты', SPOTS.length],
    ['Локации', ZONES.length],
    ['Предметы', ITEMS.length],
    ['Боссы', MOBS.filter((mob) => mob.tags.includes('boss')).length],
    ['Данжи', DUNGEONS.length],
    ['Рейды', RAIDS.length],
    ['Гильдии сейчас', server.guilds.length],
    ['Шаблоны гильдий', GUILD_TEMPLATES.length],
    ['Классы', CLASSES.length],
    ['Лут-таблицы', LOOT_TABLES.length],
    ['Лоты рынка', server.market.length],
  ];

  return (
    <div className="screen-stack">
      <section className="panel hero-panel">
        <div className="section-title">⚙️ Настройки</div>
        <h1>Сейв и проверка</h1>
        <p className="muted">app v{APP_VERSION} · save v{server.version} · день {server.serverDay}</p>
        <div className="action-grid">
          <button onClick={exportSave}>Экспорт</button>
          <button onClick={importSave}>Импорт</button>
          <button onClick={() => void checkRemoteVersion()}>Проверить обновление</button>
          <button onClick={() => void applyLatestVersion()}>Обновить версию</button>
          <button className="danger-button" onClick={resetGame}>Новый персонаж</button>
        </div>
      </section>

      <section className="panel">
        <div className="section-title">Проверка базы</div>
        <div className="stat-grid stat-grid-compact">
          {counts.map(([label, value]) => <span key={label}>{label}: {value}</span>)}
        </div>
      </section>
    </div>
  );
};
