# Create a Cloudflare Trip Journal

This guide creates a new trip journal from the template using Cloudflare Workers, Google Sheets and Gemini.

## 1. Create the repository

```bash
git clone <your-repository-url>
cd <your-repository>
npm install
```

## 2. Configure the trip

Update:

- `src/config/trip.config.ts`: title, currencies, expense categories and public links
- `index.html`: page title and metadata
- `worker/tripRepository.ts`: Sheet tab names when they differ from the defaults
- `wrangler.jsonc`: Worker name

## 3. Create the Google Sheet

Create these tabs:

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

Store ticket files in Google Drive and put their URLs in the `票券` tab. Keep the Drive ACL restricted to the intended accounts.

The default expense dashboard expects the `費用` layout used by this repository:

- the summary stores one-person EUR category amounts and a two-person total;
- accommodation detail totals are already two-person amounts;
- transport, dining and ticket detail totals are per person;
- each detail table keeps `已付款` beside its amount;
- the rate table supplies positive CHF, EUR and GBP rates in TWD.

The Worker validates these anchors before calculating totals. Update the layout adapter in `worker/tripRepository.ts` when creating a Sheet with a different structure. The website treats `費用` as read-only and appends day-to-day spending to `記帳`.

## 4. Configure Google Cloud

1. Create or select a Google Cloud project.
2. Enable Google Sheets API.
3. Create a service account and download one JSON key.
4. Share the trip Sheet with the service-account email as Editor.
5. Create an OAuth 2.0 Web client.
6. Add the production Worker URL and `http://localhost:5173` to Authorized JavaScript origins.
7. Configure the OAuth consent screen and add intended test users while the app is in testing mode.
8. Create a Gemini API key in the same project or another controlled Google Cloud project.

Do not commit the downloaded service-account JSON file.

## 5. Configure Cloudflare

Create one Worker matching the name in `wrangler.jsonc`, then add these encrypted secrets:

| Secret | Purpose |
|--------|---------|
| `GOOGLE_SHEET_ID` | Spreadsheet ID |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service-account email |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Service-account private key |
| `GOOGLE_CLIENT_ID` | OAuth Web client ID |
| `AUTHORIZED_EDITOR_EMAILS` | Comma-separated editor allowlist |
| `SESSION_SECRET` | Random session-signing secret |
| `GEMINI_API_KEY` | Gemini API key |
| `GOOGLE_TICKET_FOLDER_URL` | Optional private Drive-folder shortcut |

Use `npx wrangler secret put <NAME>` for manual setup. Never place secret values in `wrangler.jsonc`.

## 6. Configure local development

```bash
npm run dev
```

`npm run dev` starts Vite HMR and proxies `/api/*` to the production Cloudflare
Worker. It requires no local secrets. Local edits and AI requests affect the
production Google Sheet immediately.

If the branch changes Worker endpoints that production does not have yet, stop
the Vite server and run `npm run dev:cloudflare`. This command builds the branch
and runs its Worker in a temporary remote Cloudflare development session on
`http://localhost:5173`, with access to the live bindings but no production
deployment.

## 7. Configure automatic deployment

In Cloudflare Worker **Settings -> Builds**:

1. Connect the GitHub repository.
2. Set the production branch to `main`.
3. Set build command to `npm run build:cloudflare`.
4. Set deploy command to `npx wrangler deploy`.
5. Set root directory to `/`.
6. Disable builds for non-production branches.

Cloudflare manages the build token. Runtime secrets remain attached to the Worker.

## 8. Verify

```bash
npm run type-check
npm test -- --run
npm run build
npx wrangler deploy --dry-run
```

After deployment verify:

- Public itinerary returns successfully.
- Anonymous ticket, write and AI requests are denied.
- Every authorized editor can sign in.
- Tickets and private links are visible only after login.
- One reversible Sheet write and one AI request succeed.
- Logout returns the site to public read-only mode.
