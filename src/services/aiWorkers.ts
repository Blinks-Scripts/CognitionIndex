import { systemPrompt as interviewer } from '../agents/professionalInterviewer/systemPrompt';
import { systemPrompt as artifactor } from '../agents/cognitionArtifactor/systemPrompt';
import { systemPrompt as evaluator } from '../agents/artifactEvaluator/systemPrompt';
import { systemPrompt as batchEvaluator } from '../agents/artifactEvaluator/batchEvaluator';
import { systemPrompt as extractor } from '../agents/signalExtractor/systemPrompt';
import { systemPrompt as assessor } from '../agents/signalAssessor/systemPrompt';
import { systemPrompt as followUpPrompt } from '../agents/professionalInterviewer/followUpPrompt';
import { systemPrompt as referenceDetection } from '../agents/signalExtractor/referenceRecovery';

export interface ChatMessage {
  role: string;
  content: string;
}

export const chatCompletionWorker = async (openaiKey: string, question: string, temp: number = 0.7) => {
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

export const conversationWorker = async (openaiKey: string, conversation: ChatMessage[]) => {
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
  const content = data.choices[0].message.content;
  const newConversation = [...conversation, { role: 'assistant', content }];
  return { data, response: content, newConversation };
};

export const newQuestionWorker = async (openaiKey: string) => {
  const response = await chatCompletionWorker(openaiKey, interviewer, 1.0);
  return response;
};

export const followupQuestionWorker = async (
  openaiKey: string,
  conversation: ChatMessage[],
  cognitionArtifactEvaluation: any
) => {
  let returnConvo = [...conversation];
  const payloadConvo = [
    {
      role: 'system',
      content: followUpPrompt,
    },
    {
      role: "user",
      content: JSON.stringify(conversation)
    },
    {
      role: "user",
      content: JSON.stringify(cognitionArtifactEvaluation.overall_assessment) + "\n" + JSON.stringify(cognitionArtifactEvaluation.recommendations)
    }
  ];

  while (returnConvo.length > 0 && returnConvo[returnConvo.length - 1].role === "assistant") {
    returnConvo.pop();
  }

  const response = await conversationWorker(openaiKey, payloadConvo);
  returnConvo = [...returnConvo, { role: 'assistant', content: response.response }];
  return { data: response.data, response: response.response, newConversation: returnConvo };
};

export const cognitionArtifactor = async (
  openaiKey: string,
  conversation: ChatMessage[],
  extractedSignals: any,
  signalAssessment: any
): Promise<Error | any> => {
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
          content: artifactor,
        },
        { role: 'user', content: JSON.stringify(conversation) },
        { role: 'user', content: JSON.stringify(extractedSignals) },
        { role: 'user', content: JSON.stringify(signalAssessment) },
      ],
    }),
  });

  const data = await response.json();
  if (!data.choices?.[0]?.message?.content) {
    throw new Error('Invalid response from API');
  }

  try {
    return JSON.parse(data.choices[0].message.content);
  } catch (e) {
    const err = new Error('Invalid response from API: content is not valid JSON', { cause: 'JSON_PARSE_ERROR' });
    console.error(err);
    return err;
  }
};

export const artifactEvaluator = async (
  openaiKey: string,
  extractedSignals: any,
  signalAssessment: any,
  artifact: any
): Promise<Error | any> => {
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
          content: evaluator,
        },
        { role: 'user', content: JSON.stringify(extractedSignals) },
        { role: 'user', content: JSON.stringify(signalAssessment) },
        { role: 'user', content: JSON.stringify(artifact) },
      ],
    }),
  });

  const data = await response.json();
  if (!data.choices?.[0]?.message?.content) {
    throw new Error('Invalid response from API');
  }

  try {
    return JSON.parse(data.choices[0].message.content);
  } catch (e) {
    const err = new Error('Invalid response from API: content is not valid JSON', { cause: 'JSON_PARSE_ERROR' });
    console.error(err);
    return err;
  }
};

export const batchArtifactEvaluator = async (
  openaiKey: string,
  artifacts: any[]
): Promise<Error | any> => {
  let messages: any[] = [];
  artifacts.forEach((artifact: any) => {
    messages.push({
      role: 'user',
      content: JSON.stringify(artifact),
    });
    messages.push({
      role: 'assistant',
      content: "Provide another artifact if needed.",
    });
  });
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: batchEvaluator,
        },
        ...messages,
      ],
    }),
  });

  const data = await response.json();
  if (!data.choices?.[0]?.message?.content) {
    throw new Error('Invalid response from API');
  }

  try {
    const message = JSON.parse(data.choices[0].message.content.replace("```json", "").replace("```", ""));
    console.log("message", message);
    return message;
  } catch (e) {
    const err = new Error('Invalid response from API: content is not valid JSON', { cause: 'JSON_PARSE_ERROR' });
    console.error(err);
    return err;
  }
};

export const signalExtractorWorker = async (openaiKey: string, conversation: any): Promise<Error | any> => {
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
  if (!data.choices?.[0]?.message?.content) {
    throw new Error('Invalid response from API');
  }

  try {
    debugger;
    return JSON.parse(data.choices[0].message.content);
  } catch (e) {
    const err = new Error('Invalid response from API: content is not valid JSON', { cause: 'JSON_PARSE_ERROR' });
    console.error(err);
    return err;
  }
};

export const signalAssessorWorker = async (openaiKey: string, conversation: any, signals: any): Promise<Error | any> => {
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
  debugger;
  if (!data.choices?.[0]?.message?.content) {
    throw new Error('Invalid response from API');
  }

  try {
    return JSON.parse(data.choices[0].message.content);
  } catch (e) {
    const err = new Error('Invalid response from API: content is not valid JSON', { cause: 'JSON_PARSE_ERROR' });
    console.error(err);
    return err;
  }
};


export const referenceDetectionWorker = async (openaiKey: string, strength: string, conversation: any[]) => {
  debugger;
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
          content: referenceDetection,
        },
        { role: 'user', content: JSON.stringify({ strength, conversation }) },
      ],
    }),
  });

  const data = await response.json();
  if (!data.choices?.[0]?.message?.content) {
    throw new Error('Invalid response from API');
  }

  try {
    return JSON.parse(data.choices[0].message.content) as { reference: string; supporting_material: string[] };
  } catch (e) {
    const err = new Error('Invalid response from API: content is not valid JSON', { cause: 'JSON_PARSE_ERROR' });
    console.error(err);
    return err;
  }
};