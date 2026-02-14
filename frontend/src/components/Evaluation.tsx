import { Buffer } from 'buffer';
import React from 'react';
import { useCognitionContext } from '../context/CognitionContext';
import { ReferenceModal } from './ReferenceModal';
import type { EvidenceResult } from './types/EvidenceResult';

interface EvaluationProps {
  cognitionArtifactEvaluation: {
    scores: Record<string, { score: number; justification: string }>;
    overall_assessment: string;
    key_strengths: string[];
    development_gaps: string[];
    recommendations_for_stronger_artifact: string[];
  };
}

const colorFromScore = (score: number): string => {
  if (score >= 75) return '#0B0';
  if (score >= 50) return 'black';
  if (score >= 30) return 'orange';
  return '#900';
};

const outlineFromScore = (score: number): string => {
  if (score >= 75) return '3px solid #0B0';
  if (score >= 50) return '0px solid black';
  if (score >= 30) return '3px dashed orange';
  return '4px dotted #900';
};

const normalizeFirstLetter = (str: string, splitChar: string = '_') => {
  return str.split(splitChar).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}


export const Evaluation: React.FC<EvaluationProps> = ({ cognitionArtifactEvaluation }) => {
  const {
    handleGenerateReference,
    currentConversation,
    currentConversationTitle
  } = useCognitionContext();

  const [modalIsOpen, setModalIsOpen] = React.useState(false);
  const [modalTarget, setModalTarget] = React.useState('');
  const [modalEvidence, setModalEvidence] = React.useState<EvidenceResult[]>([]);

  function base64Encode(strength: string): string {
    return Buffer.from(strength).toString('base64') || 'error';
  }

  const handleClickReference = (strength: string, referenceId: string) => async () => {
    setModalTarget(strength);
    setModalEvidence([]);
    setModalIsOpen(true);

    const reference = await handleGenerateReference(strength, referenceId);

    setModalEvidence([{
      conversationTitle: currentConversationTitle,
      messages: currentConversation,
      supportingQuotes: reference.supporting_material
    }]);
  };

  return (
    <div>
      {Object.keys(cognitionArtifactEvaluation.scores).map((key) => (
        <div key={key}>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'start' }}>
            <h3 style={{
              fontWeight: 'bold',
              marginBottom: "0",
              color: colorFromScore(cognitionArtifactEvaluation.scores[key].score),
              outline: outlineFromScore(cognitionArtifactEvaluation.scores[key].score)
            }}>{cognitionArtifactEvaluation.scores[key].score}</h3>
            &nbsp;&nbsp;&nbsp;&nbsp;
            <h3 style={{ marginBottom: "0" }}>{normalizeFirstLetter(key)}</h3>
          </div>
          <p style={{ margin: "0" }}>{cognitionArtifactEvaluation.scores[key].justification}</p>
        </div>
      ))}
      <h3>Overall Assessment</h3>
      <p>{cognitionArtifactEvaluation.overall_assessment}</p>
      <h3>Key Strengths</h3>
      {cognitionArtifactEvaluation.key_strengths.map((strength: string) => (
        <p onClick={handleClickReference(strength, base64Encode(strength))} style={{ cursor: 'pointer' }} id={base64Encode(strength)} key={strength}>{strength}</p>
      ))}
      <h3>Development Gaps</h3>
      {cognitionArtifactEvaluation.development_gaps.map((gap: string) => (
        <p key={gap}>{gap}</p>
      ))}
      <h3>Recommendations for Stronger Artifact</h3>
      {cognitionArtifactEvaluation.recommendations_for_stronger_artifact.map((recommendation: string) => (
        <p key={recommendation}>{recommendation}</p>
      ))}
      <ReferenceModal
        isOpen={modalIsOpen}
        onClose={() => setModalIsOpen(false)}
        targetName={modalTarget}
        evidence={modalEvidence}
      />
    </div>
  );
};
