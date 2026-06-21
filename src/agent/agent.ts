import { streamBus } from '../stream/stream';
import { Anthropic } from "@anthropic-ai/sdk";
import { getLeaderContext, currentSlot } from '../leader/leader-service';
import { getTipPercentiles } from '../tips/tip-service';

export const decisions: any[] = [];

let aiClient: Anthropic | null = null;
export function getAiClient() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || key === "MY_ANTHROPIC_API_KEY") return null;
  if (!aiClient) aiClient = new Anthropic({ apiKey: key });
  return aiClient;
}

export function initAiAgent() {
  streamBus.on('failureClassified', async (bundle: any) => {
    const dec = await runAiAgentDecision(bundle);
    decisions.unshift(dec);
    streamBus.emit('agentDecision', { bundle, decision: dec });
  });
}

async function runAiAgentDecision(bundle: any) {
  const percentiles = getTipPercentiles();
  const leaderContext = getLeaderContext();
  const client = getAiClient();

  const context = {
    failure: {
      category: bundle.failureCategory,
      reason: bundle.failureReason,
      submissionSlot: bundle.submissionSlot,
      currentSlot: currentSlot,
      blockhashSlot: bundle.blockhashSlot
    },
    tips: percentiles,
    leaderContext
  };

  if (!client) {
    // Rich heuristic fallback — substantive reasoning based on failure category
    return buildHeuristicDecision(bundle, percentiles, leaderContext);
  }

  // Use Anthropic API (Claude 3.5 Sonnet)
  try {
    const prompt = `You are a professional Solana transaction operations AI. You analyze Jito bundle auction drops and network failures. Context: ${JSON.stringify(context, null, 2)}
    
Task: Decide the optimal path to recover this failed transaction. Your decision will be carried out by our automated orchestrator.

Output FORMAT: You must return raw JSON string representing the AgentDecision action parameters. Do NOT wrap in markdown blocks.

Expected JSON format:
{
  "reasoning": "Substantive chain-of-thought analysis explaining the failure and why this recovery action is selected, referencing network metrics (minimum 150 characters)",
  "confidence": 0.85,
  "action": "RETRY", // "RETRY" | "WAIT" | "ABANDON" | "INCREASE_TIP" | "REFRESH_BLOCKHASH" | "COMPOSITE"
  "parameters": {
    "tipMultiplier": 1.5, // 1.0 to 3.0
    "targetPercentile": 75, // 50 | 75 | 95 | 99
    "sequence": ["REFRESH_BLOCKHASH", "INCREASE_TIP", "RETRY"]
  }
}
    `;
    
    const response = await client.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 1024,
      messages: [
        { role: "user", content: prompt }
      ]
    });

    const body = response.content[0].type === 'text' ? response.content[0].text.trim() : "{}";
    const parsed = JSON.parse(body);
    
    return {
      id: "dec_" + Math.random().toString(36).substring(2, 9),
      bundleId: bundle.id,
      reasoning: parsed.reasoning || "Fallback reasoning",
      confidence: parsed.confidence || 0.85,
      action: parsed.action || 'RETRY',
      parameters: parsed.parameters || {},
      createdAt: new Date().toISOString()
    };
  } catch(e) {
    console.error("AI Agent Error", e);
    return {
      id: "dec_err", bundleId: bundle.id,
      reasoning: "Error from AI provider", confidence: 0, action: 'ABANDON', parameters: {}
    };
  }
}


