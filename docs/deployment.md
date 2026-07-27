# Production deployment

The `honeymoon-journal` Cloudflare Worker serves both the React SPA and `/api/*`.

## Worker shape

- Static Assets are built into `dist/`.
- Unknown browser routes fall back to `dist/index.html`.
- `/api/*` runs the Worker first and never falls through to the SPA.
- The Worker reads and writes the production Google Sheet.
- Anonymous access is read-only; private and mutating capabilities require an authorized session.
- Version preview URLs are disabled.

## Required secrets

Store these as encrypted secrets on `honeymoon-journal`:

- `GOOGLE_SHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
- `GOOGLE_CLIENT_ID`
- `AUTHORIZED_EDITOR_EMAILS`
- `SESSION_SECRET`
- `GEMINI_API_KEY`
- `GOOGLE_TICKET_FOLDER_URL` (optional)

Never commit `.dev.vars`, API keys, private keys or downloaded service-account JSON files.

## Google configuration

1. Enable Google Sheets API.
2. Share the Sheet with the service account as Editor.
3. Add the exact production Worker origin to the OAuth Web client's Authorized JavaScript origins.
4. Add every editor email to `AUTHORIZED_EDITOR_EMAILS`.
5. Keep ticket files restricted through Google Drive ACLs.

## Local verification

```bash
cp .dev.vars.example .dev.vars
npm install
npm run type-check
npm test -- --run
npm run build
npx wrangler deploy --dry-run
```

## Automatic deployment

Cloudflare Worker **Settings -> Builds**:

- Repository: `weiyuan1993/honeymoon-journal`
- Production branch: `main`
- Build command: `npm run build:cloudflare`
- Deploy command: `npx wrangler deploy`
- Root directory: `/`
- Non-production branch builds: disabled

Every push to `main` runs the test suite and production build before creating and promoting a Worker version at the stable production URL.

## Production smoke test

After deployment verify:

1. `/` returns the SPA.
2. `/api/rpc/getItineraryData` succeeds anonymously.
3. `/api/rpc/getTicketData` returns `401` anonymously.
4. Vic and Dora can sign in.
5. Ticket and private links appear only after login.
6. One reversible write and one AI request succeed.
7. Logout returns the app to public read-only mode.

Also verify the security boundary after auth, routing or Cloudflare configuration changes:

- A valid Google account outside `AUTHORIZED_EDITOR_EMAILS` receives `403` and no private data.
- An expired or tampered session receives `401`.
- Private responses send `Cache-Control: private, no-store`.
- A cross-origin mutation is rejected.
- Switching accounts clears the previous account's private state.
- An unknown `/api/*` route returns an API `404`, not the SPA.
- Anonymous responses contain no ticket URLs, Sheet edit links, secrets or service-account metadata.

## Rollback

Use Cloudflare's deployment history to restore the previous healthy Worker version. Verify the Sheet after any failed write or AI operation. Rotate credentials only if there is evidence of credential exposure.

The inactive `archive/gas` branch preserves the final verified hybrid revision as a disaster-recovery reference. It is not built or deployed from `main`. If a Cloudflare-wide outage requires explicitly reviving GAS, check out `archive/gas`, restore the legacy clasp credentials and deployment ID outside Git, then run `npm ci` and `npm run deploy`. This fallback may require dependency or Google configuration maintenance before use, and restoring application code never reverses Google Sheet mutations.

## References

- [Cloudflare Workers Static Assets SPA routing](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/)
- [Static Assets Worker-first routing](https://developers.cloudflare.com/workers/static-assets/binding/#run_worker_first)
- [Cloudflare Workers Git integration](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/)
- [Cloudflare Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
- [Cloudflare secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Google OAuth Web client setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid)
- [Google service-account credentials](https://developers.google.com/identity/protocols/oauth2/service-account)
