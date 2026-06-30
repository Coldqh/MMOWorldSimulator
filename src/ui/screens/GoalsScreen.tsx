import { useMemo } from 'react';
import { useGameStore } from '../../state/gameStore';
import { buildPlayerGoalsViewModel, goalSeverityLabel } from '../../systems/playerGoalsSystem';

const progressOuterStyle = {
  height: 7,
  borderRadius: 999,
  overflow: 'hidden',
  background: 'rgba(255,255,255,0.11)',
  marginTop: 8,
} as const;

const progressInnerStyle = (progress: number) => ({
  width: String(Math.max(0, Math.min(100, Math.round(progress)))) + '%',
  height: '100%',
  borderRadius: 999,
  background: 'linear-gradient(90deg, rgba(252,211,77,0.95), rgba(251,146,60,0.95))',
});

export const GoalsScreen = () => {
  const server = useGameStore((state) => state.server);
  const setScreen = useGameStore((state) => state.setScreen);
  const goals = useMemo(() => buildPlayerGoalsViewModel(server), [server]);

  return (
    <div className="screen-stack">
      <section className="panel hero-panel">
        <div className="section-title">🎯 Цели</div>
        <h1>Путь персонажа</h1>
        <p className="muted">Уровень, Gear Score, арена, данжи, рейды и гильдейский прогресс.</p>
        <div className="stat-grid">
          {goals.summary.map((metric) => (
            <div key={metric.id} className={'stat-card goal-' + metric.severity}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              {metric.target && <small>{metric.target}</small>}
              <div style={progressOuterStyle}><div style={progressInnerStyle(metric.progress)} /></div>
            </div>
          ))}
        </div>
      </section>

      {goals.sections.map((section) => (
        <section key={section.id} className="panel">
          <div className="section-title">{section.title}</div>
          <p className="muted">{section.subtitle}</p>

          <div className="stat-grid">
            {section.metrics.map((metric) => (
              <div key={metric.id} className={'stat-card goal-' + metric.severity}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                {metric.target && <small>{metric.target}</small>}
                <div style={progressOuterStyle}><div style={progressInnerStyle(metric.progress)} /></div>
                <small>{goalSeverityLabel(metric.severity)} · {Math.round(metric.progress)}%</small>
              </div>
            ))}
          </div>

          <div className="list-lines mt-small">
            {section.actions.map((action) => (
              <div key={section.id + '_' + action.label + '_' + action.detail} className="list-line">
                <span>{action.label}</span>
                <strong>{action.detail}</strong>
              </div>
            ))}
          </div>
        </section>
      ))}

      <section className="panel">
        <div className="section-title">Быстрые переходы</div>
        <div className="action-grid">
          <button onClick={() => setScreen('world')}>Мир</button>
          <button onClick={() => setScreen('contracts')}>Контракты</button>
          <button onClick={() => setScreen('partyFinder')}>Поиск пати</button>
          <button onClick={() => setScreen('market')}>Рынок</button>
          <button onClick={() => setScreen('arena')}>Арена</button>
          <button onClick={() => setScreen('guild')}>Гильдия</button>
        </div>
      </section>
    </div>
  );
};
