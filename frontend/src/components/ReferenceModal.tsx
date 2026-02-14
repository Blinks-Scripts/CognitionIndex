import React, { useState, useEffect } from 'react';
import type { EvidenceResult } from './types/EvidenceResult';
import type { ReferenceModalProps } from './types/ReferenceModalProps';
import { useCognitionContext } from '../context/CognitionContext';

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

  const sentenceRegex = /(?<=[.!?])\s+/;
  const beforeText = text.slice(0, startIndex);
  const beforeParts = beforeText.split(sentenceRegex);
  const ctxBefore = beforeParts.length > 2 ? beforeParts.slice(-3).join(" ") : beforeText;

  const afterText = text.slice(matchEnd);
  const afterParts = afterText.split(sentenceRegex);
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

interface DeepDiveResult {
  point: string;
  deep_dive_analysis: string;
  supporting_quotes: string[];
}

export const ReferenceModal: React.FC<ReferenceModalProps> = ({ isOpen, onClose, targetName, evidence }) => {
  const { handleDeepDiveReference, conversations } = useCognitionContext();
  const [expandedContexts, setExpandedContexts] = useState<Record<string, boolean>>({});
  const [deepDiveResults, setDeepDiveResults] = useState<Record<string, { loading: boolean, data?: DeepDiveResult }>>({});

  useEffect(() => {
    setExpandedContexts({});
    setDeepDiveResults({});
  }, [evidence, targetName]);

  if (!isOpen) return null;

  const toggleContext = (id: string) => {
    setExpandedContexts(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const onDeepDiveClick = async (point: string, id: string, conversationTitle: string) => {
    if (deepDiveResults[id]?.loading || deepDiveResults[id]?.data) return;

    setDeepDiveResults(prev => ({
      ...prev,
      [id]: { loading: true }
    }));

    // Find conversation ID by title
    const convoEntry = Array.from(conversations.entries()).find(([, data]) => data.title === conversationTitle);
    if (!convoEntry) {
      console.error("Conversation not found for deep dive:", conversationTitle);
      return;
    }

    const result = await handleDeepDiveReference(point, convoEntry[0]);

    setDeepDiveResults(prev => ({
      ...prev,
      [id]: { loading: false, data: result }
    }));
  };

  return (
    <>
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
        <h2 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px' }}>Evidence for: {targetName}</h2>

        {evidence.length === 0 && <p>Searching for evidence...</p>}

        {evidence.map((result, resIdx) => (
          <div key={resIdx} style={{ marginBottom: '30px', padding: '15px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
            <h3 style={{ marginTop: 0, color: '#007AFF' }}>Source: {result.conversationTitle}</h3>

            {result.supportingQuotes
              .filter(quote => quote.quote.split(/\s+/).filter(w => w.length > 0).length >= 5)
              .map((quote, qIdx) => {
                const uniqueId = `${resIdx}-${qIdx}`;
                const matchingMessages = result.messages.map((message, msgIdx) => {
                  const highlighted = getHighlightedSnippet(message.content, quote.quote);
                  if (!highlighted) return null;
                  return (
                    <div key={msgIdx} style={{ marginBottom: '10px', padding: '10px', background: 'white', borderRadius: '4px', border: '1px solid #ddd' }}>
                      <strong>{message.role}:</strong> {highlighted}
                    </div>
                  );
                }).filter(msg => msg !== null);

                if (matchingMessages.length === 0) return null;


                return (
                  <div key={qIdx} style={{ marginTop: '15px', borderTop: '1px solid #dee2e6', paddingTop: '15px' }}>
                    <p><strong>Supporting Quote #{qIdx + 1}:</strong></p>
                    <p style={{ fontStyle: 'italic', color: '#555', borderLeft: '3px solid #007AFF', paddingLeft: '10px' }}>{quote.quote}</p>

                    <div style={{ marginTop: '10px' }}>
                      <button
                        onClick={() => toggleContext(uniqueId)}
                        style={{ background: 'none', border: 'none', color: '#007AFF', cursor: 'pointer', padding: 0, fontSize: '0.9rem', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}
                      >
                        {expandedContexts[uniqueId] ? '▼' : '▶'} Context in Conversation
                      </button>
                      {expandedContexts[uniqueId] && (
                        <div style={{ paddingLeft: '10px' }}>
                          {matchingMessages}
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div
                        onClick={() => onDeepDiveClick(quote.justification, uniqueId + '-j', result.conversationTitle)}
                        style={{ cursor: 'pointer', padding: '10px', border: '1px solid #e0e0e0', borderRadius: '6px', backgroundColor: '#fff' }}
                      >
                        <strong>Justification:</strong> <span style={{ color: '#007AFF', textDecoration: 'underline' }}>{quote.justification}</span>
                        {deepDiveResults[uniqueId + '-j']?.loading && <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '5px' }}>Loading deep dive...</div>}
                        {deepDiveResults[uniqueId + '-j']?.data && (
                          <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f0f7ff', borderRadius: '4px', fontSize: '0.9rem', borderLeft: '4px solid #007AFF' }}>
                            <p style={{ margin: 0 }}>{deepDiveResults[uniqueId + '-j']?.data?.deep_dive_analysis}</p>
                          </div>
                        )}
                      </div>

                      <div
                        onClick={() => onDeepDiveClick(quote.defense, uniqueId + '-d', result.conversationTitle)}
                        style={{ cursor: 'pointer', padding: '10px', border: '1px solid #e0e0e0', borderRadius: '6px', backgroundColor: '#fff' }}
                      >
                        <strong>Defense:</strong> <span style={{ color: '#007AFF', textDecoration: 'underline' }}>{quote.defense}</span>
                        {deepDiveResults[uniqueId + '-d']?.loading && <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '5px' }}>Loading deep dive...</div>}
                        {deepDiveResults[uniqueId + '-d']?.data && (
                          <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#fdf0f0', borderRadius: '4px', fontSize: '0.9rem', borderLeft: '4px solid #d93025' }}>
                            <p style={{ margin: 0 }}>{deepDiveResults[uniqueId + '-d']?.data?.deep_dive_analysis}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        ))}

        <button
          onClick={onClose}
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
      <div
        onClick={onClose}
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
    </>
  );
};
