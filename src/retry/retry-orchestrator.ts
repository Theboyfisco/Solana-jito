import { streamBus } from '../stream/stream';
import { buildBundle } from '../bundle/bundle-builder';
import { submitBundleToNetwork } from '../submission/submission-service';
import { currentSlot } from '../leader/leader-service';

export function initRetryOrchestrator() {
  streamBus.on('agentDecision', ({ bundle, decision }) => {
    if (bundle.retryCount >= 3 || decision.action === 'ABANDON') {
      bundle.status = 'ABANDONED';
      decision.outcome = "ABANDONED";
      return;
    }

    const tipMult = decision.parameters.tipMultiplier || 1.2;
    const targetPerc = decision.parameters.targetPercentile || 75;
    const wait = decision.parameters.waitSlots || 0;

    setTimeout(() => {
      const retryBundle = buildBundle(targetPerc, `Retry #${bundle.retryCount + 1}: ${bundle.payloadDesc}`, {
        parentId: bundle.id,
        retryCount: bundle.retryCount + 1,
        blockhashSlot: currentSlot
      });

      // Simple tip multiplication
      retryBundle.tipLamports = Math.round(retryBundle.tipLamports * tipMult);
      
      submitBundleToNetwork(retryBundle);
      decision.outcome = `Successfully launched retry bundle ID: ${retryBundle.id}`;
    }, wait * 400);
  });
}
