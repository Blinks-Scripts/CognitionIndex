import { Buffer } from 'buffer';
import React from 'react';
import { useCognitionContext } from '../context/CognitionContext';

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

const getHighlightedSnippet = (text: string, highlight: string) => {
  if (!highlight || !highlight.trim()) return null;

  const target = highlight.trim().toLowerCase();
  const content = text.toLowerCase();
  const highlightWords = highlight.split(/\s+/).filter(w => w.length > 0);

  let matchStr = "";
  let startIndex = -1;

  // 1. Try exact match first (if 10+ words)
  if (highlightWords.length >= 10 && content.includes(target)) {
    matchStr = highlight;
    startIndex = content.indexOf(target);
  } else {
    // 2. Try largest contiguous substring of at least 10 words
    let bestMatch = "";
    let bestIndex = -1;

    for (let i = 0; i < highlightWords.length; i++) {
      for (let j = highlightWords.length; j >= i + 10; j--) {
        const subphrase = highlightWords.slice(i, j).join(" ");
        const idx = content.indexOf(subphrase.toLowerCase());
        if (idx !== -1 && subphrase.length > bestMatch.length) {
          bestMatch = subphrase;
          bestIndex = idx;
        }
      }
    }

    if (bestIndex !== -1) {
      matchStr = bestMatch;
      startIndex = bestIndex;
    }
  }

  if (startIndex === -1) return null;

  const matchEnd = startIndex + matchStr.length;

  // Split by sentence boundaries
  const sentenceRegex = /(?<=[.!?])\s+/;

  const beforeText = text.slice(0, startIndex);
  const beforeParts = beforeText.split(sentenceRegex);
  // Get 2 sentences before (last 2 full sentences)
  const ctxBefore = beforeParts.length > 2 ? beforeParts.slice(-3).join(" ") : beforeText;

  const afterText = text.slice(matchEnd);
  const afterParts = afterText.split(sentenceRegex);
  // Get 2 sentences after (first 2 full sentences)
  const ctxAfter = afterParts.slice(0, 2).join(" ");

  return (
    <span>
      {beforeParts.length > 3 && "... "}
      {ctxBefore}
      <mark style={{ backgroundColor: '#FFE082', padding: '0 2px', borderRadius: '2px', color: 'black' }}>
        {text.slice(startIndex, matchEnd)}
      </mark>
      {ctxAfter}
      {afterParts.length > 2 && " ..."}
    </span>
  );
};

const HighlightText: React.FC<{ text: string; highlight: string }> = ({ text, highlight }) => {
  return getHighlightedSnippet(text, highlight);
};

export const Evaluation: React.FC<EvaluationProps> = ({ cognitionArtifactEvaluation }) => {
  const {
    handleGenerateReference,
    currentConversation
  } = useCognitionContext();

  const [modalContent, setModalContent] = React.useState<{ strength: string; supporting_material: string[] } | null>(null);
  const [modalIsOpen, setModalIsOpen] = React.useState(false);

  function base64Encode(strength: string): string {
    return Buffer.from(strength).toString('base64') || 'error';
  }

  const handleCloseModal = () => {
    setModalIsOpen(false);
  }

  const handleOpenModal = () => {
    setModalIsOpen(true);
  }

  const openModalWithContent = (strength: string, supporting_material: string[]) => {
    setModalContent({ strength, supporting_material });
    handleOpenModal();
  };

  const handleClickReference = (strength: string, referenceId: string) => async () => {
    const reference = await handleGenerateReference(strength, referenceId);
    console.log(reference.supporting_material);
    openModalWithContent(strength, reference.supporting_material);
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
      {modalIsOpen && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: "white",
          padding: "40px",
          borderRadius: "12px",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.2)",
          zIndex: 1000,
          maxWidth: '80%',
          maxHeight: '80%',
          overflow: 'auto',
          color: 'black'
        }}>
          <h2 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px' }}>Evidence for: {modalContent?.strength}</h2>

          {modalContent?.supporting_material
            .filter(material => material.split(/\s+/).filter(w => w.length > 0).length >= 10)
            .map((material, index) => {
              const matchingMessages = currentConversation.map((message: any, msgIndex: number) => {
                const highlighted = getHighlightedSnippet(message.content, material);
                if (!highlighted) return null;
                return (
                  <div key={msgIndex} style={{ marginBottom: '10px', padding: '10px', background: 'white', borderRadius: '4px', border: '1px solid #ddd' }}>
                    <strong>{message.role}:</strong> {highlighted}
                  </div>
                );
              }).filter(msg => msg !== null);

              if (matchingMessages.length === 0) return null;

              return (
                <div key={index} style={{ marginBottom: '30px', padding: '15px', background: '#f9f9f9', borderRadius: '8px' }}>
                  <p><strong>Supporting Evidence #{index + 1}:</strong></p>
                  <p style={{ fontStyle: 'italic', color: '#555', borderLeft: '3px solid #007AFF', paddingLeft: '10px' }}>"{material}"</p>

                  <div style={{ marginTop: '15px' }}>
                    <p><strong>Found in Conversation:</strong></p>
                    {matchingMessages}
                  </div>
                </div>
              );
            })}
          <button
            onClick={handleCloseModal}
            style={{
              marginTop: '20px',
              padding: '8px 16px',
              background: '#007AFF',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      )}
      {modalIsOpen && (
        <div
          onClick={handleCloseModal}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 999
          }}
        />
      )}
    </div>
  );
};
