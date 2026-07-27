# AGENTS.md

This file provides guidance to coding agents working in this repository.

## Project overview

A Cloudflare-hosted travel journal for honeymoon planning. A React SPA and `/api/*` are served from one Cloudflare Worker. Google Sheets is the production database and Gemini powers AI features.

## Primary travel data source

The source of truth for this honeymoon is the live Google Sheet, not local mock data or checked-in files.

- Spreadsheet ID: `1sd5CVy0qd4QSuOUUDnQH6I1Mx2F2W1NvgWVbujcePiU`
- Production Sheet ID is provided through the `GOOGLE_SHEET_ID` Worker secret
- Project-local MCP config: `.codex/config.toml`
- Only the `google-sheets` MCP server is enabled locally
- Never store or print credential contents

For travel information:

1. Use Google Sheets MCP first.
2. Read the relevant tab and range before drawing conclusions.
3. Re-read changed ranges or totals after updates.
4. Never use local mock data as evidence for live plans, prices or bookings.

Important tabs include `行程`, `住宿`, `費用`, `待辦`, `攜帶`, `記帳`, `票券`, `參考資料`, `費用比較`, `旅程介紹`, `美食推薦`, `導航`, `景點規劃`, and `AI秘書對話`.

## Commands

```bash
npm run dev              # Vite with mock data
npm run dev:cloudflare   # Production build through local Worker
npm run type-check       # Frontend and Worker TypeScript
npm test -- --run        # Test suite
npm run build            # Production Static Assets build
npm run deploy           # Manual Cloudflare deployment
```

Cloudflare Workers Builds automatically deploys pushes to `main`.

## Architecture

### Frontend

- React 19, TypeScript and Tailwind CSS v4
- `src/utils/tripClient.ts` uses Worker APIs in production and mock data in Vite development
- `src/utils/apiClient.ts` owns HTTP, auth and error handling

### Worker

- `worker/index.ts` routes auth and RPC requests
- `worker/policy.ts` enforces same-origin mutations and editor authorization
- `worker/sheets.ts` and `worker/tripRepository.ts` access Google Sheets
- `worker/gemini.ts` and `worker/tripService.ts` implement AI features
- `shared/` defines frontend/Worker operation and response contracts

### Data flow

```text
React -> /api/auth/* or /api/rpc/* -> Cloudflare Worker
                                      -> Google Sheets API
                                      -> Gemini API
```

## Access model

- Public users can read non-sensitive itinerary content.
- Only allowlisted Google accounts receive editor sessions.
- Tickets, private links, mutations and AI operations require an authorized editor.
- Drive permissions independently protect ticket files.
- Successful mutations invalidate public read caches.

## Configuration

| File or setting | Purpose |
|-----------------|---------|
| `src/config/trip.config.ts` | Trip title, currencies, categories and public links |
| `worker/tripRepository.ts` | Sheet tab names and data mapping |
| `wrangler.jsonc` | Worker name, Static Assets and non-secret model settings |
| Cloudflare Worker secrets | Sheet, OAuth, editor, session, ticket and Gemini credentials |

Types in `shared/` and `src/types/index.ts` must remain aligned with Worker responses.

## Deployment

- Production Worker: `honeymoon-journal`
- Production branch: `main`
- Build: `npm run build:cloudflare`
- Deploy: `npx wrangler deploy`
- Runtime credentials must stay in encrypted Worker secrets

See `docs/deployment.md`.
