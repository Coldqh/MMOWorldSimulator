import { useState } from 'react';
import { getSkillById } from '../../content/classes';
import { useGameStore } from '../../state/gameStore';
import { getCombatConsumables, getPartyRoleName, getUsableSkillIds } from '../../systems/combatSystem';

const pct = (value: number, max: number) => Math.max(0, Math.min(100, Math.round((value / Math.max(1, max)) * 100)));

const ResourceBar = ({ label, value, max, kind }: { label: string; value: number; max: number; kind: 'hp' | 'mana' | 'xp' }) => (
  <div className={`resource-wrap ${kind}`}>
    <div className="resource-meta"><span>{label}</span><strong>{Math.max(0, value)}/{max}</strong></div>
    <div className="resource-track"><div className="resource-fill" style={{ width: `${pct(value, max)}%` }} /></div>
  </div>
);

export const CombatPanel = () => {
  const combat = useGameStore((state) => state.combat);
  const server = useGameStore((state) => state.server);
  const combatAction = useGameStore((state) => state.combatAction);
  const [consumablesOpen, setConsumablesOpen] = useState(false);

  if (!combat) return null;

  const skillIds = getUsableSkillIds(server);
  const party = combat.partyMembers ?? [];
  const consumables = getCombatConsumables(server.player.inventory, server.player.level);

  return (
    <div className="combat-overlay">
      <section className="panel combat-panel">
        <div className="combat-header">
          <div>
            <div className="section-title">⚔️ Бой · Раунд {combat.turn}</div>
            <h1>{combat.enemy.name}</h1>
          </div>
          <span className="combat-source">{combat.source === 'arena' ? 'Арена' : combat.source === 'dungeon' ? 'Данж' : 'Фарм'}</span>
        </div>

        <div className="combat-bars">
          <div className="combatant-card player-card">
            <strong>{combat.player.name}</strong>
            <ResourceBar label="HP" value={combat.player.hp} max={combat.player.maxHp} kind="hp" />
            <ResourceBar label="Mana" value={combat.player.mana} max={combat.player.maxMana} kind="mana" />
            <span>ATK {combat.player.attack} · DEF {combat.player.defense}</span>
          </div>
          <div className="combatant-card danger">
            <strong>{combat.enemy.name}</strong>
            <ResourceBar label="HP" value={combat.enemy.hp} max={combat.enemy.maxHp} kind="hp" />
            <span>Lv. {combat.enemy.level}</span>
            <span>ATK {combat.enemy.attack} · DEF {combat.enemy.defense}</span>
          </div>
        </div>

        {party.length > 0 && (
          <div className="party-combat-board">
            <div className="section-title">Пати · прошлый раунд</div>
            {party.map((member) => (
              <div key={member.id} className={`party-member-card ${member.id === server.player.id ? 'self-line' : ''}`}>
                <div className="party-member-top">
                  <strong>{member.name}</strong>
                  <span>{getPartyRoleName(member.role)}</span>
                </div>
                <ResourceBar label="HP" value={member.id === server.player.id ? combat.player.hp : member.hp} max={member.maxHp} kind="hp" />
                <ResourceBar label="Mana" value={member.id === server.player.id ? combat.player.mana : member.mana} max={member.maxMana} kind="mana" />
                <div className="party-round-stats">
                  <span className="dps-stat">DMG {member.damageLastRound}</span>
                  <span className="tank-stat">HIT {member.damageTakenLastRound}</span>
                  <span className="heal-stat">HEAL {member.healingLastRound}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="action-grid combat-actions">
          <button onClick={() => combatAction('basic')}>Атака</button>
          {skillIds.map((skillId) => {
            const skill = getSkillById(skillId);
            const cd = combat.player.cooldowns[skillId] ?? 0;
            const disabled = cd > 0 || combat.player.mana < (skill?.manaCost ?? 0);
            return (
              <button key={skillId} onClick={() => combatAction(skillId)} disabled={disabled}>
                {skill?.name ?? skillId}{cd > 0 ? ` (${cd})` : ''}
              </button>
            );
          })}
          <button onClick={() => setConsumablesOpen((value) => !value)} disabled={consumables.length === 0}>
            Расходники{consumables.length > 0 ? ` · ${consumables.length}` : ''}
          </button>
        </div>

        {consumablesOpen && consumables.length > 0 && (
          <div className="consumable-menu">
            {consumables.map(({ entry, item }) => (
              <button key={`${entry.itemId}_${entry.amount}`} onClick={() => { combatAction(`consume:${entry.itemId}`); setConsumablesOpen(false); }}>
                {item?.name ?? entry.itemId} · ×{entry.amount}
              </button>
            ))}
          </div>
        )}

        <div className="combat-log">
          {combat.log.map((line, index) => <div key={`${line}_${index}`}>{line}</div>)}
        </div>
      </section>
    </div>
  );
};
