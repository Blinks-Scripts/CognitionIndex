export interface ChatMessage {
  role: string;
  content: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const handleResponse = async (response: Response) => {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'API request failed');
  }
  return data;
};

export const chatCompletionWorker = async (api_key: string, question: string) => {
  const response = await fetch(`${API_BASE_URL}/new-question`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key, question })
  });
  const data = await handleResponse(response);
  return data.question;
};

export const conversationWorker = async (api_key: string, conversation: ChatMessage[]) => {
  const response = await fetch(`${API_BASE_URL}/followup-question`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key, conversation })
  });
  const data = await handleResponse(response);
  return {
    data,
    response: data.question,
    newConversation: [...conversation, { role: 'assistant', content: data.question }]
  };
};

export const newQuestionWorker = async (api_key: string) => {
  const response = await fetch(`${API_BASE_URL}/new-question`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key })
  });
  const data = await handleResponse(response);
  return data.question;
};

export const followupQuestionWorker = async (
  api_key: string,
  conversation: ChatMessage[],
  cognitionArtifactEvaluation: any
) => {
  const response = await fetch(`${API_BASE_URL}/followup-question`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key, conversation, evaluation: cognitionArtifactEvaluation })
  });
  const data = await handleResponse(response);

  let returnConvo = [...conversation];
  while (returnConvo.length > 0 && returnConvo[returnConvo.length - 1].role === "assistant") {
    returnConvo.pop();
  }
  returnConvo = [...returnConvo, { role: 'assistant', content: data.question }];

  return { data, response: data.question, newConversation: returnConvo };
};

export const cognitionArtifactor = async (
  api_key: string,
  conversation: ChatMessage[],
  extractedSignals: any,
  signalAssessment: any
): Promise<Error | any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/generate-artifact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key, conversation, extractedSignals, signalAssessment })
    });
    return await handleResponse(response);
  } catch (e: any) {
    if (e.message.includes('JSON_PARSE_ERROR')) {
      return new Error('JSON_PARSE_ERROR');
    }
    return e;
  }
};

export const artifactEvaluator = async (
  api_key: string,
  extractedSignals: any,
  signalAssessment: any,
  artifact: any
): Promise<Error | any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/evaluate-artifact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key, extractedSignals, signalAssessment, artifact })
    });
    return await handleResponse(response);
  } catch (e: any) {
    if (e.message.includes('JSON_PARSE_ERROR')) {
      return new Error('JSON_PARSE_ERROR');
    }
    return e;
  }
};

export const batchArtifactEvaluator = async (
  api_key: string,
  artifacts: any[]
): Promise<Error | any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/evaluate-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key, artifacts })
    });
    return await handleResponse(response);
  } catch (e: any) {
    if (e.message.includes('JSON_PARSE_ERROR')) {
      return new Error('JSON_PARSE_ERROR');
    }
    return e;
  }
};

export const signalExtractorWorker = async (api_key: string, conversation: any): Promise<Error | any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/extract-signals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key, conversation })
    });
    return await handleResponse(response);
  } catch (e: any) {
    return e;
  }
};

export const signalAssessorWorker = async (api_key: string, conversation: any, signals: any): Promise<Error | any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/assess-signals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key, conversation, signals })
    });
    return await handleResponse(response);
  } catch (e: any) {
    return e;
  }
};

export const referenceDetectionWorker = async (api_key: string, strength: string, conversation: any[]) => {
  try {
    const response = await fetch(`${API_BASE_URL}/detect-reference`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key, strength, conversation })
    });
    return await handleResponse(response);
  } catch (e: any) {
    return e;
  }
};
export const batchReferenceDetectionWorker = async (api_key: string, pattern: string, conversations: any[]) => {
  try {
    const response = await fetch(`${API_BASE_URL}/detect-batch-reference`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key, pattern, conversations })
    });
    return await handleResponse(response);
  } catch (e: any) {
    return e;
  }
};

export const deepDiveReferenceWorker = async (api_key: string, point: string, conversation: any[]) => {
  try {
    const response = await fetch(`${API_BASE_URL}/deep-dive-reference`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key, point, conversation })
    });
    return await handleResponse(response);
  } catch (e: any) {
    return e;
  }
};
