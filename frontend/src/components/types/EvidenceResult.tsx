import type { ChatMessage } from "../../services/aiWorkers";

export interface EvidenceResult {
  conversationTitle: string;
  messages: ChatMessage[];
  supportingQuotes: {
    quote: string;
    justification: string;
    defense: string;
  }[];
}