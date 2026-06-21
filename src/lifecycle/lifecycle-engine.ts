import { streamBus } from '../stream/stream';
import { activeBundles } from '../submission/submission-service';
import { currentSlot } from '../leader/leader-service';
import { Connection } from '@solana/web3.js';
import bs58 from 'bs58';
import { nextFault, clearNextFault } from '../engine';

let connection: Connection | null = null;

export function initLifecycleEngine() {
  const rpcUrl = process.env.RPC_URL;
  if (rpcUrl) {
    connection = new Connection(rpcUrl, 'confirmed');
  }

  // Map Geyser events to lifecycle states
  streamBus.on('transactionUpdate', (txInfo: any) => {
    // Find matching bundle by signature
    const sigBytes = txInfo.signature; 
    // Usually signature from Geyser is a buffer, convert to base58 or string
    // In this simplified version, we just assume string representation matches
    const signature = Buffer.isBuffer(sigBytes) ? bs58.encode(sigBytes) : sigBytes;

    const bundle = activeBundles.find(b => b.signature === signature);
    if (bundle) {
      if (bundle.status === 'SUBMITTED') {
        bundle.status = 'PROCESSED';
        bundle.processedSlot = currentSlot;
        bundle.processedAt = new Date().toISOString();
      }
      
      // If Geyser emits confirmed or finalized, update
      if (txInfo.commitment === 'confirmed' && bundle.status !== 'CONFIRMED' && bundle.status !== 'FINALIZED') {
        bundle.status = 'CONFIRMED';
        bundle.confirmedSlot = currentSlot;
        bundle.confirmedAt = new Date().toISOString();
      } else if (txInfo.commitment === 'finalized' && bundle.status !== 'FINALIZED') {
        bundle.status = 'FINALIZED';
        bundle.finalizedSlot = currentSlot;
        bundle.finalizedAt = new Date().toISOString();
        streamBus.emit('bundleFinalized', bundle);
      }
    }
  });

  // Polling loop for fallback tracking & blockhash expiry
  setInterval(async () => {
    if (!connection) return;

    for (const b of activeBundles) {
      if (b.status === 'FAILED' || b.status === 'FINALIZED' || b.status === 'ABANDONED') continue;

      if (b.status === 'SUBMITTED') {
        // Leader skip check
        if (nextFault === 'LEADER_SKIP') {
          clearNextFault();
          b.status = 'FAILED';
          b.failureCategory = 'LEADER_SKIP';
          b.failureReason = `Jito leader skipped the designated slot. Bundle execution window missed.`;
          streamBus.emit('bundleFailed', b);
          continue;
        }

        // Expiry logic: if 151 slots have passed and still submitted
        if (b.blockhashSlot < currentSlot - 151) {
          b.status = 'FAILED';
          b.failureCategory = 'EXPIRED_BLOCKHASH';
          b.failureReason = `Blockhash slot (${b.blockhashSlot}) is older than 151 slots relative to current slot (${currentSlot}).`;
          streamBus.emit('bundleFailed', b);
          continue;
        }

        // Check Jito API for bundle status (mocked here as simple HTTP fetch)
        try {
          // In a fully working mainnet app we would call Jito's API:
          // const res = await fetch(`https://mainnet.block-engine.jito.wtf/api/v1/bundles?id=${b.bundleId}`);
          // const data = await res.json();
        } catch (e) {
          // silent
        }
      }

      // Check signature status on Solana RPC
      try {
        const statuses = await connection.getSignatureStatuses([b.signature], { searchTransactionHistory: true });
        const status = statuses?.value[0];
        
        if (status) {
          if (status.err) {
            b.status = 'FAILED';
            b.failureCategory = 'INSUFFICIENT_TIP'; // Or parse error
            b.failureReason = `Transaction failed on chain: ${JSON.stringify(status.err)}`;
            streamBus.emit('bundleFailed', b);
            continue;
          }

          if (status.confirmationStatus === 'processed' && b.status === 'SUBMITTED') {
            b.status = 'PROCESSED';
            b.processedSlot = currentSlot;
            b.processedAt = new Date().toISOString();
          } else if (status.confirmationStatus === 'confirmed' && b.status !== 'CONFIRMED' && b.status !== 'FINALIZED') {
            b.status = 'CONFIRMED';
            b.confirmedSlot = currentSlot;
            b.confirmedAt = new Date().toISOString();
          } else if (status.confirmationStatus === 'finalized' && b.status !== 'FINALIZED') {
            b.status = 'FINALIZED';
            b.finalizedSlot = currentSlot;
            b.finalizedAt = new Date().toISOString();
            streamBus.emit('bundleFinalized', b);
          }
        }
      } catch (e) {
        // ignore rpc timeout
      }
    }
  }, 2000);

  // -------------------------------------------------------------------------
  // Simulation state machine: drives bundles through lifecycle when no RPC
  // Mirrors the real commitment progression without actual chain queries
  // -------------------------------------------------------------------------
  if (!connection) {
    setInterval(() => {
      const now = new Date().toISOString();
      for (const b of activeBundles) {
        if (b.status === 'FAILED' || b.status === 'FINALIZED' || b.status === 'ABANDONED') continue;

        const slotsElapsed = currentSlot - b.submissionSlot;

        if (b.status === 'SUBMITTED') {
          // Leader skip check
          if (nextFault === 'LEADER_SKIP') {
            clearNextFault();
            b.status = 'FAILED';
            b.failureCategory = 'LEADER_SKIP';
            b.failureReason = `Jito leader skipped the designated slot. Bundle execution window missed.`;
            streamBus.emit('bundleFailed', b);
            continue;
          }

          // Blockhash expiry check
          if (b.blockhashSlot && b.blockhashSlot < currentSlot - 151) {
            b.status = 'FAILED';
            b.failureCategory = 'EXPIRED_BLOCKHASH';
            b.failureReason = `Blockhash slot (${b.blockhashSlot}) is older than 151 slots relative to current slot (${currentSlot}).`;
            streamBus.emit('bundleFailed', b);
            continue;
          }
          // Low-tip rejection (below 2000 lamports is clearly wrong)
          if (b.tipLamports < 2000) {
            b.status = 'FAILED';
            b.failureCategory = 'INSUFFICIENT_TIP';
            b.failureReason = `Tip of ${b.tipLamports} lamports is critically below the minimum network floor.`;
            streamBus.emit('bundleFailed', b);
            continue;
          }
          // Rare random drop to simulate bundle auction loss
          if (slotsElapsed > 8 && Math.random() < 0.12) {
            b.status = 'FAILED';
            b.failureCategory = 'BUNDLE_AUCTION_LOSS';
            b.failureReason = `Bundle outbid or dropped by Jito block engine due to fast-shifting gas fee spikes.`;
            streamBus.emit('bundleFailed', b);
            continue;
          }
          // Normal progression to PROCESSED after 1-2 slots
          if (slotsElapsed >= 1 + Math.floor(Math.random() * 2)) {
            b.status = 'PROCESSED';
            b.processedSlot = currentSlot;
            b.processedAt = now;
          }

        } else if (b.status === 'PROCESSED') {
          const processedElapsed = currentSlot - (b.processedSlot || b.submissionSlot);
          if (processedElapsed >= 2 + Math.floor(Math.random() * 3)) {
            b.status = 'CONFIRMED';
            b.confirmedSlot = currentSlot;
            b.confirmedAt = now;
          }

        } else if (b.status === 'CONFIRMED') {
          const confirmedElapsed = currentSlot - (b.confirmedSlot || b.submissionSlot);
          if (confirmedElapsed >= 31) {
            b.status = 'FINALIZED';
            b.finalizedSlot = currentSlot;
            b.finalizedAt = now;
            streamBus.emit('bundleFinalized', b);
          }
        }
      }
    }, 800); // run every 2 slots
  }
}
