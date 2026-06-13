import { EventEmitter } from 'events';
import Client, { CommitmentLevel } from '@triton-one/yellowstone-grpc';
import pino from 'pino';

export const streamBus = new EventEmitter();
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const JITO_TIP_ACCOUNTS = [
  "96gYZGLnJYLFGGAzBqcNkiNpqB8bBTmMxBDKwhCTZFMG",
  "HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe",
  "Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY",
  "ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1sMXoi62cCo",
  "DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL3",
  "3AVoygJbyZ76DGJdQ6asgFuigQmgTG7Y87ngo7ZRWVKm",
  "6m9F9H68p9ZLa9sDoAnW48mE9X877wKNo6B6v9NoBD1c",
  "DfX5A2dwvSt8mGcqi77709gQBjXm991E4CNoQnoBD3b"
];

let client: Client | null = null;
let stream: any = null;
let isConnected = false;
let reconnectAttempts = 0;

export async function connectYellowstoneStream() {
  if (process.env.LIVE_MODE !== 'true') {
    logger.info("LIVE_MODE is not true. Running Yellowstone Stream Engine in mock mode.");
    startMockStream();
    return;
  }

  const endpoint = process.env.GEYSER_ENDPOINT;
  const token = process.env.GEYSER_TOKEN;

  if (!endpoint || !token) {
    logger.error("GEYSER_ENDPOINT and GEYSER_TOKEN must be set for live mode.");
    return;
  }

  try {
    client = new Client(endpoint, token, undefined);
    stream = await client.subscribe();
    
    stream.on("data", (data: any) => {
      if (data.slot) {
        streamBus.emit("slot", data.slot);
      }
      if (data.account) {
        streamBus.emit("tipAccountUpdate", data.account);
      }
      if (data.transaction) {
        streamBus.emit("transactionUpdate", data.transaction);
      }
    });

    stream.on("end", () => {
      isConnected = false;
      logger.warn("Yellowstone stream ended. Reconnecting...");
      handleReconnect();
    });

    stream.on("error", (error: any) => {
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

function handleReconnect() {
  if (stream) {
    stream.destroy();
  }
  reconnectAttempts++;
  const backoff = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
  const jitter = backoff * (Math.random() * 0.4 - 0.2); // ±20% jitter
  setTimeout(connectYellowstoneStream, backoff + jitter);
}

// Fallback mock stream
function startMockStream() {
  let mockSlot = 312450000;
  setInterval(() => {
    mockSlot++;
    streamBus.emit("slot", { slot: mockSlot, commitment: "processed" });
  }, 400);

  setInterval(() => {
    const tipAccountIndex = Math.floor(Math.random() * JITO_TIP_ACCOUNTS.length);
    const mockBalance = Math.floor(1000000 + Math.random() * 8000000);
    streamBus.emit("tipAccountUpdate", {
      account: { pubkey: JITO_TIP_ACCOUNTS[tipAccountIndex], lamports: mockBalance }
    });
  }, 1000);
}
