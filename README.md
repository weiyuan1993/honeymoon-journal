# Vic & Dora in Europe

![Cover](assets/images/cover-editorial-desktop.png)

以 Google Sheets 為資料來源的歐洲蜜月旅行日誌。React 前端與 API 由同一個 Cloudflare Worker 提供，支援桌面與手機瀏覽。

## 功能

- 旅程總覽：出發倒數、當日重點、未完成待辦與常用連結
- 旅程故事與每日行程：整合交通、票務、住宿、景點規劃與城市跳轉，授權帳號可直接編輯
- 地圖與資料：Google Maps 導航，以及可依國家篩選的實用連結
- 票券庫：依國家篩選，並預覽或直接開啟 Google Drive 文件
- 花費管理：多幣別預算、已付／待付總覽、匯率與可編輯記帳
- 待辦管理：分類、完成狀態、Google Sheets 同步與私密預約連結
- Gemini AI：當日美食推薦（搜尋查證、可附用餐需求）、行程建議、旅程介紹與旅遊助理
- 公開訪客可讀取非敏感資料；票券、私密連結、編輯與 AI 限授權帳號使用

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

`待辦`的「連結」欄可放訂票、訂單管理與票券網址，僅授權帳號登入後才會取得並顯示。
網址只接受 `http` 或 `https`；訪客只能讀取不含連結的待辦文字。

## Project structure

```text
.codex/skills/              project-local honeymoon planning workflows
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

Requirements: Node.js 20.19+ (20.x) or 22.12+, and npm.

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

| Tab | Purpose | Main fields |
|-----|---------|-------------|
| 行程 | Web 的每日行程主資料，包含時間線與行前提醒 | Day, Date, Weekday, City, Content, Transport, Ticket, Reference Link, Hotel |
| 住宿 | 集中管理飯店訂單、設施、取消與付款資訊 | Dates, City, Hotel, Platform, Amenities, Nights, Payment/Cancel, Amount/Tax/Card, Notes |
| 費用 | 旅費預算、分類明細、已付狀態與匯率，供花費總覽讀取 | Category summaries, accommodation/transport/dining/ticket details, Paid, Exchange rates |
| 票券 | 索引已購票券與 Drive 文件，供授權帳號在票券庫查看 | Day, Date, City, Item, Type, Provider, File URL, Notes |
| 待辦 | 管理行前預約與準備任務，Web 可篩選並同步完成狀態 | Section, Item, Detail, Done, Links |
| 攜帶 | 分類管理行李數量、必要性與準備狀態 | Category, Item, Quantity, Notes, Necessity, Done |
| 記帳 | 儲存旅途中的實際與額外支出，Web 可新增、修改與刪除 | Timestamp, Item, Amount, Currency, Category |
| 參考資料 | 依國家整理交通、景點、票券與攻略連結，供實用連結頁使用 | Country sections, Item, Link, Notes |
| 旅程介紹 | 儲存序章、各城市故事與結語，供旅程頁顯示 | Type (`intro`, `city:*`, `closing`), Content, UpdatedAt |
| 美食推薦 | 每天一筆整合推薦，以 Day 更新；內容包含各餐選擇、價位與地圖連結 | Day, City, Content, Preferences, UpdatedAt |
| 導航 | 提供每日景點的 Google Maps 搜尋目標 | Day, Name, Google Maps Query |
| 景點規劃 | 由 Sheet 維護每日故事、動線與提醒；網站只提供閱讀 | Day, Title, Content |
| AI秘書對話 | 保留授權使用者與旅遊助理的對話紀錄 | Timestamp, Question, Answer |

The live Sheet is the source of truth. `費用` is the read-only plan and payment view; `記帳` is the editable spending ledger. The Worker normalizes currencies and per-person or two-person totals for the Web. `住宿` and `攜帶` remain Sheet-only management tabs.

Ticket and private booking URLs require an authorized website session. Google Drive permissions independently protect the underlying files.

## Create another trip

See [SETUP.md](SETUP.md) for the Cloudflare, Google Cloud, Sheet and OAuth setup.

### Food recommendation data

`美食推薦` uses exactly five columns: `Day`, `City`, `Content`, `Preferences`, `UpdatedAt`.
Each non-empty `Day` must be unique. `Preferences` is optional dining guidance from the last update;
`UpdatedAt` is an ISO timestamp. Empty days display the generation entry point for editors.
The API returns a map keyed by day with `{ city, content, preferences, updatedAt }` values.
`generateFoodRecommendations` accepts `[day, city, itineraryContent, preferences?]` and replaces that day's recommendation.
Map URLs render as buttons; other source URLs remain separately labelled.
