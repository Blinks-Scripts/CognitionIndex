import React from 'react';
import { sendForTranscription } from '../utils/audioUtils';
import { UserInput } from '../components/UserInput';
import { TextTranscription } from '../components/TextTranscription';
import { systemPrompt as interviewer } from '../agents/professionalInterviewer/systemPrompt';
import { systemPrompt as artifactor } from '../agents/cognitionArtifactor/systemPrompt';
import { systemPrompt as evaluator } from '../agents/artifactEvaluator/systemPrompt';

const chatCompletionWorker = async (openaiKey: string, question: string) => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
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
  const response = await chatCompletionWorker(openaiKey, interviewer);
  return response;
};

const cognitionArtifactor: (openaiKey: string, conversation: { role: string, content: string }[]) => Promise<Error | any> = async (openaiKey: string, conversation: { role: string, content: string }[]) => {
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

const artifactEvaluator: (openaiKey: string, artifact: any) => Promise<Error | any> = async (openaiKey: string, artifact: any) => {
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
  const [currentConversation, setCurrentConversation] = React.useState<{ role: string, content: string }[]>([]);
  const [text, setText] = React.useState('');

  const [cognitionArtifact, setCognitionArtifact] = React.useState<any>(null);

  const [cognitionArtifactEvaluation, setCognitionArtifactEvaluation] = React.useState<any>(null);

  const handleSetOpenaiKey = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOpenaiKey(e.target.value);
  };

  const getNewQuestion = React.useCallback(async () => {
    const response = await newQuestionWorker(openaiKey);
    return response;
  }, [openaiKey]);

  const handleGenerateCognitionArtifact = React.useCallback(async (e: React.MouseEvent<HTMLButtonElement>, depth = 0) => {
    e.preventDefault();
    let response = await cognitionArtifactor(openaiKey, currentConversation);
    if (response instanceof Error) {
      if (response.message === 'JSON_PARSE_ERROR') {
        console.error(response);
        if (depth < 3) {
          response = await handleGenerateCognitionArtifact(e, depth + 1);
        }
      }
    }
    setCognitionArtifact(response);
  }, [openaiKey, currentConversation]);

  const handleEvaluateCognitionArtifact = React.useCallback(async (e: React.MouseEvent<HTMLButtonElement>, depth = 0) => {
    e.preventDefault();
    let response = await artifactEvaluator(openaiKey, cognitionArtifact);
    if (response instanceof Error) {
      if (response.message === 'JSON_PARSE_ERROR') {
        console.error(response);
        if (depth < 3) {
          response = await handleEvaluateCognitionArtifact(e, depth + 1);
        }
      }
    }
    setCognitionArtifactEvaluation(response);
  }, [openaiKey, cognitionArtifact]);

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
    debugger;
    const response = await professionalInterviewer(payloadConversation);
    setCurrentConversation(response.newConversation);
    return response;
  }, [currentQuestion, text, currentConversation, professionalInterviewer]);

  const transcribeFn = React.useCallback(async (audio: Blob | null, file: File | null) => {
    return sendForTranscription(audio, file, openaiKey);
  }, [openaiKey]);

  const handleSetCurrentQuestion = (question: string) => {
    setCurrentQuestion(question);
  };

  const handleClickNewQuestion = React.useCallback(async () => {
    const response = await getNewQuestion();
    handleSetCurrentQuestion(response);
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

  React.useEffect(() => {
    const savedKey = localStorage.getItem('openaiKey');
    if (savedKey) {
      setOpenaiKey(savedKey);
    }
  }, []);

  return (
    <div>
      <h1>{label}</h1>
      <button onClick={handleClickNewQuestion}>New Conversation Question</button>
      <p>Current Question: {currentQuestion}</p>
      <TextTranscription text={text} />
      {currentConversation &&
        <p>
          Current Conversation: {
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
      <button onClick={handleGenerateCognitionArtifact}>Generate Cognition Artifact</button>
      {cognitionArtifact && <p>{JSON.stringify(cognitionArtifact)}</p>}
      <button onClick={handleEvaluateCognitionArtifact}>Evaluate Cognition Artifact</button>
      Enter Artifact:
      <input type="text" placeholder="Cognition Artifact" value={cognitionArtifact} onChange={(e) => setCognitionArtifact(e.target.value)} />
      {cognitionArtifactEvaluation &&
        <Evaluation cognitionArtifactEvaluation={cognitionArtifactEvaluation} />
      }
    </div>
  );
};