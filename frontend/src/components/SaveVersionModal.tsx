import React from 'react';

interface SaveVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOverwrite: () => void;
  onNewVersion: () => void;
}

export const SaveVersionModal: React.FC<SaveVersionModalProps> = ({ isOpen, onClose, onOverwrite, onNewVersion }) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        width: '400px',
        maxWidth: '90%',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ marginTop: 0 }}>Save Conversation</h3>
        <p>How would you like to save your progress?</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
          <button
            onClick={onOverwrite}
            style={{ padding: '10px', cursor: 'pointer', backgroundColor: '#f0f0f0', border: '1px solid #ccc', borderRadius: '4px' }}
          >
            <strong>Overwrite Current Version</strong>
            <div style={{ fontSize: '0.8em', color: '#666' }}>Update the existing version with latest changes.</div>
          </button>

          <button
            onClick={onNewVersion}
            style={{ padding: '10px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            <strong>Save as New Version</strong>
            <div style={{ fontSize: '0.8em', color: '#eee' }}>Create a fresh checkpoint. Ideal for trying new prompts.</div>
          </button>

          <button
            onClick={onClose}
            style={{ padding: '8px', cursor: 'pointer', marginTop: '10px', backgroundColor: 'transparent', border: 'none', color: '#666' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
