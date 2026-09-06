---
name: itinerary-layering
description: "Restructure a selected city or day range in the live honeymoon itinerary into a glanceable timeline and retained operational detail. Use when the user asks to 整理行程, preview a rewrite, or work city by city; do not write before approval."
metadata:
  short-description: itinerary-layering
---

# Itinerary Layering

Turn an overloaded itinerary into a clear daily overview without deleting the decisions that make the trip workable.

## Setup

Use this project's live Google Sheet through the Google Sheets MCP. `行程` and `景點規劃` are the source material; do not use local mock data or infer row numbers from a prior conversation.

## Modes

- **Review or preview**: read only the requested city or day range, then show a row-by-row proposal. A local Excel preview is appropriate only when the user asks for one.
- **Apply**: write only after the user explicitly approves the proposal and scope. Approval for one city does not authorize the rest of the itinerary.

Before either mode, locate the live Day/date rows and read the relevant columns, including links where they might be preserved.

## Column contract

- **主要行程內容**: a scan-friendly time/order narrative, with at most one necessary conditional backup.
- **備註／交通重點**: transfers, buffers, trade-offs, energy or weather decisions, and on-site tactics.
- **票務／備註**: reservation state, price, seats, validity, and entry rules.
- **參考連結**: official or useful URLs, one per line; it is distinct from ticket files.
- **景點規劃**: detailed routes, must-sees, stories, contingency plans, and reminders.

Keep a fixed reservation visible in both the main timeline and ticket context when each serves a different reader need. Preserve meaningful mountain/weather and transport fallbacks rather than flattening the day into an overconfident plan.

## Proposal and write discipline

Show the proposed text by row and identify what moves between columns. Preserve links and genuinely empty cells; do not add a ticket, URL, or booking status merely to make the table look complete.

If the live content differs from the approved preview, stop and re-read before changing anything. On approval, use narrow writes to the selected ranges only, then re-read those visible cells to verify both the content and the correct Day order.

## Output

Write proposals and summaries in Traditional Chinese. Clearly label a preview as not yet applied, and report the exact ranges read or changed. Route questions about whether an option is worth buying to `trip-option-evaluator`.
