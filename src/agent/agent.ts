import { streamBus } from '../stream/stream';
import { GoogleGenAI, Type } from "@google/genai";
import { getLeaderContext, currentSlot } from '../leader/leader-service';
import { getTipPercentiles } from '../tips/tip-service';

export const agentDecisions: any[] = [];

let aiClient: GoogleGenAI | null = null;
function getAiClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === "MY_GEMINI_API_KEY") return null;
  if (!aiClient) aiClient = new GoogleGenAI({ apiKey: key });
  return aiClient;
}

export function initAiAgent() {
  streamBus.on('failureClassified', async (bundle: any) => {
    const dec = await runAiAgentDecision(bundle);
    agentDecisions.unshift(dec);
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
    return {
      id: "dec_" + Math.random().toString(36).substring(2, 9),
      bundleId: bundle.id,
      reasoning: `Operational fallback: Simulated logic due to no API key. Modifying tip buffer to secure queue.`,
      confidence: 0.8,
      action: 'COMPOSITE',
      parameters: {
        tipMultiplier: 1.5,
        targetPercentile: 75,
        sequence: ["REFRESH_BLOCKHASH", "INCREASE_TIP", "RETRY"]
      },
      createdAt: new Date().toISOString()
    };
  }

  // Use Gemini API
  try {
    const prompt = `You are a professional Solana transaction operations AI. You analyze Jito bundle auction drops and network failures. Context: ${JSON.stringify(context)}`;
    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["reasoning", "confidence", "action", "parameters"],
          properties: {
            reasoning: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            action: { type: Type.STRING },
            parameters: { type: Type.OBJECT }
          }
        }
      }
    });

    const parsed = JSON.parse(response.text?.trim() || "{}");
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
    return {
      id: "dec_err", bundleId: bundle.id,
      reasoning: "Error from AI provider", confidence: 0, action: 'ABANDON', parameters: {}
    };
  }
}
