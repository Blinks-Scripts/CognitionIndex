import { useState, useCallback, useRef } from 'react';
import {
  signalExtractorWorker,
  signalAssessorWorker,
  cognitionArtifactor,
  artifactEvaluator,
  followupQuestionWorker,
  type ChatMessage,
  batchArtifactEvaluator,
  referenceDetectionWorker,
  batchReferenceDetectionWorker,
  deepDiveReferenceWorker
} from '../services/aiWorkers';
import { INTERVIEWER_PROMPT } from '../constants/prompts';
import { encryptApiKey, decryptApiKey } from '../utils/cryptoUtils';

export interface ConversationData {
  id: string;
  title: string;
  conversation: ChatMessage[];
  extractedSignals: any;
  signalAssessment: any;
  cognitionArtifact: any;
  evaluation: any;
}

export interface ConversationVersion {
  id: string;
  timestamp: number;
  data: ConversationData;
}

export interface ConversationContainer {
  id: string;
  title: string;
  activeVersionId: string;
  versions: ConversationVersion[];
}

export const useCognition = () => {
  const [openaiKey, _setOpenaiKey] = useState<string>(() => {
    const encrypted = localStorage.getItem('openaiKey');
    return encrypted ? decryptApiKey(encrypted) : '';
  });

  const setOpenaiKey = (key: string) => {
    _setOpenaiKey(key);
    localStorage.setItem('openaiKey', encryptApiKey(key));
  };

  const [conversations, setConversations] = useState<Map<string, ConversationContainer>>(() => {
    const saved = localStorage.getItem("conversations");
    if (!saved) return new Map();
    try {
      const parsed = JSON.parse(saved);
      let map = new Map<string, any>(Array.isArray(parsed) ? parsed : Object.entries(parsed));

      // Migration: Convert legacy ConversationData to ConversationContainer
      const migratedMap = new Map<string, ConversationContainer>();
      map.forEach((value, key) => {
        if (value.versions) {
          migratedMap.set(key, value as ConversationContainer);
        } else {
          // Legacy data
          const legacy = value as ConversationData;
          const versionId = crypto.randomUUID();
          migratedMap.set(key, {
            id: key,
            title: legacy.title,
            activeVersionId: versionId,
            versions: [{
              id: versionId,
              timestamp: Date.now(),
              data: legacy
            }]
          });
        }
      });
      return migratedMap;
    } catch (e) {
      console.error("Failed to parse conversations from localStorage", e);
      return new Map();
    }
  });

  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [currentActiveVersionId, setCurrentActiveVersionId] = useState<string | null>(null);
  const [currentVersions, setCurrentVersions] = useState<ConversationVersion[]>([]);

  const [currentConversationTitle, setCurrentConversationTitle] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectedIdsRef = useRef<string[]>([]);
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
      const container = conversations.get(id);
      if (!container) return null;

      const activeVersion = container.versions.find(v => v.id === container.activeVersionId) || container.versions[0];
      const conversation = activeVersion.data;

      return { title: conversation.title, artifact: conversation.cognitionArtifact, id: container.id };
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

  const handleSaveVersion = useCallback((action: 'overwrite' | 'new') => {
    let id = currentConversationId;

    // If new conversation (no ID), generate one and force 'new' logic in effect
    if (!id) {
      id = crypto.randomUUID();
      // First save is effectively a new version on a new ID
    }

    // Detect title change fork
    if (conversations.has(id!) && conversations.get(id!)?.title !== currentConversationTitle) {
      // Forking to new conversation ID
      id = crypto.randomUUID();
      // This effectively becomes a new conversation, so action doesn't matter much, gets treated as new entry
    }

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
      const timestamp = Date.now();
      const newVersionId = crypto.randomUUID();

      const newVersion: ConversationVersion = {
        id: newVersionId,
        timestamp,
        data
      };

      if (next.has(id!)) {
        const existing = next.get(id!)!;

        if (action === 'new') {
          existing.versions.push(newVersion);
          existing.activeVersionId = newVersion.id;
        } else {
          // Overwrite
          const activeIdx = existing.versions.findIndex(v => v.id === existing.activeVersionId);
          if (activeIdx !== -1) {
            existing.versions[activeIdx] = {
              ...existing.versions[activeIdx],
              timestamp,
              data
            };
          } else {
            // Fallback
            existing.versions.push(newVersion);
            existing.activeVersionId = newVersion.id;
          }
        }
        next.set(id!, existing);

        // Update local state to reflect changes immediately
        setCurrentVersions(existing.versions);
        setCurrentActiveVersionId(existing.activeVersionId);

      } else {
        // New ID
        const container = {
          id: id!,
          title: currentConversationTitle,
          activeVersionId: newVersion.id,
          versions: [newVersion]
        };
        next.set(id!, container);
        setCurrentVersions(container.versions);
        setCurrentActiveVersionId(container.activeVersionId);
      }

      localStorage.setItem("conversations", JSON.stringify(Array.from(next.entries())));
      return next;
    });

    setCurrentConversationId(id);
  }, [currentConversation, currentConversationTitle, extractedSignals, signalAssessment, cognitionArtifact, cognitionArtifactEvaluation, currentConversationId, conversations, currentActiveVersionId]);

  const handleSwitchVersion = useCallback((versionId: string) => {
    if (!currentConversationId) return;
    const container = conversations.get(currentConversationId);
    if (!container) return;

    const version = container.versions.find(v => v.id === versionId);
    if (!version) return;

    // Update active version in container (persist selection)
    setConversations(prev => {
      const next = new Map(prev);
      const c = next.get(currentConversationId!)!;
      c.activeVersionId = versionId;
      next.set(currentConversationId!, c);
      localStorage.setItem("conversations", JSON.stringify(Array.from(next.entries())));
      return next;
    });

    // Load data
    setCurrentActiveVersionId(versionId);
    const conversation = version.data;
    setCurrentConversationTitle(conversation.title);
    setCurrentQuestion(conversation.conversation[1]?.content || '');
    setText(conversation.conversation[2]?.content || '');
    setCurrentConversation(conversation.conversation);
    setExtractedSignals(conversation.extractedSignals);
    setSignalAssessment(conversation.signalAssessment);
    setCognitionArtifact(conversation.cognitionArtifact);
    setCognitionArtifactEvaluation(conversation.evaluation);
  }, [conversations, currentConversationId]);

  // Deprecated direct save, mostly replaced by handleSaveVersion but kept for compatibility or internal logic if needed
  const handleStoreConversationAndArtifacts = useCallback(() => {
    handleSaveVersion('overwrite');
  }, [handleSaveVersion]);

  const handleBulkUploadConversations = useCallback((newList: ConversationData[]) => {
    setConversations(prev => {
      const next = new Map(prev);
      newList.forEach(convo => {
        const id = convo.id || crypto.randomUUID();
        let conversation = convo.conversation || [];
        if (conversation.length === 0 || conversation[0].role !== 'system') {
          conversation = [{ role: 'system', content: INTERVIEWER_PROMPT }, ...conversation];
        }

        // Wrap in container
        const versionId = crypto.randomUUID();
        const data = { ...convo, id, conversation };

        next.set(id, {
          id,
          title: convo.title,
          activeVersionId: versionId,
          versions: [{
            id: versionId,
            timestamp: Date.now(),
            data
          }]
        });
      });
      localStorage.setItem("conversations", JSON.stringify(Array.from(next.entries())));
      return next;
    });
  }, []);

  const handleDeleteConversation = (key: string) => {
    const confirmation = confirm(`Are you sure you want to delete this conversation: ${conversations.get(key)?.title || 'Empty Title'}?`);
    if (!confirmation) return;
    setConversations(prev => {
      const next = new Map(prev);
      next.delete(key);
      localStorage.setItem("conversations", JSON.stringify(Array.from(next.entries())));
      return next;
    });
    if (currentConversationId === key) {
      setCurrentConversationId(null);
      setCurrentConversation([]);
      setCurrentConversationTitle('');
      resetETLVariables();
    }
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
    const container = conversations.get(key);
    if (!container) return;

    // Find active version
    const activeVersion = container.versions.find(v => v.id === container.activeVersionId) || container.versions[0];
    const conversation = activeVersion.data;

    setCurrentConversationId(key);
    setCurrentActiveVersionId(activeVersion.id);
    setCurrentVersions(container.versions);

    setCurrentConversationTitle(conversation.title);
    setCurrentQuestion(conversation.conversation[1]?.content || '');
    setText(conversation.conversation[2]?.content || '');
    setCurrentConversation(conversation.conversation);
    setExtractedSignals(conversation.extractedSignals);
    setSignalAssessment(conversation.signalAssessment);
    setCognitionArtifact(conversation.cognitionArtifact);
    setCognitionArtifactEvaluation(conversation.evaluation);
  };

  const startNewConversation = (assistantMessage: string) => {
    // If we have unsaved changes we might want to prompt, but for now just clear

    // Don't auto-store on new conversation logic here, confusing UX.
    // handleStoreConversationAndArtifacts();

    setCurrentConversationId(null);
    setCurrentConversation([]);
    setCurrentQuestion('');
    setText('');
    resetETLVariables();

    const newConversation: ChatMessage[] = [
      { role: 'system', content: INTERVIEWER_PROMPT },
      { role: 'assistant', content: assistantMessage }
    ];
    setCurrentConversation(newConversation);
    setCurrentQuestion(assistantMessage);
  };

  const handleSetConversationTitle = (title: string) => {
    setCurrentConversationTitle(title);
  };


  const handleGetFollowupQuestion = useCallback(async () => {
    const response = await followupQuestionWorker(
      openaiKey,
      currentConversation,
      cognitionArtifactEvaluation || "No evaluation yet"
    );
    setCurrentConversation(response.newConversation);
    return response;
  }, [openaiKey, currentConversation, cognitionArtifactEvaluation]);


  const handleGenerateReference = useCallback(async (strength: string, referenceId: string) => {
    const response = await referenceDetectionWorker(openaiKey, strength, currentConversation);
    if (response instanceof Error) {
      console.error(response);
      return { supporting_material: ['Error generating reference'] };
    }
    console.log(response, referenceId);
    return { supporting_material: response.supporting_material };
  }, [openaiKey, currentConversation]);

  const handleGenerateBatchReference = useCallback(async (pattern: string, citations: string[]) => {
    const payloadConversations = citations.map(id => {
      const container = conversations.get(id);
      if (!container) return null;

      const activeVersion = container.versions.find(v => v.id === container.activeVersionId) || container.versions[0];
      const conversation = activeVersion.data;

      return {
        id: id,
        title: conversation?.title || 'Untitled',
        conversation: conversation?.conversation || []
      };
    }).filter(c => c !== null);

    const response = await batchReferenceDetectionWorker(openaiKey, pattern, payloadConversations);
    if (response instanceof Error) {
      console.error(response);
      return { results: [] };
    }
    return response;
  }, [openaiKey, conversations]);

  const handleDeepDiveReference = useCallback(async (point: string, conversationId: string) => {
    const container = conversations.get(conversationId);
    if (!container) {
      return { error: 'Conversation not found' };
    }

    const activeVersion = container.versions.find(v => v.id === container.activeVersionId) || container.versions[0];
    const conversation = activeVersion.data;

    const response = await deepDiveReferenceWorker(openaiKey, point, conversation.conversation);
    if (response instanceof Error) {
      console.error(response);
      return { error: 'Error generating deep dive' };
    }
    return response;
  }, [openaiKey, conversations]);

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
    handleGenerateBatchReference,
    handleDeepDiveReference,
    handleBulkUploadConversations,
    startNewConversation,
    selectedIds,
    setSelectedIds,
    selectedIdsRef,
    currentVersions,
    currentActiveVersionId,
    handleSaveVersion,
    handleSwitchVersion
  };
};
