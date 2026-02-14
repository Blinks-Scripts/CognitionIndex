import React, { useEffect, useState, useCallback } from 'react';
import { sendForTranscription } from '../utils/audioUtils';
import { UserInput } from '../components/UserInput';
import { useCognitionContext } from '../context/CognitionContext';
import { newQuestionWorker } from '../services/aiWorkers';
import { SaveVersionModal } from '../components/SaveVersionModal';
import { VersionTabs } from '../components/VersionTabs';
import './Home.css';

export const Home: React.FC<{ id: string; label: string }> = ({ label }) => {
  const {
    openaiKey,
    currentConversation,
    currentConversationTitle,
    setCurrentConversation,
    handleGetFollowupQuestion,
    handleFullPipeline,
    handleSetConversationTitle,
    startNewConversation,
    currentVersions,
    currentActiveVersionId,
    handleSaveVersion,
    handleSwitchVersion,
    setText
  } = useCognitionContext();

  const [sessionIsOpen, setSessionIsOpen] = useState(false);
  const sessionContainerClass = React.useMemo(() => {
    const baseClass = "session-container";
    return sessionIsOpen ? baseClass : baseClass + " collapsed";
  }, [sessionIsOpen]);
  const controlsContainerClass = React.useMemo(() => {
    return "controls-container";
  }, []);
  const [tempTitle, setTempTitle] = useState('');
  const handleSetTempTitle = (title: string) => {
    setTempTitle(title);
  };
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  const handleOpenSaveModal = () => {
    setIsSaveModalOpen(true);
  };

  const handleCloseSaveModal = () => {
    setIsSaveModalOpen(false);
  };

  const onOverwrite = useCallback(() => {
    handleSaveVersion('overwrite');
    setIsSaveModalOpen(false);
  }, [handleSaveVersion]);

  const onNewVersion = useCallback(() => {
    handleSaveVersion('new');
    setIsSaveModalOpen(false);
  }, [handleSaveVersion]);


  const handleClickNewQuestion = async () => {
    const newQuestion = await newQuestionWorker(openaiKey);
    startNewConversation(newQuestion);
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

  const handleDeleteMessage = (message: any) => {
    setCurrentConversation(currentConversation.filter((item: any) => item !== message));
  };

  const handleToggleSessionVisibility = () => {
    setSessionIsOpen(prev => !prev);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>{label}</h1>


      <div className={sessionContainerClass}>

        <div className="current-session">
          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Current Session</h3>
            <button onClick={handleToggleSessionVisibility}>{sessionIsOpen ? 'Hide' : 'Show'}</button>
          </div>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <p><strong>Title:</strong> {currentConversationTitle}</p>
                <button onClick={() => setIsEditingTitle(true)} style={{ padding: '2px 8px', fontSize: '0.8rem' }}>Edit</button>
              </div>
              <VersionTabs
                versions={currentVersions}
                activeVersionId={currentActiveVersionId || ''}
                onSwitchVersion={handleSwitchVersion}
              />
            </>
          )}

          <div className={controlsContainerClass}>
            <button onClick={handleOpenSaveModal}>Store Progress</button>
            <button onClick={handleClickNewQuestion}>Start New Session</button>
            <button onClick={handleFullPipeline} disabled={currentConversation.length === 0}>
              Run Full ETL Pipeline
            </button>
          </div>
          {(() => {
            const displayMessages = currentConversation.filter((m: any) => m.role !== 'system');
            return (
              <>
                <p><strong>Question:</strong> {displayMessages[0]?.content || 'None'}</p>
                <p><strong>Initial Answer:</strong> {displayMessages[1]?.content || 'None'}</p>

                {displayMessages.length > 2 && (
                  <div style={{ margin: '20px 0', borderLeft: '4px solid #eee', paddingLeft: '15px' }}>
                    <h4>Followup Discussion:</h4>
                    {displayMessages.slice(2).map((item: any, index: number) => (
                      <React.Fragment key={index}>
                        <p><strong>{item.role}:</strong> {item.content}</p>
                        <button onClick={() => handleDeleteMessage(item)}>Delete this message</button>
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </>
            );
          })()}

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

      {/* Pipeline Controls - Hiding as per user request, but keeping code for potential future use
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
      */}

      <SaveVersionModal
        isOpen={isSaveModalOpen}
        onClose={handleCloseSaveModal}
        onOverwrite={onOverwrite}
        onNewVersion={onNewVersion}
      />
    </div>
  );
};