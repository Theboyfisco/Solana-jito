import { EventEmitter } from 'events'; // kept for potential consumer use
import { connectStream, setMockCongestionScore, streamBus } from './stream/stream';
import { initLeaderService, getLeaderContext, currentSlot } from './leader/leader-service';
import { initTipService, getTipPercentiles } from './tips/tip-service';
import { initSubmissionService, activeBundles, activeBundles as bundles, submitBundleToNetwork } from './submission/submission-service';
import { initLifecycleEngine } from './lifecycle/lifecycle-engine';
import { initFailureClassifier } from './classifier/failure-classifier';
import { initAiAgent, getAiClient } from './agent/agent';
import { initRetryOrchestrator } from './retry/retry-orchestrator';
import { Bundle, AgentDecision, TipSnapshot, NetworkHealth } from './types';

// Shared in‑memory state for API endpoints
export const health: NetworkHealth = {
  congestionScore: 0.35,
  avgProcessedToConfirmedMs: 1450,
  recentLandingRate: 0.90,
  slotDurationMs: 400,
  tps: 2450,
};

export let nextFault: string | undefined;

/** Set the next simulated fault scenario – used by the lifecycle engine */
export function setNextFault(fault: string) {
  nextFault = fault;
}
export function clearNextFault() {
  nextFault = undefined;
}
/** Adjust network congestion (affects mock tip observations) */
export function setCongestionScore(score: number) {
  health.congestionScore = score;
  // Propagate to mock stream for tip scaling
  setMockCongestionScore(score);
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
  await connectStream();
  initLeaderService();
  initTipService();
  initSubmissionService();
  initFailureClassifier();
  initAiAgent();
  initRetryOrchestrator();
  initLifecycleEngine();

  // Populate tip snapshots every 30 slots (using a 12s interval = ~30 slots at 400ms each)
  let lastSnapshotSlot = 0;
  streamBus.on('slot', () => {
    if (currentSlot - lastSnapshotSlot >= 30) {
      lastSnapshotSlot = currentSlot;
      const percs = getTipPercentiles();
      const recentBundles = (activeBundles as any[]).slice(0, 10);
      const succ = recentBundles.filter((b: any) => b.status === 'FINALIZED' || b.status === 'CONFIRMED').length;
      const total = recentBundles.length;
      const landingRate = total > 0 ? succ / total : 0.90;

      snapshots.push({
        id: "sn_" + Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toISOString(),
        slot: currentSlot,
        p25: percs.p25,
        p50: percs.p50,
        p75: percs.p75,
        p95: percs.p95,
        p99: percs.p99,
        landingRate
      });

      // Keep last 50 snapshots
      if (snapshots.length > 50) snapshots.shift();
    }
  });
}
