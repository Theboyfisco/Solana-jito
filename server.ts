import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { 
  currentSlot, bundles, decisions, snapshots, health, 
  getTipPercentiles, getLeaderContext, submitBundle, 
  setNextFault, setCongestionScore, startEngine
} from "./src/engine";

// Load environment variables
dotenv.config();

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('⚠️ Uncaught Exception:', error);
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json());

  // Background Solana Smart Chain Simulator startup
  startEngine();

  // API Routes
  app.get("/api/health", (req, res) => {
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const isLiveAi = !!(anthropicKey && anthropicKey !== "MY_ANTHROPIC_API_KEY" && anthropicKey.trim() !== "");
    res.json({ 
      status: "ok", 
      time: new Date().toISOString(),
      aiMode: isLiveAi ? "LIVE_CLAUDE_API" : "HEURISTIC_REASONING_SIMULATION"
    });
  });

  // Retrieve current active state of all 9 services
  app.get("/api/state", (req, res) => {
    const percentiles = getTipPercentiles();
    const leaderContext = getLeaderContext();
    res.json({
      currentSlot,
      leaderContext,
      percentiles,
      health
    });
  });

  // Get active Jito Bundles feed
  app.get("/api/bundles", (req, res) => {
    res.json(bundles);
  });

  // Get AI decisions history
  app.get("/api/decisions", (req, res) => {
    res.json(decisions);
  });

  // Get historical bundle tip snapshots
  app.get("/api/snapshots", (req, res) => {
    res.json(snapshots);
  });

  // Manually submit a smart bundle
  app.post("/api/submit-bundle", (req, res) => {
    const { percentile, description, tipLamports } = req.body;
    try {
      const forceParams = tipLamports !== undefined && tipLamports !== null ? { tipLamports } : undefined;
      const b = submitBundle(percentile || 75, description, forceParams);
      res.status(201).json({
        success: true,
        message: "Bundle queued in the Jito leader submission gate",
        bundle: b
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Inject a simulated failure scenario
  app.post("/api/inject-fault", (req, res) => {
    const { scenario } = req.body;
    if (!["BLOCKHASH_EXPIRY", "LOW_TIP", "LEADER_SKIP"].includes(scenario)) {
      return res.status(400).json({ error: "Invalid failure scenario specified" });
    }
    setNextFault(scenario as any);
    res.json({ 
      success: true, 
      message: `Injected fault scenario: [${scenario}]. Will trigger on the next bundle submission.` 
    });
  });

  // Adjust network congestion slider
  app.post("/api/congestion", (req, res) => {
    const { score } = req.body;
    const s = parseFloat(score);
    if (isNaN(s) || s < 0 || s > 1) {
      return res.status(400).json({ error: "Score must be a float between 0.0 and 1.0" });
    }
    setCongestionScore(s);
    res.json({ 
      success: true, 
      message: `Congestion score set to: ${s}`,
      health 
    });
  });

  // Seed bundle history so the dashboard loads with visual logs
  seedInitialData();

  // Vite development / production static SPA serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Bind exclusively to 0.0.0.0 & Port 3000 inside containers
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`=======================================================`);
    console.log(`🚀 SOLANA SMART TRANSACTION INFRASTRUCTURE ONLINE!`);
    console.log(`🔗 Interface running on: http://localhost:${PORT}`);
    console.log(`📡 Simulation loop started at slot: ${currentSlot}`);
    console.log(`=======================================================`);
  });
}

function seedInitialData() {
  // Pre-populate with 10 interesting historical bundles to instantly fulfill the log criteria
  const payloads = [
    "Token Swap (0.1 SOL -> USDC)",
    "Jupiter Aggregator Swap (Raydium Vault Router)",
    "Pyth Network Oracle Feed Update Refresh",
    "OpenBook v2 Market Maker Refresh Limit",
    "Meteora Dynamic DLMM Liquidity Deposit",
    "Jupiter Multi-Hop Route Optimized Swap",
    "Phoenix Limit Order Placement Spot Sell",
    "Drift Protocol Perps Position Refull Fee"
  ];

  let simSlot = currentSlot - 425;
  for (let i = 0; i < 8; i++) {
    const payload = payloads[i % payloads.length];
    const tip = Math.round(1500000 + Math.random() * 6000000);
    const subSlot = simSlot + i * 40;
    
    // Create successful historical bundles
    bundles.push({
      id: "bnd_init" + i,
      bundleId: `jit-seed${i}-401f-009a`,
      signature: `5vSeedSignature${i}Jito` + Math.random().toString(36).substring(2, 6),
      status: 'FINALIZED',
      tipLamports: tip,
      blockhashUsed: `5G7C68qK8pBvG3pLd8ZNoXp9tU8M7e6vF5W4X3y2Z${i}`,
      blockhashSlot: subSlot - 4,
      submissionSlot: subSlot,
      processedSlot: subSlot + 1,
      confirmedSlot: subSlot + 3,
      finalizedSlot: subSlot + 34,
      submittedAt: new Date(Date.now() - (10 - i) * 60000).toISOString(),
      processedAt: new Date(Date.now() - (10 - i) * 60000 + 400).toISOString(),
      confirmedAt: new Date(Date.now() - (10 - i) * 60000 + 1200).toISOString(),
      finalizedAt: new Date(Date.now() - (10 - i) * 60000 + 13600).toISOString(),
      retryCount: 0,
      payloadDesc: payload
    });
  }

  // Pre-populate 2 failed ones + retry flow for stunning logs out of the box!
  const failedSlot1 = simSlot + 320;
  const bundleFail1: any = {
    id: "bnd_fail_init1",
    bundleId: "jit-fail1-401f-009a",
    signature: "5vFailSignature1JitoXyz",
    status: 'FAILED',
    tipLamports: 1000, // deliberately low tip to simulate the low tip scenario
    blockhashUsed: "5G7C68qK8pBvG3pLd8ZNoXp9tU8M7e6vF5W4X3y2Z99",
    blockhashSlot: failedSlot1 - 10,
    submissionSlot: failedSlot1,
    submittedAt: new Date(Date.now() - 3 * 60000).toISOString(),
    retryCount: 0,
    payloadDesc: "Jupiter Aggregator Swap (Raydium Vault Router)",
    failureCategory: "INSUFFICIENT_TIP",
    failureReason: "Tip of 1000 lamports is below current network p50 floor of 3450000 lamports. Outbid in Jito bundle auction."
  };
  bundles.push(bundleFail1);

  const dec1: any = {
    id: "dec_init1",
    bundleId: "bnd_fail_init1",
    reasoning: "Analysis of target bundle 'bnd_fail_init1' reveals submission failure due to INSUFFICIENT_TIP. The bid of 1,000 lamports sits orders of magnitude below the active p50 floor. To secure execution priority with current congestion at 35%, we must adjust fee models to align with competitive bids. Recommendation: Rebuild transaction targeting the p95 percentile with a 1.5x buffer, refresh the blockhash target, and resubmit immediately.",
    confidence: 0.98,
    action: "INCREASE_TIP",
    parameters: {
      tipMultiplier: 2.5,
      targetPercentile: 95,
      sequence: ["REFRESH_BLOCKHASH", "INCREASE_TIP", "RETRY"]
    },
    outcome: "Successfully launched retry bundle ID: bnd_retry_init1 at slot " + (failedSlot1 + 5),
    createdAt: new Date(Date.now() - 3 * 60000 + 1500).toISOString()
  };
  decisions.push(dec1);

  const bundleRetry1: any = {
    id: "bnd_retry_init1",
    bundleId: "jit-retry1-401f-009a",
    signature: "5vRetrySuccessSig1JitoAbc",
    status: 'FINALIZED',
    tipLamports: 18500000,
    blockhashUsed: "5G7C68qK8pBvG3pLd8ZNoXp9tU8M7e6vF5W4X3y2Z77",
    blockhashSlot: failedSlot1 + 4,
    submissionSlot: failedSlot1 + 5,
    processedSlot: failedSlot1 + 6,
    confirmedSlot: failedSlot1 + 8,
    finalizedSlot: failedSlot1 + 39,
    submittedAt: new Date(Date.now() - 3 * 60000 + 2000).toISOString(),
    processedAt: new Date(Date.now() - 3 * 60000 + 2400).toISOString(),
    confirmedAt: new Date(Date.now() - 3 * 60000 + 3200).toISOString(),
    finalizedAt: new Date(Date.now() - 3 * 60000 + 15600).toISOString(),
    retryCount: 1,
    parentBundleId: "bnd_fail_init1",
    payloadDesc: "Retry #1: Jupiter Aggregator Swap (Raydium Vault Router)"
  };
  bundles.push(bundleRetry1);
}

startServer();
