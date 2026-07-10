import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { CLASSES } from '../../content/classes';
import { CITY_NAME, getSpotById, getZoneById } from '../../content/world';
import { APP_VERSION } from '../../engine/version';
import { formatTime } from '../../engine/time';
import { getGameDayOfWeekName } from '../../systems/contractSystem';
import { getGearScore } from '../../systems/itemSystem';
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
import { QuestScreen } from '../screens/QuestScreen';
import { ContractsScreen } from '../screens/ContractsScreen';
import { GoalsScreen } from '../screens/GoalsScreen';
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
  goals: <GoalsScreen />,
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
  quests: <QuestScreen />,
  contracts: <ContractsScreen />,
};

type NavigationEntry = {
  id: ScreenId;
  label: string;
  icon: string;
  cityOnly?: boolean;
};

type NavigationGroup = {
  label: string;
  entries: NavigationEntry[];
};

const navigationGroups: NavigationGroup[] = [
  {
    label: 'Персонаж',
    entries: [
      { id: 'character', label: 'Герой', icon: '◆' },
      { id: 'goals', label: 'Цели', icon: '◎' },
      { id: 'library', label: 'Коллекция', icon: '◇' },
    ],
  },
  {
    label: 'Мир',
    entries: [
      { id: 'world', label: 'Карта мира', icon: '◈' },
      { id: 'quests', label: 'Квесты', icon: '▤' },
      { id: 'contracts', label: 'Контракты', icon: '▦' },
      { id: 'news', label: 'Новости', icon: '◉' },
    ],
  },
  {
    label: 'Активности',
    entries: [
      { id: 'partyFinder', label: 'Поиск пати', icon: '◌' },
      { id: 'dungeon', label: 'Данжи', icon: '⚔' },
      { id: 'raid', label: 'Рейды', icon: '♜' },
      { id: 'arena', label: 'Арена', icon: '✦', cityOnly: true },
    ],
  },
  {
    label: 'Сообщество',
    entries: [
      { id: 'guild', label: 'Гильдия', icon: '♛' },
      { id: 'server', label: 'Сервер', icon: '⌁' },
    ],
  },
  {
    label: 'Экономика',
    entries: [
      { id: 'market', label: 'Рынок', icon: '◫', cityOnly: true },
      { id: 'enhance', label: 'Заточка', icon: '⬡', cityOnly: true },
      { id: 'settings', label: 'Настройки', icon: '⚙' },
    ],
  },
];

const screenMeta: Record<ScreenId, { label: string; section: string }> = {
  start: { label: 'Начало', section: 'MMO World Simulator' },
  character: { label: 'Герой', section: 'Персонаж' },
  world: { label: 'Мир', section: 'Исследование' },
  goals: { label: 'Цели', section: 'Прогресс' },
  partyFinder: { label: 'Поиск пати', section: 'Активности' },
  dungeon: { label: 'Данжи', section: 'Активности' },
  guild: { label: 'Гильдия', section: 'Сообщество' },
  server: { label: 'Сервер', section: 'Сообщество' },
  market: { label: 'Рынок', section: 'Экономика' },
  arena: { label: 'Арена', section: 'PvP' },
  enhance: { label: 'Заточка', section: 'Мастерская' },
  raid: { label: 'Рейды', section: 'Активности' },
  settings: { label: 'Настройки', section: 'Система' },
  library: { label: 'Коллекция', section: 'Персонаж' },
  news: { label: 'Новости', section: 'Мир' },
  quests: { label: 'Квесты', section: 'Журнал' },
  contracts: { label: 'Контракты', section: 'Журнал' },
};

