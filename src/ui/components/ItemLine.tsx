import { getItemById } from '../../content/items';

interface Props {
  itemId: string;
  amount?: number;
  enhancement?: number;
  cardIds?: string[];
  showLevel?: boolean;
}

const sourceText = (item: NonNullable<ReturnType<typeof getItemById>>) => {
  if (!item.sourceType || item.sourceType === 'world') return '';
  if (item.sourceType === 'general') return ' · world set';
  if (item.sourceType === 'dungeon') return ' · dungeon';
  if (item.sourceType === 'raid') return ' · raid';
  return '';
};

export const ItemLine = ({ itemId, amount, enhancement = 0, cardIds = [], showLevel = false }: Props) => {
  const item = getItemById(itemId);
  if (!item) return <span>{itemId}</span>;

  const bindText = item.bindType === 'bindOnPickup' ? ' · BoP' : '';
  const setText = item.setId && showLevel ? ' · set' : '';

  return (
    <span className={`rarity rarity-${item.rarity}`}>
      {item.name}{enhancement > 0 ? ` +${enhancement}` : ''}{showLevel ? ` · Lv. ${item.levelReq}` : ''}{showLevel ? sourceText(item) : ''}{bindText}{setText}{cardIds.length > 0 ? ` · 🃏${cardIds.length}` : ''}{amount !== undefined ? ` ×${amount}` : ''}
    </span>
  );
};
