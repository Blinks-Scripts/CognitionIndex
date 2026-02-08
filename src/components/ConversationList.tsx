import React from 'react';
import type { ConversationData } from '../hooks/useCognition';

interface ConversationListProps {
  conversations: Map<string, ConversationData>;
  onLoad: (key: string) => void;
  onDelete: (key: string) => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({ conversations, onLoad, onDelete }) => {
  const [isSelectedIds, setIsSelectedIds] = React.useState<string[]>([]);
  const [isSelectedAll, setIsSelectedAll] = React.useState(false);
  const handleSelected = (isSelected: boolean, key: string) => {
    if (isSelected) {
      setIsSelectedIds([...isSelectedIds, key]);
    } else {
      setIsSelectedIds(isSelectedIds.filter((id: string) => id !== key));
    }
  };

  React.useEffect(() => {
    if (isSelectedAll) {
      setIsSelectedIds(Array.from(conversations.keys()));
    } else {
      setIsSelectedIds([]);
    }
  }, [isSelectedAll]);

  const handleSettingSelectedAll = (checked: boolean) => {
    setIsSelectedAll(checked);
  };

  if (conversations.size === 0) return null;

  return (
    <div>
      <h2>Conversations</h2>
      <div style={{ display: 'flex', flexDirection: 'row', gap: '10px', marginBottom: '8px' }}>
        <input type="checkbox" checked={isSelectedAll} onChange={(e) => handleSettingSelectedAll(e.target.checked)} />
        <label>Select All</label>
      </div>
      <ul>
        {Array.from(conversations.keys()).map((key) => {
          const conversation = conversations.get(key);
          if (!conversation) return null;
          return (
            <div key={key} style={{ display: 'flex', flexDirection: 'row', gap: '10px', marginBottom: '8px' }}>
              <input type="checkbox" checked={isSelectedIds.includes(key)} onChange={(e) => handleSelected(e.target.checked, key)} />
              <li
                onClick={() => onLoad(key)}
                style={{ cursor: 'pointer', listStyleType: 'none', textDecoration: 'underline' }}
              >
                {conversation.title || 'Empty Title'}
              </li>
              <div style={{ flexGrow: 1 }} />
              <button onClick={() => onDelete(key)}>Delete</button>
            </div>
          );
        })}
      </ul>
    </div>
  );
};