const cityOnlyScreens = new Set<ScreenId>(['market', 'arena', 'enhance']);

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

  return (
    <span className={`connection-state ${online ? 'online' : 'offline'}`}>
      <i />{online ? 'Сеть' : 'Офлайн'}
    </span>
  );
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
  const visibleScreen: ScreenId = server.location.mode !== 'city' && cityOnlyScreens.has(activeScreen) ? 'world' : activeScreen;
  const playerClass = CLASSES.find((entry) => entry.id === server.player.classId)?.name ?? server.player.classId;
  const playerGear = getGearScore(server.player.equipment);
  const playerInitials = server.player.name.slice(0, 2).toUpperCase();
  const meta = screenMeta[visibleScreen];

  const locationLabel = useMemo(() => {
    if (server.location.mode === 'city') return CITY_NAME;
    if (server.location.mode === 'spot') return getSpotById(server.location.spotId ?? '')?.name ?? 'Неизвестный спот';
    return getZoneById(server.location.zoneId ?? '')?.name ?? 'Неизвестная зона';
  }, [server.location]);

  const navigate = (screen: ScreenId) => {
    setScreen(screen);
    closeSidebar();
  };

  if (!server.characterCreated) {
    return (
      <main className="app-shell start-shell next-gen-shell">
        <div className="ambient-glow ambient-glow-one" />
        <div className="ambient-glow ambient-glow-two" />
        <section className="screen-frame start-frame">
          <StartScreen />
        </section>
      </main>
    );
  }

  const dungeonInnerScreen = visibleScreen === 'character' ? <CharacterScreen /> : <DungeonScreen />;

  return (
    <main className="app-shell next-gen-shell">
      <div className="ambient-glow ambient-glow-one" />
      <div className="ambient-glow ambient-glow-two" />
      <UpdateBanner />

      {sidebarOpen && <button className="side-backdrop" onClick={closeSidebar} aria-label="Закрыть меню" />}

      <aside className={`side-drawer ${sidebarOpen ? 'open' : ''}`}>
        <div className="side-brand">
          <div className="brand-mark" aria-hidden="true"><span>MW</span></div>
          <div className="brand-copy">
            <strong>MMO WORLD</strong>
            <span>SIMULATOR</span>
          </div>
          <button className="drawer-close" onClick={closeSidebar} aria-label="Закрыть меню">×</button>
        </div>

        <button className="sidebar-player" onClick={() => navigate('character')}>
          <span className="player-avatar">{playerInitials}</span>
          <span className="sidebar-player-copy">
            <strong>{server.player.name}</strong>
            <small>Lv. {server.player.level} · {playerClass}</small>
          </span>
          <span className="sidebar-gs">GS {playerGear}</span>
        </button>

        <nav className="side-list" aria-label="Главное меню">
          {navigationGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <div className="nav-group-title">{group.label}</div>
              {group.entries.map((entry) => {
                const locked = entry.cityOnly && server.location.mode !== 'city';
                const lockedByInstance = dungeonOpen && entry.id !== 'guild' && entry.id !== 'character';
                const disabled = locked || lockedByInstance || partyLobbyOpen;
                return (
                  <button
                    key={entry.id}
                    className={`nav-item ${visibleScreen === entry.id ? 'active' : ''}`}
                    onClick={() => navigate(entry.id)}
                    disabled={disabled}
                  >
                    <span className="nav-icon">{entry.icon}</span>
                    <span className="nav-label">{entry.label}</span>
                    {locked && <small className="nav-badge">город</small>}
                    {lockedByInstance && <small className="nav-badge">занят</small>}
                    {partyLobbyOpen && <small className="nav-badge">пати</small>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <OnlineStatus />
          <span>v{APP_VERSION}</span>
        </div>
      </aside>

      <div className="app-workspace">
        <header className="topbar">
          <div className="topbar-leading">
            <button className="menu-button" onClick={toggleSidebar} aria-label="Открыть меню">
              <span /><span /><span />
            </button>
            <div className="topbar-context">
              <span>{meta.section}</span>
              <strong>{meta.label}</strong>
            </div>
          </div>

          <div className="world-clock">
            <span className="world-clock-icon">◈</span>
            <span>
              <strong>{locationLabel}</strong>
              <small>День {server.serverDay} · {getGameDayOfWeekName(server.serverDay)} · {formatTime(server.currentMinute)}</small>
            </span>
          </div>

          <div className="topbar-player">
            <span className="hud-chip"><small>GEAR</small><strong>{playerGear}</strong></span>
            <span className="hud-chip gold"><small>GOLD</small><strong>{server.player.gold}</strong></span>
            <button className="player-mini" onClick={() => navigate('character')} aria-label="Открыть героя">
              <span className="player-mini-copy"><strong>{server.player.name}</strong><small>Lv. {server.player.level}</small></span>
              <span className="player-avatar small">{playerInitials}</span>
            </button>
          </div>
        </header>

        <section className="screen-frame" data-screen={visibleScreen}>
          {screens[visibleScreen] ?? screens.world}
        </section>
      </div>

      {dungeonOpen && (
        <div className="dungeon-fullscreen">
          <div className="dungeon-overlay-top">
            <div className="overlay-heading">
              <span className="overlay-icon">⚔</span>
              <span><small>АКТИВНЫЙ ЭКЗЕМПЛЯР</small><strong>Подземелье</strong></span>
            </div>
            <div className="mini-tabs">
              <button className={visibleScreen !== 'character' ? 'active' : ''} onClick={() => setScreen('dungeon')}>Данж</button>
              <button className={visibleScreen === 'character' ? 'active' : ''} onClick={() => setScreen('character')}>Профиль</button>
            </div>
          </div>
          <div className="dungeon-overlay-body">{dungeonInnerScreen}</div>
        </div>
      )}

      {partyLobbyOpen && !dungeonOpen && (
        <div className="dungeon-fullscreen party-lobby-overlay">
          <div className="dungeon-overlay-top">
            <div className="overlay-heading">
              <span className="overlay-icon">◌</span>
              <span><small>ПОИСК ПАТИ</small><strong>Лобби группы</strong></span>
            </div>
            <div className="mini-tabs">
              <button className="active" onClick={() => setScreen('partyFinder')}>Лобби</button>
            </div>
          </div>
          <div className="dungeon-overlay-body"><PartyLobbyScreen /></div>
        </div>
      )}

      <ResultModal />

      <nav className="bottom-nav" aria-label="Мобильная навигация">
        <button className={visibleScreen === 'character' ? 'active' : ''} onClick={() => navigate('character')} disabled={dungeonOpen && visibleScreen !== 'character'}>
          <span>◆</span><small>Герой</small>
        </button>
        <button className={visibleScreen === 'world' ? 'active' : ''} onClick={() => navigate('world')} disabled={dungeonOpen}>
          <span>◈</span><small>Мир</small>
        </button>
        <button className={visibleScreen === 'quests' ? 'active' : ''} onClick={() => navigate('quests')} disabled={dungeonOpen}>
          <span>▤</span><small>Квесты</small>
        </button>
        <button className={sidebarOpen ? 'active' : ''} onClick={toggleSidebar}>
          <span>•••</span><small>Ещё</small>
        </button>
      </nav>
    </main>
  );
};
