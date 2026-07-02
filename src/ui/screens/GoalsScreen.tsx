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

const boardStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: 14,
};

const heroGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
  gap: 12,
  marginTop: 16,
};

const sectionStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(180px, 0.8fr) minmax(240px, 1.2fr)',
  gap: 14,
  alignItems: 'stretch',
};

const metricCardStyle = (metric: GoalMetric): CSSProperties => ({
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 16,
  padding: 14,
  background: metric.severity === 'good'
    ? 'rgba(34,197,94,0.09)'
    : metric.severity === 'danger'
      ? 'rgba(239,68,68,0.09)'
      : metric.severity === 'warning'
        ? 'rgba(245,158,11,0.09)'
        : 'rgba(255,255,255,0.045)',
});

const compactMetricStyle = (metric: GoalMetric): CSSProperties => ({
  ...metricCardStyle(metric),
  minHeight: 88,
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
        <p className="muted">Короткая сводка: уровень, GS, tier, гильдия и ближайшие действия.</p>

        <div style={heroGridStyle}>
          {goals.summary.map((metric) => (
            <div key={metric.id} style={compactMetricStyle(metric)}>
              <div className="muted">{metric.label}</div>
              <strong style={{ display: 'block', fontSize: 22, marginTop: 4 }}>{metric.value}</strong>
              {metric.target && <small>{metric.target}</small>}
              <div style={progressOuterStyle}><div style={progressInnerStyle(metric.progress)} /></div>
            </div>
          ))}
        </div>
      </section>

      <div style={boardStyle}>
        {goals.sections.map((section) => (
          <section key={section.id} className="panel">
            <div style={sectionStyle}>
              <div>
                <div className="section-title">{section.title}</div>
                <p className="muted">{section.subtitle}</p>
              </div>

              <div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {section.metrics.map((metric) => (
                    <div key={metric.id} style={metricCardStyle(metric)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                        <span>{metric.label}</span>
                        <strong>{metric.value}</strong>
                      </div>
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
              </div>
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
