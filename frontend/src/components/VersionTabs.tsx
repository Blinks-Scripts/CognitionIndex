import React from 'react';
import type { ConversationVersion } from '../hooks/useCognition';

interface VersionTabsProps {
  versions: ConversationVersion[];
  activeVersionId: string;
  onSwitchVersion: (versionId: string) => void;
}

export const VersionTabs: React.FC<VersionTabsProps> = ({ versions, activeVersionId, onSwitchVersion }) => {
  if (!versions || versions.length <= 1) return null;

  // Sort versions by timestamp (oldest first)
  const sortedVersions = [...versions].sort((a, b) => a.timestamp - b.timestamp);

  return (
    <div style={{ display: 'flex', gap: '5px', marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '5px', overflowX: 'auto' }}>
      {sortedVersions.map((version, index) => {
        const isActive = version.id === activeVersionId;
        const date = new Date(version.timestamp);
        const label = `v${index + 1}`;
        const title = date.toLocaleString();

        return (
          <button
            key={version.id}
            onClick={() => onSwitchVersion(version.id)}
            title={title}
            style={{
              padding: '6px 12px',
              cursor: 'pointer',
              backgroundColor: isActive ? '#e6f7ff' : 'transparent',
              border: isActive ? '1px solid #1890ff' : '1px solid transparent',
              borderRadius: '4px 4px 0 0',
              color: isActive ? '#1890ff' : '#666',
              fontWeight: isActive ? 'bold' : 'normal',
              borderBottom: isActive ? 'none' : '1px solid transparent'
            }}
          >
            {label}
            <span style={{ fontSize: '0.75em', marginLeft: '5px', opacity: 0.7 }}>
              {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </button>
        );
      })}
    </div>
  );
};
