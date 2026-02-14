import type { EvidenceResult } from "./EvidenceResult";

export interface ReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetName: string;
  evidence: EvidenceResult[];
}