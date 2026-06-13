import { streamBus } from '../stream/stream';
import { BundlePayload } from '../bundle/bundle-builder';

// The centralized in-memory array for our active bundles
export const activeBundles: any[] = [];

export function initSubmissionService() {
  streamBus.on('jitoLeaderApproaching', (context: any) => {
    // In a real system, we dequeue queued bundles here.
    // For this simulation, we'll let the engine manually submit them to activeBundles.
  });
}

export function submitBundleToNetwork(bundle: BundlePayload) {
  activeBundles.unshift(bundle);
  streamBus.emit('bundleSubmitted', bundle);
  return bundle;
}
