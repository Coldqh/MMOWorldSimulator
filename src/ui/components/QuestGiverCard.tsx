import { useState } from 'react';
import type { QuestDefinition, QuestGiverDefinition, QuestObjective } from '../../types/game';
import { getDungeonById, getMobById } from '../../content/world';
import { useGameStore } from '../../state/gameStore';
import {
  getActiveQuestsForGiver,
  getAvailableQuestsForGiver,
  getQuestProgressText,
  getQuestState,
  getReadyToTurnInQuestsForGiver,
  hasAvailableQuestForGiver,
} from '../../systems/questSystem';

const cleanQuestTitle = (title: string) =>
  title
    .replace(/^\s*(🛡️\s*)?!\s*/u, '')
    .replace(/^\s*🛡️\s*!\s*/u, '')
    .replace(/^(Следы у входа|Открыть проход):\s*/i, 'Открыть: ')
    .trim();

const cleanInstanceName = (name: string) =>
  name.replace(/^(Данж|Рейд):\s*/i, '').trim();

const isUnlockQuest = (quest: Pick<QuestDefinition, 'importance'>) => quest.importance === 'unlock';

const unlockTypeText = (type?: string) => {
  if (type === 'raid') return 'рейд';
  if (type === 'dungeon') return 'данж';
  if (type === 'zone') return 'локация';
  return 'контент';
};

const unlockTargetText = (quest: QuestDefinition) => {
  if (!quest.unlockTargetId) return '';
  const instance = getDungeonById(quest.unlockTargetId);
  return unlockTypeText(quest.unlockTargetType) + ': ' + cleanInstanceName(instance?.name ?? quest.unlockTargetId);
};

const objectiveName = (objective: QuestObjective) => {
  if (objective.type === 'kill' && objective.targetId) return getMobById(objective.targetId)?.name ?? objective.targetId;
  if (objective.type === 'talk') return 'Поговорить с NPC';
  if (objective.type === 'dungeon' && objective.dungeonId) return cleanInstanceName(getDungeonById(objective.dungeonId)?.name ?? objective.dungeonId);
  return 'Цель';
};

const objectiveLines = (server: ReturnType<typeof useGameStore.getState>['server'], quest: QuestDefinition) => {
  const state = getQuestState(server, quest.id);
  return state.objectives.map((objective) => {
    if (objective.type === 'kill') return objectiveName(objective) + ' — ' + (objective.current ?? 0) + '/' + objective.required;
    if (objective.type === 'talk') return objectiveName(objective) + ' — ' + ((objective.current ?? 0) >= objective.required ? 'готово' : '0/1');
    return objectiveName(objective) + ' — ' + (objective.current ?? 0) + '/' + objective.required;
  });
};

const QuestTitle = ({ quest }: { quest: QuestDefinition }) => (
  <strong>{isUnlockQuest(quest) ? '🛡️ ! ' : ''}{cleanQuestTitle(quest.title)}</strong>
);

const QuestDetails = ({ quest, server }: { quest: QuestDefinition; server: ReturnType<typeof useGameStore.getState>['server'] }) => {
  const unlockText = unlockTargetText(quest);
  const lines = objectiveLines(server, quest);
  return (
    <>
      {isUnlockQuest(quest) && unlockText && <small>Открывает: {unlockText}</small>}
      {lines.length > 0 && <small>Убей: {lines.join(' · ')}</small>}
      <small>Прогресс: {getQuestProgressText(server, quest)}</small>
    </>
  );
};

export const QuestGiverCard = ({ giver }: { giver: QuestGiverDefinition }) => {
  const server = useGameStore((state) => state.server);
  const acceptQuest = useGameStore((state) => state.acceptQuest);
  const turnInQuest = useGameStore((state) => state.turnInQuest);
  const talkToQuestGiver = useGameStore((state) => state.talkToQuestGiver);
  const [open, setOpen] = useState(false);
  const available = getAvailableQuestsForGiver(server, giver.id);
  const active = getActiveQuestsForGiver(server, giver.id);
  const ready = getReadyToTurnInQuestsForGiver(server, giver.id);
  const hasMarker = hasAvailableQuestForGiver(server, giver.id);
  const hasUnlockMarker = [...available, ...ready, ...active].some(isUnlockQuest);
  const locationText = giver.locationText && giver.locationText.trim() !== (giver.shortText ?? '').trim()
    ? giver.locationText
    : undefined;

  const openDialog = () => {
    talkToQuestGiver(giver.id);
    setOpen((value) => !value);
  };

  return (
    <article className={'content-card info-card quest-giver-card ' + (hasUnlockMarker ? 'quest-unlock-giver-card' : '')}>
      <strong>
        {hasUnlockMarker && <span className="quest-shield-marker">🛡️!</span>}
        {!hasUnlockMarker && hasMarker && <span className="quest-marker" style={{ color: '#ffd84d', fontWeight: 900 }}>!</span>}
        {' '}{giver.name}
      </strong>
      <span>{giver.shortText ?? 'Задания'}</span>
      {locationText && <span>{locationText}</span>}
      <button onClick={openDialog}>Поговорить</button>

      {open && (
        <div className="quest-dialog">
          {ready.length === 0 && available.length === 0 && active.length === 0 && <p className="muted">Сейчас работы нет.</p>}

          {ready.map((quest) => (
            <div key={quest.id} className={'list-line quest-line ready-line ' + (isUnlockQuest(quest) ? 'quest-unlock-line' : '')}>
              <span>
                <QuestTitle quest={quest} />
                {isUnlockQuest(quest) && unlockTargetText(quest) && <small>Откроется: {unlockTargetText(quest)}</small>}
              </span>
              <button className="primary-button" onClick={() => turnInQuest(quest.id)}>Сдать</button>
            </div>
          ))}

          {available.map((quest) => (
            <div key={quest.id} className={'list-line quest-line ' + (isUnlockQuest(quest) ? 'quest-unlock-line' : '')}>
              <span>
                <QuestTitle quest={quest} />
                <QuestDetails quest={quest} server={server} />
                <small>Награда: XP {quest.reward.xp} · Gold {quest.reward.gold}{quest.reward.unlockContentIds?.length ? ' · доступ' : ''}</small>
              </span>
              <button onClick={() => acceptQuest(quest.id)}>Принять</button>
            </div>
          ))}

          {active.map((quest) => (
            <div key={quest.id} className={'list-line quest-line ' + (isUnlockQuest(quest) ? 'quest-unlock-line' : '')}>
              <span>
                <QuestTitle quest={quest} />
                <QuestDetails quest={quest} server={server} />
              </span>
              <button disabled>В работе</button>
            </div>
          ))}
        </div>
      )}
    </article>
  );
};
