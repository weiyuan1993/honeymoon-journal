---
name: trip-booking-update
description: "Synchronize a confirmed travel booking across the live honeymoon Google Sheet. Use when the user says 我訂好了/剛訂了 and asks to update the sheet; not for comparing unbooked options."
metadata:
  short-description: trip-booking-update
---

# Trip Booking Update

Synchronize one confirmed booking across its affected workbook records without inventing a payment, ticket, or itinerary change.

## Setup

Use this project's live Google Sheet as the source of truth:

- Spreadsheet ID: `1sd5CVy0qd4QSuOUUDnQH6I1Mx2F2W1NvgWVbujcePiU`
- Project MCP config: `.codex/config.toml`
- Project instructions and tab guidance: `AGENTS.md`

Use the Google Sheets MCP, not local mock data. Start with `list_sheets`, then inspect the relevant live headers and narrow row ranges. Never infer a Day or row number from conversation history.

## Authorization and input

A confirmed booking plus a request to update Google Sheet authorizes the directly affected tabs unless the user explicitly limits the scope. Ask only for a field that prevents a correct record, such as the date, booking identity, or an ambiguous total.

Capture the booked item, date/time, people, purchase status, price/currency, booking reference, and ticket/Drive artefact when supplied. Distinguish a per-person allocation from the actual combined card charge.

## Build the change set

Choose only the tabs that genuinely change:

- **行程**: record the confirmed status, slot, or transport details against the matching live day.
- **待辦**: mark the related item complete and add a follow-up only when one actually exists. Keep dates aligned with `行程`.
- **票券**: treat ticket artefacts as first-class records. Inspect the current header, preserve each supplied URL separately, and insert new rows in the existing Day/date order. Re-read adjacent rows after an insert.
- **費用**: preserve formulas and the workbook's existing allocation convention. Do not add a duplicate expense, and do not create one when the booking is free, already represented, or the user asked to leave it unchanged.
- **景點規劃**, **美食推薦**, or another contextual tab: update only when it contains a now-stale booking instruction or a requested related record.

Do not create a placeholder ticket row for an unpurchased future option. Put an exact shared-card total in a clear note when there is no dedicated field; do not confuse it with the rounded per-person display.

## Write and verify

Use bounded writes only. Preserve existing date formats, currency notation, checkbox conventions, formulas, and unrelated cells. If a live value differs from the understood booking, stop and clarify rather than overwrite it.

After every write, re-read every touched range. For ticket inserts, include the surrounding rows in the read-back to prove placement and Day ordering. Do not report success after an MCP timeout, authorization error, or a write response without a successful read-back.

## Output

Respond in Traditional Chinese with a compact tab-by-tab summary, including exact updated ranges and any intentional non-change (for example, no expense entry). Route an unconfirmed comparison to `trip-option-evaluator` instead of writing it here.
