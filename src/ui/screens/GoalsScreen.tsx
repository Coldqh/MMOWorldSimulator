import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useGameStore } from '../../state/gameStore';
import { buildPlayerGoalsViewModel, goalSeverityLabel, type GoalMetric } from '../../systems/playerGoalsSystem';

const progressOuterStyle: CSSProperties = {
  height: 8,
  borderRadius: 999,
  overflow: 'hidden',
  background: 'rgba(255,255,255,0.10)',
  marginTop: 10,
};

const progressInnerStyle = (progress: number): CSSProperties => ({
  width: String(Math.max(0, Math.min(100, Math.round(progress)))) + '%',
  height: '100%',
  borderRadius: 999,
  background: 'linear-gradient(90deg, rgba(96,165,250,0.95), rgba(34,211,238,0.95))',
});

const summaryGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 12,
  marginTop: 16,
};

const boardStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
  gap: 14,
};

const metricGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
  gap: 10,
  marginTop: 12,
};

const metricCardStyle = (metric: GoalMetric): CSSProperties => ({
  minWidth: 0,
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 16,
  padding: 14,
  background: metric.severity === 'good'
    ? 'rgba(34,197,94,0.10)'
    : metric.severity === 'danger'
      ? 'rgba(239,68,68,0.10)'
      : metric.severity === 'warning'
        ? 'rgba(245,158,11,0.10)'
        : 'rgba(255,255,255,0.045)',
});

const valueStyle: CSSProperties = {
  display: 'block',
  fontSize: 20,
  marginTop: 4,
  lineHeight: 1.15,
  wordBreak: 'break-word',
};

const labelRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  alignItems: 'baseline',
};

const actionListStyle: CSSProperties = {
  display: 'grid',
  gap: 8,
  marginTop: 12,
};

const actionRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '92px minmax(0, 1fr)',
  gap: 10,
  alignItems: 'start',
  padding: '8px 0',
  borderTop: '1px solid rgba(255,255,255,0.08)',
};

export const GoalsScreen = () => {
  const server = useGameStore((state) => state.server);
  const setScreen = useGameStore((state) => state.setScreen);
  const goals = useMemo(() => buildPlayerGoalsViewModel(server), [server]);

  return (
    <div className="screen-stack">
      <section className="panel hero-panel">
        <div className="section-title">🎯 Цели</div>
        <h1>Путь персонажа</h1>
        <p className="muted">Уровень, gear score, tier, гильдия и ближайшие действия.</p>

        <div style={summaryGridStyle}>
          {goals.summary.map((metric) => (
            <div key={metric.id} style={metricCardStyle(metric)}>
              <span className="muted">{metric.label}</span>
              <strong style={valueStyle}>{metric.value}</strong>
              {metric.target && <small>{metric.target}</small>}
              <div style={progressOuterStyle}>
                <div style={progressInnerStyle(metric.progress)} />
              </div>
              <small>{goalSeverityLabel(metric.severity)} · {Math.round(metric.progress)}%</small>
            </div>
          ))}
        </div>
      </section>

      <div style={boardStyle}>
        {goals.sections.map((section) => (
          <section key={section.id} className="panel">
            <div className="section-title">{section.title}</div>
            <p className="muted">{section.subtitle}</p>

            <div style={metricGridStyle}>
              {section.metrics.map((metric) => (
                <div key={metric.id} style={metricCardStyle(metric)}>
                  <div style={labelRowStyle}>
                    <span>{metric.label}</span>
                    <strong>{metric.value}</strong>
                  </div>
                  {metric.target && <small>{metric.target}</small>}
                  <div style={progressOuterStyle}>
                    <div style={progressInnerStyle(metric.progress)} />
                  </div>
                  <small>{goalSeverityLabel(metric.severity)} · {Math.round(metric.progress)}%</small>
                </div>
              ))}
            </div>

            <div style={actionListStyle}>
              {section.actions.map((action) => (
                <div key={section.id + '_' + action.label + '_' + action.detail} style={actionRowStyle}>
                  <span className="muted">{action.label}</span>
                  <strong style={{ minWidth: 0, wordBreak: 'break-word' }}>{action.detail}</strong>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

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
