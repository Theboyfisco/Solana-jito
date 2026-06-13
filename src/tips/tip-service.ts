import { streamBus } from '../stream/stream';
import { currentSlot } from '../leader/leader-service';

export let recentObservations: number[] = Array.from({ length: 100 }, () => Math.floor(1000000 + Math.random() * 8000000));

export function initTipService() {
  streamBus.on('tipAccountUpdate', (update: any) => {
    // Observe tip delta in lamports (mocked delta)
    const newObs = Math.max(100000, Math.floor(update.account.lamports * 0.1 + (Math.random() - 0.5) * 500000));
    recentObservations.push(newObs);
    if (recentObservations.length > 500) recentObservations.shift();
    
    // Periodically take snapshots (every 30 slots theoretically, managed in engine loop for now)
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

