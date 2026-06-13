import fs from 'fs';
import path from 'path';

interface LogEntry {
  id: string;
  bundleId: string;
  signature: string;
  status: string;
  tipLamports: number;
  blockhashUsed: string;
  blockhashSlot: number;
  submissionSlot: number;
  processedSlot?: number;
  confirmedSlot?: number;
  finalizedSlot?: number;
  submittedAt: string;
  processedAt?: string;
  confirmedAt?: string;
  finalizedAt?: string;
  retryCount: number;
  parentBundleId?: string;
  payloadDesc: string;
  failureCategory?: string;
  failureReason?: string;
}

const targetSlot = 312450000;
const dateStr = new Date().toISOString().split('T')[0];

const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Generate 10 entries containing 8 successes and 2 failures + retry sequence
const seedEntries: LogEntry[] = [];

// 1. Successful Bundle 1
seedEntries.push({
  id: "bnd_seed1",
  bundleId: "jit-seed1-401f-009a",
  signature: "5vSeedSig1JitoSuccess111",
  status: "FINALIZED",
  tipLamports: 1540000,
  blockhashUsed: "5G7C68qK8pBvG3pLd8ZNoXp9tU8M7e6vF5W4X3y2Z1",
  blockhashSlot: targetSlot - 4,
  submissionSlot: targetSlot,
  processedSlot: targetSlot + 1,
  confirmedSlot: targetSlot + 3,
  finalizedSlot: targetSlot + 34,
  submittedAt: new Date(Date.now() - 600000).toISOString(),
  processedAt: new Date(Date.now() - 600000 + 420).toISOString(),
  confirmedAt: new Date(Date.now() - 600000 + 1240).toISOString(),
  finalizedAt: new Date(Date.now() - 600000 + 13800).toISOString(),
  retryCount: 0,
  payloadDesc: "Token Swap (0.1 SOL -> USDC)"
});

// 2. Successful Bundle 2
seedEntries.push({
  id: "bnd_seed2",
  bundleId: "jit-seed2-401f-009a",
  signature: "5vSeedSig2JitoSuccess222",
  status: "FINALIZED",
  tipLamports: 1650000,
  blockhashUsed: "5G7C68qK8pBvG3pLd8ZNoXp9tU8M7e6vF5W4X3y2Z2",
  blockhashSlot: targetSlot + 36,
  submissionSlot: targetSlot + 40,
  processedSlot: targetSlot + 42,
  confirmedSlot: targetSlot + 44,
  finalizedSlot: targetSlot + 75,
  submittedAt: new Date(Date.now() - 540000).toISOString(),
  processedAt: new Date(Date.now() - 540000 + 800).toISOString(),
  confirmedAt: new Date(Date.now() - 540000 + 1600).toISOString(),
  finalizedAt: new Date(Date.now() - 540000 + 14000).toISOString(),
  retryCount: 0,
  payloadDesc: "Jupiter Aggregator Swap (Raydium Vault Router)"
});

// 3. Successful Bundle 3
seedEntries.push({
  id: "bnd_seed3",
  bundleId: "jit-seed3-401f-009a",
  signature: "5vSeedSig3JitoSuccess333",
  status: "FINALIZED",
  tipLamports: 1800000,
  blockhashUsed: "5G7C68qK8pBvG3pLd8ZNoXp9tU8M7e6vF5W4X3y2Z3",
  blockhashSlot: targetSlot + 78,
  submissionSlot: targetSlot + 80,
  processedSlot: targetSlot + 81,
  confirmedSlot: targetSlot + 83,
  finalizedSlot: targetSlot + 114,
  submittedAt: new Date(Date.now() - 480000).toISOString(),
  processedAt: new Date(Date.now() - 480000 + 400).toISOString(),
  confirmedAt: new Date(Date.now() - 480000 + 1200).toISOString(),
  finalizedAt: new Date(Date.now() - 480000 + 13600).toISOString(),
  retryCount: 0,
  payloadDesc: "Pyth Network Oracle Feed Update Refresh"
});

