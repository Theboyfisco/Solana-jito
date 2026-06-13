export type BundleStatus = 'SUBMITTED' | 'PROCESSED' | 'CONFIRMED' | 'FINALIZED' | 'FAILED' | 'ABANDONED';

export type FailureCategory = 
  | 'EXPIRED_BLOCKHASH'
  | 'COMPUTE_EXCEEDED'
  | 'INSUFFICIENT_TIP'
  | 'LEADER_SKIP'
  | 'BUNDLE_AUCTION_LOSS'
  | 'ACCOUNT_CONTENTION'
  | 'UNKNOWN';

export type AgentAction = 'RETRY' | 'WAIT' | 'ABANDON' | 'INCREASE_TIP' | 'REFRESH_BLOCKHASH' | 'COMPOSITE';

export interface Bundle {
  id: string;                // Internal tracking ID
  bundleId?: string;          // Jito bundle UUID
  signature?: string;         // Transaction signature
  status: BundleStatus;
  failureReason?: string;
  failureCategory?: FailureCategory;
  tipLamports: number;
  blockhashUsed: string;
  blockhashSlot: number;      // Slot when blockhash was fetched
  submissionSlot: number;     // Slot when submitted
  processedSlot?: number;
  confirmedSlot?: number;
  finalizedSlot?: number;
  submittedAt: string;        // ISO timestamp
  processedAt?: string;
  confirmedAt?: string;
  finalizedAt?: string;
  retryCount: number;
  parentBundleId?: string;    // Link to previous failed bundle
  payloadDesc?: string;       // human readable payload description
}

export interface AgentDecision {
  id: string;
  bundleId: string;
  reasoning: string;          // Claude / Gemini reasoning verbatim
  confidence: number;
  action: AgentAction;
  parameters: {
    tipMultiplier?: number;
    waitSlots?: number;
    targetPercentile?: number;
    sequence?: string[];
  };
  outcome?: string;
  createdAt: string;          // ISO timestamp
}

export interface TipSnapshot {
  id: string;
  timestamp: string;
  slot: number;
  p25: number;
  p50: number;
  p75: number;
  p95: number;
  p99: number;
  landingRate: number;
}

export interface NetworkHealth {
  congestionScore: number;          // 0.0 to 1.0
  avgProcessedToConfirmedMs: number;
  recentLandingRate: number;        // ratio of successes past 10 entries
  slotDurationMs: number;
  tps: number;
}

export interface JitoLeaderSchedule {
  currentLeader: string;
  nextLeader: string;
  nextJitoLeader: string;
  nextJitoLeaderSlot: number;
  slotsUntilJitoLeader: number;
}
