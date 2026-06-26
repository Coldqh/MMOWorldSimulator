import { useEffect, useRef, useState } from 'react';
import { CLASSES } from '../../content/classes';
import { ITEMS } from '../../content/items';
import { GUILD_TEMPLATES } from '../../content/npc';
import { DUNGEONS, LOOT_TABLES, MOBS, RAIDS, SPOTS, ZONES } from '../../content/world';
import { useGameStore } from '../../state/gameStore';
import { APP_VERSION } from '../../engine/version';
import { applyLatestVersion, checkRemoteVersion, registerPwa } from '../../engine/pwa';

export const SettingsScreen = () => {
  const [offlineReady, setOfflineReady] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateText, setUpdateText] = useState('');
  const server = useGameStore((state) => state.server);
  const resetGame = useGameStore((state) => state.resetGame);
  const exportSave = useGameStore((state) => state.exportSave);
  const importSave = useGameStore((state) => state.importSave);
  const exportCharacter = useGameStore((state) => state.exportCharacter);
  const importCharacter = useGameStore((state) => state.importCharacter);
  const saveNow = useGameStore((state) => state.saveNow);
  const characterInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let mounted = true;
    registerPwa().then((registration) => {
      if (mounted) setOfflineReady(Boolean(registration));
    });
    return () => { mounted = false; };
  }, []);

  const manualCheckUpdate = async () => {
    setCheckingUpdate(true);
    const next = await checkRemoteVersion();
    setCheckingUpdate(false);
    setUpdateText(next ? `Доступна версия ${next}.` : 'Установлена последняя версия.');
  };

  const handleCharacterFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => importCharacter(String(reader.result ?? ''));
    reader.readAsText(file);
  };

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
        <p className="muted">app v{APP_VERSION} · день {server.serverDay}</p>
        <p className="muted">Offline: {offlineReady ? 'готов' : 'готовится'}{updateText ? ` · ${updateText}` : ''}</p>
        <div className="action-grid">
          <button onClick={saveNow}>Сохранить</button>
          <button onClick={exportSave}>Экспорт мира</button>
          <button onClick={importSave}>Импорт мира</button>
          <button onClick={exportCharacter}>Экспорт героя</button>
          <button onClick={() => characterInputRef.current?.click()}>Импорт героя</button>
          <button onClick={() => void manualCheckUpdate()}>{checkingUpdate ? 'Проверка...' : 'Проверить обновление'}</button>
          <button onClick={() => void applyLatestVersion()}>Обновить версию</button>
          <button className="danger-button" onClick={resetGame}>Новый персонаж</button>
        </div>
        <input
          ref={characterInputRef}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={(event) => handleCharacterFile(event.target.files?.[0] ?? undefined)}
        />
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