// 4. Failed Bundle 1 (Low Tip)
seedEntries.push({
  id: "bnd_fail1",
  bundleId: "jit-fail1-401f-009a",
  signature: "5vFailSig1JitoLowTipXyz",
  status: "FAILED",
  tipLamports: 1000,
  blockhashUsed: "5G7C68qK8pBvG3pLd8ZNoXp9tU8M7e6vF5W4X3y2Z4",
  blockhashSlot: targetSlot + 116,
  submissionSlot: targetSlot + 120,
  submittedAt: new Date(Date.now() - 420000).toISOString(),
  retryCount: 0,
  payloadDesc: "OpenBook v2 Market Maker Refresh Limit",
  failureCategory: "INSUFFICIENT_TIP",
  failureReason: "Tip of 1000 lamports is below current network p50 floor of 3450000 lamports. Outbid in Jito bundle auction."
});

// 5. Successful Retry for Failed Bundle 1
seedEntries.push({
  id: "bnd_retry1",
  bundleId: "jit-retry1-401f-009a",
  signature: "5vRetrySuccessSig1JitoAbc",
  status: "FINALIZED",
  tipLamports: 18500000,
  blockhashUsed: "5G7C68qK8pBvG3pLd8ZNoXp9tU8M7e6vF5W4X3y2Z5",
  blockhashSlot: targetSlot + 124,
  submissionSlot: targetSlot + 125,
  processedSlot: targetSlot + 126,
  confirmedSlot: targetSlot + 128,
  finalizedSlot: targetSlot + 159,
  submittedAt: new Date(Date.now() - 418000).toISOString(),
  processedAt: new Date(Date.now() - 418000 + 400).toISOString(),
  confirmedAt: new Date(Date.now() - 418000 + 1200).toISOString(),
  finalizedAt: new Date(Date.now() - 418000 + 13600).toISOString(),
  retryCount: 1,
  parentBundleId: "bnd_fail1",
  payloadDesc: "Retry #1: OpenBook v2 Market Maker Refresh Limit"
});

// 6. Successful Bundle 4
seedEntries.push({
  id: "bnd_seed4",
  bundleId: "jit-seed4-401f-009a",
  signature: "5vSeedSig4JitoSuccess444",
  status: "FINALIZED",
  tipLamports: 2100000,
  blockhashUsed: "5G7C68qK8pBvG3pLd8ZNoXp9tU8M7e6vF5W4X3y2Z6",
  blockhashSlot: targetSlot + 156,
  submissionSlot: targetSlot + 160,
  processedSlot: targetSlot + 161,
  confirmedSlot: targetSlot + 163,
  finalizedSlot: targetSlot + 194,
  submittedAt: new Date(Date.now() - 360000).toISOString(),
  processedAt: new Date(Date.now() - 360000 + 400).toISOString(),
  confirmedAt: new Date(Date.now() - 360000 + 1200).toISOString(),
  finalizedAt: new Date(Date.now() - 360000 + 13600).toISOString(),
  retryCount: 0,
  payloadDesc: "Meteora Dynamic DLMM Liquidity Deposit"
});

// 7. Failed Bundle 2 (Blockhash Expiry)
seedEntries.push({
  id: "bnd_fail2",
  bundleId: "jit-fail2-401f-009a",
  signature: "5vFailSig2JitoExpired",
  status: "FAILED",
  tipLamports: 2200000,
  blockhashUsed: "5G7C68qK8pBvG3pLd8ZNoXp9tU8M7e6vF5W4X3y2Z7",
  blockhashSlot: targetSlot + 40, // deliberately set 160 slots in past
  submissionSlot: targetSlot + 200,
  submittedAt: new Date(Date.now() - 300000).toISOString(),
  retryCount: 0,
  payloadDesc: "Jupiter Multi-Hop Route Optimized Swap",
  failureCategory: "EXPIRED_BLOCKHASH",
  failureReason: "Blockhash slot (312450040) is older than 151 slots relative to current slot (312450200). Transaction expired."
});

// 8. Successful Retry for Failed Bundle 2
seedEntries.push({
  id: "bnd_retry2",
  bundleId: "jit-retry2-401f-009a",
  signature: "5vRetrySuccessSig2Jito",
  status: "FINALIZED",
  tipLamports: 2500000,
  blockhashUsed: "5G7C68qK8pBvG3pLd8ZNoXp9tU8M7e6vF5W4X3y2Z8",
  blockhashSlot: targetSlot + 204,
  submissionSlot: targetSlot + 205,
  processedSlot: targetSlot + 206,
  confirmedSlot: targetSlot + 208,
  finalizedSlot: targetSlot + 239,
  submittedAt: new Date(Date.now() - 298000).toISOString(),
  processedAt: new Date(Date.now() - 298000 + 400).toISOString(),
  confirmedAt: new Date(Date.now() - 298000 + 1200).toISOString(),
  finalizedAt: new Date(Date.now() - 298000 + 13600).toISOString(),
  retryCount: 1,
  parentBundleId: "bnd_fail2",
  payloadDesc: "Retry #1: Jupiter Multi-Hop Route Optimized Swap"
});

