import { streamBus } from '../stream/stream';
import { BundlePayload } from '../bundle/bundle-builder';
import { searcherClient } from 'jito-ts/dist/sdk/block-engine/searcher.js';
import { Bundle } from 'jito-ts/dist/sdk/block-engine/types.js';
import { getJitoAuthKeypair } from '../utils/keypair';
import { VersionedTransaction } from '@solana/web3.js';

// The centralized in-memory array for our active bundles
export const activeBundles: any[] = [];
export const bundles = activeBundles;

const BLOCK_ENGINE_URL = process.env.JITO_BLOCK_ENGINE_URL || 'mainnet.block-engine.jito.wtf';
let jitoClient: any;

export function initSubmissionService() {
  const authKey = process.env.JITO_AUTH_KEYPAIR;
  const hasAuth = authKey && authKey !== "YOUR_JITO_AUTH_KEYPAIR" && authKey !== "MY_JITO_AUTH_KEYPAIR" && authKey.trim() !== "";

  if (!hasAuth) {
    console.warn("JITO_AUTH_KEYPAIR is not set or is placeholder. Running Jito submissions in local simulation mode.");
  } else {
    try {
      const authKeypair = getJitoAuthKeypair();
      // Using an arbitrary Jito block engine endpoint (New York, Frankfurt, Tokyo, Amsterdam)
      // You should select the one geographically closest to your infrastructure.
      jitoClient = searcherClient(BLOCK_ENGINE_URL, authKeypair);
      console.log(`Initialized Jito SearcherClient connecting to ${BLOCK_ENGINE_URL}`);
    } catch (e) {
      console.warn("Failed to initialize Jito SearcherClient. Will fallback to simulated submission.", e);
    }
  }

  streamBus.on('jitoLeaderApproaching', (context: any) => {
    // In a real system, we dequeue queued bundles here when a Jito leader is ~2 slots away.
  });
}

export async function submitBundleToNetwork(bundlePayload: BundlePayload) {
  activeBundles.unshift(bundlePayload);
  
  if (jitoClient && bundlePayload.serializedTx) {
    try {
      const tx = VersionedTransaction.deserialize(bundlePayload.serializedTx);
      // Construct a bundle with a maximum of 5 slots for validity
      const bundle = new Bundle([tx], 5);
      
      // Sending bundle via Searcher Client
      await jitoClient.sendBundle(bundle);
      console.log(`[JITO BLOCK ENGINE] Successfully submitted bundle ${bundlePayload.bundleId}`);
    } catch (e) {
      console.error(`[JITO BLOCK ENGINE] Failed to submit bundle ${bundlePayload.bundleId}:`, e);
    }
  } else {
    console.log(`[SIMULATOR] Simulated submission for bundle ${bundlePayload.bundleId}`);
  }

  streamBus.emit('bundleSubmitted', bundlePayload);
  return bundlePayload;
}
