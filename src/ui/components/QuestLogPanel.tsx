import { getQuestById, QUESTS } from '../../content/quests';
import type { QuestDefinition, QuestObjective, QuestStatus } from '../../types/game';
import { getQuestGiverById } from '../../content/questGivers';
import { getDungeonById, getMobById } from '../../content/world';
import { useGameStore } from '../../state/gameStore';
import { getQuestProgressText, getQuestState, getQuestTurnInGiverId } from '../../systems/questSystem';

const cleanQuestTitle = (title: string) =>
  title
    .replace(/^\s*(🛡️\s*)?!\s*/u, '')
    .replace(/^\s*🛡️\s*!\s*/u, '')
    .replace(/^(Следы у входа|Открыть проход):\s*/i, 'Открыть: ')
    .trim();

const cleanInstanceName = (name: string) =>
  name.replace(/^(Данж|Рейд):\s*/i, '').trim();

const isUnlockQuest = (quest: QuestDefinition) => quest.importance === 'unlock';

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

const statusText: Record<QuestStatus, string> = {
  available: 'доступно',
  active: 'активно',
  readyToTurnIn: 'сдать',
  completed: 'завершено',
  locked: 'закрыто',
};

export const QuestLogPanel = ({ mode }: { mode: 'active' | 'completed' }) => {
  const server = useGameStore((state) => state.server);
  const turnInQuest = useGameStore((state) => state.turnInQuest);
  const entries = Object.entries(server.questStates ?? {})
    .map(([questId]) => getQuestById(questId))
    .filter((quest): quest is QuestDefinition => Boolean(quest))
    .filter((quest) => {
      const status = getQuestState(server, quest.id).status;
      if (mode === 'completed') return status === 'completed';
      return status === 'active' || status === 'readyToTurnIn';
    })
    .sort((a, b) => a.levelReq - b.levelReq || a.title.localeCompare(b.title));

  const availableCount = QUESTS.filter((quest) => getQuestState(server, quest.id).status === 'available').length;

  return (
    <section className="panel">
      <div className="section-title">{mode === 'completed' ? 'Завершённые задания' : 'Активные задания'}</div>
      {mode === 'active' && entries.length === 0 && <p className="muted">Активных квестов нет. Доступных: {availableCount}.</p>}
      {mode === 'completed' && entries.length === 0 && <p className="muted">Завершённых квестов нет.</p>}
      <div className="list-lines">
        {entries.map((quest) => {
          const state = getQuestState(server, quest.id);
          const giver = getQuestGiverById(quest.giverId);
          const turnIn = getQuestGiverById(getQuestTurnInGiverId(quest));
          const unlockText = unlockTargetText(quest);
          const lines = objectiveLines(server, quest);

          return (
            <div key={quest.id} className={'list-line quest-log-line ' + (state.status === 'readyToTurnIn' ? 'ready-line ' : '') + (isUnlockQuest(quest) ? 'quest-unlock-line' : '')}>
              <span>
                <strong>{isUnlockQuest(quest) ? '🛡️ ! ' : ''}{cleanQuestTitle(quest.title)}</strong>
                <small>{statusText[state.status]} · Lv. {quest.levelReq} · {giver?.name ?? quest.giverId}</small>
                {isUnlockQuest(quest) && unlockText && <small>Открывает: {unlockText}</small>}
                {lines.length > 0 && <small>Убей: {lines.join(' · ')}</small>}
                {state.status !== 'completed' && <small>Прогресс: {getQuestProgressText(server, quest)}</small>}
                {state.status === 'readyToTurnIn' && <small>Вернись к: {turnIn?.name ?? getQuestTurnInGiverId(quest)}</small>}
              </span>
              {state.status === 'readyToTurnIn' && <button className="primary-button" onClick={() => turnInQuest(quest.id)}>Сдать</button>}
            </div>
          );
        })}
      </div>
    </section>
  );
};
