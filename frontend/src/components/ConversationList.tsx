import React, { useRef } from 'react';
import type { ConversationData, ConversationContainer } from '../hooks/useCognition';

interface ConversationListProps {
  conversations: Map<string, ConversationContainer>;
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  selectedIdsRef: React.MutableRefObject<string[]>;
  onLoad: (key: string) => void;
  onDelete: (key: string) => void;
  onBulkUpload?: (newList: ConversationData[]) => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({ conversations, selectedIds, onSelectedIdsChange, selectedIdsRef, onLoad, onDelete, onBulkUpload }) => {
  const [isSelectedAll, setIsSelectedAll] = React.useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleSelected = (isSelected: boolean, key: string) => {
    if (isSelected) {
      onSelectedIdsChange([...selectedIds, key]);
    } else {
      onSelectedIdsChange(selectedIds.filter((id: string) => id !== key));
    }
  };

  React.useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);

  React.useEffect(() => {
    if (isSelectedAll) {
      onSelectedIdsChange(Array.from(conversations.keys()));
    } else {
      onSelectedIdsChange([]);
    }
  }, [isSelectedAll, conversations]);

  const handleSettingSelectedAll = (checked: boolean) => {
    setIsSelectedAll(checked);
  };

  const handleDownloadSelected = () => {
    if (selectedIds.length === 0) return;

    const selectedData = selectedIds.map(id => {
      const container = conversations.get(id);
      if (!container) return null;

      const activeVersion = container.versions.find(v => v.id === container.activeVersionId) || container.versions[0];
      const conversation = activeVersion.data;

      // Strip system prompt
      return {
        ...conversation,
        conversation: conversation.conversation.filter(m => m.role !== 'system')
      };
    }).filter(Boolean);
    const blob = new Blob([JSON.stringify(selectedData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `conversations_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const processFiles = async (files: FileList | null) => {
    if (!files || !onBulkUpload) return;

    const allConvos: ConversationData[] = [];
    for (const file of Array.from(files)) {
      if (!file.name.endsWith('.json')) continue;

      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (Array.isArray(data)) {
          allConvos.push(...data);
        } else {
          allConvos.push(data);
        }
      } catch (e) {
        console.error(`Failed to parse file: ${file.name}`, e);
      }
    }

    if (allConvos.length > 0) {
      onBulkUpload(allConvos);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Conversations</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleDownloadSelected}
            disabled={selectedIds.length === 0}
            title="Download selected as JSON"
          >
            Download Selected
          </button>

          <button onClick={() => fileInputRef.current?.click()} title="Upload one or more JSON files">
            Upload Files
          </button>
          <input
            type="file"
            ref={fileInputRef}
            multiple
            accept=".json"
            style={{ display: 'none' }}
            onChange={(e) => processFiles(e.target.files)}
          />

          <button onClick={() => folderInputRef.current?.click()} title="Upload a folder containing JSON files">
            Upload Folder
          </button>
          <input
            type="file"
            ref={folderInputRef}
            {...({ webkitdirectory: "" } as any)}
            style={{ display: 'none' }}
            onChange={(e) => processFiles(e.target.files)}
          />
        </div>
      </div>

      {conversations.size > 0 && (
        <>
          <div style={{ display: 'flex', flexDirection: 'row', gap: '10px', marginBottom: '8px' }}>
            <input type="checkbox" checked={isSelectedAll} onChange={(e) => handleSettingSelectedAll(e.target.checked)} />
            <label>Select All</label>
          </div>
          <ul style={{ padding: 0 }}>
            {Array.from(conversations.keys()).map((key) => {
              const conversation = conversations.get(key);
              if (!conversation) return null;
              return (
                <div key={key} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px', marginBottom: '8px', padding: '8px', border: '1px solid #eee', borderRadius: '4px' }}>
                  <input type="checkbox" checked={selectedIds.includes(key)} onChange={(e) => handleSelected(e.target.checked, key)} />
                  <li
                    onClick={() => onLoad(key)}
                    style={{ cursor: 'pointer', listStyleType: 'none', textDecoration: 'underline', flexGrow: 1 }}
                  >
                    {conversation.title || 'Empty Title'}
                  </li>
                  <button onClick={() => onDelete(key)} style={{ color: '#d93025', border: '1px solid #dadce0' }}>Delete</button>
                </div>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
};
