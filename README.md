# Solana Smart Transaction Infrastructure Stack

AI-assisted Jito/Yellowstone transaction infrastructure simulator with live-compatible service boundaries, autonomous failure recovery, dynamic tip intelligence, lifecycle tracking, and a WebGL operations dashboard.

> **Default mode:** Competition Simulator Mode. The app runs without paid Jito or Yellowstone access by replaying slot, tip, leader, lifecycle, fault, AI, and retry behavior through the same service boundaries a live deployment would use.
>
> **Simulator guide:** [`docs/SIMULATOR_MODE.md`](./docs/SIMULATOR_MODE.md)
>
> **Architecture doc:** [Solana Smart Transaction Infrastructure Stack](https://app.notion.com/p/Solana-Smart-Transaction-Infrastructure-Stack-38eec094301580e79a79d6bb645e52d9?source=copy_link)

![System architecture](./docs/assets/system-architecture.svg)

## Why This Exists

The bounty asks for a full Solana transaction infrastructure stack: slot awareness, leader timing, Jito-style bundle submission, tip decisions, lifecycle tracking, failure handling, and AI-assisted retry decisions.

Paid Jito/Yellowstone access can be expensive, so this project provides a judge-friendly simulator that demonstrates the operational logic without pretending to be live mainnet. The UI explicitly labels simulator mode, and the app can export runtime evidence for review.

## What Judges Can Demo

Run the app, then use the **Competition Simulator Mode Evidence Console**:

- **Run judge gauntlet** schedules a normal bundle, low-tip failure, expired-blockhash failure, and skipped-leader failure.
- The lifecycle engine moves bundles through submitted, processed, confirmed, and finalized states.
- The failure classifier emits structured failure categories.
- The AI agent decides whether to increase tips, refresh blockhashes, wait for the next leader, retry, or abandon.
- The retry orchestrator launches child bundles with parent lineage.
- **Export evidence** downloads a JSON snapshot of bundles, decisions, failure categories, tip percentiles, leader context, and runtime health.

## Judge Scoring Highlights

| Criterion | What This Project Shows |
|---|---|
| Architecture depth | Nine-service transaction pipeline with stream, leader, tip, submission, lifecycle, classifier, agent, and retry boundaries. |
| Failure handling | Expired blockhash, low tip, skipped leader, and auction-loss paths. |
| AI decision making | Agent selects action, tip target, multiplier, wait behavior, and retry sequence from failure context. |
| Lifecycle tracking | Submitted, processed, confirmed, finalized, failed, abandoned, timestamps, slots, and retry lineage. |
| Explanation quality | README, simulator guide, Notion copy, production checklist, diagrams, and runtime evidence export. |
| Demo quality | One-click gauntlet, 3D WebGL block-engine arena, live ledger, event log, and evidence JSON. |

## Core Features

- Yellowstone-compatible stream layer with 400ms local slot replay when live credentials are absent.
- Jito-compatible submit gate and leader-window model.
- Dynamic tip floor simulation using rolling p25/p50/p75/p95/p99 observations.
- Full transaction lifecycle ledger with timestamps, slot numbers, latency deltas, statuses, and parent-child retry lineage.
- Failure simulation for:
  - `INSUFFICIENT_TIP`
  - `EXPIRED_BLOCKHASH`
  - `LEADER_SKIP`
  - `BUNDLE_AUCTION_LOSS`
- AI decision layer with live Claude support when `ANTHROPIC_API_KEY` is configured and deterministic heuristic fallback otherwise.
- 3D WebGL block-engine arena for visualizing bundle flow, auction rings, leader path, and landing/failure states.
- Evidence export endpoint at `/api/evidence`.
- Production Express server with static asset serving, readiness endpoint, graceful shutdown, security headers, and env-based port.

## Architecture

The system is organized as a 9-service pipeline connected by an internal event bus:

```text
Stream Ingest
  -> Leader Intelligence
  -> Tip Intelligence
  -> Bundle Builder
  -> Submit Gate
  -> Lifecycle Engine
  -> Failure Classifier
  -> AI Agent
  -> Retry Orchestrator
```

| Service | File | Responsibility |
|---|---|---|
| Stream Ingest | `src/stream/stream.ts` | Yellowstone-compatible slot, transaction, and tip-account stream. Falls back to local replay. |
| Leader Intelligence | `src/leader/leader-service.ts` | Maintains current slot and next Jito leader window. |
| Tip Intelligence | `src/tips/tip-service.ts` | Maintains rolling tip observations and computes percentiles. |
| Bundle Builder | `src/bundle/bundle-builder.ts` | Builds Jito-style bundle payloads and tip instructions. |
| Submit Gate | `src/submission/submission-service.ts` | Queues/submits bundles, using Jito client when configured or simulator queue otherwise. |
| Lifecycle Engine | `src/lifecycle/lifecycle-engine.ts` | Tracks submitted, processed, confirmed, finalized, and failed states. |
| Failure Classifier | `src/classifier/failure-classifier.ts` | Classifies tip, blockhash, leader, and auction failures. |
| AI Agent | `src/agent/agent.ts` | Makes recovery decisions from failure context and network conditions. |
| Retry Orchestrator | `src/retry/retry-orchestrator.ts` | Executes agent decisions and creates retry child bundles. |

### Lifecycle Recovery Flow

![Lifecycle recovery flow](./docs/assets/lifecycle-recovery.svg)

### AI Decision Loop

![AI decision loop](./docs/assets/ai-decision-loop.svg)

## Bounty Questions

### 1. What does the delta between `processed_at` and `confirmed_at` tell you?

It measures how long it takes for a transaction that has been processed by a validator to gain enough cluster confirmation to be considered confirmed. In operational terms, this delta is a signal for vote propagation, validator responsiveness, fork pressure, and general network health.

When the delta widens, the system should become more conservative: raise tip targets, avoid stale blockhashes, and prefer submission windows with better leader timing. In the simulator, increasing congestion widens lifecycle timing and pushes tip percentiles upward so the recovery logic can react to the same class of signal.

### 2. Why should you avoid `finalized` commitment for time-sensitive blockhashes?

A Solana blockhash is valid for roughly 150 slots. A `finalized` blockhash is already older because it has accumulated finalization depth before your client receives it. For latency-sensitive Jito bundle submission, that reduces the usable validity window before signing, routing, leader waiting, and block-engine handling even begin.

The safer operational pattern is to fetch a recent blockhash with `confirmed` commitment for time-sensitive transactions, then refresh the blockhash on retry after expiry or delay.

### 3. What happens if the Jito leader skips their slot?

The bundle misses the execution window because the scheduled leader did not produce the expected block. This is different from an insufficient-tip failure: the tip may have been competitive, and the transaction itself may still be valid. The correct recovery is usually to wait for the next viable Jito leader window, refresh the blockhash as a time precaution, and retry without over-escalating the tip.

The simulator demonstrates this through the `LEADER_SKIP` gauntlet case, where the AI agent chooses a composite recovery path instead of blindly increasing the bid.

## Quickstart

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

Recommended demo:

1. Open the dashboard.
2. Press **Run judge gauntlet**.
3. Watch the ledger, AI decision feed, live event log, tip matrix, and 3D arena update.
4. Press **Export evidence**.

## Notion Architecture Page

Paste the contents of [`docs/NOTION_SUBMISSION_COPY.md`](./docs/NOTION_SUBMISSION_COPY.md) into your public Notion page.

Recommended Notion visuals:

- Upload [`docs/assets/system-architecture.svg`](./docs/assets/system-architecture.svg) near the architecture overview.
- Upload [`docs/assets/lifecycle-recovery.svg`](./docs/assets/lifecycle-recovery.svg) near the failure handling section.
- Upload [`docs/assets/ai-decision-loop.svg`](./docs/assets/ai-decision-loop.svg) near the AI agent section.
- Add screenshots of the dashboard after running the judge gauntlet.

## Production

```bash
npm run build
npm run start
```

Useful endpoints:

- `GET /api/health`
- `GET /api/ready`
- `GET /api/evidence`
- `POST /api/demo/gauntlet`

## Configuration

Copy `.env.example` to `.env`.

```env
PORT=3000
ANTHROPIC_API_KEY=""
RPC_URL=""
GEYSER_ENDPOINT=""
GEYSER_TOKEN=""
JITO_BLOCK_ENGINE_URL="mainnet.block-engine.jito.wtf"
JITO_AUTH_KEYPAIR=""
WALLET_KEYPAIR=""
```

Leave the live infrastructure values blank to run Competition Simulator Mode.

## Live Upgrade Path

To move from simulator mode to live infrastructure mode, configure:

- Yellowstone gRPC endpoint and token.
- Solana RPC URL.
- Jito auth keypair.
- Wallet keypair.
- Optional Anthropic API key for live model decisions.

The project is intentionally structured so the simulator and live paths use the same service boundaries.

## Limitations

- Default logs are simulator evidence, not explorer-verifiable mainnet bundle submissions.
- Live Jito/Yellowstone operation requires paid infrastructure credentials.
- The simulator is built to demonstrate operational reasoning and system design, not to claim live production execution.

## Tech Stack

- React 19 + Vite
- TypeScript
- Express
- Three.js
- Tailwind CSS
- Solana Web3.js
- Jito TypeScript SDK
- Triton Yellowstone gRPC client
- Anthropic SDK