/** Produces contextual, technical reasoning without requiring a live Claude API key */
function buildHeuristicDecision(bundle: any, percentiles: any, leaderContext: any): any {
  const id = "dec_" + Math.random().toString(36).substring(2, 9);
  const cat = bundle.failureCategory || 'UNKNOWN';

  let reasoning = '';
  let action = 'RETRY';
  let confidence = 0.87;
  let tipMultiplier = 1.5;
  let targetPercentile = 75;
  let sequence: string[] = ['REFRESH_BLOCKHASH', 'INCREASE_TIP', 'RETRY'];

  const p75 = percentiles.p75;
  const p95 = percentiles.p95;
  const tip = bundle.tipLamports || 0;
  const slotsUntilJito = leaderContext?.slotsUntilJitoLeader ?? 8;

  if (cat === 'INSUFFICIENT_TIP') {
    const deficitPct = ((( p75 - tip) / p75) * 100).toFixed(0);
    tipMultiplier = parseFloat(Math.min(3.0, (p95 / Math.max(tip, 1000))).toFixed(2));
    targetPercentile = 95;
    action = 'INCREASE_TIP';
    confidence = 0.96;
    sequence = ['INCREASE_TIP', 'RETRY'];
    reasoning = `Bundle ${bundle.id} was rejected by the Jito block engine due to an INSUFFICIENT_TIP bid. ` +
      `The submitted tip of ${tip.toLocaleString()} lamports falls ${deficitPct}% short of the current p75 network floor (${p75.toLocaleString()} lamports). ` +
      `Active network congestion and high-frequency auction competition at the block engine level require bids at or above p95 (${p95.toLocaleString()} lamports) to guarantee inclusion. ` +
      `Recommended action: rebuild the bundle targeting the p95 percentile with a ${tipMultiplier}x multiplier, refresh the blockhash to ensure freshness, and resubmit to the block engine. ` +
      `The next Jito-enabled leader is ${slotsUntilJito} slots away, providing a viable resubmission window.`;

  } else if (cat === 'EXPIRED_BLOCKHASH') {
    tipMultiplier = 1.2;
    targetPercentile = 75;
    action = 'COMPOSITE';
    confidence = 0.91;
    sequence = ['REFRESH_BLOCKHASH', 'RETRY'];
    reasoning = `Bundle ${bundle.id} failed with an EXPIRED_BLOCKHASH classification. ` +
      `The blockhash anchored at slot ${bundle.blockhashSlot} exceeded the 150-slot validity window. ` +
      `This is a common failure mode when transactions are built with "finalized" commitment-level blockhashes (already 30+ slots old at creation time). ` +
      `Recovery protocol: fetch a fresh blockhash using getLatestBlockhash("confirmed"), rebuild the transaction, and resubmit immediately. ` +
      `Tip level was at ${tip.toLocaleString()} lamports — ${tip >= p75 ? 'tip adjustment not required' : 'recommend bumping to p75 on retry'}.`;

  } else if (cat === 'LEADER_SKIP') {
    tipMultiplier = 1.1;
    targetPercentile = 75;
    action = 'COMPOSITE';
    confidence = 0.88;
    sequence = ['WAIT_FOR_JITO_LEADER', 'REFRESH_BLOCKHASH', 'RETRY'];
    reasoning = `Bundle ${bundle.id} encountered a LEADER_SKIP event — the designated Jito validator failed to produce its assigned slot block. ` +
      `This is an infrastructure-level failure unrelated to tip sizing or transaction validity; the Jito block engine received the bundle but could not pack it into a block. ` +
      `Recovery protocol: wait ${slotsUntilJito > 0 ? slotsUntilJito : 5} slots for the next Jito-enabled leader window (slot ${leaderContext?.nextJitoLeaderSlot}), ` +
      `refresh the blockhash as a precaution, and resubmit. Tip escalation is NOT recommended since the failure was leader-side, not auction-side.`;

  } else if (cat === 'BUNDLE_AUCTION_LOSS') {
    tipMultiplier = 1.75;
    targetPercentile = 99;
    action = 'INCREASE_TIP';
    confidence = 0.83;
    sequence = ['INCREASE_TIP', 'RETRY'];
    reasoning = `Bundle ${bundle.id} was outbid in the Jito block engine MEV auction (BUNDLE_AUCTION_LOSS). ` +
      `Despite a tip of ${tip.toLocaleString()} lamports, competing bundles offered higher bids for the same leader slot. ` +
      `The current p99 frontier sits at ${percentiles.p99.toLocaleString()} lamports. ` +
      `Recommended: escalate the bid to p99 with a ${tipMultiplier}x multiplier to ensure priority in the next auction cycle. ` +
      `Incremental tip cost: ${((percentiles.p99 - tip) / 1e9).toFixed(6)} SOL — likely well below the economic value of the payload.`;

  } else {
    reasoning = `Bundle ${bundle.id} failed with an unclassified error. Applying conservative COMPOSITE recovery: refresh blockhash and resubmit at p75 tip level.`;
  }

  return {
    id,
    bundleId: bundle.id,
    reasoning,
    confidence,
    action,
    parameters: { tipMultiplier, targetPercentile, sequence },
    createdAt: new Date().toISOString()
  };
}
