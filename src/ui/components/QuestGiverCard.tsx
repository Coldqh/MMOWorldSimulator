import { useState } from 'react';
import type { QuestGiverDefinition } from '../../types/game';
import { useGameStore } from '../../state/gameStore';
import {
  getActiveQuestsForGiver,
  getAvailableQuestsForGiver,
  getQuestProgressText,
  getReadyToTurnInQuestsForGiver,
  hasAvailableQuestForGiver,
} from '../../systems/questSystem';

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

  const openDialog = () => {
    talkToQuestGiver(giver.id);
    setOpen((value) => !value);
  };

  return (
    <article className="content-card info-card quest-giver-card">
      <strong>{hasMarker && <span className="quest-marker" style={{ color: '#ffd84d', fontWeight: 900 }}>!</span>} {giver.name}</strong>
      <span>{giver.shortText ?? 'Задания'}</span>
      {giver.locationText && <span>{giver.locationText}</span>}
      <button onClick={openDialog}>Поговорить</button>

      {open && (
        <div className="quest-dialog">
          {ready.length === 0 && available.length === 0 && active.length === 0 && <p className="muted">Сейчас работы нет.</p>}

          {ready.map((quest) => (
            <div key={quest.id} className="list-line quest-line ready-line">
              <span>
                <strong>? {quest.title}</strong>
                <small>{quest.completeText}</small>
              </span>
              <button className="primary-button" onClick={() => turnInQuest(quest.id)}>Сдать</button>
            </div>
          ))}

          {available.map((quest) => (
            <div key={quest.id} className="list-line quest-line">
              <span>
                <strong>! {quest.title}</strong>
                <small>{quest.introText}</small>
                <small>Награда: XP {quest.reward.xp} · Gold {quest.reward.gold}</small>
              </span>
              <button onClick={() => acceptQuest(quest.id)}>Принять</button>
            </div>
          ))}

          {active.map((quest) => (
            <div key={quest.id} className="list-line quest-line">
              <span>
                <strong>{quest.title}</strong>
                <small>{quest.progressText ?? 'Задание выполняется.'}</small>
                <small>Прогресс: {getQuestProgressText(server, quest)}</small>
              </span>
              <button disabled>В работе</button>
            </div>
          ))}
        </div>
      )}
    </article>
  );
};
