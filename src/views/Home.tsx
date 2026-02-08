import React from 'react';
import { sendForTranscription } from '../utils/audioUtils';
import { UserInput } from '../components/UserInput';
import { TextTranscription } from '../components/TextTranscription';

const getChatCompletionWorker = async (openaiKey: string, question: string) => {
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
  const response = await getChatCompletionWorker(openaiKey, 'Provide a random personality question.');
  return response;
};

export const Home: React.FC<{ id: string; label: string }> = ({ id, label }) => {
  const [openaiKey, setOpenaiKey] = React.useState('');
  const [currentQuestion, setCurrentQuestion] = React.useState('');
  const [currentConversation, setCurrentConversation] = React.useState<{ role: string, content: string }[]>([]);
  const [text, setText] = React.useState('');

  const handleSetOpenaiKey = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOpenaiKey(e.target.value);
  };

  const getNewQuestion = React.useCallback(async () => {
    const response = await newQuestionWorker(openaiKey);
    return response;
  }, [openaiKey]);

  const professionalInterviewer = React.useCallback(async (convo: { role: string, content: string }[]) => {
    let payloadConversation = [];
    if (convo[0].role === "system") {
      payloadConversation = convo;
    } else {
      payloadConversation = [{
        role: 'system', content: 'You are a professional interviewer. Ask a thoughtful followup question every time that aims to generate and extract high-signal professional experience and cognition patterns from the participant\'s response.'
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
    </div>
  );
};