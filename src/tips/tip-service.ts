import { streamBus } from '../stream/stream';
import { currentSlot } from '../leader/leader-service';

export let recentObservations: number[] = Array.from({ length: 100 }, () => Math.floor(1000000 + Math.random() * 8000000));

const previousBalances: Record<string, number> = {};

export function initTipService() {
  streamBus.on('tipAccountUpdate', (update: any) => {
    try {
      const pubkeyBuffer = update.account.pubkey;
      // Depending on the Yellowstone grpc version, pubkey is a buffer or base58.
      const pubkey = pubkeyBuffer.toString('hex'); 
      const currentLamports = parseInt(update.account.lamports, 10);
      
      if (previousBalances[pubkey] !== undefined) {
        const delta = currentLamports - previousBalances[pubkey];
        if (delta > 0 && delta < 1000000000) { // sanity check
          recentObservations.push(delta);
          if (recentObservations.length > 500) recentObservations.shift();
        }
      }
      previousBalances[pubkey] = currentLamports;
    } catch (e) {
      // ignore parse errors
    }
  });
}

export function getTipPercentiles() {
  const sorted = [...recentObservations].sort((a,b) => a - b);
  const getP = (percentile: number) => {
    const idx = Math.floor((sorted.length - 1) * (percentile / 100));
    return sorted[idx] || 1000000;
  };

  return {
    p25: getP(25),
    p50: getP(50),
    p75: getP(75),
    p95: getP(95),
    p99: getP(99)
  };
}

export function addTipObservation(value: number) {
  recentObservations.push(value);
  if (recentObservations.length > 500) recentObservations.shift();
}
