import { useState } from 'react';
import { useGameStore } from '../../state/gameStore';
import { getGameDayOfWeekName } from '../../systems/contractSystem';
import type { ContractCategory } from '../../types/game';
import { ContractListPanel } from '../components/ContractListPanel';

const timeLabel = (minute: number) => {
  const hh = Math.floor(minute / 60).toString().padStart(2, '0');
  const mm = (minute % 60).toString().padStart(2, '0');
  return `${hh}:${mm}`;
};

export const ContractsScreen = () => {
  const server = useGameStore((state) => state.server);
  const [tab, setTab] = useState<ContractCategory>('daily');

  return (
    <div className="screen-stack">
      <section className="panel hero-panel">
        <div className="section-title">📋 Контракты</div>
        <h1>Доска заказов</h1>
        <p className="muted">День {server.serverDay} · {getGameDayOfWeekName(server.serverDay)} · {timeLabel(server.currentMinute)}</p>
        <div className="mini-tabs">
          <button className={tab === 'daily' ? 'active' : ''} onClick={() => setTab('daily')}>Ежедневные</button>
          <button className={tab === 'weekly' ? 'active' : ''} onClick={() => setTab('weekly')}>Еженедельные</button>
        </div>
      </section>

      <ContractListPanel category={tab} />
    </div>
  );
};
