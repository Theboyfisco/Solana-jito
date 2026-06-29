# Production Readiness Checklist

## Build

- Run `npm install`.
- Run `npm run build`.
- Run `npm run start`.
- Open `http://localhost:3000`.

## Required Runtime

- Node.js 20 or newer.
- `PORT` environment variable if not using port `3000`.

## Optional Live Infrastructure

Leave these blank for Competition Simulator Mode:

- `GEYSER_ENDPOINT`
- `GEYSER_TOKEN`
- `RPC_URL`
- `JITO_AUTH_KEYPAIR`
- `WALLET_KEYPAIR`
- `ANTHROPIC_API_KEY`

## Smoke Test

- `GET /api/health` returns `status: ok`.
- `GET /api/ready` returns `ready: true`.
- Dashboard loads without console errors.
- 3D arena renders.
- **Run judge gauntlet** increases bundle and AI decision counts.
- `GET /api/evidence` returns bundles, decisions, summary, and failure categories.

## Submission Steps

- Publish GitHub repository.
- Publish Notion architecture document.
- Paste content from `docs/NOTION_SUBMISSION_COPY.md` into Notion.
- Add screenshots or short demo video if allowed.
- In the README and Notion page, clearly state that default mode is Competition Simulator Mode.
- Do not claim explorer-verifiable live submissions unless you have configured and run live infrastructure.
