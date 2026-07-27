# Cloudflare production deployment runbook

This runbook covers the single Cloudflare production Worker. Google Apps Script
stays available only as a rollback path until the Cloudflare release is fully
accepted.

## Deployment shape

- `honeymoon-journal` serves both the React SPA and `/api/*`.
- Static assets are served from `dist/`.
- Unknown browser navigation paths fall back to `dist/index.html`.
- `/api/*` runs the Worker first, so API requests cannot fall through to the
  SPA shell.
- The Worker reads and writes the production Google Sheet.
- Authorized editor operations take effect on production data immediately.
- There is no second Cloudflare environment or staging spreadsheet.

The existing `.github/workflows/deploy.yml` remains unchanged while GAS is kept
as a rollback path.

## Required accounts and configuration

### Cloudflare

Connect the repository through Cloudflare Workers Builds. Cloudflare manages
the build token; do not copy a Cloudflare API token into GitHub Actions.

Store these runtime secrets on `honeymoon-journal`, never in GitHub or this
repository:

- `GOOGLE_SHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
- `GOOGLE_CLIENT_ID`
- `AUTHORIZED_EDITOR_EMAILS`
- `SESSION_SECRET`
- `GEMINI_API_KEY`

`GOOGLE_TICKET_FOLDER_URL` is an optional encrypted secret for the editor-only
ticket-folder shortcut.

Use a cryptographically random value for `SESSION_SECRET`. Do not upload the
downloaded service-account JSON file; copy only its email and private key into
encrypted Worker secrets.

### Google Cloud

1. Enable Google Sheets API for the service-account project.
2. Share the production spreadsheet with the service-account email as Editor.
3. Create a Google OAuth Web client for editor login.
4. Add the exact `honeymoon-journal` origin to Authorized JavaScript origins.
5. Add Vic and Dora's exact Google account emails to
   `AUTHORIZED_EDITOR_EMAILS`.
6. Keep Drive ticket files restricted to those Google accounts. Site login does
   not replace Drive ACL checks.

## Local setup

Before creating local secret files, ensure `.gitignore` contains:

```gitignore
.dev.vars*
!.dev.vars.example
```

Then:

```bash
cp .dev.vars.example .dev.vars
npm install
npm run build:cloudflare
npm run dev:cloudflare
```

Fill `.dev.vars` locally and preserve private-key line breaks. Check
`git status --short` before every commit to ensure no secret file is staged.

`npm run build` remains the legacy GAS build. `npm run build:cloudflare` creates
the SPA artifact used by Wrangler.

## One-time production bootstrap

From a trusted machine:

1. Authenticate with `npx wrangler login`.
2. Run:

   ```bash
   npm run build:cloudflare
   npx wrangler deploy
   ```

3. Add every runtime secret with `npx wrangler secret put <NAME>`.
4. Confirm the Worker points to the intended production Sheet.
5. Confirm anonymous users cannot access tickets, private links, writes, or AI.
6. Confirm Vic and Dora can access the authorized editor features.

## Automatic deployment

Open the `honeymoon-journal` Worker in Cloudflare and configure
**Settings → Builds**:

1. Connect `weiyuan1993/honeymoon-journal`.
2. Use `codex/cloudflare-sheets-api` as the production branch during migration.
3. Set the build command to `npm run build:cloudflare`.
4. Set the deploy command to `npx wrangler deploy`.
5. Set the root directory to `/`.
6. Disable builds for non-production branches.

Every push to the selected branch builds and promotes the new version to the
active `honeymoon-journal` deployment at the same URL. After the migration
branch is merged, change the production branch to `main`.

Runtime secrets remain on the Worker and are not exposed to the build process
or repository.

## Production Sheet validation

Before testing writes:

1. Record the target row and its current values.
2. Use a reversible test, such as toggling one todo and restoring it.
3. Verify the exact row after every edit, expense, AI, or chat operation.
4. Use Google Sheets version history to recover unexpected changes.

Do not test destructive bulk operations unless the affected production data can
be safely restored.

## Production acceptance

1. Complete the parity checklist with Vic and Dora on desktop and mobile.
2. Verify anonymous access, both editor accounts, Drive tickets, one reversible
   Sheet write, one AI save, and logout.
3. Confirm Workers Builds deploys a pushed commit to the same production URL.
4. Record and test the GAS URL as the rollback path.
5. Remove the obsolete Cloudflare Worker only after the production Worker and
   automatic deployment are verified.

## Rollback

If Cloudflare fails:

1. Direct users to the unchanged GAS Web App URL.
2. Roll the Worker back to its prior healthy deployment when possible.
3. Verify and revert any unintended Sheet writes.
4. Keep GAS source and deployment metadata until the acceptance window ends.

Rollback should not require rotating credentials unless an actual security
incident occurred.

## References

- [Cloudflare Workers Static Assets SPA routing](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/)
- [Static Assets Worker-first routing](https://developers.cloudflare.com/workers/static-assets/binding/#run_worker_first)
- [Cloudflare Workers Git integration](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/)
- [Cloudflare Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
- [Cloudflare secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Google OAuth Web client setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid)
- [Google service-account credentials](https://developers.google.com/identity/protocols/oauth2/service-account)
