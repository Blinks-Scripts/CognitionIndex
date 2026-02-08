import React, { useEffect, useState, useCallback } from 'react';
import { sendForTranscription } from '../utils/audioUtils';
import { UserInput } from '../components/UserInput';
import { TextTranscription } from '../components/TextTranscription';
import { ConversationList } from '../components/ConversationList';
import { PipelineResults } from '../components/PipelineResults';
import { useCognition } from '../hooks/useCognition';
import { newQuestionWorker } from '../services/aiWorkers';
import { systemPrompt as interviewer } from '../agents/professionalInterviewer/systemPrompt';

export const Home: React.FC<{ id: string; label: string }> = ({ label }) => {
  const [openaiKey, setOpenaiKey] = useState('');

  const {
    conversations,
    currentConversation,
    currentConversationTitle,
    setCurrentConversation,
    extractedSignals,
    signalAssessment,
    cognitionArtifact,
    cognitionArtifactEvaluation,
    isLoading,
    showSections,
    setText,
    toggleSection,
    handleExtractSignals,
    handleAssessSignals,
    handleGenerateCognitionArtifact,
    handleEvaluateCognitionArtifact,
    handleGetFollowupQuestion,
    handleDeleteConversation,
    handleFullPipeline,
    handleLoadConversation,
    handleStoreConversationAndArtifacts,
    handleSetConversationTitle,
    startNewConversation
  } = useCognition(openaiKey);

  const [tempTitle, setTempTitle] = useState('');
  const handleSetTempTitle = (title: string) => {
    setTempTitle(title);
  };

  useEffect(() => {
    const savedKey = localStorage.getItem('openaiKey');
    if (savedKey) {
      setOpenaiKey(savedKey);
    }
  }, []);

  const handleSaveKey = useCallback(() => {
    localStorage.setItem('openaiKey', openaiKey);
  }, [openaiKey]);

  const handleClickNewQuestion = async () => {
    const newQuestion = await newQuestionWorker(openaiKey);
    startNewConversation(newQuestion, interviewer);
  };

  const handleSetText = (newText: string) => {
    if (currentConversation.length > 0) {
      setCurrentConversation([...currentConversation, { role: 'user', content: newText }]);
    } else {
      setText(newText);
    }
  };

  const transcribeFn = async (audio: Blob | null, file: File | null) => {
    return sendForTranscription(audio, file, openaiKey);
  };

  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const handleSetCurrentConversationTitle = (title: string) => {
    handleSetConversationTitle(title);
    handleSetTempTitle('');
    setIsEditingTitle(false);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>{label}</h1>

      <div style={{ display: 'flex', gap: '20px', marginBottom: '40px' }}>
        <input
          type="password"
          placeholder="OpenAI Key"
          value={openaiKey}
          onChange={(e) => setOpenaiKey(e.target.value)}
          style={{ padding: '8px', width: '300px' }}
        />
        <button onClick={handleSaveKey}>Save Key</button>
      </div>

      <ConversationList
        conversations={conversations}
        onLoad={handleLoadConversation}
        onDelete={handleDeleteConversation}
      />

      <div style={{ marginTop: '40px', border: '1px solid #ccc', padding: '20px', borderRadius: '8px' }}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button onClick={handleStoreConversationAndArtifacts}>Store Progress</button>
          <button onClick={handleClickNewQuestion}>Start New Session</button>
          <button onClick={handleFullPipeline} disabled={currentConversation.length === 0}>
            Run Full ETL Pipeline
          </button>
        </div>

        <div className="current-session">
          <h3>Current Session</h3>
          {isEditingTitle && (
            <div>
              <input
                type="text"
                value={tempTitle}
                onChange={(e) => handleSetTempTitle(e.target.value)}
                style={{ padding: '8px', width: '300px' }}
              />
              <button onClick={() => handleSetCurrentConversationTitle(tempTitle)}>Save Title</button>
            </div>
          )}
          {!isEditingTitle && (
            <>
              <p><strong>Title:</strong> {currentConversationTitle}</p>
              <button onClick={() => setIsEditingTitle(true)}>Edit Title</button>
            </>
          )}

          <p><strong>Question:</strong> {currentConversation[1]?.content || 'None'}</p>
          <p><strong>Initial Answer:</strong> {currentConversation[2]?.content || 'None'}</p>

          {currentConversation.length > 3 && (
            <div style={{ margin: '20px 0', borderLeft: '4px solid #eee', paddingLeft: '15px' }}>
              <h4>Followup Discussion:</h4>
              {currentConversation.slice(3).map((item, index) => (
                <p key={index}><strong>{item.role}:</strong> {item.content}</p>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button onClick={handleGetFollowupQuestion} disabled={currentConversation.length === 0}>
              Ask Followup
            </button>
          </div>
        </div>

        <div style={{ marginTop: '30px' }}>
          <UserInput setText={handleSetText} transcribeFn={transcribeFn} />
        </div>
      </div>

      <div style={{ marginTop: '40px' }}>
        <h2>Pipeline Controls</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => handleExtractSignals()}>1. Extract Signals</button>
          <button onClick={() => handleAssessSignals()}>2. Assess Signals</button>
          <button onClick={() => handleGenerateCognitionArtifact()}>3. Generate Artifact</button>
          <button onClick={() => handleEvaluateCognitionArtifact()}>4. Evaluate Artifact</button>
        </div>

        <PipelineResults
          extractedSignals={extractedSignals}
          signalAssessment={signalAssessment}
          cognitionArtifact={cognitionArtifact}
          cognitionArtifactEvaluation={cognitionArtifactEvaluation}
          isLoading={isLoading}
          showSections={showSections}
          toggleSection={toggleSection}
        />
      </div>
    </div>
  );
};