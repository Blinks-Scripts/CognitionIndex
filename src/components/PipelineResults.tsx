import React from 'react';
import { Evaluation } from './Evaluation';

interface PipelineResultsProps {
  extractedSignals: any;
  signalAssessment: any;
  cognitionArtifact: any;
  cognitionArtifactEvaluation: any;
  isLoading: any;
  showSections: any;
  toggleSection: (section: any) => void;
}

export const PipelineResults: React.FC<PipelineResultsProps> = ({
  extractedSignals,
  signalAssessment,
  cognitionArtifact,
  cognitionArtifactEvaluation,
  isLoading,
  showSections,
  toggleSection
}) => {
  return (
    <div className="pipeline-results">
      <br />
      <hr />

      {/* Extracted Signals */}
      <section>
        {extractedSignals && (
          <button onClick={() => toggleSection('signals')}>
            {showSections.signals ? 'Hide' : 'Show'} Extracted Signals
          </button>
        )}
        {isLoading.signals && <p>Extracting signals...</p>}
        {!isLoading.signals && extractedSignals && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>✅</span>
            <h3>Extracted Signals</h3>
          </div>
        )}
        {showSections.signals && extractedSignals && (
          <div className="result-content">
            <p><strong>Claims:</strong> {extractedSignals.claims?.join(', ')}</p>
            <p><strong>Technologies:</strong> {extractedSignals.technologies_mentioned?.join(', ')}</p>
            <p><strong>Actions:</strong> {extractedSignals.actions_described?.join(', ')}</p>
            <p><strong>Reasoning:</strong> {extractedSignals.reasoning_steps_explicit?.join(', ')}</p>
            <p><strong>Constraints:</strong> {extractedSignals.constraints_explicit?.join(', ')}</p>
            <p><strong>Metrics:</strong> {extractedSignals.metrics_mentioned?.join(', ')}</p>
            <p><strong>Metaphors:</strong> {extractedSignals.metaphorical_content?.join(', ')}</p>
            <p><strong>Styles:</strong> {extractedSignals.cognition_styles_shown?.join(', ')}</p>
          </div>
        )}
      </section>

      {/* Signal Assessment */}
      <section>
        {signalAssessment && (
          <button onClick={() => toggleSection('assessment')}>
            {showSections.assessment ? 'Hide' : 'Show'} Signal Assessment
          </button>
        )}
        {isLoading.assessment && <p>Assessing signals...</p>}
        {!isLoading.assessment && signalAssessment && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>✅</span>
            <h3>Signal Assessment</h3>
          </div>
        )}
        {/* {
  "signal_assessment": {
    "technical_signal_strength": number (0-100),
    "reasoning_explicitness": number (0-100),
    "specificity": number (0-100),
    "professional_relevance": number (0-100),
    "content_coherence": number (0-100),
    "content_quality": "high" | "medium" | "low" | "invalid",
    "metaphor_density": number (0-100),
    "hallucination_risk": number (0-100),
    "artifact_viable": boolean,
    "artifact_tier": "invalid" | "conceptual" | "applied" | "operational",
    "artifact_reason": string
  }
} */}
        {showSections.assessment && signalAssessment && (
          <div className="result-content">
            <p><strong>Strength:</strong> {signalAssessment.signal_assessment.technical_signal_strength}</p>
            <p><strong>Reasoning:</strong> {signalAssessment.signal_assessment.reasoning_explicitness}</p>
            <p><strong>Specificity:</strong> {signalAssessment.signal_assessment.specificity}</p>
            <p><strong>Relevance:</strong> {signalAssessment.signal_assessment.professional_relevance}</p>
            <p><strong>Quality:</strong> {signalAssessment.signal_assessment.content_quality}</p>
            <p><strong>Viable:</strong> {signalAssessment.signal_assessment.artifact_viable ? 'Yes' : 'No'}</p>
            <p><strong>Reason:</strong> {signalAssessment.signal_assessment.artifact_reason}</p>
          </div>
        )}
      </section>

      {/* Cognition Artifact */}
      <section>
        {cognitionArtifact && (
          <button onClick={() => toggleSection('artifact')}>
            {showSections.artifact ? 'Hide' : 'Show'} Cognition Artifact
          </button>
        )}
        {isLoading.artifact && <p>Generating artifact...</p>}
        {!isLoading.artifact && cognitionArtifact && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>✅</span>
            <h3>Cognition Artifact</h3>
          </div>
        )}
        {showSections.artifact && cognitionArtifact && (
          // cognition artifact structure
          // {
          //   "title": "Short descriptive title (max 12 words)",
          //   "domain": "Primary technical domain (e.g., DevOps, Distributed Systems, Platform Engineering)",
          //   "problem_statement": "Explicit description of the structural or architectural problem",
          //   "context": "Relevant situational and system context",
          //   "constraints": ["Explicit constraints mentioned"],
          //   "decision_points": [
          //     {
          //       "decision": "What structural or implementation decision was made?",
          //       "alternatives_considered": ["Alternative 1", "Alternative 2"],
          //       "reasoning": "Why the final choice was selected, including tradeoffs and risks"
          //     }
          //   ],
          //   "technical_depth": [
          //     "Concrete implementation mechanics or system behavior details"
          //   ],
          //   "risks_and_mitigations": [
          //     "Specific failure modes and how they were addressed"
          //   ],
          //   "outcome": "Result or impact (if explicitly stated; otherwise empty string)",
          //   "cognitive_signals": [
          //     "Architecture thinking",
          //     "Tradeoff analysis",
          //     "Risk modeling",
          //     "Systems thinking",
          //     "Ownership",
          //     "Failure mode awareness",
          //     "Deployment reasoning"
          //   ],
          //   "cognition_patterns": [
          //     {
          //       "pattern": "Name of demonstrated thinking behavior",
          //       "description": "Brief explanation of the cognition behavior",
          //       "evidence": "All transcript-grounded evidence supporting this pattern"
          //     }
          //   ],
          //   "concise_summary": "2–3 sentence executive-level summary emphasizing structural tension and reasoning"
          // }
          <div className="result-content">
            <p><strong>Title:</strong> {cognitionArtifact.title}</p>
            <p><strong>Domain:</strong> {cognitionArtifact.domain}</p>
            <p><strong>Problem:</strong> {cognitionArtifact.problem_statement}</p>
            <p><strong>Context:</strong> {cognitionArtifact.context}</p>
            <p><strong>Summary:</strong> {cognitionArtifact.concise_summary}</p>
            <p><strong>Constraints:</strong> {cognitionArtifact.constraints.join(', ')}</p>
            <p><strong>Decision Points:</strong> {cognitionArtifact.decision_points.map((dp: any) => dp.decision).join(', ')}</p>
            <p><strong>Technical Depth:</strong> {cognitionArtifact.technical_depth.join(', ')}</p>
            <p><strong>Risks and Mitigations:</strong> {cognitionArtifact.risks_and_mitigations.join(', ')}</p>
            <p><strong>Outcome:</strong> {cognitionArtifact.outcome}</p>
            <p><strong>Cognitive Signals:</strong> {cognitionArtifact.cognitive_signals.join(', ')}</p>
            <p><strong>Cognition Patterns:</strong> {cognitionArtifact.cognition_patterns.map((cp: any) => cp.pattern).join(', ')}</p>
          </div>
        )}
      </section>

      {/* Evaluation */}
      <section>
        {cognitionArtifactEvaluation && (
          <button onClick={() => toggleSection('evaluation')}>
            {showSections.evaluation ? 'Hide' : 'Show'} Evaluation
          </button>
        )}
        {isLoading.evaluation && <p>Evaluating artifact...</p>}
        {!isLoading.evaluation && cognitionArtifactEvaluation && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>✅</span>
            <h3>Artifact Evaluation</h3>
          </div>
        )}
        {showSections.evaluation && cognitionArtifactEvaluation && (
          <Evaluation cognitionArtifactEvaluation={cognitionArtifactEvaluation} />
        )}
      </section>
    </div>
  );
};
