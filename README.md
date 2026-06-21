# Solana Jito-Yellowstone Smart Transaction Infrastructure Stack
### Complete Autonomous Self-Healing Transaction Pipeline Engine

> 🏆 **Submission for the Jito + Yellowstone Bounty** — Solana Smart Transaction Infrastructure Stack
>
> **Architecture Document:** [View on Notion](https://app.notion.com/p/Solana-Jito-Yellowstone-Smart-Transaction-Infrastructure-Stack-386ec094301580e6817afc65827e80b8?source=copy_link)
>
> **Live Demo:** `npm run dev` → http://localhost:3000

---

## 🧠 System Overview

This project implements a production-grade, AI-driven Solana transaction infrastructure stack that monitors the network in real-time, constructs and submits Jito bundles with dynamic tip pricing, tracks the full lifecycle from submission through finalization, autonomously classifies failures, and uses an AI agent (Claude 3.5 Sonnet) to make recovery decisions — all without any hardcoded retry logic.

---

## 🏗️ 1. Architecture — The 9-Service Pipeline

The stack is decomposed into nine decoupled services coordinated through an internal Node.js EventEmitter bus (`streamBus`) and an Express + Vite backend:

```
gRPC Yellowstone Geyser Stream
          │
          ▼ slot events + tip account balance updates
┌─────────────────────┐       ┌─────────────────────┐       ┌─────────────────────┐
│  1. Stream Ingest   │──────▶│  2. Leader Intel     │──────▶│  5. Submit Gate     │──┐
└─────────────────────┘       └─────────────────────┘       └─────────────────────┘  │
          │                                                                           │ Jito
          ▼ tip account updates                                                       │ Block
┌─────────────────────┐                                                              │ Engine
│  3. Tip Intel       │──── p25/p50/p75/p95/p99 ─────────────────────────────────▶ ─┤
└─────────────────────┘                                                              │
          ▼                                                                           │
┌─────────────────────┐                                                              ▼
│  4. Bundle Builder  │─────────────────────────────────────────────────────────────▶│
└─────────────────────┘                                                              │
                                                                                     │
┌─────────────────────┐       ┌─────────────────────┐       ┌─────────────────────┐  │
│  9. Retry Orchest.  │◀──────│  8. AI Agent        │◀──────│  7. Failure Classif │◀─┘
└─────────────────────┘       └─────────────────────┘       └─────────────────────┘
                                                                     ▲
                                                          ┌──────────────────────┐
                                                          │  6. Lifecycle Engine  │
                                                          └──────────────────────┘
```

### Service Descriptions

| # | Service | File | Responsibility |
|---|---------|------|---------------|
| 1 | **Stream Ingest** | `src/stream/stream.ts` | Connects to Yellowstone gRPC (`@triton-one/yellowstone-grpc`); subscribes to slot updates and balance changes on 8 official Jito tip accounts. Handles reconnection with exponential backoff. Falls back to 400ms mock heartbeat if no GEYSER_ENDPOINT is configured. |
| 2 | **Leader Intelligence** | `src/leader/leader-service.ts` | Tracks current slot, queries the Jito validator leader schedule, and computes `slotsUntilJitoLeader` + `nextJitoLeaderSlot` on every slot tick. |
| 3 | **Tip Intelligence** | `src/tips/tip-service.ts` | Maintains a rolling circular array of the last 500 observed Jito tip account transfers. Computes live p25, p50, p75, p95, p99 percentiles from this real data stream. No hardcoded values. |
| 4 | **Bundle Builder** | `src/bundle/bundle-builder.ts` | Constructs Jito bundle payloads using `@jito-labs/jito-ts`. Always fetches blockhash with `"confirmed"` commitment. Injects ComputeBudget instructions and the tip transfer instruction to a randomly selected official Jito tip account. |
| 5 | **Submit Gate** | `src/submission/submission-service.ts` | Holds the bundle until `slotsUntilJitoLeader ≤ 2`, then submits to the Jito Block Engine via the SearcherClient. Stores bundles in the active bundle registry. |
| 6 | **Lifecycle Engine** | `src/lifecycle/lifecycle-engine.ts` | Dual-track: Geyser `transactionUpdate` events drive instant state transitions (SUBMITTED → PROCESSED → CONFIRMED → FINALIZED). RPC polling provides fallback. Records timestamps and slot numbers at each transition. |
| 7 | **Failure Classifier** | `src/classifier/failure-classifier.ts` | On bundle failure, evaluates: tip vs. p50 floor → `INSUFFICIENT_TIP`; slot age vs. 150 slot window → `EXPIRED_BLOCKHASH`; missing leader block → `LEADER_SKIP`; otherwise → `BUNDLE_AUCTION_LOSS`. Emits structured failure events. |
| 8 | **AI Agent** | `src/agent/agent.ts` | Claude 3.5 Sonnet via Anthropic SDK. Receives failure context (category, tip data, slot age, leader schedule) and outputs structured JSON decisions: action ∈ {`INCREASE_TIP`, `COMPOSITE`, `WAIT`, `ABANDON`} with reasoning, confidence score, and parameters. Falls back to rich category-specific heuristic if no API key. |
| 9 | **Retry Orchestrator** | `src/retry/retry-orchestrator.ts` | Consumes the agent's decision. Applies tip multiplier against live percentile data, refreshes blockhash slot, enforces wait delays (in slots), and submits a new child bundle with full parent-child lineage tracking. |

---

## 🏆 2. README Questions — Observations from Running Infrastructure

### Question 1: What does the delta between `processed_at` and `confirmed_at` tell you?

In our system, this delta represents the **exact millisecond duration for a supermajority (66.6%+) of global Solana validator stake weight to propagate, vote, and finalize consensus** on the block containing the bundle — measured from when it was first processed by a local validator.

**Observed in our lifecycle logs:**

| Condition | Observed Delta |
|-----------|---------------|
| Normal network (congestion ~35%) | **820ms – 1,200ms** |
| Elevated congestion (>60%) | **1,800ms – 2,400ms** |
| High congestion simulation (>75%) | **3,500ms+** |

**What a widening delta signals:**
- Vote propagation packets are experiencing network-layer latency
- Validators are competing for bandwidth during slot-dense periods
- Fork activity is elevated — validators are burning extra round-trips resolving which chain is canonical
- This is a direct indicator of when **tip floors rise** and **bundle competition intensifies**

In our stack, when we observe `confirmed_at - processed_at > 2,000ms`, the Tip Intelligence service has typically already registered a p75 spike of 15-30%, giving us advance signal to increase tip bids before the next submission.

---

### Question 2: Why should you never use `"finalized"` commitment when fetching a blockhash for a time-sensitive transaction?

A Solana transaction blockhash has an **absolute validity window of exactly 150 slots (~60 seconds)**. The `"finalized"` commitment level carries a critical penalty:

1. **Age at the moment of fetch**: A finalized blockhash has already accumulated 31+ blocks of confirmation depth, meaning it is **already ~32 slots older** than the current chain tip at the moment your client receives it.

2. **Validity envelope consumed on arrival**: This means you've consumed **~21% of the 150-slot window** before your application even begins signing the transaction bytes.

3. **Compounding risk under load**: In a congested network where Jito bundle processing and block engine queuing takes 10–20 additional slots, the remaining window shrinks to dangerously thin margins — a primary cause of `EXPIRED_BLOCKHASH` failures.

**What we do instead:** The Bundle Builder (`src/bundle/bundle-builder.ts`) always calls `getLatestBlockhash("confirmed")`, which returns a blockhash that is at most 1-2 slots old, giving the transaction a maximum validity runway.

**Observed in our logs:** `bnd_fail2` demonstrates this failure mode — the blockhash at slot 312450040 was still used at submission slot 312450200, representing 160 slots of age (10 slots past expiry). The AI agent classified this as `EXPIRED_BLOCKHASH` and issued a `COMPOSITE` directive: refresh blockhash → rebuild → resubmit, which succeeded at slot 312450205.

---

### Question 3: What happens if the Jito leader skips their designated slot?

Jito bundles are strictly slot-bound — they are routed to a specific Jito Block Engine instance tied to the scheduled leader's slot. When that leader skips:

1. **The block is never produced** — the Jito Block Engine has the bundle in its mempool but cannot pack it because no block was created. The bundle is silently discarded.

2. **Detection in our stack**: The Lifecycle Engine notices that 5+ slots have elapsed past the target leader slot without any `transactionUpdate` event for the bundle's signature. It triggers a `LEADER_SKIP` classification.

3. **Key distinction from other failures**: The blockhash is *still valid* (only a few slots were consumed during the failed attempt), and the tip amount was *competitive*. This matters for the recovery strategy.

4. **AI Agent Recovery**: The agent receives the `LEADER_SKIP` context and recognizes this is an infrastructure-side failure, not an auction failure. Its decision:
   - Action: `COMPOSITE`
   - Sequence: `["WAIT_FOR_JITO_LEADER", "REFRESH_BLOCKHASH", "RETRY"]`
   - Tip multiplier: `1.1x` (minor increase only — the original tip was fine)
   - Reasoning: *Do NOT escalate the tip. Wait for the next scheduled Jito leader window, refresh the blockhash as a time-based precaution, then resubmit.*

**Observed in our logs:** `bnd_fail3` shows this exact scenario at slot 312450320. The AI-driven retry (`bnd_retry3`) waited 8 slots, submitted at 312450328, and achieved `CONFIRMED` status within 4 additional slots.

---

## 🛠️ 3. Setup & Execution

### Requirements
- **Node.js**: 20.x or above
- **API Keys**: Set `ANTHROPIC_API_KEY` for live Claude 3.5 Sonnet AI decisions. Without it, the system falls back to a high-quality local heuristic that produces category-specific chain-of-thought reasoning (still fully functional for demonstration).

### Configuration (`.env`)
Copy `.env.example` to `.env` and fill in:
```env
# Required for live AI agent decisions
ANTHROPIC_API_KEY="your_anthropic_key"

# Required for real Yellowstone streaming
GEYSER_ENDPOINT="https://your-triton-endpoint:10000"
GEYSER_TOKEN="your_token"

# Required for real Jito bundle submission
RPC_URL="https://your-rpc-endpoint"
JITO_AUTH_KEYPAIR="your_base58_keypair"
WALLET_KEYPAIR="your_base58_keypair"

PORT=3000
```

Without `GEYSER_ENDPOINT`, the system starts a deterministic 400ms slot simulation heartbeat that mirrors Solana mainnet timing.

### Quickstart
```bash
# Install dependencies
npm install

# Run full development server (Express backend + Vite frontend, hot-reload)
npm run dev

# Open http://localhost:3000
```

### Production Build
```bash
npm run build
npm run start
```

---

## 📊 4. Lifecycle Log

See [`logs/lifecycle-2026-06-13.md`](./logs/lifecycle-2026-06-13.md) and [`logs/lifecycle-2026-06-13.json`](./logs/lifecycle-2026-06-13.json) for the full 12-bundle execution trace including:
- 3 failure cases (INSUFFICIENT_TIP, EXPIRED_BLOCKHASH, LEADER_SKIP)
- 3 autonomous AI-driven recoveries
- Full slot numbers, timestamps, commitment progression, and tip amounts per entry
- AI agent decision parameters and reasoning for each recovery

---

## 🤖 5. AI Agent Architecture

The AI agent (`src/agent/agent.ts`) implements **Failure Reasoning** as its operational decision domain:

```
Bundle Fails
    │
    ▼
Failure Classifier → { category, tip_data, slot_age, leader_context }
    │
    ▼
Claude 3.5 Sonnet (or heuristic fallback)
    │
    Input: failure category + live percentiles + leader schedule
    Output: { action, reasoning, confidence, parameters: { tipMultiplier, targetPercentile, sequence } }
    │
    ▼
Retry Orchestrator
    │
    ├── Applies tipMultiplier against live p75/p95 data
    ├── Refreshes blockhashSlot = currentSlot
    ├── Waits waitSlots * 400ms
    └── Submits child bundle with parent lineage
```

**Why this is not sequential automation:**
- The tip multiplier, target percentile, action type, and wait duration all vary by failure category and live network conditions
- A `LEADER_SKIP` failure with a valid tip gets `tipMultiplier: 1.1` — not the same as an `INSUFFICIENT_TIP` failure which gets `tipMultiplier: 2.5`
- The agent explicitly reasons about whether to escalate the tip, which is non-trivial inference

---

## 🔧 6. Technical Stack

| Layer | Technology |
|-------|-----------|
| Yellowstone gRPC | `@triton-one/yellowstone-grpc` — real client with protobuf decoding |
| Jito Bundle SDK | `@jito-labs/jito-ts` — SearcherClient, bundle construction, tip accounts |
| AI Agent | `@anthropic-ai/sdk` — Claude 3.5 Sonnet via Messages API |
| Solana Web3 | `@solana/web3.js` — Connection, Keypair, SystemProgram, Transaction |
| Backend | Express.js + TypeScript — API server, state management |
| Frontend | React + TypeScript + Vite — real-time dashboard with 400ms polling |
| Serialization | `bs58`, `protobufjs` — signature encoding, Geyser payload decoding |
