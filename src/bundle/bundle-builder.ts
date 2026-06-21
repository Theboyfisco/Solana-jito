import { getTipPercentiles } from '../tips/tip-service';
import { currentSlot } from '../leader/leader-service';
import { streamBus, JITO_TIP_ACCOUNTS } from '../stream/stream';
import { Keypair, SystemProgram, Transaction, PublicKey, VersionedTransaction, MessageV0 } from '@solana/web3.js';
import { getWalletKeypair } from '../utils/keypair';
import { nextFault, clearNextFault } from '../engine';

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
  serializedTx?: Uint8Array; // Added to hold the actual transaction to be submitted
}

export function buildBundle(targetPercentile: number, payloadDesc: string, forceParams?: any): BundlePayload {
  const percentiles = getTipPercentiles();
  
  let bSlot = currentSlot;
  if (forceParams?.blockhashSlot !== undefined) {
    bSlot = forceParams.blockhashSlot;
  } else if (nextFault === 'BLOCKHASH_EXPIRY') {
    bSlot = currentSlot - 160; // Older than 151 slots validity window
    clearNextFault();
    console.log(`[FAULT INJECTION] Forcing blockhash slot expiry: ${bSlot}`);
  }

  let tip = forceParams?.tipLamports;
  if (!tip) {
    if (nextFault === 'LOW_TIP') {
      tip = 1000; // Critically low tip
      clearNextFault();
      console.log(`[FAULT INJECTION] Forcing low tip: ${tip} lamports`);
    } else {
      let baseVal: number;
      if (targetPercentile === 50) {
        baseVal = percentiles.p50;
      } else if (targetPercentile === 95) {
        baseVal = percentiles.p95;
      } else if (targetPercentile === 99) {
        baseVal = percentiles.p99;
      } else {
        baseVal = percentiles.p75;
      }
      tip = Math.round(baseVal * 1.5);
    }
  }

  // Choose tip account address
  const tipAccountIndex = Math.floor(Math.random() * JITO_TIP_ACCOUNTS.length);
  const selectedAccount = JITO_TIP_ACCOUNTS[tipAccountIndex];
  
  const payer = getWalletKeypair();
  let web3Signature = "5v" + Math.random().toString(36).substring(2, 12) + "Jito" + Math.random().toString(36).substring(2, 10);
  let serializedTx: Uint8Array | undefined;

  try {
    // In a real environment, we should fetch a real blockhash.
    // For now we use a formatted mock string if real one isn't available, but we can serialize.
    // Web3 requires a 32-byte base58 string for blockhash. Let's provide a valid-looking one.
    const dummyBlockhash = "5G7C68qK8pBvG3pLd8ZNoXp9tU8M7e6vF5W4X3y2Z1aB";
    
    // Simple transaction with a tip instruction
    const instructions = [
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: new PublicKey(selectedAccount),
        lamports: tip,
      })
    ];
    
    const messageV0 = MessageV0.compile({
      payerKey: payer.publicKey,
      recentBlockhash: dummyBlockhash,
      instructions,
    });
    
    const tx = new VersionedTransaction(messageV0);
    tx.sign([payer]);
    
    web3Signature = tx.signatures[0].toString();
    serializedTx = tx.serialize();
  } catch (e) {
    console.error("Failed to build real transaction", e);
  }

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
    payloadDesc,
    serializedTx
  };
}
