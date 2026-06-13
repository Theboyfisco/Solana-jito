import { EventEmitter } from 'events';
import { connectYellowstoneStream } from './stream/stream';
import { initLeaderService, getLeaderContext, currentSlot } from './leader/leader-service';
import { initTipService, getTipPercentiles } from './tips/tip-service';
import { initSubmissionService, activeBundles as bundles, submitBundleToNetwork } from './submission/submission-service';
import { initLifecycleEngine } from './lifecycle/lifecycle-engine';
import { initFailureClassifier } from './classifier/failure-classifier';
import { initAiAgent, getAiClient } from './agent/agent';
import { initRetryOrchestrator } from './retry/retry-orchestrator';
import { Bundle, AgentDecision, TipSnapshot, NetworkHealth } from './types';

// Shared in‑memory state for API endpoints
export const health: NetworkHealth = {
  congestionScore: 0,
  avgProcessedToConfirmedMs: 0,
  recentLandingRate: 0,
  slotDurationMs: 400,
  tps: 0,
};

let nextFault: string | undefined;

/** Set the next simulated fault scenario – used by the lifecycle engine */
export function setNextFault(fault: string) {
  nextFault = fault;
}
/** Adjust network congestion (affects mock tip observations) */
export function setCongestionScore(score: number) {
  health.congestionScore = score;
}
/** Submit a new bundle – builds then persists via the submission service */
export function submitBundle(percentile: number, description: string, forceParams?: Partial<Bundle>) {
  const { buildBundle } = require('./bundle/bundle-builder') as typeof import('./bundle/bundle-builder');
  const payload = buildBundle(percentile, description, forceParams);
  return submitBundleToNetwork(payload);
}
/** Export current slot for UI */
export { currentSlot };
/** Export AI client getter */
export { getAiClient };
/** Export state collections */
export { bundles } from './submission/submission-service';
export { decisions } from './agent/agent';
export const snapshots: TipSnapshot[] = [];
/** Export helper getters */
export { getLeaderContext } from './leader/leader-service';
export { getTipPercentiles } from './tips/tip-service';
/** Engine entry point – wire all services together */
export async function startEngine() {
  await connectYellowstoneStream();
  initLeaderService();
  initTipService();
  initSubmissionService();
  initFailureClassifier();
  initAiAgent();
  initRetryOrchestrator();
  initLifecycleEngine();
}
