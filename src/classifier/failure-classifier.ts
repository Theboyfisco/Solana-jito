import { streamBus } from '../stream/stream';
import { getTipPercentiles } from '../tips/tip-service';

export function initFailureClassifier() {
  streamBus.on('bundleFailed', (bundle: any) => {
    const percentiles = getTipPercentiles();
    
    let category = bundle.failureCategory;
    let reason = bundle.failureReason;
    
    // If no category was explicitly set by the lifecycle engine (e.g., from RPC errors)
    if (!category) {
      if (bundle.tipLamports < percentiles.p50) {
        category = 'INSUFFICIENT_TIP';
        reason = `Tip of ${bundle.tipLamports} lamports is below current network p50 floor of ${percentiles.p50} lamports. Likely outbid in Jito bundle auction.`;
      } else {
        category = 'BUNDLE_AUCTION_LOSS';
        reason = 'Bundle dropped by Jito block engine (potential account contention or high priority fee spikes).';
      }
      bundle.failureCategory = category;
      bundle.failureReason = reason;
    }

    streamBus.emit('failureClassified', bundle);
  });
}
