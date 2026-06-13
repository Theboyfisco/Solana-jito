import { streamBus } from '../stream/stream';
import { activeBundles } from '../submission/submission-service';
import { currentSlot } from '../leader/leader-service';

export function initLifecycleEngine() {
  setInterval(() => {
    // Engine loop checking bundle statuses
    for (const b of activeBundles) {
      if (b.status === 'SUBMITTED') {
        const slotsElapsed = currentSlot - b.submissionSlot;
        
        // Simulating expiry logic
        if (b.blockhashSlot < currentSlot - 151) {
          b.status = 'FAILED';
          b.failureCategory = 'EXPIRED_BLOCKHASH';
          b.failureReason = `Blockhash slot (${b.blockhashSlot}) is older than 151 slots relative to current slot (${currentSlot}).`;
          streamBus.emit('bundleFailed', b);
        } else if (slotsElapsed >= 1 + Math.floor(Math.random() * 2)) {
          b.status = 'PROCESSED';
          b.processedSlot = currentSlot;
          b.processedAt = new Date().toISOString();
        }
      } else if (b.status === 'PROCESSED') {
        const slotsElapsed = currentSlot - (b.processedSlot || b.submissionSlot);
        if (slotsElapsed >= 1 + Math.floor(Math.random() * 2)) {
          b.status = 'CONFIRMED';
          b.confirmedSlot = currentSlot;
          b.confirmedAt = new Date().toISOString();
        }
      } else if (b.status === 'CONFIRMED') {
        const slotsElapsed = currentSlot - (b.confirmedSlot || b.submissionSlot);
        if (slotsElapsed >= 31) { // Solana finalization depth is 31 slots
          b.status = 'FINALIZED';
          b.finalizedSlot = currentSlot;
          b.finalizedAt = new Date().toISOString();
          streamBus.emit('bundleFinalized', b);
        }
      }
    }
  }, 400);
}
