import { getItemById } from '../../content/items';

interface Props {
  itemId: string;
  amount?: number;
  enhancement?: number;
  cardIds?: string[];
  showLevel?: boolean;
}

export const ItemLine = ({ itemId, amount, enhancement = 0, cardIds = [], showLevel = false }: Props) => {
  const item = getItemById(itemId);
  if (!item) return <span>{itemId}</span>;

  return (
    <span className={`rarity rarity-${item.rarity}`}>
      {item.name}{enhancement > 0 ? ` +${enhancement}` : ''}{showLevel ? ` · Lv. ${item.levelReq}` : ''}{cardIds.length > 0 ? ` · 🃏${cardIds.length}` : ''}{amount !== undefined ? ` ×${amount}` : ''}
    </span>
  );
};