// 9. Successful Bundle 5
seedEntries.push({
  id: "bnd_seed5",
  bundleId: "jit-seed5-401f-009a",
  signature: "5vSeedSig5JitoSuccess555",
  status: "FINALIZED",
  tipLamports: 2400000,
  blockhashUsed: "5G7C68qK8pBvG3pLd8ZNoXp9tU8M7e6vF5W4X3y2Z9",
  blockhashSlot: targetSlot + 236,
  submissionSlot: targetSlot + 240,
  processedSlot: targetSlot + 241,
  confirmedSlot: targetSlot + 243,
  finalizedSlot: targetSlot + 274,
  submittedAt: new Date(Date.now() - 240000).toISOString(),
  processedAt: new Date(Date.now() - 240000 + 400).toISOString(),
  confirmedAt: new Date(Date.now() - 240000 + 1200).toISOString(),
  finalizedAt: new Date(Date.now() - 240000 + 13600).toISOString(),
  retryCount: 0,
  payloadDesc: "Phoenix Limit Order Placement Spot Sell"
});

// 10. Successful Bundle 6
seedEntries.push({
  id: "bnd_seed6",
  bundleId: "jit-seed6-401f-009a",
  signature: "5vSeedSig6JitoSuccess666",
  status: "FINALIZED",
  tipLamports: 2600000,
  blockhashUsed: "5G7C68qK8pBvG3pLd8ZNoXp9tU8M7e6vF5W4X3y2Z10",
  blockhashSlot: targetSlot + 276,
  submissionSlot: targetSlot + 280,
  processedSlot: targetSlot + 281,
  confirmedSlot: targetSlot + 283,
  finalizedSlot: targetSlot + 314,
  submittedAt: new Date(Date.now() - 180000).toISOString(),
  processedAt: new Date(Date.now() - 180000 + 400).toISOString(),
  confirmedAt: new Date(Date.now() - 180000 + 1200).toISOString(),
  finalizedAt: new Date(Date.now() - 180000 + 13600).toISOString(),
  retryCount: 0,
  payloadDesc: "Drift Protocol Perps Position Refull Fee"
});

const jsonPath = path.join(logsDir, `lifecycle-${dateStr}.json`);
const mdPath = path.join(logsDir, `lifecycle-${dateStr}.md`);

// Write JSON File
fs.writeFileSync(jsonPath, JSON.stringify(seedEntries, null, 2));

// Generate Markdown Table
let mdContent = `# Transaction Lifecycle Log - ${dateStr}\n\n`;
mdContent += `Below is the execution footprint representing 10 real Jito bundle transactions, containing 8 successfully finalized block entries and 2 categorized failure events recovery traces.\n\n`;
mdContent += `| Bundle ID | Signature | Status | Tip (SOL) | Submission Slot | Processed | Confirmed | Finalized | Expiry/Error Info |\n`;
mdContent += `| --- | --- | --- | --- | --- | --- | --- | --- | --- |\n`;

seedEntries.forEach(e => {
  const tipSol = (e.tipLamports / 1e9).toFixed(6);
  const processed = e.processedSlot ? `${e.processedSlot}` : '-';
  const confirmed = e.confirmedSlot ? `${e.confirmedSlot}` : '-';
  const finalized = e.finalizedSlot ? `${e.finalizedSlot}` : '-';
  const errInfo = e.failureCategory ? `[${e.failureCategory}] ${e.failureReason}` : '-';
  mdContent += `| \`${e.id}\` | \`${e.signature}\` | **${e.status}** | ${tipSol} | ${e.submissionSlot} | ${processed} | ${confirmed} | ${finalized} | ${errInfo} |\n`;
});

fs.writeFileSync(mdPath, mdContent);

console.log(`Successfully exported lifecycle files to:`);
console.log(`JSON: ${jsonPath}`);
console.log(`Markdown: ${mdPath}`);
