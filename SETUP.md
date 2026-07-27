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
- `src/index.html`: page title and metadata
- `worker/tripRepository.ts`: Sheet tab names when they differ from the defaults
- `wrangler.jsonc`: Worker name

## 3. Create the Google Sheet

Create these tabs:

| Tab | Columns |
|-----|---------|
| 行程 | Day, Date, Weekday, City, Content, Transport, Ticket, Link, Hotel |
| 記帳 | Timestamp, Item, Amount, Currency, Category |
| 待辦 | Section, Item, Detail, Deadline, Done |
| 票券 | Day, Date, City, Item, Type, Provider, File URL, Notes |
| 景點規劃 | Day, Title, Content |
| 導航 | Day, Name, Google Maps Query |
| 美食推薦 | Day, City, PriceLevel, Content, UpdatedAt |
| 旅程介紹 | Type, Content, UpdatedAt |
| AI秘書對話 | Timestamp, Question, Answer |

Store ticket files in Google Drive and put their URLs in the `票券` tab. Keep the Drive ACL restricted to the intended accounts.

## 4. Configure Google Cloud

1. Create or select a Google Cloud project.
2. Enable Google Sheets API.
3. Create a service account and download one JSON key.
4. Share the trip Sheet with the service-account email as Editor.
5. Create an OAuth 2.0 Web client.
6. Add the production Worker URL to Authorized JavaScript origins.
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
cp .dev.vars.example .dev.vars
```

Fill `.dev.vars`, preserving private-key line breaks. The file is ignored by Git.

```bash
npm run dev
npm run dev:cloudflare
```

- `npm run dev`: frontend with mock data
- `npm run dev:cloudflare`: production build served through the local Worker

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
