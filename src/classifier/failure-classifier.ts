import { streamBus } from '../stream/stream';
import { getTipPercentiles } from '../tips/tip-service';

export function initFailureClassifier() {
  streamBus.on('bundleFailed', (bundle: any) => {
    // We already do a basic failure classification in the lifecycle engine for mock purposes, 
    // but here we can enrich it before sending it to the AI agent.
    const percentiles = getTipPercentiles();
    
    let category = bundle.failureCategory;
    let reason = bundle.failureReason;
    
    if (!category) {
      if (bundle.tipLamports < percentiles.p50) {
        category = 'INSUFFICIENT_TIP';
        reason = `Tip of ${bundle.tipLamports} is below p50 floor of ${percentiles.p50}`;
      } else {
        category = 'BUNDLE_AUCTION_LOSS';
        reason = 'Rejected by block engine.';
      }
      bundle.failureCategory = category;
      bundle.failureReason = reason;
    }

    streamBus.emit('failureClassified', bundle);
  });
}
