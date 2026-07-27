# Cloudflare deployment runbook

This runbook covers the parallel Cloudflare preview. The Google Apps Script
deployment stays live until the parity checklist is accepted and production
cutover is explicitly approved.

## Deployment shape

- One Cloudflare Worker serves both the React SPA and `/api/*`.
- Static assets are served from `dist/`.
- Unknown browser navigation paths fall back to `dist/index.html`.
- `/api/*` runs the Worker first, so API requests can never fall through to the
  SPA shell.
- The `preview` Wrangler environment creates a separate
  `honeymoon-journal-preview` Worker.
- Preview uploads use Worker Versions and an aliased Preview URL. Uploading a
  version does not change production traffic.
- `PREVIEW_READ_ONLY` is `false` in the checked-in preview configuration.
- Preview and GAS use the same production spreadsheet. Authorized preview
  writes therefore change live trip data immediately.

The existing `.github/workflows/deploy.yml` is intentionally unchanged and
continues to deploy `main` to Google Apps Script during validation.

## Required accounts and configuration

### Cloudflare

Connect the repository through Cloudflare Workers Builds. Cloudflare manages
the build token; do not copy a Cloudflare API token into GitHub Actions.

Preview runtime secrets are stored on the
`honeymoon-journal-preview` Worker, not in GitHub and not in this repository:

- `GOOGLE_SHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
- `GOOGLE_CLIENT_ID`
- `AUTHORIZED_EDITOR_EMAILS`
- `SESSION_SECRET`
- `GEMINI_API_KEY`

`GEMINI_API_KEY` is required because preview exposes AI generation and chat to
authorized editors.

`GOOGLE_TICKET_FOLDER_URL` is an optional private binding for the editor-only
shortcut to the ticket folder. Configure it as an encrypted Worker secret when
that shortcut is enabled; never put it in checked-in `vars` or the public
frontend config.

`GOOGLE_CLIENT_ID` and editor email addresses are not passwords, but they still
belong in runtime configuration so the repository is reusable. Use a
cryptographically random value for `SESSION_SECRET`.

### Google Cloud

1. Enable Google Sheets API for the service-account project.
2. Share the production spreadsheet with the service-account email as Editor.
3. Create a Google OAuth Web client for editor login.
4. Add each exact preview origin and, later, the production origin to Authorized
   JavaScript origins. Preview URLs are separate origins.
5. Add the exact verified Google account emails for Vic and Dora to
   `AUTHORIZED_EDITOR_EMAILS`.
6. Keep Drive ticket files restricted to those Google accounts. Site login does
   not replace Drive ACL checks.

Do not upload the downloaded service-account JSON file. Copy only its email and
private key into encrypted Worker secrets.

Use the stable `branch-preview` alias for Vic/Dora authentication tests.

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

Fill `.dev.vars` locally. Preserve the private-key line breaks in the format the
Worker expects. Check `git status --short` before every commit to ensure no local
secret file is staged.

`npm run build` remains the legacy GAS build. `npm run build:cloudflare` creates
the SPA artifact used by Wrangler.

## One-time preview bootstrap

Bootstrap the preview Worker and its required runtime secrets from a trusted
machine:

1. Authenticate with `npx wrangler login`.
2. Populate `.dev.vars.preview` with the seven preview secrets listed above.
3. Run:

   ```bash
   npm run build:cloudflare
   npx wrangler deploy --env preview --secrets-file .dev.vars.preview
   ```

4. Confirm the deployed preview points to the intended production Sheet and
   that editor-only write controls require an authorized login.
5. Delete the local `.dev.vars.preview` when it is no longer needed.

This command deploys only `honeymoon-journal-preview`; it does not deploy the
top-level production Worker and does not call `clasp`.

After bootstrap, open the `honeymoon-journal-preview` Worker in Cloudflare:

1. Go to **Settings → Builds** and connect this GitHub repository.
2. Set the production branch to `codex/cloudflare-sheets-api`.
3. Set the build command to `npm run build:cloudflare`.
4. Set the deploy command to
   `npx wrangler versions upload --env preview --preview-alias branch-preview`.
5. Leave the root directory empty because this repository is the project root.

Every push to the branch now builds and uploads a new preview version without
promoting it to production. Cloudflare manages the build token internally, so
repository code and GitHub pull-request workflows never receive a Cloudflare
API token. Runtime secrets remain on the Worker and Wrangler configuration
contains no secret values.

Cloudflare Preview URLs are public by default. The app must therefore enforce
its anonymous/private API boundary even in preview. Optionally enable Cloudflare
Access for the preview URL as an extra test-environment restriction; do not use
Access on the future public production site.

## Shared production Sheet validation

Preview intentionally uses the same spreadsheet as GAS. Before testing writes:

1. Confirm `GOOGLE_SHEET_ID` is the production spreadsheet ID.
2. Confirm the service account has Editor access.
3. Record the target row and its current values.
4. Use a reversible test, such as toggling one todo and restoring it immediately.
5. Verify the exact row after every edit, expense, AI, or chat operation.
6. Use Google Sheets version history to recover if a validation step changes
   unexpected data.

Do not use destructive bulk operations during preview validation. Clearing all
chat history and deleting existing expenses should be tested only when the
affected production data can be safely restored.

## Production cutover

Cutover is a separate, approval-gated change. Do not repurpose the preview
build configuration.

1. Complete the parity checklist with Vic and Dora on desktop and mobile.
2. Configure top-level production secrets, including `GEMINI_API_KEY`.
3. Confirm the production spreadsheet grants the service account Editor access.
4. Add the production origin to the Google OAuth Web client.
5. Upload a production Worker version and smoke-test its version Preview URL.
6. Reconfigure Workers Builds so the approved production Worker listens to
   `main` and uses `npx wrangler deploy`.
7. Attach the production custom domain or distribute the new Worker URL.
8. Verify anonymous access, both editor accounts, Drive tickets, one reversible
   Sheet write, one AI save, and logout.
9. Keep the GAS Web App URL and clasp deployment metadata intact during the
   acceptance window.

## Rollback

If Cloudflare fails before or during cutover:

1. Stop routing/distributing the Cloudflare URL.
2. Return users to the unchanged GAS Web App URL.
3. If a custom domain was attached, remove or replace only its Worker route.
4. If the Worker itself is healthy but the latest version is bad, use Cloudflare
   deployment rollback to restore the prior Worker version.
5. Verify and revert any unintended preview writes in the production Sheet.
6. Leave the GAS source and deployment workflow in place until a later,
   separately approved cleanup.

Rollback must not require reverting the Google Sheet or rotating credentials
unless an actual data/security incident occurred.

## References

- [Cloudflare Workers Static Assets SPA routing](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/)
- [Static Assets Worker-first routing](https://developers.cloudflare.com/workers/static-assets/binding/#run_worker_first)
- [Cloudflare Worker Preview URLs](https://developers.cloudflare.com/workers/versions-and-deployments/preview-urls/)
- [Cloudflare Workers Git integration](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/)
- [Cloudflare Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
- [Wrangler environments](https://developers.cloudflare.com/workers/wrangler/environments/)
- [Cloudflare secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Google OAuth Web client setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid)
- [Google service-account credentials](https://developers.google.com/identity/protocols/oauth2/service-account)
