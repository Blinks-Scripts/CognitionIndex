import React from 'react';
import { sendForTranscription } from '../utils/audioUtils';
import { UserInput } from '../components/UserInput';
import { TextTranscription } from '../components/TextTranscription';
import { systemPrompt as interviewer } from '../agents/professionalInterviewer/systemPrompt';
import { systemPrompt as artifactor } from '../agents/cognitionArtifactor/systemPrompt';
import { systemPrompt as evaluator } from '../agents/artifactEvaluator/systemPrompt';
import { systemPrompt as extractor } from '../agents/signalExtractor/systemPrompt';
import { systemPrompt as assessor } from '../agents/signalAssessor/systemPrompt';
import { systemPrompt as followUpPrompt } from '../agents/professionalInterviewer/followUpPrompt';

const chatCompletionWorker = async (openaiKey: string, question: string, temp: number = 0.7) => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      temperature: temp,
      messages: [{ role: 'user', content: question }],
    }),
  });
  const data = await response.json();
  return data.choices[0].message.content;
};

const conversationWorker = async (openaiKey: string, conversation: { role: string, content: string }[]) => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: conversation,
    }),
  });
  const data = await response.json();
  const newConversation = [...conversation, { role: 'assistant', content: data.choices[0].message.content }];
  return { data, response: data.choices[0].message.content, newConversation };
};

const newQuestionWorker = async (openaiKey: string) => {
  const response = await chatCompletionWorker(openaiKey, interviewer, 1.0);
  return response;
};

const followupQuestionWorker = async (openaiKey: string, conversation: { role: string, content: string }[], signalAssessment: any, cognitionArtifactEvaluation: any) => {
  let returnConvo = conversation;
  const payloadConvo = [{
    role: 'system',
    content: followUpPrompt,
  }, {
    role: "user",
    content: JSON.stringify(conversation)
  }, {
    role: "user",
    content: JSON.stringify(cognitionArtifactEvaluation.overall_assessment) + "\n" + JSON.stringify(cognitionArtifactEvaluation.recommendations)
  }];
  while (returnConvo[returnConvo.length - 1].role === "assistant") {
    returnConvo.pop();
  }
  const response = await conversationWorker(openaiKey, payloadConvo);
  returnConvo = [...returnConvo, { role: 'assistant', content: response.response }];
  return { data: response.data, response: response.response, newConversation: returnConvo };
};

const cognitionArtifactor: (openaiKey: string, conversation: { role: string, content: string }[], extractedSignals: any, signalAssessment: any) => Promise<Error | any> = async (openaiKey: string, conversation: { role: string, content: string }[], extractedSignals: any, signalAssessment: any) => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'system',
        content: artifactor,
      },
      { role: 'user', content: JSON.stringify(conversation) },
      { role: 'user', content: JSON.stringify(extractedSignals) },
      { role: 'user', content: JSON.stringify(signalAssessment) },
      ],
    }),
  });
  const data = await response.json();
  // verify message in response is valid json
  if (!data.choices[0].message.content) {
    throw new Error('Invalid response from API');
  }
  let parsedData;
  try {
    parsedData = JSON.parse(data.choices[0].message.content);
  } catch (e) {
    const err = new Error('Invalid response from API: content is not valid JSON', { cause: 'JSON_PARSE_ERROR' });
    console.error(err);
    return err;
  }
  return parsedData;
};

const artifactEvaluator: (openaiKey: string, extractedSignals: any, signalAssessment: any, artifact: any) => Promise<Error | any> = async (openaiKey: string, extractedSignals: any, signalAssessment: any, artifact: any) => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'system',
        content: evaluator,
      },
      { role: 'user', content: JSON.stringify(extractedSignals) },
      { role: 'user', content: JSON.stringify(signalAssessment) },
      { role: 'user', content: JSON.stringify(artifact) },
      ],
    }),
  });
  const data = await response.json();
  // verify message in response is valid json
  if (!data.choices[0].message.content) {
    throw new Error('Invalid response from API');
  }
  let parsedData;
  try {
    parsedData = JSON.parse(data.choices[0].message.content);
  } catch (e) {
    const err = new Error('Invalid response from API: content is not valid JSON', { cause: 'JSON_PARSE_ERROR' });
    console.error(err);
    return err;
  }
  return parsedData;
};

