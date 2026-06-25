import { useEffect, useState, type ReactNode } from 'react';
import { formatTime } from '../../engine/time';
import { useGameStore } from '../../state/gameStore';
import type { ScreenId } from '../../types/game';
import { ArenaScreen } from '../screens/ArenaScreen';
import { CharacterScreen } from '../screens/CharacterScreen';
import { DungeonScreen } from '../screens/DungeonScreen';
import { GuildScreen } from '../screens/GuildScreen';
import { MarketScreen } from '../screens/MarketScreen';
import { RaidScreen } from '../screens/RaidScreen';
import { ServerScreen } from '../screens/ServerScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { NewsScreen } from '../screens/NewsScreen';
import { PartyFinderScreen } from '../screens/PartyFinderScreen';
import { PartyLobbyScreen } from '../screens/PartyLobbyScreen';
import { StartScreen } from '../screens/StartScreen';
import { EnhanceScreen } from '../screens/EnhanceScreen';
import { WorldScreen } from '../screens/WorldScreen';
import { LibraryScreen } from '../screens/LibraryScreen';
import { ResultModal } from '../components/ResultModal';
import { UpdateBanner } from '../components/UpdateBanner';

const screens: Record<ScreenId, ReactNode> = {
  start: <StartScreen />,
  character: <CharacterScreen />,
  world: <WorldScreen />,
  partyFinder: <PartyFinderScreen />,
  dungeon: <DungeonScreen />,
  guild: <GuildScreen />,
  server: <ServerScreen />,
  market: <MarketScreen />,
  arena: <ArenaScreen />,
  enhance: <EnhanceScreen />,
  raid: <RaidScreen />,
  settings: <SettingsScreen />,
  library: <LibraryScreen />,
  news: <NewsScreen />,
};

const bottomNav: Array<{ id: ScreenId; label: string }> = [
  { id: 'character', label: '🧍 Герой' },
  { id: 'world', label: '🌍 Мир' },
  { id: 'guild', label: '🏰 Гильдия' },
];

const sideNav: Array<{ id: ScreenId; label: string; cityOnly?: boolean }> = [
  { id: 'character', label: '🧍 Герой' },
  { id: 'world', label: '🌍 Мир' },
  { id: 'partyFinder', label: '👥 Поиск пати' },
  { id: 'dungeon', label: '⚔️ Данжи' },
  { id: 'raid', label: '🐉 Рейды' },
  { id: 'server', label: '📜 Сервер' },
  { id: 'news', label: '🗞️ Новости' },
  { id: 'library', label: '📚 Библиотека' },
  { id: 'guild', label: '🏰 Гильдия' },
  { id: 'market', label: '🛒 Рынок', cityOnly: true },
  { id: 'arena', label: '🏟️ Арена', cityOnly: true },
  { id: 'enhance', label: '🔨 Заточка', cityOnly: true },
  { id: 'settings', label: '⚙️ Настройки' },
];

const OnlineStatus = () => {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return <span>{online ? 'Онлайн' : 'Офлайн'}</span>;
};

export const AppShell = () => {
  const server = useGameStore((state) => state.server);
  const activeScreen = useGameStore((state) => state.activeScreen);
  const setScreen = useGameStore((state) => state.setScreen);
  const sidebarOpen = useGameStore((state) => state.sidebarOpen);
  const toggleSidebar = useGameStore((state) => state.toggleSidebar);
  const closeSidebar = useGameStore((state) => state.closeSidebar);
  const dungeonOpen = Boolean(server.currentDungeonRun);
  const partyLobbyOpen = Boolean(server.currentPartyListingId);

  if (!server.characterCreated) {
    return (
      <main className="app-shell start-shell">
        <section className="screen-frame start-frame">
          <StartScreen />
        </section>
      </main>
    );
  }

  const dungeonInnerScreen = activeScreen === 'character' ? <CharacterScreen /> : <DungeonScreen />;

  return (
    <main className="app-shell fantasy-shell">
      <UpdateBanner />
      <header className="topbar">
        <button className="menu-button" onClick={toggleSidebar}>☰</button>
        <div className="topbar-center">
          <div className="app-title">MMO World Simulator</div>
          <div className="muted">День {server.serverDay} · {formatTime(server.currentMinute)}</div>
        </div>
        <div className="topbar-player">
          <strong>{server.player.name}</strong>
          <span>Lv. {server.player.level}</span>
          <span>{server.player.gold}g</span>
          <OnlineStatus />
        </div>
      </header>

      {sidebarOpen && <button className="side-backdrop" onClick={closeSidebar} aria-label="Закрыть меню" />}
      <aside className={`side-drawer ${sidebarOpen ? 'open' : ''}`}>
        <div className="side-title">Меню</div>
        <div className="side-list">
          {sideNav.map((entry) => {
            const locked = entry.cityOnly && server.location.mode !== 'city';
            return (
              <button key={entry.id} className={activeScreen === entry.id ? 'active' : ''} onClick={() => setScreen(entry.id)} disabled={locked || dungeonOpen || partyLobbyOpen}>
                <span>{entry.label}</span>
                {locked && <small>город</small>}
                {dungeonOpen && entry.id !== 'guild' && <small>данж</small>}{partyLobbyOpen && <small>пати</small>}{partyLobbyOpen && <small>пати</small>}
              </button>
            );
          })}
        </div>
      </aside>

      <section className="screen-frame">{screens[activeScreen] ?? screens.world}</section>

      {dungeonOpen && (
        <div className="dungeon-fullscreen">
          <div className="dungeon-overlay-top">
            <div>
              <div className="section-title">⚔️ Экземпляр</div>
              <strong>Экземпляр активен</strong>
            </div>
            <div className="mini-tabs">
              <button className={activeScreen !== 'character' ? 'active' : ''} onClick={() => setScreen('dungeon')}>Данж</button>
              <button className={activeScreen === 'character' ? 'active' : ''} onClick={() => setScreen('character')}>Профиль</button>
            </div>
          </div>
          <div className="dungeon-overlay-body">{dungeonInnerScreen}</div>
        </div>
      )}

      {partyLobbyOpen && !dungeonOpen && (
        <div className="dungeon-fullscreen party-lobby-overlay">
          <div className="dungeon-overlay-top">
            <div>
              <div className="section-title">👥 Поиск пати</div>
              <strong>Лобби группы</strong>
            </div>
            <div className="mini-tabs">
              <button className="active" onClick={() => setScreen('partyFinder')}>Лобби</button>
            </div>
          </div>
          <div className="dungeon-overlay-body"><PartyLobbyScreen /></div>
        </div>
      )}

      <ResultModal />

      <nav className="bottom-nav">
        {bottomNav.map((entry) => {
          const lockedByDungeon = dungeonOpen && entry.id !== 'character';
          return (
            <button key={entry.id} className={activeScreen === entry.id ? 'active' : ''} onClick={() => setScreen(entry.id)} disabled={lockedByDungeon}>
              {entry.label}
            </button>
          );
        })}
      </nav>
    </main>
  );
};
