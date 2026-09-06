---
name: itinerary-audit
description: "Run a read-only readiness audit of the live honeymoon workbook: booking urgency, date drift, and cross-tab consistency. Use when the user asks 行程還有什麼要處理, wants 待辦 re-checked, or requests a pre-trip review."
metadata:
  short-description: itinerary-audit
---

# Itinerary Audit

Read-only booking and consistency sweep. Report problems and proposed fixes; write only after explicit approval.

## Setup

Use this project's live Google Sheet as the source of truth:

- Spreadsheet ID: `1sd5CVy0qd4QSuOUUDnQH6I1Mx2F2W1NvgWVbujcePiU`
- Project MCP config: `.codex/config.toml`
- Project instructions and tab guidance: `AGENTS.md`

Use the Google Sheets MCP and read the live tab headers before choosing ranges. Keep reads bounded to avoid rate limits; local mock data is never evidence for current plans, bookings, or prices.

## Evidence model

Read `行程` first to establish actual dates and fixed constraints. Then use:

- `票券` for what is already purchased or has an artefact;
- `待辦` for unfinished actions and their dates;
- `費用` for a payment inconsistency only when the booked item should be represented there;
- `費用比較` when a pass-versus-single-ticket decision remains relevant.

Do not treat a ticket as missing merely because one tab is stale. Reconcile the evidence before classifying it.

## Checks

1. **Booking state** — classify each relevant item as `已買／已確認`, `現在要處理`, `尚未開放`, or `可當天決定`.
2. **Date alignment** — compare every date-bearing todo that is in scope, including transport and visa/fee rows, against `行程`. Do not normalize accommodation/status rows without first understanding their role.
3. **Cross-tab integrity** — flag orphaned todos, stale booking text, missing ticket artefacts, and payment records that conflict with the confirmed state. Do not demand an expense entry for a free booking or one intentionally kept out of `費用`.
4. **Urgency** — use current official operator or venue information for release windows, timed entry, operating season, and sell-out risk. Distinguish a date not yet released, a genuine sold-out date, and a browser/WAF failure.

## Output

繁體中文, action-first:

1. **🔴 已過期或本週必辦** — item, deadline, one-line action.
2. **🟡 兩週內** — same shape.
3. **尚未開放／可當天決定** — state the condition and whether a fixed desired service is still at risk.
4. **不一致清單** — tab, cell/row, evidence, and proposed correction.
5. **看起來沒問題的部分** — one line.

State the source limitation when live official information cannot be verified. Offer to apply accepted corrections using `trip-booking-update` conventions; do not write in this skill.