const signalExtractorWorker: (openaiKey: string, conversation: any) => Promise<Error | any> = async (openaiKey: string, conversation: any) => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: extractor,
        },
        { role: 'user', content: JSON.stringify(conversation) },
      ],
    }),
  });
  const data = await response.json();
  // verify message in response is valid json
  if (!data.choices[0].message.content) {
    throw new Error('Invalid response from API');
  }
  let parsedData;
  try {
    parsedData = JSON.parse(data.choices[0].message.content);
  } catch (e) {
    const err = new Error('Invalid response from API: content is not valid JSON', { cause: 'JSON_PARSE_ERROR' });
    console.error(err);
    return err;
  }
  return parsedData;
};

const signalAssessorWorker: (openaiKey: string, conversation: any, signals: any) => Promise<Error | any> = async (openaiKey: string, conversation: any, signals: any) => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: assessor,
        },
        { role: 'user', content: JSON.stringify(signals) },
        { role: 'user', content: JSON.stringify(conversation) },
      ],
    }),
  });
  const data = await response.json();
  // verify message in response is valid json
  if (!data.choices[0].message.content) {
    throw new Error('Invalid response from API');
  }
  let parsedData;
  try {
    parsedData = JSON.parse(data.choices[0].message.content);
  } catch (e) {
    const err = new Error('Invalid response from API: content is not valid JSON', { cause: 'JSON_PARSE_ERROR' });
    console.error(err);
    return err;
  }
  return parsedData;
};

const Evaluation: React.FC<{ cognitionArtifactEvaluation: any }> = ({ cognitionArtifactEvaluation }) => {
  //   {
  //   "scores": {
  //     "problem_clarity": { "score": 0-100, "justification": "" },
  //     "systems_thinking": { "score": 0-100, "justification": "" },
  //     "technical_depth": { "score": 0-100, "justification": "" },
  //     "tradeoff_awareness": { "score": 0-100, "justification": "" },
  //     "risk_analysis": { "score": 0-100, "justification": "" },
  //     "execution_specificity": { "score": 0-100, "justification": "" },
  //     "outcome_orientation": { "score": 0-100, "justification": "" },
  //     "ownership_agency": { "score": 0-100, "justification": "" },
  //     "communication_precision": { "score": 0-100, "justification": "" }
  //   },
  //   "overall_assessment": "High-level evaluation of demonstrated engineering cognition",
  //   "key_strengths": ["Bullet list"],
  //   "development_gaps": ["Bullet list"],
  //   "recommendations_for_stronger_artifact": [
  //     "Concrete suggestions for improving future cognition artifacts"
  //   ]
  // }
  return (
    <div>
      {Object.keys(cognitionArtifactEvaluation.scores).map((key) => (
        <div key={key}>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'start' }}>
            <h1>{cognitionArtifactEvaluation.scores[key].score}</h1>
            &nbsp;&nbsp;&nbsp;&nbsp;
            <h2>{key}</h2>
          </div>
          <p>{cognitionArtifactEvaluation.scores[key].justification}</p>
        </div>
      ))}
      <h3>Overall Assessment  </h3>
      <p>{cognitionArtifactEvaluation.overall_assessment}</p>
      <h3>Key Strengths</h3>
      {cognitionArtifactEvaluation.key_strengths.map((strength: string) => (
        <p key={strength}>{strength}</p>
      ))}
      <h3>Development Gaps</h3>
      {cognitionArtifactEvaluation.development_gaps.map((gap: string) => (
        <p key={gap}>{gap}</p>
      ))}
      <h3>Recommendations for Stronger Artifact</h3>
      {cognitionArtifactEvaluation.recommendations_for_stronger_artifact.map((recommendation: string) => (
        <p key={recommendation}>{recommendation}</p>
      ))}
    </div>
  );
};

