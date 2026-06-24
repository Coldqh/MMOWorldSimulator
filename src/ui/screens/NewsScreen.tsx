import { useGameStore } from '../../state/gameStore';
import { NewsList } from '../components/NewsList';

export const NewsScreen = () => {
  const news = useGameStore((state) => state.server.worldNews);
  return (
    <div className="screen-stack">
      <section className="panel hero-panel">
        <div className="section-title">🗞️ Новости</div>
        <h1>Новости сервера</h1>
        <p className="muted">Только важные изменения гильдий и редкие дропы.</p>
      </section>
      <section className="panel">
        <div className="section-title">Лента</div>
        {news.length === 0 ? <p className="muted">Пока тихо.</p> : <NewsList items={news} limit={80} />}
      </section>
    </div>
  );
};
