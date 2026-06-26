import { useState } from 'react';
import type { ContractCategory } from '../../types/game';
import { ContractListPanel } from '../components/ContractListPanel';

export const ContractsScreen = () => {
  const [tab, setTab] = useState<ContractCategory>('daily');

  return (
    <div className="screen-stack">
      <section className="panel hero-panel">
        <div className="section-title">📋 Контракты</div>
        <h1>Доска заказов</h1>
        <p className="muted">Ежедневные и еженедельные задачи без описаний.</p>
        <div className="mini-tabs">
          <button className={tab === 'daily' ? 'active' : ''} onClick={() => setTab('daily')}>Ежедневные</button>
          <button className={tab === 'weekly' ? 'active' : ''} onClick={() => setTab('weekly')}>Еженедельные</button>
        </div>
      </section>

      <ContractListPanel category={tab} />
    </div>
  );
};
