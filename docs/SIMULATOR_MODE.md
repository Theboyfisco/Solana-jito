# Competition Simulator Mode

This project can run without paid Jito or Yellowstone access. In that mode it is an offline infrastructure simulator, not a claim of live mainnet execution.

## What Is Simulated

- Slot ticks at Solana-like 400ms cadence.
- Jito leader windows and submit-gate timing.
- Tip-account observations and p25/p50/p75/p95/p99 percentile movement.
- Bundle lifecycle transitions: submitted, processed, confirmed, finalized.
- Failure cases: low tip, expired blockhash, skipped leader, auction loss.
- AI recovery decisions and retry orchestration.

## What Stays Real

- The backend service boundaries match a live deployment: stream ingest, leader intelligence, tip intelligence, bundle builder, submission gate, lifecycle engine, failure classifier, AI agent, and retry orchestrator.
- The UI consumes the same API shape used by a live backend.
- The evidence export is generated from live in-memory runtime state, not from a static screenshot.
- The autonomous gauntlet exercises actual event wiring: injected fault -> lifecycle failure -> classifier -> agent decision -> retry orchestrator -> child bundle.

## Judge Demo Flow

1. Start the app with `npm run dev`.
2. Open `http://localhost:3000`.
3. Press **Run judge gauntlet**.
4. Watch the ledger, AI decision feed, 3D arena, tip matrix, and live event log update.
5. Press **Export evidence** to download the runtime evidence JSON.

## Live Upgrade Path

To convert simulator mode into live infrastructure mode, configure:

- `GEYSER_ENDPOINT`
- `GEYSER_TOKEN`
- `RPC_URL`
- `JITO_AUTH_KEYPAIR`
- `WALLET_KEYPAIR`
- `ANTHROPIC_API_KEY` for live Claude decisions

The simulator exists because paid Solana infrastructure can be expensive. It is designed to make the system architecture, failure handling, and autonomous decision flow inspectable without those external services.
