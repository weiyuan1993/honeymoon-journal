# AGENTS.md

This file provides guidance to coding agents, including Codex, when working in this repository.

## Project Overview

A travel journal web app for honeymoon trip planning. The production runtime is a Cloudflare Worker with a React frontend and Google Sheets as the database. The former Google Apps Script deployment is retained as a temporary rollback path. Designed as a reusable template.

## Primary Travel Data Source

The source of truth for this specific honeymoon project is the Google Sheet, not local mock data or checked-in files. Current itinerary, hotels, costs, todos, packing notes, references, and comparison tables should be read from Google Sheets through MCP before answering travel-planning questions or making data updates.

- Spreadsheet ID: `1sd5CVy0qd4QSuOUUDnQH6I1Mx2F2W1NvgWVbujcePiU`
- Sheet URL is configured in `src/config/trip.config.ts` under `tripConfig.links.googleSheet`
- Project-local MCP config lives at `.codex/config.toml`
- This project intentionally enables only the `google-sheets` MCP server; other MCP servers are disabled locally
- Do not store or print credential contents. Credentials are referenced by path in `.codex/config.toml`

When working with travel information:

1. Use Google Sheets MCP first, especially `list_sheets`, `get_sheet_data`, `get_multiple_sheet_data`, `update_cells`, and `batch_update_cells`.
2. Read the relevant tab/range before drawing conclusions. Important planning tabs include `行程`, `住宿`, `費用`, `待辦`, `攜帶`, `記帳`, `參考資料`, `費用比較`, `旅程介紹`, `美食推薦`, `導航`, `景點規劃`, and `AI秘書對話`.
3. After updating sheet data, re-read the changed range or related totals to verify the update.
4. Local dev mock data is only for UI development and may be stale. Do not use mock data as evidence for current plans, prices, bookings, or itinerary feasibility.

## Commands

```bash
npm run dev      # Local development with mock data (http://localhost:5173)
npm run build:cloudflare # Type-check and build the Cloudflare production artifact
npm run dev:cloudflare   # Build and run the Worker locally
npm run build            # Build the legacy GAS rollback artifact
npm run deploy           # Manually deploy the legacy GAS rollback
```

Auto-deploy: Cloudflare Workers Builds deploys the configured production branch to `honeymoon-journal`. During migration that branch is `codex/cloudflare-sheets-api`; switch it to `main` after merge. Pushes to `main` also continue to deploy the GAS rollback through GitHub Actions until that legacy deployment is retired.

## Architecture

### Frontend (src/)
- **React 19 + TypeScript + Tailwind CSS v4** single-page application
- Built with Vite
- `gasClient.ts` selects the Cloudflare `/api/*` transport in production, the GAS transport on the rollback deployment, and mock data for local Vite development

### Production backend (worker/)
- Cloudflare Worker serves the SPA and `/api/*` from one origin
- Uses Google Sheets API through a service account
- Uses Google OAuth ID tokens plus signed session cookies for Vic and Dora
- Enforces public read-only access and editor-only tickets, writes, and AI operations
- Integrates Google Gemini API and preserves Sheet-backed AI caches

### Rollback backend (gas/)
- **Code.js**: retained Google Apps Script server functions called via `google.script.run`
- Reads/writes to Google Sheets tabs: 行程, 記帳, 景點規劃, 導航, 美食推薦, 旅程介紹, AI秘書對話
- Integrates Google Gemini API for AI features (景點故事, 美食推薦, 旅程介紹, AI秘書對話)

### Data Flow
```
React Components → gasClient.ts → /api/* → Cloudflare Worker → Google Sheets API
                     ├─ GAS rollback → google.script.run → Code.js
                     └─ local Vite development → mock data
```

### Key Files to Modify for New Trips
| File | Purpose |
|------|---------|
| `src/config/trip.config.ts` | App title, currencies, categories, external links |
| `worker/tripRepository.ts` | Production Sheet names and data mapping |
| `wrangler.jsonc` | Production Worker name, assets, and non-secret variables |
| Cloudflare Worker secrets | Sheet, OAuth, editor, session, ticket, and Gemini credentials |
| `gas/Code.js` CONFIG object | Legacy rollback page title and sheet names |

## Google Sheets Structure

Use MCP to inspect the live spreadsheet because planning tabs may evolve over time. The production web runtime uses the tab names configured in `worker/tripRepository.ts`; the rollback runtime uses `gas/Code.js`. Broader trip planning also uses additional tabs.

| Tab | Columns |
|-----|---------|
| 行程 | Day, Date, Weekday, City, Content, Transport, Ticket, Link, Hotel |
| 記帳 | Timestamp, Item, Amount, Currency, Category |
| 費用 | Budget/cost planning; inspect live columns with MCP |
| 費用比較 | Scenario and pass/ticket comparison; inspect live columns with MCP |
| 住宿 | Hotel/lodging planning; inspect live columns with MCP |
| 待辦 | Booking and planning todos; inspect live columns with MCP |
| 攜帶 | Packing notes; inspect live columns with MCP |
| 參考資料 | Research links and notes; inspect live columns with MCP |
| 景點規劃 | Day, Title, Content |
| 導航 | Day, Name, Google Maps Query |
| 美食推薦 | Day, City, PriceLevel, Content, UpdatedAt |
| 旅程介紹 | Type (intro/city:name/closing), Content, UpdatedAt |
| AI秘書對話 | Timestamp, Question, Answer |

## Important Patterns

- Cloudflare authorization checks every non-public RPC operation against the signed editor session
- Public Sheet reads are cached; successful mutations invalidate the related public cache
- The GAS rollback preserves rich text hyperlinks via `getRichTextValues()` → `convertRichTextToHtml()`
- AI content auto-saves to sheets for caching
- Types in `src/types/index.ts` must match both Worker and GAS rollback responses

## Deployment

Production uses Cloudflare Workers Builds with `npm run build:cloudflare` and `npx wrangler deploy`. Runtime credentials are encrypted Worker secrets and must never be committed. See `docs/deployment-cloudflare.md`.

The GAS rollback requires authenticated `clasp`; its GitHub Actions workflow uses `CLASPRC_JSON` and `DEPLOYMENT_ID` secrets.
