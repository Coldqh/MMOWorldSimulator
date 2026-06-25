import { useState } from 'react';
import { QuestLogPanel } from '../components/QuestLogPanel';

export const QuestScreen = () => {
  const [tab, setTab] = useState<'active' | 'completed'>('active');

  return (
    <div className="screen-stack">
      <section className="panel hero-panel">
        <div className="section-title">📜 Квесты</div>
        <h1>Журнал заданий</h1>
        <p className="muted">Активные и завершённые квесты игрока.</p>
        <div className="mini-tabs">
          <button className={tab === 'active' ? 'active' : ''} onClick={() => setTab('active')}>Активные</button>
          <button className={tab === 'completed' ? 'active' : ''} onClick={() => setTab('completed')}>Завершённые</button>
        </div>
      </section>

      <QuestLogPanel mode={tab} />
    </div>
  );
};
