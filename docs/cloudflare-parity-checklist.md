# Cloudflare parity and cutover checklist

Record evidence against the preview Worker. Leave blocked real-environment items
unchecked with a short reason; do not mark them passed from local mocks.

## Build and deployment isolation

- [ ] `npm run type-check` exits 0.
- [ ] `npm test -- --run` exits 0.
- [ ] `npm run build` exits 0 and still produces the GAS artifact.
- [ ] `npm run build:cloudflare` exits 0 and produces `dist/index.html`.
- [ ] A push to `codex/cloudflare-sheets-api` uploads a Worker Preview version.
- [ ] The Workers Builds log contains no `clasp`, production Worker deploy, custom
      domain, or route mutation.
- [ ] `.github/workflows/deploy.yml` is unchanged.
- [ ] Preview reports read-only mode and rejects every mutation/AI request.
- [ ] No preview request changes the production spreadsheet.

Evidence:

```text
Date:
Commit:
Preview URL:
Workers Build:
Notes:
```

## Public and private boundary

Test both the visible UI and direct `/api/*` requests.

| State | Public reads | Tickets/Sheet links | Writes | AI/chat/history |
|---|---|---|---|---|
| Anonymous | [ ] allowed | [ ] denied/redacted | [ ] denied | [ ] denied |
| Vic | [ ] allowed | [ ] allowed | [ ] preview read-only | [ ] preview read-only |
| Dora | [ ] allowed | [ ] allowed | [ ] preview read-only | [ ] preview read-only |
| Other Google account | [ ] allowed | [ ] denied/redacted | [ ] denied | [ ] denied |
| Expired/tampered session | [ ] allowed after reset | [ ] denied/redacted | [ ] denied | [ ] denied |

- [ ] Anonymous `/api/rpc/getTicketData` returns an authorization error and no metadata,
      count, filename, Drive ID, or URL.
- [ ] Anonymous assets and responses contain no raw Sheet URL, ticket-folder
      URL, chat data, service-account data, Gemini key, or session secret.
- [ ] A valid but non-allowlisted Google account remains in public mode.
- [ ] Sign-out immediately removes private links/data without a full reload.
- [ ] Private responses use `Cache-Control: private, no-store`.
- [ ] Cross-origin state-changing requests are rejected.

## Public read parity

- [ ] Dashboard totals and upcoming-trip state match GAS.
- [ ] Itinerary days, cities, content, transport, tickets, links, and hotels
      match GAS.
- [ ] Todo sections, rich-text links, deadlines, and completion state match GAS.
- [ ] Expense list, totals, currency formatting, and categories match GAS.
- [ ] Navigation items and map queries match GAS.
- [ ] Attraction details and saved stories match GAS.
- [ ] Food recommendations match GAS.
- [ ] Journey intro, city content, and closing content match GAS.
- [ ] Rich text with multiple links, line breaks, and HTML characters renders
      correctly and safely.
- [ ] A retryable Sheets `429/5xx` is shown as a retry state, not empty data.
- [ ] A warm public read reduces Google API calls without serving stale data
      after invalidation.

## Staging write parity

Prerequisite: a copied staging spreadsheet, service-account Editor access,
separate preview bindings, and an explicitly approved temporary write-enabled
preview.

- [ ] Editing itinerary updates only the intended editable columns.
- [ ] Completing a todo updates the intended row.
- [ ] Creating, editing, and deleting an expense match GAS.
- [ ] A stale row identity returns `409` and changes no row.
- [ ] A successful write invalidates the corresponding public cache.
- [ ] Story generation persists to the intended attraction row.
- [ ] Food generation persists with the current format.
- [ ] Itinerary suggestion returns the expected response shape.
- [ ] Journey generation preserves the existing content if persistence fails.
- [ ] AI secretary chat and optional search grounding match current behavior.
- [ ] Chat history read, delete, and clear match GAS.
- [ ] Gemini success plus Sheet failure is reported as generated but unsaved.
- [ ] Preview write tests changed only the staging spreadsheet.

Evidence:

```text
Staging spreadsheet:
Before snapshot:
After snapshot:
Rows exercised:
Cleanup:
```

## Browser and Drive acceptance

Test the Worker URL, not Vite mocks.

- [ ] Desktop Chrome: public navigation and all tabs.
- [ ] Mobile viewport: public navigation, modals, cards, and overflow.
- [ ] Vic signs in, sees private controls, previews a ticket, then signs out.
- [ ] Dora signs in, sees private controls, previews a ticket, then signs out.
- [ ] Account switching does not retain the prior account's private state.
- [ ] Expired session recovers to public mode with a clear message.
- [ ] Direct navigation to an SPA route returns the application, not a 404.
- [ ] An unknown `/api/*` path returns an API error, not `index.html`.
- [ ] Drive independently rejects a non-authorized Google account.

## Cutover gate

All items below require explicit user approval.

- [ ] Every unchecked item above has an accepted explanation.
- [ ] Production Worker secrets and OAuth origin are configured.
- [ ] Production version Preview URL passes the authorization matrix.
- [ ] The `main` Cloudflare Workers Builds production configuration was reviewed.
- [ ] The still-live GAS URL was recorded and tested as rollback.
- [ ] The production routing/link switch was approved.
- [ ] Post-cutover anonymous, Vic, Dora, Drive, Sheet write, AI save, and logout
      smoke tests pass.
- [ ] The rollback owner and acceptance-window end time are recorded.

Approval:

```text
Approved by:
Approved commit:
Cutover time:
Rollback URL:
Acceptance window:
```
