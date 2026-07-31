# Vic & Dora in Europe

![Cover](assets/images/cover.png)

以 Google Sheets 為資料來源的歐洲蜜月旅行日誌。React 前端與 API 由同一個 Cloudflare Worker 提供，支援桌面與手機瀏覽。

## 功能

- 行程總覽、每日詳情與城市快速跳轉
- 多幣別花費統計與記帳
- 待辦事項同步 Google Sheets
- Google Maps 導航
- Gemini 景點故事、美食推薦、行程建議與旅遊助理
- 授權帳號專用的票券、Sheet 連結、編輯與 AI 功能
- 公開訪客只能讀取非敏感行程資料

## Production

- Website: [honeymoon-journal.ab889721.workers.dev](https://honeymoon-journal.ab889721.workers.dev)
- Runtime: Cloudflare Workers + Static Assets
- Database: Google Sheets API
- Authentication: Google Identity Services + signed session cookie
- AI: Google Gemini API
- Deployment: Cloudflare Workers Builds from `main`

## Architecture

```text
React SPA
  -> /api/auth/*          Google login and session
  -> /api/rpc/*           trip operations
  -> Cloudflare Worker
       -> Google Sheets API
       -> Gemini API
```

The Worker enforces the access boundary:

- `public:read`: anonymous itinerary and public planning content
- `private:read`: tickets and private links
- `private:write`: itinerary, todo, expense and chat mutations
- `private:ai`: Gemini generation and assistant chat

## Project structure

```text
src/                       React application
  components/              pages, modals and controls
  config/                  trip-specific frontend settings
  utils/apiClient.ts       HTTP and authentication transport
  utils/tripClient.ts      trip API facade
shared/                    frontend/Worker API contracts
worker/                    auth, policy, Sheets and Gemini backend
worker/__tests__/          Worker behavior and authorization tests
docs/deployment.md         production deployment runbook
wrangler.jsonc             Worker and Static Assets configuration
```

## Local development

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

`npm run dev` opens `http://localhost:5173` with Vite HMR and proxies `/api/*`
to the production Cloudflare Worker. Google Sheets, authentication and Gemini
therefore use the production services without local secrets or mock data.

When the current branch adds or changes Worker API operations that are not
deployed yet, use `npm run dev:cloudflare` instead. It builds the current branch
and starts a temporary remote Cloudflare development session on the same port,
using the live Worker bindings without deploying the branch to production.

Add `http://localhost:5173` to the Google OAuth Web client's Authorized
JavaScript origins. Local edits, AI requests and other mutations affect the
production Sheet immediately.

## Verification

```bash
npm run type-check
npm test -- --run
npm run build
npx wrangler deploy --dry-run
```

`npm run build:cloudflare` runs the high-value test suite before the production build. Cloudflare Builds uses this command as the promotion gate.

## Deployment

Cloudflare Workers Builds watches `main`:

- Build command: `npm run build:cloudflare`
- Deploy command: `npx wrangler deploy`
- Root directory: `/`
- Non-production branch builds: disabled

Every push to `main` deploys a new version to the same production URL.

For a manual deployment:

```bash
npm run deploy
```

Runtime credentials are encrypted Worker secrets. See [docs/deployment.md](docs/deployment.md) for setup, verification and rollback.

## Google Sheets tabs

| Tab | Columns |
|-----|---------|
| 行程 | Day, Date, Weekday, City, Content, Transport, Ticket, Link, Hotel |
| 費用 | Two-person budget summary plus accommodation, transport, dining and ticket tables with adjacent `已付款` checkboxes |
| 記帳 | Timestamp, Item, Amount, Currency, Category |
| 待辦 | Section, Item, Detail, Deadline, Done |
| 票券 | Day, Date, City, Item, Type, Provider, File URL, Notes |
| 景點規劃 | Day, Title, Content |
| 導航 | Day, Name, Google Maps Query |
| 美食推薦 | Day, City, PriceLevel, Content, UpdatedAt |
| 旅程介紹 | Type, Content, UpdatedAt |
| AI秘書對話 | Timestamp, Question, Answer |

The live Sheet is the source of truth. `費用` stores each planned item's current best-known amount and payment state; the Web reads it but does not edit it. Accommodation detail totals are already for two people, while transport, dining and ticket detail amounts are per person and are normalized by the Worker. The rate table supplies current CHF, EUR and GBP equivalents in TWD. `記帳` remains the additive ledger for meals and other trip spending.

Ticket files remain protected by their Google Drive permissions in addition to the website login.

## Create another trip

See [SETUP.md](SETUP.md) for the Cloudflare, Google Cloud, Sheet and OAuth setup.
