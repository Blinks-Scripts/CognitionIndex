import { useState, useCallback } from 'react';
import {
  signalExtractorWorker,
  signalAssessorWorker,
  cognitionArtifactor,
  artifactEvaluator,
  followupQuestionWorker,
  type ChatMessage,
  batchArtifactEvaluator,
  referenceDetectionWorker
} from '../services/aiWorkers';

export interface ConversationData {
  id: string;
  title: string;
  conversation: ChatMessage[];
  extractedSignals: any;
  signalAssessment: any;
  cognitionArtifact: any;
  evaluation: any;
}

export const useCognition = () => {
  const [openaiKey, setOpenaiKey] = useState<string>(() => localStorage.getItem('openaiKey') || '');
  const [conversations, setConversations] = useState<Map<string, ConversationData>>(() => {
    const saved = localStorage.getItem("conversations");
    if (!saved) return new Map();
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return new Map(parsed);
      return new Map(Object.entries(parsed));
    } catch (e) {
      console.error("Failed to parse conversations from localStorage", e);
      return new Map();
    }
  });

  const [currentConversationTitle, setCurrentConversationTitle] = useState('');
  const [currentConversation, setCurrentConversation] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState('');

  const [cognitionArtifact, setCognitionArtifact] = useState<any>(null);
  const [cognitionArtifactEvaluation, setCognitionArtifactEvaluation] = useState<any>(null);
  const [extractedSignals, setExtractedSignals] = useState<any>(null);
  const [signalAssessment, setSignalAssessment] = useState<any>(null);

  const [isLoading, setIsLoading] = useState({
    artifact: false,
    evaluation: false,
    signals: false,
    assessment: false,
    pipeline: false
  });

  const [showSections, setShowSections] = useState({
    artifact: false,
    evaluation: false,
    signals: false,
    assessment: false,
    pipeline: false
  });

  const [pipelineData, setPipelineData] = useState<any>(null);

  const toggleSection = (section: keyof typeof showSections) => {
    setShowSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const resetETLVariables = useCallback(() => {
    setExtractedSignals(null);
    setSignalAssessment(null);
    setCognitionArtifact(null);
    setCognitionArtifactEvaluation(null);
    setShowSections({
      artifact: false,
      evaluation: false,
      signals: false,
      assessment: false,
      pipeline: false
    });
  }, []);

  const handleExtractSignals = useCallback(async (convo = currentConversation) => {
    setIsLoading(prev => ({ ...prev, signals: true }));
    const response = await signalExtractorWorker(openaiKey, convo);
    setExtractedSignals(response);
    setIsLoading(prev => ({ ...prev, signals: false }));
    return response;
  }, [openaiKey, currentConversation]);

  const handleAssessSignals = useCallback(async (convo = currentConversation, signals = extractedSignals) => {
    setIsLoading(prev => ({ ...prev, assessment: true }));
    const response = await signalAssessorWorker(openaiKey, convo, signals);
    setSignalAssessment(response);
    setIsLoading(prev => ({ ...prev, assessment: false }));
    return response;
  }, [openaiKey, currentConversation, extractedSignals]);

  const handleGenerateCognitionArtifact = useCallback(async (convo = currentConversation, signals = extractedSignals, assessment = signalAssessment, depth = 0) => {
    setIsLoading(prev => ({ ...prev, artifact: true }));
    let response = await cognitionArtifactor(openaiKey, convo, signals, assessment);
    if (response instanceof Error && response.message === 'JSON_PARSE_ERROR' && depth < 3) {
      response = await handleGenerateCognitionArtifact(convo, signals, assessment, depth + 1);
    }
    setCognitionArtifact(response);
    setIsLoading(prev => ({ ...prev, artifact: false }));
    return response;
  }, [openaiKey, currentConversation, extractedSignals, signalAssessment]);

  const handleEvaluateCognitionArtifact = useCallback(async (signals = extractedSignals, assessment = signalAssessment, artifact = cognitionArtifact, depth = 0) => {
    setIsLoading(prev => ({ ...prev, evaluation: true }));
    let response = await artifactEvaluator(openaiKey, signals, assessment, artifact);
    if (response instanceof Error && response.message === 'JSON_PARSE_ERROR' && depth < 3) {
      response = await handleEvaluateCognitionArtifact(signals, assessment, artifact, depth + 1);
    }
    setCognitionArtifactEvaluation(response);
    setIsLoading(prev => ({ ...prev, evaluation: false }));
    return response;
  }, [openaiKey, extractedSignals, signalAssessment, cognitionArtifact]);

  const handleEvaluateBatchArtifacts = useCallback(async (selectedIds: string[], depth = 0) => {
    const artifacts = selectedIds.map((id) => {
      const conversation = conversations.get(id);
      if (!conversation) return null;
      return { title: conversation.title, artifact: conversation.cognitionArtifact };
    });
    setIsLoading(prev => ({ ...prev, evaluation: true }));
    let response = await batchArtifactEvaluator(openaiKey, artifacts);
    if (response instanceof Error && response.message === 'JSON_PARSE_ERROR' && depth < 3) {
      response = await handleEvaluateBatchArtifacts(selectedIds, depth + 1);
    }
    setCognitionArtifactEvaluation(response);
    setIsLoading(prev => ({ ...prev, evaluation: false }));
    return response;
  }, [openaiKey, conversations]);

  const handleStoreConversationAndArtifacts = useCallback(() => {
    const id = crypto.randomUUID();
    const data: ConversationData = {
      id,
      title: currentConversationTitle,
      conversation: currentConversation,
      extractedSignals,
      signalAssessment,
      cognitionArtifact,
      evaluation: cognitionArtifactEvaluation
    };

    setConversations(prev => {
      const next = new Map(prev);
      next.set(id, data);
      localStorage.setItem("conversations", JSON.stringify(Array.from(next.entries())));
      return next;
    });
  }, [currentConversation, currentConversationTitle, extractedSignals, signalAssessment, cognitionArtifact, cognitionArtifactEvaluation]);

  const handleDeleteConversation = (key: string) => {
    const confirmation = confirm(`Are you sure you want to delete this conversation: ${conversations.get(key)?.title || 'Empty Title'}?`);
    if (!confirmation) return;
    setConversations(prev => {
      const next = new Map(prev);
      next.delete(key);
      localStorage.setItem("conversations", JSON.stringify(Array.from(next.entries())));
      return next;
    });
  };

  const handleFullPipeline = useCallback(async () => {
    resetETLVariables();
    setIsLoading(prev => ({ ...prev, pipeline: true }));

    const _signals = await handleExtractSignals(currentConversation);
    const _assessment = await handleAssessSignals(currentConversation, _signals);
    const _artifact = await handleGenerateCognitionArtifact(currentConversation, _signals, _assessment);
    const _evaluation = await handleEvaluateCognitionArtifact(_signals, _assessment, _artifact);

    const data = {
      id: crypto.randomUUID(),
      conversation: currentConversation,
      extractedSignals: _signals,
      signalAssessment: _assessment,
      cognitionArtifact: _artifact,
      evaluation: _evaluation
    };

    setPipelineData(data);
    setIsLoading(prev => ({ ...prev, pipeline: false }));
    setShowSections(prev => ({ ...prev, pipeline: true }));
  }, [currentConversation, handleExtractSignals, handleAssessSignals, handleGenerateCognitionArtifact, handleEvaluateCognitionArtifact, resetETLVariables]);

  const handleLoadConversation = (key: string) => {
    const conversation = conversations.get(key);
    if (!conversation) return;
    setCurrentConversationTitle(conversation.title);
    setCurrentQuestion(conversation.conversation[1]?.content || '');
    setText(conversation.conversation[2]?.content || '');
    setCurrentConversation(conversation.conversation);
    setExtractedSignals(conversation.extractedSignals);
    setSignalAssessment(conversation.signalAssessment);
    setCognitionArtifact(conversation.cognitionArtifact);
    setCognitionArtifactEvaluation(conversation.evaluation);
  };

  const startNewConversation = (assistantMessage: string, systemPrompt: string) => {
    handleStoreConversationAndArtifacts();
    setCurrentConversation([]);
    setCurrentQuestion('');
    setText('');
    resetETLVariables();

    const newConversation: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'assistant', content: assistantMessage }
    ];
    setCurrentConversation(newConversation);
    setCurrentQuestion(assistantMessage);
  };

  const handleSetConversationTitle = (title: string) => {
    setCurrentConversationTitle(title);
  };


  const handleGetFollowupQuestion = useCallback(async () => {
    let payloadConversation: ChatMessage[] = [];
    if (currentConversation.length === 0) {
      payloadConversation = [{ role: 'assistant', content: currentQuestion }, { role: 'user', content: text }];
    } else {
      payloadConversation = [...currentConversation];
    }

    const response = await followupQuestionWorker(openaiKey, payloadConversation, cognitionArtifactEvaluation || "No evaluation yet");
    setCurrentConversation(response.newConversation);
    return response;
  }, [openaiKey, currentQuestion, text, currentConversation, signalAssessment, cognitionArtifactEvaluation]);


  const handleGenerateReference = useCallback(async (strength: string, referenceId: string) => {
    const response = await referenceDetectionWorker(openaiKey, strength, currentConversation);
    if (response instanceof Error) {
      console.error(response);
      return { supporting_material: ['Error generating reference'] };
    }
    console.log(response, referenceId);
    return { supporting_material: response.supporting_material };
  }, [openaiKey, currentConversation]);

  return {
    openaiKey,
    setOpenaiKey,
    conversations,
    currentConversation,
    currentConversationTitle,
    setCurrentConversation,
    text,
    setText,
    currentQuestion,
    setCurrentQuestion,
    cognitionArtifact,
    cognitionArtifactEvaluation,
    extractedSignals,
    signalAssessment,
    isLoading,
    showSections,
    pipelineData,
    toggleSection,
    handleExtractSignals,
    handleAssessSignals,
    handleGenerateCognitionArtifact,
    handleEvaluateCognitionArtifact,
    handleEvaluateBatchArtifacts,
    handleGetFollowupQuestion,
    handleStoreConversationAndArtifacts,
    handleDeleteConversation,
    handleFullPipeline,
    handleLoadConversation,
    handleSetConversationTitle,
    handleGenerateReference,
    startNewConversation
  };
};
