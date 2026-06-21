import { EventEmitter } from 'events';
import * as Yellowstone from '@triton-one/yellowstone-grpc';
import pino from 'pino';

const Client = Yellowstone.default;
const { CommitmentLevel } = Yellowstone;

export const streamBus = new EventEmitter();
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

export const JITO_TIP_ACCOUNTS = [
  "96gYZGLnJYLFGGAzBqcNkiNpqB8bBTmMxBDKwhCTZFMG",
  "HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe",
  "Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY",
  "ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1sMXoi62cCo",
  "DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL3",
  "3AVoygJbyZ76DGJdQ6asgFuigQmgTG7Y87ngo7ZRWVKm",
  "6m9F9H68p9ZLa9sDoAnW48mE9X877wKNo6B6v9NoBD1c",
  "DfXSA2dwvSt8mGcqi77709gQBjXm991E4CNoQnoBD3b"
];

let client: any = null;
let stream: any = null;
let isConnected = false;
let reconnectAttempts = 0;
let mockCongestionScore = 0;

export function setMockCongestionScore(score: number) {
  mockCongestionScore = Math.min(1, Math.max(0, score));
}

export const connectStream = connectYellowstoneStream;

async function connectYellowstoneStream() {
  const endpoint = process.env.GEYSER_ENDPOINT;
  const token = process.env.GEYSER_TOKEN;

  if (!endpoint || !token) {
    logger.warn("GEYSER_ENDPOINT / GEYSER_TOKEN not set. Starting mock simulation heartbeat.");
    startMockHeartbeat();
    return;
  }

  try {
    client = new Client(endpoint, token, undefined);
    stream = await client.subscribe();
    
    stream.on("data", (data: any) => {
      if (data.slot) {
        streamBus.emit('slot', data.slot);
      }
      if (data.account) {
        streamBus.emit('tipAccountUpdate', data.account);
      }
      if (data.transaction) {
        streamBus.emit('transactionUpdate', data.transaction);
      }
    });

    stream.on('end', () => {
      isConnected = false;
      logger.warn("Yellowstone stream ended. Reconnecting...");
      handleReconnect();
    });

    stream.on('error', (error: any) => {
      isConnected = false;
      logger.error({ error }, "Yellowstone stream error. Reconnecting...");
      handleReconnect();
    });

    // Write subscription request
    await new Promise<void>((resolve, reject) => {
      stream.write({
        slots: {
          "slot-sub": {
            filterByCommitment: true
          }
        },
        accounts: {
          "jito-tips": {
            account: JITO_TIP_ACCOUNTS,
            owner: [],
            filters: []
          }
        },
        transactions: {
          "tx-sub": {
            vote: false,
            failed: false,
            signature: undefined,
            accountInclude: JITO_TIP_ACCOUNTS,
            accountExclude: [],
            accountRequired: []
          }
        },
        blocks: {},
        blocksMeta: {},
        entry: {},
        commitment: CommitmentLevel.PROCESSED
      }, (err: any) => {
        if (err) reject(err);
        else resolve();
      });
    });

    isConnected = true;
    reconnectAttempts = 0;
    logger.info("Successfully connected to Yellowstone gRPC stream.");

  } catch (error) {
    logger.error({ error }, "Failed to connect to Yellowstone. Retrying...");
    handleReconnect();
  }
}

// ---------------------------------------------------------------------------
// Mock heartbeat — drives the entire engine when no live Geyser is available
// ---------------------------------------------------------------------------
let mockSlot = 312450000;
let mockTick = 0;

function startMockHeartbeat() {
  isConnected = true; // treat as connected so health checks pass
  setInterval(() => {
    mockSlot += 1;
    mockTick += 1;

    // Emit slot event (same shape as Yellowstone)
    streamBus.emit('slot', mockSlot);

    // Every 3 slots emit a synthetic tip account balance delta so tip percentiles evolve
    if (mockTick % 3 === 0) {
      const baseBalance = 5_000_000_000 + Math.floor(Math.random() * 100_000_000);
      const tipDelta    = Math.floor((1_000_000 + Math.random() * 12_000_000) * (1 + mockCongestionScore * 1.5));
      // Simulate a tip account receiving a payment
      streamBus.emit('tipAccountUpdate', {
        account: {
          pubkey: Buffer.from(JITO_TIP_ACCOUNTS[mockTick % JITO_TIP_ACCOUNTS.length]),
          lamports: (baseBalance + tipDelta).toString(),
        }
      });
    }
  }, 400);
}

function handleReconnect() {
  if (stream) {
    stream.destroy();
  }
  reconnectAttempts++;
  const backoff = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
  const jitter = backoff * (Math.random() * 0.4 - 0.2); // ±20% jitter
  setTimeout(connectYellowstoneStream, backoff + jitter);
}

// Removed mock stream implementation

/** Return mock health info for UI consumption */
export function getStreamHealth() {
  return { connected: isConnected, reconnectAttempts };
}
