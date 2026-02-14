import React, { useState } from 'react';
import { useCognitionContext } from '../context/CognitionContext';
import './Settings.css';

export const Settings: React.FC<{ id: string; label: string }> = ({ label }) => {
  const { openaiKey, setOpenaiKey } = useCognitionContext();
  const [inputType, setInputType] = useState('password');

  return (
    <div className="settings-container">
      <h1>{label}</h1>
      <div className="settings-section">
        <h2>API Configuration</h2>
        <div className="input-group">
          <label htmlFor="openai-key">OpenAI API Key</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              id="openai-key"
              type={inputType}
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder="sk-..."
              style={{ flex: 1, padding: '8px', fontSize: '1rem' }}
            />
            <button
              onClick={() => setInputType(inputType === 'password' ? 'text' : 'password')}
              style={{ padding: '8px 12px' }}
            >
              {inputType === 'password' ? 'Show' : 'Hide'}
            </button>
          </div>
          <p className="help-text">
            Your API key is stored locally in your browser and is encrypted.
            It is never sent to our servers, only directly to OpenAI during analysis.
          </p>
        </div>
      </div>
    </div>
  );
};
