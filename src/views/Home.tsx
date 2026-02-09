import React, { useEffect, useState, useCallback } from 'react';
import { sendForTranscription } from '../utils/audioUtils';
import { UserInput } from '../components/UserInput';
import { TextTranscription } from '../components/TextTranscription';
import { ConversationList } from '../components/ConversationList';
import { PipelineResults } from '../components/PipelineResults';
import { useCognition } from '../hooks/useCognition';
import { newQuestionWorker } from '../services/aiWorkers';
import { systemPrompt as interviewer } from '../agents/professionalInterviewer/systemPrompt';

const MultiArtifactEvaluation = ({ batchEvaluation, selectedIds }: { batchEvaluation: any, selectedIds: string[] }) => {

  // new schema {
  //   "candidate_profile": {
  //     "overall_cognitive_score": number (0-100),
  //     "pattern_strengths": [
  //       {
  //         "pattern": string,
  //         "frequency": number,
  //         "average_depth": number (0-100)
  //       }
  //     ],
  //     "development_gaps": [
  //       {
  //         "pattern": string,
  //         "frequency": number,
  //         "average_depth": number (0-100)
  //       }
  //     ],
  //     "tier_distribution": {
  //       "conceptual": number,
  //       "applied": number,
  //       "operational": number
  //     },
  //     "longitudinal_trends": {
  //       "cognitive_depth_over_time": [number],
  //       "pattern_adoption": {
  //         "<pattern_name>": [number]
  //       }
  //     },
  //     "summary": "Concise assessment of candidate's strengths, weaknesses, recurring gaps, and trends across artifacts."
  //   }
  // }
  return (
    <div>
      <h2>Multi-Artifact Evaluation</h2>
      {batchEvaluation && (
        <div key={batchEvaluation.id}>
          <h3>Batch Evaluation</h3>
          <p><strong>Overall Cognitive Score: </strong> {String(batchEvaluation?.candidate_profile?.overall_cognitive_score)}</p>
          <p><strong>Pattern Strengths: </strong>
            <div>
              {batchEvaluation?.candidate_profile?.pattern_strengths?.map((pattern: any) => (
                <div key={pattern.pattern}>
                  <ul>
                    <li><strong>Cognition Area:</strong> {pattern.pattern}</li>
                    <li><strong>Document Frequency:</strong> {String((pattern.frequency * 100) / (selectedIds.length * 1.0))}</li>
                    <li><strong>Strength Confidence:</strong> {pattern.average_depth > 90 ? "Superior" : pattern.average_depth > 70 ? "High" : pattern.average_depth > 50 ? "Adequate" : pattern.average_depth > 30 ? "Low" : "Minimal"}</li>
                  </ul>
                </div>
              ))}
            </div>
          </p>
          <p><strong>Development Gaps: </strong>
            <div>
              {batchEvaluation?.candidate_profile?.development_gaps?.map((pattern: any) => {
                const documentFrequency = (pattern.frequency * 100) / (selectedIds.length * 1.0);
                return (
                  <div key={pattern.pattern} style={{ border: pattern.average_depth * documentFrequency > 70 ? "2px solid red" : documentFrequency > 50 ? "2px solid orange" : documentFrequency > 30 ? "2px solid yellow" : documentFrequency > 10 ? "2px solid green" : "2px solid blue" }}>
                    <ul>
                      <li><strong>Cognition Area:</strong> {pattern.pattern}</li>
                      <li><strong>Document Frequency:</strong> {String(documentFrequency)}</li>
                      <li><strong>Concern Level:</strong> {pattern.average_depth > 70 ? "Extreme" : documentFrequency > 50 ? "High" : documentFrequency > 30 ? "Medium" : documentFrequency > 10 ? "Low" : "Minimal"}</li>
                    </ul>
                  </div>
                )
              })}
            </div>
          </p>
          <p>
            <strong>Cognition Tier Distribution: </strong>
            <br />
            <span style={{ marginLeft: "1rem", fontWeight: "bold" }}>{String(batchEvaluation?.candidate_profile?.tier_distribution?.conceptual)}</span>
            &nbsp;&nbsp;&nbsp;&nbsp;Conceptual
            <br />
            <span style={{ marginLeft: "1rem", fontWeight: "bold" }}>{String(batchEvaluation?.candidate_profile?.tier_distribution?.operational)}</span>
            &nbsp;&nbsp;&nbsp;&nbsp;Operational
            <br />
            <span style={{ marginLeft: "1rem", fontWeight: "bold" }}>{String(batchEvaluation?.candidate_profile?.tier_distribution?.applied)}</span>
            &nbsp;&nbsp;&nbsp;&nbsp;Applied
          </p>
          <p><strong>Summary: </strong> {String(batchEvaluation?.candidate_profile?.summary)}</p>
        </div>
      )}
    </div>
  );
};

export const Home: React.FC<{ id: string; label: string }> = ({ label }) => {
  const [openaiKey, setOpenaiKey] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectedIdsRef = React.useRef<string[]>([]);
  React.useEffect(() => {
    setSelectedIds(selectedIdsRef.current);
  }, [selectedIdsRef.current]);
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
    handleEvaluateBatchArtifacts,
    handleGetFollowupQuestion,
    handleDeleteConversation,
    handleFullPipeline,
    handleLoadConversation,
    handleStoreConversationAndArtifacts,
    handleSetConversationTitle,
    startNewConversation
  } = useCognition(openaiKey);

  const [tempTitle, setTempTitle] = useState('');
  const [batchEvaluation, setBatchEvaluation] = useState<any>(null);
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

  const handleBatchClick = useCallback(async () => {
    console.log('selectedIdsRef.current', selectedIdsRef.current);
    console.log('selectedIds', selectedIds);
    console.log("selected convo titles: ", selectedIdsRef.current.map((id: string) => conversations.get(id)?.title));
    const batchEval = await handleEvaluateBatchArtifacts(selectedIdsRef.current);
    setBatchEvaluation(batchEval);
  }, [selectedIdsRef.current]);

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
        selectedIdsRef={selectedIdsRef}
        onLoad={handleLoadConversation}
        onDelete={handleDeleteConversation}
      />

      <button onClick={handleBatchClick}>Evaluate Batch Artifacts</button>
      <MultiArtifactEvaluation batchEvaluation={batchEvaluation} selectedIds={selectedIds} />

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