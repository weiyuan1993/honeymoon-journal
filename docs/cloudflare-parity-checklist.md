# Cloudflare parity and cutover checklist

Record evidence against the production Worker. Leave blocked real-environment items
unchecked with a short reason; do not mark them passed from local mocks.

## Build and deployment isolation

- [ ] `npm run type-check` exits 0.
- [ ] `npm test -- --run` exits 0.
- [ ] `npm run build` exits 0 and still produces the GAS artifact.
- [ ] `npm run build:cloudflare` exits 0 and produces `dist/index.html`.
- [ ] A push to `codex/cloudflare-sheets-api` deploys the production Worker.
- [ ] The Workers Builds log contains no `clasp`, custom domain, or route
      mutation.
- [ ] `.github/workflows/deploy.yml` is unchanged.
- [ ] Production reports write-enabled mode only for authenticated, authorized
      editors.
- [ ] Every validation mutation changes only the intended production Sheet row.

Evidence:

```text
Date:
Commit:
Production URL:
Workers Build:
Notes:
```

## Public and private boundary

Test both the visible UI and direct `/api/*` requests.

| State | Public reads | Tickets/Sheet links | Writes | AI/chat/history |
|---|---|---|---|---|
| Anonymous | [ ] allowed | [ ] denied/redacted | [ ] denied | [ ] denied |
| Vic | [ ] allowed | [ ] allowed | [ ] allowed | [ ] allowed |
| Dora | [ ] allowed | [ ] allowed | [ ] allowed | [ ] allowed |
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

## Production Sheet write parity

Prerequisite: the production spreadsheet is shared with the service account as
Editor, and each validation operation has a recorded before value and cleanup
step.

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
- [ ] Validation writes changed only the intended production rows.

Evidence:

```text
Production spreadsheet:
Before snapshot:
After snapshot:
Rows exercised:
Cleanup:
```

## Browser and Drive acceptance

Test the Worker URL, not Vite mocks.

- [ ] Desktop Chrome: public navigation and all tabs.
- [ ] Mobile viewport: public navigation, modals, cards, and overflow.
- [ ] Vic signs in, sees private controls, opens a ticket, then signs out.
- [ ] Dora signs in, sees private controls, opens a ticket, then signs out.
- [ ] Account switching does not retain the prior account's private state.
- [ ] Expired session recovers to public mode with a clear message.
- [ ] Direct navigation to an SPA route returns the application, not a 404.
- [ ] An unknown `/api/*` path returns an API error, not `index.html`.
- [ ] Drive independently rejects a non-authorized Google account.

## Production acceptance gate

All items below require explicit user approval.

- [ ] Every unchecked item above has an accepted explanation.
- [ ] Production Worker secrets and OAuth origin are configured.
- [ ] Production URL passes the authorization matrix.
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
