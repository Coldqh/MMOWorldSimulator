import { useMemo, useState } from 'react';
import { CLASSES, getSkillById } from '../../content/classes';
import { getItemById } from '../../content/items';
import { RACES } from '../../content/races';
import { useGameStore } from '../../state/gameStore';

const starterWeaponByClass: Record<string, string> = {
  warrior: 'rusty_sword',
  ranger: 'training_bow',
  mage: 'cracked_wand',
  priest: 'cracked_wand'
};

const statShort: Record<string, string> = {
  hp: 'HP',
  mana: 'Mana',
  attack: 'ATK',
  magic: 'MAG',
  defense: 'DEF',
  speed: 'SPD'
};

export const StartScreen = () => {
  const newGame = useGameStore((state) => state.newGame);
  const [name, setName] = useState('Newbie');
  const [raceId, setRaceId] = useState(RACES[0]?.id ?? 'human');
  const [classId, setClassId] = useState(CLASSES[0]?.id ?? 'warrior');
  const [step, setStep] = useState<'race' | 'class' | 'confirm'>('race');
  const selectedRace = RACES.find((entry) => entry.id === raceId) ?? RACES[0];
  const selectedClass = CLASSES.find((entry) => entry.id === classId) ?? CLASSES[0];

  const starterItems = useMemo(() => {
    const weapon = getItemById(starterWeaponByClass[classId] ?? 'rusty_sword');
    const chest = getItemById('linen_armor');
    const cap = getItemById('cloth_cap');
    const boots = getItemById('worn_boots');
    const potion = getItemById('minor_potion');
    const mana = getItemById('mana_potion');
    const stone = getItemById('sharpening_stone');
    return [weapon?.name, chest?.name, cap?.name, boots?.name, potion ? `${potion.name} ×3` : undefined, mana ? `${mana.name} ×2` : undefined, stone ? `${stone.name} ×2` : undefined].filter(Boolean);
  }, [classId]);

  return (
    <div className="start-screen">
      <section className="panel start-panel">
        <div className="game-logo">MMO World Simulator</div>
        <div className="step-pills">
          <button className={step === 'race' ? 'active' : ''} onClick={() => setStep('race')}>1. Раса</button>
          <button className={step === 'class' ? 'active' : ''} onClick={() => setStep('class')}>2. Класс</button>
          <button className={step === 'confirm' ? 'active' : ''} onClick={() => setStep('confirm')}>3. Старт</button>
        </div>
      </section>

      <section className="panel">
        <div className="section-title">Имя</div>
        <input className="text-input" value={name} maxLength={18} onChange={(event) => setName(event.target.value)} />
      </section>

      {step === 'race' && (
        <section className="panel">
          <div className="section-title">Раса</div>
          <div className="choice-list">
            {RACES.map((race) => (
              <button key={race.id} className={`choice-row ${raceId === race.id ? 'selected' : ''}`} onClick={() => setRaceId(race.id)}>
                <strong>{race.name}</strong>
                <span>{race.description}</span>
                <small>
                  {Object.entries(race.statBonus).map(([key, value]) => `${statShort[key] ?? key} ${value && value > 0 ? '+' : ''}${value}`).join(' · ')}
                </small>
              </button>
            ))}
          </div>
          <button className="primary-button wide-button" onClick={() => setStep('class')}>Дальше</button>
        </section>
      )}

      {step === 'class' && (
        <section className="panel">
          <div className="section-title">Класс</div>
          <div className="choice-list">
            {CLASSES.map((entry) => (
              <button key={entry.id} className={`choice-row ${classId === entry.id ? 'selected' : ''}`} onClick={() => setClassId(entry.id)}>
                <strong>{entry.name}</strong>
                <span>{entry.role}</span>
                <small>{entry.description}</small>
              </button>
            ))}
          </div>
          <div className="action-grid spaced-actions">
            <button onClick={() => setStep('race')}>Назад</button>
            <button className="primary-button" onClick={() => setStep('confirm')}>Дальше</button>
          </div>
        </section>
      )}

      {step === 'confirm' && selectedRace && selectedClass && (
        <section className="panel summary-panel">
          <div className="section-title">Старт</div>
          <h1>{name || 'Newbie'}</h1>
          <p className="muted">{selectedRace.name} · {selectedClass.name}</p>

          <div className="list-lines compact-list">
            <div className="list-line"><span>Роль</span><strong>{selectedClass.role}</strong></div>
            <div className="list-line"><span>Навык 1</span><strong>{getSkillById(selectedClass.skillIds[0])?.name ?? 'нет'}</strong></div>
            <div className="list-line"><span>Навык 2</span><strong>{getSkillById(selectedClass.skillIds[1])?.name ?? 'нет'}</strong></div>
            <div className="list-line"><span>Золото</span><strong>45g</strong></div>
          </div>

          <div className="section-title sub-title">Снаряжение</div>
          <div className="tag-list">
            {starterItems.map((item) => <span key={item}>{item}</span>)}
          </div>

          <div className="action-grid spaced-actions">
            <button onClick={() => setStep('class')}>Назад</button>
            <button className="primary-button" onClick={() => newGame(name || 'Newbie', raceId, classId)}>Войти</button>
          </div>
        </section>
      )}
    </div>
  );
};
