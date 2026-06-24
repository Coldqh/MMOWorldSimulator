import { formatTime } from '../../engine/time';
import type { NewsEntry } from '../../types/game';

interface Props {
  items: NewsEntry[];
  limit?: number;
}

export const NewsList = ({ items, limit = 20 }: Props) => {
  return (
    <div className="news-list">
      {items.slice(0, limit).map((entry) => (
        <article key={entry.id} className={`news-entry ${entry.important ? 'important' : ''}`}>
          <span className="news-meta">D{entry.day} · {formatTime(entry.minute)} · {entry.type}</span>
          <span>{entry.text}</span>
        </article>
      ))}
    </div>
  );
};
