import React, { useState, useCallback } from 'react';
import { useCognitionContext } from '../context/CognitionContext';
import { ReferenceModal } from '../components/ReferenceModal';

const MultiArtifactEvaluation = ({ batchEvaluation, selectedIds }: { batchEvaluation: any, selectedIds: string[] }) => {
  const { handleGenerateBatchReference, conversations } = useCognitionContext();
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [modalTarget, setModalTarget] = useState('');
  const [evidenceResults, setEvidenceResults] = useState<any[]>([]);
  const [loadingReference, setLoadingReference] = useState<string | null>(null);

  const onPatternClick = async (pattern: string, positive: boolean, citations: string[]) => {
    const modalTitle = positive ? 'Strength in ' + pattern : 'Gap in ' + pattern;
    let systemPromptAddendum = positive
      ? 'The following pattern is a strength to be detected within the conversations: '
      : 'The following pattern is a gap to be detected within the conversations: ';
    systemPromptAddendum += pattern;

    setModalTarget(modalTitle);
    setEvidenceResults([]);
    setLoadingReference(pattern);
    setModalIsOpen(true);

    try {
      const results = await handleGenerateBatchReference(systemPromptAddendum, citations);

      const formattedEvidence = results.results.map((res: any) => {
        const container = Array.from(conversations.values()).find((c: any) => c.title === res.conversation_title);
        let messages: any[] = [];
        if (container) {
          const activeVersion = container.versions.find((v: any) => v.id === container.activeVersionId) || container.versions[0];
          messages = activeVersion?.data?.conversation || [];
        }

        return {
          conversationTitle: res.conversation_title,
          messages,
          supportingQuotes: res.supporting_material
        };
      });

      setEvidenceResults(formattedEvidence);
    } catch (e) {
      console.error("Error fetching batch references:", e);
    } finally {
      setLoadingReference(null);
    }
  };

  if (!batchEvaluation) return null;

  return (
    <div style={{ marginTop: '20px', border: '1px solid #ddd', padding: '20px', borderRadius: '8px', backgroundColor: 'white' }}>
      <h2>Multi-Artifact Evaluation</h2>
      <div>
        <p><strong>Overall Cognitive Score: </strong> {String(batchEvaluation?.candidate_profile?.overall_cognitive_score)}</p>

        <div style={{ marginBottom: '20px' }}>
          <strong>Pattern Strengths (Click to see evidence): </strong>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
            {batchEvaluation?.candidate_profile?.pattern_strengths?.map((strength: any) => (
              <div
                key={strength.pattern}
                onClick={() => onPatternClick(strength.pattern, true, strength.citations)}
                style={{
                  cursor: 'pointer',
                  border: '1px solid #ccc',
                  padding: '10px',
                  borderRadius: '4px',
                  backgroundColor: loadingReference === strength.pattern ? '#f0f0f0' : 'white',
                  transition: 'background-color 0.2s'
                }}
              >
                <strong>{strength.pattern}</strong> {loadingReference === strength.pattern && ' (Searching...)'}
                <ul style={{ margin: '5px 0 0 0', fontSize: '0.9em' }}>
                  <li>Frequency: {String(((strength.frequency || 0) * 100) / (selectedIds.length * 1.0))}%</li>
                  <li>Confidence: {strength.average_depth > 70 ? "High" : strength.average_depth > 40 ? "Medium" : "Low"}</li>
                  <li>Citations: {strength.citations.map((c: any) => conversations.get(c)?.title).join(', ')}</li>
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <strong>Development Gaps (Click to see evidence): </strong>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
            {batchEvaluation?.candidate_profile?.development_gaps?.map((gap: any) => {
              const documentFrequency = ((gap.frequency || 0) * 100) / (selectedIds.length * 1.0);
              return (
                <div
                  key={gap.pattern}
                  onClick={() => onPatternClick(gap.pattern, false, gap.citations)}
                  style={{
                    cursor: 'pointer',
                    border: '1px solid #fac0c0',
                    padding: '10px',
                    borderRadius: '4px',
                    backgroundColor: loadingReference === gap.pattern ? '#f0f0f0' : '#fff5f5'
                  }}
                >
                  <strong>{gap.pattern}</strong> {loadingReference === gap.pattern && ' (Searching...)'}
                  <ul style={{ margin: '5px 0 0 0', fontSize: '0.9em' }}>
                    <li>Frequency: {String(documentFrequency)}%</li>
                    <li>Concern: {gap.average_depth > 70 ? "High" : "Medium"}</li>
                    <li>Citations: {gap.citations.map((c: any) => conversations.get(c)?.title).join(', ')}</li>
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        <p>
          <strong>Cognition Tier Distribution: </strong>
          <br />
          Conceptual: {batchEvaluation?.candidate_profile?.tier_distribution?.conceptual} |
          Operational: {batchEvaluation?.candidate_profile?.tier_distribution?.operational} |
          Applied: {batchEvaluation?.candidate_profile?.tier_distribution?.applied}
        </p>
        <p><strong>Summary: </strong> {String(batchEvaluation?.candidate_profile?.summary)}</p>

        <ReferenceModal
          isOpen={modalIsOpen}
          onClose={() => setModalIsOpen(false)}
          targetName={modalTarget}
          evidence={evidenceResults}
        />
      </div>
    </div>
  );
};

export const BatchEvaluation: React.FC<{ id: string; label: string }> = ({ label }) => {
  const { handleEvaluateBatchArtifacts, selectedIds } = useCognitionContext();
  const selectedConversationsCount = React.useMemo(() => selectedIds.length, [selectedIds]);
  const [batchEvaluation, setBatchEvaluation] = useState<any>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const handleBatchClick = useCallback(async () => {
    if (selectedIds.length === 0) {
      alert("Please select conversations in the sidebar first.");
      return;
    }
    setIsEvaluating(true);
    try {
      const batchEval = await handleEvaluateBatchArtifacts(selectedIds);
      setBatchEvaluation(batchEval);
    } catch (e) {
      console.error(e);
    } finally {
      setIsEvaluating(false);
    }
  }, [selectedIds, handleEvaluateBatchArtifacts]);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <h1>{label}</h1>
      <div style={{ marginBottom: '20px', padding: '20px', border: '1px solid #eee', borderRadius: '8px', backgroundColor: '#fff' }}>
        <h3>Selection Status</h3>
        <p>Selected Conversations: {selectedConversationsCount}</p>
        <button
          onClick={handleBatchClick}
          disabled={selectedIds.length === 0 || isEvaluating}
          style={{ padding: '10px 20px', fontSize: '1rem' }}
        >
          {isEvaluating ? 'Evaluating...' : 'Evaluate Selected Artifacts'}
        </button>
      </div>

      <MultiArtifactEvaluation batchEvaluation={batchEvaluation} selectedIds={selectedIds} />
    </div>
  );
};