export const Home: React.FC<{ id: string; label: string }> = ({ id, label }) => {
  const [openaiKey, setOpenaiKey] = React.useState('');
  const [currentQuestion, setCurrentQuestion] = React.useState('');
  const [conversations, setConversations] = React.useState<Map<string, { id: string, conversation: { role: string, content: string }[], extractedSignals: any, signalAssessment: any, cognitionArtifact: any, evaluation: any }>>(() => {
    const saved = localStorage.getItem("conversations");
    if (!saved) return new Map();
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return new Map(parsed);
      }
      // Fallback for old object format
      return new Map(Object.entries(parsed));
    } catch (e) {
      console.error("Failed to parse conversations from localStorage", e);
      return new Map();
    }
  });

  const [currentConversation, setCurrentConversation] = React.useState<{ role: string, content: string }[]>([]);
  const [text, setText] = React.useState('');

  const [cognitionArtifact, setCognitionArtifact] = React.useState<any>(null);
  const [showCognitionArtifact, setShowCognitionArtifact] = React.useState(false);
  const [cognitionArtifactIsLoading, setCognitionArtifactIsLoading] = React.useState(false);
  const [cognitionArtifactEvaluation, setCognitionArtifactEvaluation] = React.useState<any>(null);
  const [showCognitionArtifactEvaluation, setShowCognitionArtifactEvaluation] = React.useState(false);
  const [cognitionArtifactEvaluationIsLoading, setCognitionArtifactEvaluationIsLoading] = React.useState(false);

  const [extractedSignals, setExtractedSignals] = React.useState<any>(null);
  const [showExtractedSignals, setShowExtractedSignals] = React.useState(false);
  const [extractedSignalsIsLoading, setExtractedSignalsIsLoading] = React.useState(false);

  const [signalAssessment, setSignalAssessment] = React.useState<any>(null);
  const [showSignalAssessment, setShowSignalAssessment] = React.useState(false);
  const [signalAssessmentIsLoading, setSignalAssessmentIsLoading] = React.useState(false);

  const [fullPipelineIsLoading, setFullPipelineIsLoading] = React.useState(false);
  const [pipelineData, setPipelineData] = React.useState<any>(null);
  const [showPipelineData, setShowPipelineData] = React.useState(false);

  const handleSetOpenaiKey = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOpenaiKey(e.target.value);
  };

  const getNewQuestion = React.useCallback(async () => {
    const response = await newQuestionWorker(openaiKey);
    return response;
  }, [openaiKey]);

  const handleExtractSignals = React.useCallback(async (e: React.MouseEvent<HTMLButtonElement>, convo = currentConversation) => {
    const response = await signalExtractorWorker(openaiKey, convo);
    setExtractedSignals(response);
    return response;
  }, [openaiKey, currentConversation]);

  const handleAssessSignals = React.useCallback(async (e: React.MouseEvent<HTMLButtonElement>, convo = currentConversation, signals = extractedSignals) => {
    const response = await signalAssessorWorker(openaiKey, convo, signals);
    setSignalAssessment(response);
  }, [openaiKey, currentConversation, extractedSignals]);

  const handleGenerateCognitionArtifact = React.useCallback(async (e: React.MouseEvent<HTMLButtonElement>, convo = currentConversation, signals = extractedSignals, assessment = signalAssessment, depth = 0) => {
    if (e !== null) e.preventDefault();
    let response = await cognitionArtifactor(openaiKey, currentConversation, extractedSignals, signalAssessment);
    if (response instanceof Error) {
      if (response.message === 'JSON_PARSE_ERROR') {
        console.error(response);
        if (depth < 3) {
          response = await handleGenerateCognitionArtifact(e, convo, signals, assessment, depth + 1);
        }
      }
    }
    setCognitionArtifact(response);
  }, [openaiKey, currentConversation, extractedSignals, signalAssessment]);

  const handleEvaluateCognitionArtifact = React.useCallback(async (e: React.MouseEvent<HTMLButtonElement>, signals = extractedSignals, assessment = signalAssessment, artifact = cognitionArtifact, depth = 0) => {
    if (e !== null) e.preventDefault();
    let response = await artifactEvaluator(openaiKey, signals, assessment, artifact);
    if (response instanceof Error) {
      if (response.message === 'JSON_PARSE_ERROR') {
        console.error(response);
        if (depth < 3) {
          response = await handleEvaluateCognitionArtifact(e, signals, assessment, artifact, depth + 1);
        }
      }
    }
    setCognitionArtifactEvaluation(response);
  }, [openaiKey, extractedSignals, signalAssessment, cognitionArtifact]);

  const professionalInterviewer = React.useCallback(async (convo: { role: string, content: string }[]) => {
    let payloadConversation = [];
    if (convo[0].role === "system") {
      payloadConversation = convo;
    } else {
      payloadConversation = [{
        role: 'system', content: interviewer
      }, ...convo];
    }
    const response = await conversationWorker(openaiKey, payloadConversation);
    return response;
  }, [openaiKey]);

  const handleGetFollowupQuestion = React.useCallback(async () => {
    let payloadConversation = [];
    if (currentConversation.length === 0) {
      payloadConversation = [{ role: 'assistant', content: currentQuestion }, { role: 'user', content: text }];
    } else {
      payloadConversation = [...currentConversation];
    }

    const response = await followupQuestionWorker(openaiKey, payloadConversation, signalAssessment, cognitionArtifactEvaluation);
    setCurrentConversation(response.newConversation);
    return response;
  }, [openaiKey, currentQuestion, text, currentConversation, signalAssessment, cognitionArtifactEvaluation]);

  const transcribeFn = React.useCallback(async (audio: Blob | null, file: File | null) => {
    return sendForTranscription(audio, file, openaiKey);
  }, [openaiKey]);

  const handleSetCurrentQuestion = (question: string) => {
    setCurrentQuestion(question);
  };

  const handleStartNewConversation = (assistantMessage: string) => {
    handleStoreConversationAndArtifacts();
    setCurrentConversation([]);
    setCurrentQuestion('');
    setText('');
    setExtractedSignals(null);
    setSignalAssessment(null);
    setCognitionArtifact(null);
    setCognitionArtifactEvaluation(null);

    const newConversation = [{ role: 'system', content: interviewer }, { role: 'assistant', content: assistantMessage }];
    setCurrentConversation(newConversation);
    handleSetCurrentQuestion(assistantMessage);
  };

  const handleClickNewQuestion = React.useCallback(async () => {
    const newQuestion = await getNewQuestion();
    handleStartNewConversation(newQuestion);
  }, [getNewQuestion]);

  const handleSaveKey = React.useCallback(async () => {
    localStorage.setItem('openaiKey', openaiKey);
  }, [openaiKey]);

  const handleSetText = (text: string) => {
    if (currentConversation.length > 0) {
      setCurrentConversation([...currentConversation, { role: 'user', content: text }]);
    } else {
      setText(text);
    }
  };

  const handleStoreConversationAndArtifacts = React.useCallback(async () => {
    const id = crypto.randomUUID();
    const data = {
      id,
      conversation: currentConversation,
      extractedSignals: extractedSignals,
      signalAssessment: signalAssessment,
      cognitionArtifact: cognitionArtifact,
      evaluation: cognitionArtifactEvaluation
    };

    setConversations(prev => {
      const next = new Map(prev);
      next.set(id, data);
      localStorage.setItem("conversations", JSON.stringify(Array.from(next.entries())));
      return next;
    });
  }, [currentConversation, cognitionArtifact, cognitionArtifactEvaluation]);

  const handleDeleteConversation = (key: string) => async () => {
    setConversations(prev => {
      const next = new Map(prev);
      next.delete(key);
      localStorage.setItem("conversations", JSON.stringify(Array.from(next.entries())));
      return next;
    });
  };

  const resetETLVariables = () => {
    setExtractedSignals(null);
    setSignalAssessment(null);
    setCognitionArtifact(null);
    setCognitionArtifactEvaluation(null);
    setShowExtractedSignals(false);
    setShowSignalAssessment(false);
    setShowCognitionArtifact(false);
    setShowPipelineData(false);
  };

  const handleFullPipeline = React.useCallback(async () => {
    resetETLVariables();
    const dummyEvent = null as unknown as React.MouseEvent<HTMLButtonElement>;
    setExtractedSignalsIsLoading(true);
    const _extractedSignals = await handleExtractSignals(dummyEvent, currentConversation);
    setExtractedSignalsIsLoading(false);
    setSignalAssessmentIsLoading(true);
    const _signalAssessment = await handleAssessSignals(dummyEvent, currentConversation, _extractedSignals);
    setSignalAssessmentIsLoading(false);
    setCognitionArtifactIsLoading(true);
    const _cognitionArtifact = await handleGenerateCognitionArtifact(dummyEvent, currentConversation, _extractedSignals, _signalAssessment);
    setCognitionArtifactIsLoading(false);
    setCognitionArtifactEvaluationIsLoading(true);
    const _cognitionArtifactEvaluation = await handleEvaluateCognitionArtifact(dummyEvent, _extractedSignals, _signalAssessment, _cognitionArtifact);
    setCognitionArtifactEvaluationIsLoading(false);
    const pipelineData = {
      id: crypto.randomUUID(),
      conversation: currentConversation,
      extractedSignals: _extractedSignals,
      signalAssessment: _signalAssessment,
      cognitionArtifact: _cognitionArtifact,
      evaluation: _cognitionArtifactEvaluation
    };
    setPipelineData(pipelineData);
    setShowPipelineData(true);
  }, [currentConversation, handleExtractSignals, handleAssessSignals, handleGenerateCognitionArtifact, handleEvaluateCognitionArtifact]);

  const handleLoadConversation = (key: string) => async () => {
    const conversation = conversations.get(key);
    if (!conversation) return;
    setCurrentQuestion(conversation.conversation[1]?.content);
    setText(conversation.conversation[2]?.content);
    setCurrentConversation(conversation.conversation);
    setExtractedSignals(conversation.extractedSignals);
    setSignalAssessment(conversation.signalAssessment);
    setCognitionArtifact(conversation.cognitionArtifact);
    setCognitionArtifactEvaluation(conversation.evaluation);
  };

  React.useEffect(() => {
    const savedKey = localStorage.getItem('openaiKey');
    if (savedKey) {
      setOpenaiKey(savedKey);
    }
  }, []);

  return (
    <div>
      <h1>{label}</h1>
      <h2>Conversations </h2>
      {conversations.size > 0 &&
        <ul>
          {Array.from(conversations.keys()).map((key) => {
            const conversation = conversations.get(key);
            if (!conversation) return null;
            return (
              <div style={{ display: 'flex', flexDirection: 'row', gap: '10px' }}>
                <li key={key} onClick={handleLoadConversation(key)} style={{ cursor: 'pointer' }}>{conversation.conversation[2]?.content}</li>
                <button onClick={handleDeleteConversation(key)}>Delete</button>
              </div>
            );
          })}
        </ul>
      }
      <button onClick={handleStoreConversationAndArtifacts}>Store Conversation and Artifacts</button>
      <button onClick={handleClickNewQuestion}>New Conversation Question</button>
      <p>Current Question: {currentConversation[1]?.content}</p>
      <p>Answer: {currentConversation[2]?.content}</p>
      {/* <TextTranscription text={text} /> */}
      {currentConversation &&
        <p>
          Followup Discussion: {
            currentConversation.map((item, index) => {
              if ([0, 1, 2].includes(index)) return null;
              return (
                <p key={index}>{item.role}: {item.content}</p>
              );
            })}
        </p>
      }
      <button onClick={handleGetFollowupQuestion}>Add Followup Question</button>
      <UserInput setText={handleSetText} transcribeFn={transcribeFn} />
      <input
        type="password"
        placeholder="OpenAI Key"
        value={openaiKey}
        onChange={handleSetOpenaiKey}
      />
      <button onClick={handleSaveKey}>Save Key</button>

      <br />
      <br />

      <button onClick={handleExtractSignals}>Extract Signals</button>
      {extractedSignals && <button onClick={() => setShowExtractedSignals(!showExtractedSignals)}>Toggle Show Extracted Signals</button>}
      <br />
      {extractedSignalsIsLoading && <p>Loading...</p>}
      {!extractedSignalsIsLoading && extractedSignals &&
        <div style={{ display: 'flex', flexDirection: 'row', gap: '10px' }}>
          <p>✅</p>
          <h3>Extracted Signals</h3>
        </div>
      }
      {showExtractedSignals && extractedSignals &&
        <>
          <p>Claims: {extractedSignals.claims.join(', ')}</p>
          <p>Technologies Mentioned: {extractedSignals.technologies_mentioned.join(', ')}</p>
          <p>Actions Described: {extractedSignals.actions_described.join(', ')}</p>
          <p>Reasoning Steps Explicit: {extractedSignals.reasoning_steps_explicit.join(', ')}</p>
          <p>Constraints Explicit: {extractedSignals.constraints_explicit.join(', ')}</p>
          <p>Metrics Mentioned: {extractedSignals.metrics_mentioned.join(', ')}</p>
          <p>Metaphorical Content: {extractedSignals.metaphorical_content.join(', ')}</p>
          <p>Non-Cooperative Signals: {extractedSignals.non_cooperative_signals.join(', ')}</p>
          <p>Cognition Styles Shown: {extractedSignals.cognition_styles_shown.join(', ')}</p>
        </>}

      <br />
      <br />

      <button onClick={handleAssessSignals}>Assess Signals</button>
      {signalAssessment && <button onClick={() => setShowSignalAssessment(!showSignalAssessment)}>Toggle Show Signal Assessment</button>}
      <br />
      {signalAssessmentIsLoading && <p>Loading...</p>}
      {!signalAssessmentIsLoading && signalAssessment &&
        <div style={{ display: 'flex', flexDirection: 'row', gap: '10px' }}>
          <p>✅</p>
          <h3>Signal Assessment</h3>
        </div>
      }
      {showSignalAssessment && signalAssessment &&
        <>
          <p>Technical Signal Strength: {signalAssessment.technical_signal_strength}</p>
          <p>Reasoning Explicitness: {signalAssessment.reasoning_explicitness}</p>
          <p>Specificity: {signalAssessment.specificity}</p>
          <p>Professional Relevance: {signalAssessment.professional_relevance}</p>
          <p>Content Coherence: {signalAssessment.content_coherence}</p>
          <p>Content Quality: {signalAssessment.content_quality}</p>
          <p>Metaphor Density: {signalAssessment.metaphor_density}</p>
          <p>Hallucination Risk: {signalAssessment.hallucination_risk}</p>
          <p>Artifact Viable: {signalAssessment.artifact_viable}</p>
          <p>Artifact Tier: {signalAssessment.artifact_tier}</p>
          <p>Artifact Reason: {signalAssessment.artifact_reason}</p>
        </>
      }

      <br />
      <br />

      <button onClick={handleGenerateCognitionArtifact}>Generate Cognition Artifact</button>
      {cognitionArtifact && <button onClick={() => setShowCognitionArtifact(!showCognitionArtifact)}>Toggle Show Cognition Artifact</button>}
      <br />
      {cognitionArtifactIsLoading && <p>Loading...</p>}
      {!cognitionArtifactIsLoading && cognitionArtifact && <p>✅</p>}
      {showCognitionArtifact && cognitionArtifact &&
        <>
          <h3>Cognition Artifact</h3>

          <p>Title: {cognitionArtifact.title}</p>
          <p>Domain: {cognitionArtifact.domain}</p>
          <p>Problem Statement: {cognitionArtifact.problem_statement}</p>
          <p>Context: {cognitionArtifact.context}</p>
          <p>Constraints: {cognitionArtifact.constraints.join(', ')}</p>
          <p>Decision Points: {cognitionArtifact.decision_points.map((decisionPoint: any) => decisionPoint.decision).join(', ')}</p>
          <p>Technical Depth: {cognitionArtifact.technical_depth.join(', ')}</p>
          <p>Risks and Mitigations: {cognitionArtifact.risks_and_mitigations.join(', ')}</p>
          <p>Outcome: {cognitionArtifact.outcome}</p>
          <p>Cognitive Signals: {cognitionArtifact.cognitive_signals.join(', ')}</p>
          <p>Cognition Patterns: {cognitionArtifact.cognition_patterns.map((cognitionPattern: any) => cognitionPattern.pattern).join(', ')}</p>
          <p>Concise Summary: {cognitionArtifact.concise_summary}</p>
        </>
      }

      <br />
      <br />

      <button onClick={handleEvaluateCognitionArtifact}>Evaluate Cognition Artifact</button>
      {cognitionArtifactEvaluation && <button onClick={() => setShowCognitionArtifactEvaluation(!showCognitionArtifactEvaluation)}>Toggle Show Cognition Artifact Evaluation</button>}
      <br />
      {cognitionArtifactEvaluationIsLoading && <p>Loading...</p>}
      {!cognitionArtifactEvaluationIsLoading && cognitionArtifactEvaluation && <p>✅</p>}
      {/* {showCognitionArtifactEvaluation && cognitionArtifactEvaluation && <p>{JSON.stringify(cognitionArtifactEvaluation)}</p>} */}
      {showCognitionArtifactEvaluation && cognitionArtifactEvaluation &&

        <>
          {/* {
  "scores": {
    "problem_clarity": { "score": 0-100, "justification": "" },
    "systems_thinking": { "score": 0-100, "justification": "" },
    "technical_depth": { "score": 0-100, "justification": "" },
    "tradeoff_awareness": { "score": 0-100, "justification": "" },
    "risk_analysis": { "score": 0-100, "justification": "" },
    "execution_specificity": { "score": 0-100, "justification": "" },
    "outcome_orientation": { "score": 0-100, "justification": "" },
    "ownership_agency": { "score": 0-100, "justification": "" },
    "communication_precision": { "score": 0-100, "justification": "" }
  },
  "overall_assessment": "High-level evaluation of demonstrated engineering cognition",
  "key_strengths": ["Bullet list"],
  "development_gaps": ["Bullet list"],
  "recommendations_for_stronger_artifact": [
    "Concrete suggestions for improving future cognition artifacts"
  ]
} */}
          <h3>Cognition Artifact Evaluation</h3>
          <p>Overall Assessment: {cognitionArtifactEvaluation.overall_assessment}</p>
          <p>Scores:</p>
          <ul>
            {Object.entries(cognitionArtifactEvaluation.scores).map(([key, value]: [string, any]) => (
              <li>
                <span
                  style={{
                    fontWeight: 'bold',
                    fontSize: '1.2em',
                    color: value.score >= 75 ? '#00B000' : value.score > 30 ? 'black' : 'orange',
                    border: value.score >= 75 ? '3px solid #00B000' : value.score > 30 ? '0px solid black' : '3px dashed orange'
                  }}>
                  {value.score}
                </span> -
                {key.split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}:
                {value.justification}
              </li>
            ))}
          </ul>
          <p>Key Strengths:</p>
          <ul>
            {cognitionArtifactEvaluation.key_strengths.map((strength: string) => (
              <li>{strength}</li>
            ))}
          </ul>
          <p>Development Gaps:</p>
          <ul>
            {cognitionArtifactEvaluation.development_gaps.map((gap: string) => (
              <li>{gap}</li>
            ))}
          </ul>
          <p>Recommendations for Stronger Artifact:</p>
          <ul>
            {cognitionArtifactEvaluation.recommendations_for_stronger_artifact.map((recommendation: string) => (
              <li>{recommendation}</li>
            ))}
          </ul>
        </>
      }

      <br />
      <br />

      <button onClick={handleFullPipeline}>Run Full Pipeline</button>
      {fullPipelineIsLoading && <p>Loading...</p>}
      {!fullPipelineIsLoading && pipelineData && <p>✅</p>}
      {/* {showPipelineData && pipelineData && <p>{JSON.stringify(pipelineData)}</p>} */}
      {cognitionArtifactEvaluation &&
        <Evaluation cognitionArtifactEvaluation={cognitionArtifactEvaluation} />
      }
    </div>
  );
};