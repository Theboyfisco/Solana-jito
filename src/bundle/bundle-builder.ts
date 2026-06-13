import { getTipPercentiles } from '../tips/tip-service';
import { currentSlot } from '../leader/leader-service';
import { streamBus } from '../stream/stream';

export interface BundlePayload {
  id: string;
  bundleId: string;
  signature: string;
  status: string;
  tipLamports: number;
  blockhashUsed: string;
  blockhashSlot: number;
  submissionSlot: number;
  submittedAt: string;
  retryCount: number;
  parentBundleId?: string;
  payloadDesc: string;
}

export function buildBundle(targetPercentile: number, payloadDesc: string, forceParams?: any): BundlePayload {
  const percentiles = getTipPercentiles();
  
  let bSlot = currentSlot;
  if (forceParams?.blockhashSlot !== undefined) bSlot = forceParams.blockhashSlot;

  let tip = forceParams?.tipLamports;
  if (!tip) {
    const baseVal = targetPercentile === 50 ? percentiles.p50 : 
                    targetPercentile === 95 ? percentiles.p95 : 
                    targetPercentile === 99 ? percentiles.p99 : percentiles.p75;
    tip = Math.round(baseVal * 1.5); // Add generic multiplier for safety
  }

  const web3Signature = "5v" + Math.random().toString(36).substring(2, 12) + "Jito" + Math.random().toString(36).substring(2, 10);

  return {
    id: "bnd_" + Math.random().toString(36).substring(2, 9),
    bundleId: "jit-" + Math.random().toString(36).substring(2, 10) + "-401f-009a",
    signature: web3Signature,
    status: 'SUBMITTED',
    tipLamports: tip,
    blockhashUsed: "5G7C68qK8pBvG3pLd8ZNo..." + bSlot.toString().slice(-4),
    blockhashSlot: bSlot,
    submissionSlot: currentSlot,
    submittedAt: new Date().toISOString(),
    retryCount: forceParams?.retryCount || 0,
    parentBundleId: forceParams?.parentId,
    payloadDesc
  };
}
